import { supabase, TABLES } from '../../../core/supabase';
import { campaignValidationService } from './campaignValidationService';

export interface AutomaticOfferConfig {
  campaignId: string;
  advertiserId: string;
  campaignTitle: string;
  campaignDescription: string;
  filters: {
    platforms: string[];
    contentTypes: string[];
    audienceSize: { min: number; max: number };
    demographics: any;
  };
  weights: {
    followers: number;
    engagement: number;
    rating: number;
    completedCampaigns: number;
  };
  targetCount: number;
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  timeline: {
    startDate: string;
    endDate: string;
  };
}

export class AutomaticOfferService {
  async distributeOffersToInfluencers(config: AutomaticOfferConfig): Promise<{
    success: boolean;
    offersCreated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let offersCreated = 0;

    try {
      const matchedInfluencers = await this.findMatchedInfluencers(
        config.filters,
        config.weights,
        config.targetCount
      );

      if (matchedInfluencers.length === 0) {
        return {
          success: false,
          offersCreated: 0,
          errors: ['Не найдено подходящих инфлюенсеров']
        };
      }

      const scoredInfluencers = this.scoreAndRankInfluencers(
        matchedInfluencers,
        config.weights
      );

      const topInfluencers = scoredInfluencers.slice(0, config.targetCount);

      for (const influencer of topInfluencers) {
        try {
          await this.createAutomaticOffer(config, influencer);
          offersCreated++;
        } catch (error) {
          console.error(`Failed to create offer for influencer ${influencer.user_id}:`, error);
          errors.push(`Ошибка создания предложения для инфлюенсера ${influencer.user_id}`);
        }
      }

      return {
        success: offersCreated > 0,
        offersCreated,
        errors
      };
    } catch (error) {
      console.error('Failed to distribute offers:', error);
      return {
        success: false,
        offersCreated: 0,
        errors: ['Общая ошибка при распределении предложений']
      };
    }
  }

  private async findMatchedInfluencers(
    filters: any,
    weights: any,
    targetCount: number
  ): Promise<any[]> {
    try {
      let query = supabase
        .from(TABLES.INFLUENCER_CARDS)
        .select('*, user_profiles!inner(user_id, full_name, email, avatar)')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .eq('moderation_status', 'approved');

      if (filters.platforms.length > 0) {
        query = query.in('platform', filters.platforms);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data) return [];

      return data.filter(card => this.matchesFilters(card, filters));
    } catch (error) {
      console.error('Failed to find matched influencers:', error);
      return [];
    }
  }

  private matchesFilters(card: any, filters: any): boolean {
    const reach = card.reach || {};
    const demographics = card.audience_demographics || {};
    const serviceDetails = card.service_details || {};

    const followers = reach.followers || 0;
    if (
      filters.audienceSize.min > 0 &&
      followers < filters.audienceSize.min
    ) {
      return false;
    }
    if (
      filters.audienceSize.max > 0 &&
      followers > filters.audienceSize.max
    ) {
      return false;
    }

    if (filters.contentTypes.length > 0) {
      const cardContentTypes = serviceDetails.contentTypes || [];
      const hasMatchingContentType = filters.contentTypes.some((type: string) =>
        cardContentTypes.includes(type)
      );
      if (!hasMatchingContentType) {
        return false;
      }
    }

    return true;
  }

  private scoreAndRankInfluencers(
    influencers: any[],
    weights: {
      followers: number;
      engagement: number;
      rating: number;
      completedCampaigns: number;
    }
  ): any[] {
    const scored = influencers.map(influencer => {
      const reach = influencer.reach || {};
      const followers = reach.followers || 0;
      const engagementRate = reach.engagementRate || 0;
      const rating = influencer.rating || 0;
      const completedCampaigns = influencer.completed_campaigns || 0;

      const maxFollowers = Math.max(...influencers.map(i => (i.reach?.followers || 0)));
      const maxEngagement = Math.max(...influencers.map(i => (i.reach?.engagementRate || 0)));
      const maxRating = 5;
      const maxCompletedCampaigns = Math.max(...influencers.map(i => (i.completed_campaigns || 0)));

      const normalizedFollowers = maxFollowers > 0 ? followers / maxFollowers : 0;
      const normalizedEngagement = maxEngagement > 0 ? engagementRate / maxEngagement : 0;
      const normalizedRating = maxRating > 0 ? rating / maxRating : 0;
      const normalizedCompletedCampaigns = maxCompletedCampaigns > 0 ? completedCampaigns / maxCompletedCampaigns : 0;

      const score =
        (normalizedFollowers * weights.followers) +
        (normalizedEngagement * weights.engagement) +
        (normalizedRating * weights.rating) +
        (normalizedCompletedCampaigns * weights.completedCampaigns);

      return {
        ...influencer,
        score
      };
    });

    return scored.sort((a, b) => b.score - a.score);
  }

  private async createAutomaticOffer(
    config: AutomaticOfferConfig,
    influencer: any
  ): Promise<void> {
    const serviceDetails = influencer.service_details || {};
    const pricing = serviceDetails.pricing || {};

    const suggestedBudget = this.calculateSuggestedBudget(
      pricing,
      config.budget,
      config.filters.contentTypes
    );

    const offerData = {
      influencer_id: influencer.user_id,
      campaign_id: config.campaignId,
      advertiser_id: config.advertiserId,
      influencer_card_id: influencer.id,
      details: {
        title: config.campaignTitle,
        description: config.campaignDescription,
        contentTypes: config.filters.contentTypes,
        suggestedBudget,
        deliverables: config.filters.contentTypes.map((type: string) => ({
          type,
          quantity: 1,
          description: `Создание ${type.toLowerCase()}`
        }))
      },
      status: 'pending',
      timeline: config.timeline,
      metadata: {
        isAutomatic: true,
        campaignId: config.campaignId,
        score: influencer.score || 0,
        sentAt: new Date().toISOString()
      },
      current_stage: 'offer_sent',
      initiated_by: config.advertiserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from(TABLES.OFFERS)
      .insert([offerData]);

    if (error) throw error;
  }

  private calculateSuggestedBudget(
    pricing: any,
    campaignBudget: { min: number; max: number; currency: string },
    contentTypes: string[]
  ): number {
    let totalPricing = 0;
    let countedTypes = 0;

    for (const type of contentTypes) {
      const typeKey = type.toLowerCase();
      if (pricing[typeKey] && pricing[typeKey] > 0) {
        totalPricing += pricing[typeKey];
        countedTypes++;
      }
    }

    const averagePricing = countedTypes > 0 ? totalPricing / countedTypes : 0;

    if (averagePricing === 0) {
      return Math.floor((campaignBudget.min + campaignBudget.max) / 2);
    }

    const suggestedBudget = Math.min(
      Math.max(averagePricing, campaignBudget.min),
      campaignBudget.max
    );

    return Math.floor(suggestedBudget);
  }

  async getAutomaticOfferDetails(offerId: string): Promise<any> {
    try {
      const { data: offer, error: offerError } = await supabase
        .from(TABLES.OFFERS)
        .select(`
          *,
          campaigns!inner(
            campaign_id,
            title,
            description,
            brand,
            budget,
            preferences,
            timeline,
            metadata
          )
        `)
        .eq('offer_id', offerId)
        .maybeSingle();

      if (offerError) throw offerError;
      if (!offer) return null;

      return {
        ...offer,
        campaignDetails: offer.campaigns
      };
    } catch (error) {
      console.error('Failed to get automatic offer details:', error);
      return null;
    }
  }
}

export const automaticOfferService = new AutomaticOfferService();
