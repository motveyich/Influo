import { database } from '../../../core/database';
import { apiClient } from '../../../core/apiClient';
import { showFeatureNotImplemented } from '../../../core/utils';
import { AutoCampaign, AutoCampaignFormData, InfluencerCard } from '../../../core/types';
import { analytics } from '../../../core/analytics';

interface MatchedInfluencer {
  card: InfluencerCard;
  selectedFormat: string;
  selectedPrice: number;
  pricePerFollower: number;
  priceDifference: number;
}

export class AutoCampaignService {
  async createCampaign(advertiserId: string, data: AutoCampaignFormData): Promise<AutoCampaign> {
    const payload = {
      advertiserId,
      title: data.title,
      description: data.description,
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax,
      audienceMin: data.audienceMin,
      audienceMax: data.audienceMax,
      targetInfluencersCount: data.targetInfluencersCount,
      contentTypes: data.contentTypes,
      platforms: data.platforms.map(p => p.toLowerCase()),
      targetCountries: data.targetCountries,
      targetAudienceInterests: data.targetAudienceInterests,
      productCategories: data.productCategories,
      enableChat: data.enableChat,
      startDate: data.startDate,
      endDate: data.endDate,
    };

    const { data: campaign, error } = await apiClient.post<any>('/auto-campaigns', payload);

    if (error) throw new Error(error.message);

    analytics.track('auto_campaign_created', {
      campaignId: campaign.id,
      advertiserId,
      targetCount: data.targetInfluencersCount
    });

    return this.mapCampaignFromApi(campaign);
  }

  async getCampaigns(userId: string): Promise<AutoCampaign[]> {
    const { data, error } = await apiClient.get<any[]>(`/auto-campaigns?userId=${userId}`);

    if (error) throw new Error(error.message);

    return (data || []).map(c => this.mapCampaignFromApi(c));
  }

  async getActiveCampaigns(currentUserId?: string): Promise<AutoCampaign[]> {
    const params = new URLSearchParams();
    params.append('status', 'active');
    if (currentUserId) {
      params.append('excludeUserId', currentUserId);
    }

    const { data, error } = await apiClient.get<any[]>(`/auto-campaigns?${params.toString()}`);

    if (error) throw new Error(error.message);

    return (data || []).map(c => this.mapCampaignFromApi(c));
  }

  async getCampaign(campaignId: string): Promise<AutoCampaign | null> {
    try {
      const { data, error } = await apiClient.get<any>(`/auto-campaigns/${campaignId}`);

      if (error) {
        if (error.status === 404) return null;
        throw new Error(error.message);
      }

      return this.mapCampaignFromApi(data);
    } catch (error) {
      console.error('[getCampaign] Unexpected error:', error);
      throw error;
    }
  }

  async updateCampaign(campaignId: string, updates: Partial<AutoCampaignFormData>): Promise<AutoCampaign> {
    const payload: any = {};

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.budgetMin !== undefined) payload.budgetMin = updates.budgetMin;
    if (updates.budgetMax !== undefined) payload.budgetMax = updates.budgetMax;
    if (updates.audienceMin !== undefined) payload.audienceMin = updates.audienceMin;
    if (updates.audienceMax !== undefined) payload.audienceMax = updates.audienceMax;
    if (updates.targetInfluencersCount !== undefined) payload.targetInfluencersCount = updates.targetInfluencersCount;
    if (updates.contentTypes !== undefined) payload.contentTypes = updates.contentTypes;
    if (updates.platforms !== undefined) {
      payload.platforms = updates.platforms.map(p => p.toLowerCase());
    }
    if (updates.targetCountries !== undefined) payload.targetCountries = updates.targetCountries;
    if (updates.targetAudienceInterests !== undefined) payload.targetAudienceInterests = updates.targetAudienceInterests;
    if (updates.productCategories !== undefined) payload.productCategories = updates.productCategories;
    if (updates.enableChat !== undefined) payload.enableChat = updates.enableChat;
    if (updates.startDate !== undefined) payload.startDate = updates.startDate;
    if (updates.endDate !== undefined) payload.endDate = updates.endDate;

    const { data, error } = await apiClient.patch<any>(`/auto-campaigns/${campaignId}`, payload);

    if (error) throw new Error(error.message);

    return this.mapCampaignFromApi(data);
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    const { error } = await apiClient.delete(`/auto-campaigns/${campaignId}`);

    if (error) throw new Error(error.message);

    analytics.track('auto_campaign_deleted', { campaignId });
  }

  async launchCampaign(campaignId: string, advertiserId: string): Promise<void> {
    const { data, error } = await apiClient.post<any>(`/auto-campaigns/${campaignId}/launch`, {
      advertiserId
    });

    if (error) throw new Error(error.message);

    analytics.track('auto_campaign_launched', {
      campaignId,
      ...data
    });
  }

  async findMatchingInfluencers(campaignId: string): Promise<MatchedInfluencer[]> {
    const { data, error } = await apiClient.get<any[]>(`/auto-campaigns/${campaignId}/matches`);

    if (error) throw new Error(error.message);

    return data || [];
  }

  async updateCampaignStats(campaignId: string): Promise<void> {
    const { error } = await apiClient.post(`/auto-campaigns/${campaignId}/sync-stats`);

    if (error) {
      console.error('[updateCampaignStats] Error:', error);
      throw new Error(error.message);
    }
  }

  async updateCampaignStatus(campaignId: string, status: 'draft' | 'active' | 'in_progress' | 'paused' | 'completed' | 'cancelled'): Promise<void> {
    const { error } = await apiClient.patch(`/auto-campaigns/${campaignId}`, { status });

    if (error) throw new Error(error.message);
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    const { error } = await apiClient.post(`/auto-campaigns/${campaignId}/pause`);

    if (error) throw new Error(error.message);

    analytics.track('auto_campaign_paused', { campaignId });
  }

  async resumeCampaign(campaignId: string): Promise<void> {
    const { data, error } = await apiClient.post<any>(`/auto-campaigns/${campaignId}/resume`);

    if (error) throw new Error(error.message);

    analytics.track('auto_campaign_resumed', { campaignId, newStatus: data?.status });
  }

  async incrementSentOffersCount(campaignId: string): Promise<void> {
    const { error } = await apiClient.post(`/auto-campaigns/${campaignId}/increment-offers`);

    if (error) {
      console.error('Failed to increment sent offers count:', error);
      throw new Error(error.message);
    }
  }

  private mapCampaignFromApi(data: any): AutoCampaign {
    return {
      id: data.id,
      advertiserId: data.advertiserId || data.advertiser_id,
      title: data.title,
      description: data.description,
      status: data.status,
      budgetMin: Number(data.budgetMin || data.budget_min),
      budgetMax: Number(data.budgetMax || data.budget_max),
      audienceMin: data.audienceMin || data.audience_min,
      audienceMax: data.audienceMax || data.audience_max,
      targetInfluencersCount: data.targetInfluencersCount || data.target_influencers_count,
      contentTypes: data.contentTypes || data.content_types || [],
      platforms: data.platforms || [],
      targetCountries: data.targetCountries || data.target_countries || [],
      targetAgeGroups: data.targetAgeGroups || data.target_age_groups || [],
      targetGenders: data.targetGenders || data.target_genders || [],
      targetAudienceInterests: data.targetAudienceInterests || data.target_audience_interests || [],
      productCategories: data.productCategories || data.product_categories || [],
      enableChat: data.enableChat ?? data.enable_chat ?? true,
      startDate: data.startDate || data.start_date,
      endDate: data.endDate || data.end_date,
      targetPricePerFollower: data.targetPricePerFollower ? Number(data.targetPricePerFollower) : (data.target_price_per_follower ? Number(data.target_price_per_follower) : undefined),
      sentOffersCount: data.sentOffersCount || data.sent_offers_count || 0,
      acceptedOffersCount: data.acceptedOffersCount || data.accepted_offers_count || 0,
      completedOffersCount: data.completedOffersCount || data.completed_offers_count || 0,
      createdAt: data.createdAt || data.created_at,
      updatedAt: data.updatedAt || data.updated_at,
      isParticipating: data.isParticipating
    };
  }
}

export const autoCampaignService = new AutoCampaignService();
