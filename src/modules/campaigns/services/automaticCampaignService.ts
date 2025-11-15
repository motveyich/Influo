import { supabase, TABLES } from '../../../core/supabase';
import { Campaign, InfluencerCard, Offer } from '../../../core/types';
import { analytics } from '../../../core/analytics';
import { influencerCardService } from '../../influencer-cards/services/influencerCardService';

interface InfluencerScore {
  influencerId: string;
  cardId: string;
  score: number;
  metrics: {
    followers: number;
    engagement: number;
    relevance: number;
    responseTime: number;
  };
}

interface AutomaticSettings {
  targetInfluencerCount: number;
  overbookingPercentage: number;
  batchSize: number;
  batchDelay: number; // minutes
  scoringWeights: {
    followers: number;
    engagement: number;
    relevance: number;
    responseTime: number;
  };
  autoReplacement: boolean;
  maxReplacements: number;
}

export class AutomaticCampaignService {
  private activeCampaigns = new Map<string, {
    campaign: Campaign;
    acceptedCount: number;
    sentOffers: string[];
    replacementCount: Map<string, number>;
  }>();

  async createCampaign(campaignData: Partial<Campaign>): Promise<Campaign> {
    try {
      // Validate required fields
      this.validateCampaignData(campaignData);

      const newCampaign = {
        advertiser_id: campaignData.advertiserId,
        title: campaignData.title,
        description: campaignData.description,
        brand: campaignData.brand,
        budget: campaignData.budget,
        preferences: campaignData.preferences,
        status: 'active', // Automatic campaigns start active
        timeline: campaignData.timeline,
        metrics: {
          applicants: 0,
          accepted: 0,
          impressions: 0,
          engagement: 0
        },
        metadata: campaignData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.CAMPAIGNS)
        .insert([newCampaign])
        .select()
        .single();

      if (error) throw error;

      const campaign = this.transformFromDatabase(data);

      // Initialize campaign tracking
      this.activeCampaigns.set(campaign.campaignId, {
        campaign,
        acceptedCount: 0,
        sentOffers: [],
        replacementCount: new Map()
      });

      // Start automatic influencer matching
      this.startAutomaticMatching(campaign);

      // Track campaign creation
      analytics.trackCampaignCreated(campaign.campaignId, campaignData.advertiserId!);

      return campaign;
    } catch (error) {
      console.error('Failed to create automatic campaign:', error);
      throw error;
    }
  }

  async updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign> {
    try {
      // Validate updates
      this.validateCampaignData(updates, false);

      const updateData = {
        title: updates.title,
        description: updates.description,
        brand: updates.brand,
        budget: updates.budget,
        preferences: updates.preferences,
        timeline: updates.timeline,
        metadata: updates.metadata,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.CAMPAIGNS)
        .update(updateData)
        .eq('campaign_id', campaignId)
        .select()
        .single();

      if (error) throw error;

      const updatedCampaign = this.transformFromDatabase(data);

      // Update tracking if campaign is active
      if (this.activeCampaigns.has(campaignId)) {
        const tracking = this.activeCampaigns.get(campaignId)!;
        tracking.campaign = updatedCampaign;
      }

      // Track campaign update
      analytics.track('automatic_campaign_updated', {
        campaign_id: campaignId,
        updated_fields: Object.keys(updates)
      });

      return updatedCampaign;
    } catch (error) {
      console.error('Failed to update automatic campaign:', error);
      throw error;
    }
  }

  private async startAutomaticMatching(campaign: Campaign): Promise<void> {
    try {
      const automaticSettings = (campaign as any).metadata?.automaticSettings as AutomaticSettings;
      if (!automaticSettings) {
        throw new Error('Automatic settings not found');
      }

      // Find and score influencers
      const scoredInfluencers = await this.findAndScoreInfluencers(campaign, automaticSettings);
      
      if (scoredInfluencers.length === 0) {
        throw new Error('No matching influencers found');
      }

      // Calculate how many offers to send
      const targetCount = automaticSettings.targetInfluencerCount;
      const overbookingCount = Math.ceil(targetCount * (automaticSettings.overbookingPercentage / 100));
      const totalToSend = targetCount + overbookingCount;

      // Send offers in batches
      await this.sendOffersInBatches(
        campaign,
        scoredInfluencers.slice(0, totalToSend),
        automaticSettings
      );

      // Track matching completion
      analytics.track('automatic_matching_completed', {
        campaign_id: campaign.campaignId,
        influencers_found: scoredInfluencers.length,
        offers_to_send: totalToSend
      });
    } catch (error) {
      console.error('Failed to start automatic matching:', error);
      
      // Update campaign status to indicate error
      await supabase
        .from(TABLES.CAMPAIGNS)
        .update({ 
          status: 'paused',
          metadata: {
            ...(campaign as any).metadata,
            error: error.message
          }
        })
        .eq('campaign_id', campaign.campaignId);
    }
  }

  private async findAndScoreInfluencers(campaign: Campaign, settings: AutomaticSettings): Promise<InfluencerScore[]> {
    try {
      // Get all active influencer cards that match basic criteria
      const influencerCards = await influencerCardService.getAllCards({
        isActive: true,
        minFollowers: campaign.preferences.audienceSize.min,
        maxFollowers: campaign.preferences.audienceSize.max || undefined
      });

      // Filter by platform (case-insensitive comparison)
      const platformFiltered = influencerCards.filter(card => {
        const cardPlatform = card.platform.toLowerCase();
        return campaign.preferences.platforms.some(p =>
          p.toLowerCase() === cardPlatform
        ) || cardPlatform === 'multi';
      });

      // Score each influencer
      const scoredInfluencers: InfluencerScore[] = [];

      for (const card of platformFiltered) {
        const score = this.calculateInfluencerScore(card, campaign, settings);
        
        if (score.score > 0) {
          scoredInfluencers.push({
            influencerId: card.userId,
            cardId: card.id,
            ...score
          });
        }
      }

      // Sort by score (highest first)
      return scoredInfluencers.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('Failed to find and score influencers:', error);
      throw error;
    }
  }

  private calculateInfluencerScore(
    card: InfluencerCard, 
    campaign: Campaign, 
    settings: AutomaticSettings
  ): { score: number; metrics: any } {
    const weights = settings.scoringWeights;
    
    // Followers score (0-100)
    const followersScore = Math.min(100, (card.reach.followers / 1000000) * 100);
    
    // Engagement score (0-100)
    const engagementScore = Math.min(100, card.reach.engagementRate * 10);
    
    // Relevance score based on content types and audience demographics
    let relevanceScore = 0;
    
    // Check content type overlap (exact match or substring match)
    const contentOverlap = campaign.preferences.contentTypes.filter(type => {
      const typeLower = type.toLowerCase();
      return card.serviceDetails.contentTypes.some(cardType => {
        const cardTypeLower = cardType.toLowerCase();
        return cardTypeLower === typeLower ||
               cardTypeLower.includes(typeLower) ||
               typeLower.includes(cardTypeLower);
      });
    }).length;
    relevanceScore += (contentOverlap / campaign.preferences.contentTypes.length) * 50;
    
    // Check country overlap
    const countryOverlap = campaign.preferences.demographics?.countries?.filter(country =>
      card.audienceDemographics?.topCountries?.includes(country)
    ).length || 0;
    if (campaign.preferences.demographics?.countries?.length > 0) {
      relevanceScore += (countryOverlap / campaign.preferences.demographics.countries.length) * 50;
    } else {
      relevanceScore += 50; // No country restriction
    }
    
    // Response time score (removed field, use default value)
    const responseTimeScore = 80; // Default value since response time field is removed
    
    // Calculate weighted score
    const totalScore = (
      (followersScore * weights.followers / 100) +
      (engagementScore * weights.engagement / 100) +
      (relevanceScore * weights.relevance / 100) +
      (responseTimeScore * weights.responseTime / 100)
    );

    return {
      score: Math.round(totalScore),
      metrics: {
        followers: followersScore,
        engagement: engagementScore,
        relevance: relevanceScore,
        responseTime: responseTimeScore
      }
    };
  }

  private async sendOffersInBatches(
    campaign: Campaign,
    scoredInfluencers: InfluencerScore[],
    settings: AutomaticSettings
  ): Promise<void> {
    const batches = this.createBatches(scoredInfluencers, settings.batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      // Check if we still need more influencers
      const tracking = this.activeCampaigns.get(campaign.campaignId);
      if (tracking && tracking.acceptedCount >= settings.targetInfluencerCount) {
        console.log(`Campaign ${campaign.campaignId} target reached, stopping batch sending`);
        break;
      }

      // Send offers for this batch
      await this.sendBatchOffers(campaign, batch);
      
      // Wait before sending next batch (except for last batch)
      if (i < batches.length - 1) {
        await this.delay(settings.batchDelay * 60 * 1000); // Convert minutes to milliseconds
      }
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async sendBatchOffers(campaign: Campaign, influencers: InfluencerScore[]): Promise<void> {
    // Automatic offer sending is disabled - offers functionality removed
    console.log('Automatic offer sending disabled - offers functionality removed');
  }

  private calculateOfferRate(budget: Campaign['budget'], score: number): number {
    // Calculate rate based on score and budget range
    const scoreRatio = score / 100;
    const budgetRange = budget.max - budget.min;
    return Math.round(budget.min + (budgetRange * scoreRatio));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async handleOfferResponse(offerId: string, response: 'accepted' | 'declined'): Promise<void> {
    try {
      // Find which campaign this offer belongs to
      const { data: offer } = await supabase
        .from(TABLES.OFFERS)
        .select('campaign_id, influencer_id')
        .eq('offer_id', offerId)
        .single();

      if (!offer) return;

      const tracking = this.activeCampaigns.get(offer.campaign_id);
      if (!tracking) return;

      const settings = tracking.campaign.metadata?.automaticSettings as AutomaticSettings;
      if (!settings) return;

      if (response === 'accepted') {
        tracking.acceptedCount++;
        
        // Check if target is reached
        if (tracking.acceptedCount >= settings.targetInfluencerCount) {
          await this.stopCampaignOffers(offer.campaign_id);
        }
      }

      // Track response
      analytics.track('automatic_campaign_offer_response', {
        campaign_id: offer.campaign_id,
        offer_id: offerId,
        response: response,
        accepted_count: tracking.acceptedCount,
        target_count: settings.targetInfluencerCount
      });
    } catch (error) {
      console.error('Failed to handle offer response:', error);
    }
  }

  private async stopCampaignOffers(campaignId: string): Promise<void> {
    try {
      // Mark all pending offers as invalid
      await supabase
        .from(TABLES.OFFERS)
        .update({ 
          status: 'withdrawn',
          metadata: {
            reason: 'campaign_target_reached'
          }
        })
        .eq('campaign_id', campaignId)
        .eq('status', 'pending');

      // Update campaign status
      await supabase
        .from(TABLES.CAMPAIGNS)
        .update({ 
          status: 'paused',
          metadata: {
            reason: 'target_reached',
            pausedAt: new Date().toISOString()
          }
        })
        .eq('campaign_id', campaignId);

      // Track campaign completion
      analytics.track('automatic_campaign_target_reached', {
        campaign_id: campaignId
      });
    } catch (error) {
      console.error('Failed to stop campaign offers:', error);
    }
  }

  async handleInfluencerDropout(campaignId: string, influencerId: string): Promise<void> {
    try {
      const tracking = this.activeCampaigns.get(campaignId);
      if (!tracking) return;

      const settings = tracking.campaign.metadata?.automaticSettings as AutomaticSettings;
      if (!settings || !settings.autoReplacement) return;

      // Check replacement limit
      const currentReplacements = tracking.replacementCount.get(influencerId) || 0;
      if (currentReplacements >= settings.maxReplacements) {
        console.log(`Max replacements reached for influencer ${influencerId}`);
        return;
      }

      // Find replacement
      const replacement = await this.findReplacement(tracking.campaign, tracking.sentOffers);
      
      if (replacement) {
        // Replacement offer sending is disabled - offers functionality removed
        console.log('Replacement offer sending disabled - offers functionality removed');

        // Update replacement count
        tracking.replacementCount.set(influencerId, currentReplacements + 1);

        // Track replacement
        analytics.track('automatic_campaign_replacement_sent', {
          campaign_id: campaignId,
          original_influencer: influencerId,
          replacement_influencer: replacement.influencerId,
          replacement_count: currentReplacements + 1
        });
      }
    } catch (error) {
      console.error('Failed to handle influencer dropout:', error);
    }
  }

  private async findReplacement(campaign: Campaign, excludeInfluencers: string[]): Promise<InfluencerScore | null> {
    try {
      const settings = (campaign as any).metadata?.automaticSettings as AutomaticSettings;
      if (!settings) return null;

      // Find new influencers not in exclude list
      const allScored = await this.findAndScoreInfluencers(campaign, settings);
      const available = allScored.filter(inf => !excludeInfluencers.includes(inf.influencerId));
      
      return available.length > 0 ? available[0] : null;
    } catch (error) {
      console.error('Failed to find replacement:', error);
      return null;
    }
  }

  private validateCampaignData(campaignData: Partial<Campaign>, isCreate: boolean = true): void {
    const errors: string[] = [];

    if (isCreate) {
      if (!campaignData.advertiserId) errors.push('Advertiser ID is required');
      if (!campaignData.title?.trim()) errors.push('Campaign title is required');
      if (!campaignData.brand?.trim()) errors.push('Brand name is required');
    }

    if (campaignData.title && campaignData.title.trim().length < 3) {
      errors.push('Campaign title must be at least 3 characters');
    }

    if (campaignData.description && campaignData.description.trim().length < 10) {
      errors.push('Campaign description must be at least 10 characters');
    }

    if (campaignData.budget) {
      if (campaignData.budget.min < 0 || campaignData.budget.max < 0) {
        errors.push('Budget amounts cannot be negative');
      }
      if (campaignData.budget.min > campaignData.budget.max) {
        errors.push('Minimum budget cannot be greater than maximum budget');
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private transformFromDatabase(dbData: any): Campaign {
    return {
      campaignId: dbData.campaign_id,
      advertiserId: dbData.advertiser_id,
      title: dbData.title,
      description: dbData.description,
      brand: dbData.brand,
      budget: dbData.budget,
      preferences: dbData.preferences,
      status: dbData.status,
      timeline: dbData.timeline,
      metrics: dbData.metrics,
      metadata: dbData.metadata,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }
}

export const automaticCampaignService = new AutomaticCampaignService();