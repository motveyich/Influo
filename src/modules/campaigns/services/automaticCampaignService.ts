import { supabase } from '../../../core/supabase';
import type { Campaign, InfluencerCard } from '../../../core/types';

export interface AutomaticSettings {
  targetInfluencerCount: number;
  minRating: number;
  batchSize: number;
  batchDelay: number;
  unitAudienceCost: number;
  scoringWeights: {
    followers: number;
    engagement: number;
    rating: number;
    completedCampaigns: number;
  };
  autoReplacement: boolean;
}

export const DEFAULT_AUTOMATIC_SETTINGS: AutomaticSettings = {
  targetInfluencerCount: 5,
  minRating: 3,
  batchSize: 30,
  batchDelay: 2,
  unitAudienceCost: 0.05,
  scoringWeights: {
    followers: 30,
    engagement: 30,
    rating: 20,
    completedCampaigns: 20,
  },
  autoReplacement: true,
};

interface ScoredInfluencer extends InfluencerCard {
  score: number;
  matchingContentType: string;
  suggestedPrice: number;
}

class AutomaticCampaignService {
  async createAutomaticCampaign(
    campaignData: Omit<Campaign, 'campaign_id' | 'created_at' | 'updated_at'>,
    automaticSettings: Partial<AutomaticSettings>
  ): Promise<Campaign> {
    const settings = { ...DEFAULT_AUTOMATIC_SETTINGS, ...automaticSettings };

    const { data, error } = await supabase
      .from('campaigns')
      .insert([
        {
          ...campaignData,
          is_automatic: true,
          automatic_settings: settings,
          status: 'draft',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async startAutomaticCampaign(campaignId: string): Promise<void> {
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('campaign_id', campaignId);

    if (updateError) throw updateError;

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trigger-automatic-offers`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ campaignId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to trigger automatic offers');
    }
  }

  async pauseAutomaticCampaign(campaignId: string): Promise<void> {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'paused' })
      .eq('campaign_id', campaignId);

    if (error) throw error;
  }

  async resumeAutomaticCampaign(campaignId: string): Promise<void> {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('campaign_id', campaignId);

    if (error) throw error;
  }

  async findMatchingInfluencers(campaign: Campaign): Promise<ScoredInfluencer[]> {
    if (!campaign.is_automatic || !campaign.automatic_settings) {
      throw new Error('Campaign is not automatic');
    }

    const settings = campaign.automatic_settings as AutomaticSettings;

    let query = supabase
      .from('influencer_cards')
      .select('*, user_profiles!inner(user_id, full_name, email)')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .eq('moderation_status', 'approved')
      .gte('rating', settings.minRating);

    if (campaign.preferences.platforms?.length > 0) {
      query = query.in('platform', campaign.preferences.platforms);
    }

    const { data: cards, error } = await query;
    if (error) throw error;
    if (!cards || cards.length === 0) return [];

    const filtered = this.filterByPreferences(cards, campaign);
    const scored = this.scoreInfluencers(filtered, campaign, settings);

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, settings.targetInfluencerCount);
  }

  private filterByPreferences(cards: InfluencerCard[], campaign: Campaign): InfluencerCard[] {
    return cards.filter((card) => {
      const followers = card.reach?.followers || 0;
      if (followers === 0) return false;

      if (campaign.preferences.audienceSize) {
        const { min, max } = campaign.preferences.audienceSize;
        if (min && followers < min) return false;
        if (max && followers > max) return false;
      }

      if (campaign.preferences.contentTypes?.length > 0) {
        const cardTypes = card.serviceDetails?.contentTypes || [];
        const hasMatch = campaign.preferences.contentTypes.some((prefType) =>
          cardTypes.some(
            (cardType) =>
              cardType.toLowerCase().includes(prefType.toLowerCase()) ||
              prefType.toLowerCase().includes(cardType.toLowerCase())
          )
        );
        if (!hasMatch) return false;
      }

      if (campaign.preferences.demographics?.countries?.length > 0) {
        const cardCountries = Object.keys(card.audienceDemographics?.topCountries || {});
        const hasCountryMatch = campaign.preferences.demographics.countries.some((prefCountry) =>
          cardCountries.some(
            (cardCountry) => cardCountry.toLowerCase() === prefCountry.toLowerCase()
          )
        );
        if (!hasCountryMatch) return false;
      }

      return true;
    });
  }

  private scoreInfluencers(
    cards: InfluencerCard[],
    campaign: Campaign,
    settings: AutomaticSettings
  ): ScoredInfluencer[] {
    const weights = settings.scoringWeights;

    const maxFollowers = Math.max(...cards.map((c) => c.reach?.followers || 0), 1);
    const maxEngagement = Math.max(...cards.map((c) => c.reach?.engagementRate || 0), 1);
    const maxCompleted = Math.max(...cards.map((c) => c.completed_campaigns || 0), 1);

    return cards
      .map((card) => {
        const followers = card.reach?.followers || 0;
        const engagement = card.reach?.engagementRate || 0;
        const rating = card.rating || 0;
        const completed = card.completed_campaigns || 0;

        const score =
          (followers / maxFollowers) * (weights.followers / 100) +
          (engagement / maxEngagement) * (weights.engagement / 100) +
          (rating / 5) * (weights.rating / 100) +
          (completed / maxCompleted) * (weights.completedCampaigns / 100);

        const { contentType, price } = this.findBestContentType(card, campaign);

        return {
          ...card,
          score: score * 100,
          matchingContentType: contentType,
          suggestedPrice: price,
        };
      })
      .filter((card) => card.suggestedPrice > 0);
  }

  private findBestContentType(
    card: InfluencerCard,
    campaign: Campaign
  ): { contentType: string; price: number } {
    const pricing = card.serviceDetails?.pricing || {};
    const contentTypes = campaign.preferences.contentTypes || [];

    const matches: Array<{ type: string; price: number }> = [];

    for (const type of contentTypes) {
      const key = type.toLowerCase();
      if (pricing[key] && pricing[key] > 0) {
        matches.push({ type, price: pricing[key] });
      }
    }

    if (matches.length === 0) {
      return { contentType: '', price: 0 };
    }

    const best = matches.reduce((min, curr) => (curr.price < min.price ? curr : min));
    return { contentType: best.type, price: best.price };
  }

  async getCampaignProgress(campaignId: string) {
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*, offers(offer_id, status)')
      .eq('campaign_id', campaignId)
      .single();

    if (campaignError) throw campaignError;

    const offers = campaign.offers || [];
    const settings = campaign.automatic_settings as AutomaticSettings;

    return {
      targetCount: settings?.targetInfluencerCount || 0,
      offersCount: offers.length,
      acceptedCount: offers.filter((o: any) => o.status === 'accepted').length,
      pendingCount: offers.filter((o: any) => o.status === 'pending').length,
      declinedCount: offers.filter((o: any) => o.status === 'declined').length,
      status: campaign.status,
    };
  }
}

export const automaticCampaignService = new AutomaticCampaignService();
