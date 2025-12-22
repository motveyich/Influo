import { apiClient } from '../../../core/api';
import { AutoCampaign, AutoCampaignFormData } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class AutoCampaignService {
  async createCampaign(advertiserId: string, data: AutoCampaignFormData): Promise<AutoCampaign> {
    try {
      const payload = {
        title: data.title,
        description: data.description,
        platform: data.platforms?.[0] || 'instagram',
        maxInfluencers: data.targetInfluencersCount,
        budget: {
          amount: data.budgetMax || data.budgetMin || 0,
          currency: 'RUB',
        },
        followerRange: {
          min: data.audienceMin,
          max: data.audienceMax,
        },
        minEngagementRate: 0,
        targetInterests: data.targetAudienceInterests || [],
        targetCountries: data.targetCountries,
        enableChat: data.enableChat,
      };

      const campaign = await apiClient.post<AutoCampaign>('/auto-campaigns', payload);

      analytics.track('auto_campaign_created', {
        campaignId: campaign.id,
        advertiserId,
        targetCount: data.targetInfluencersCount
      });

      return campaign;
    } catch (error) {
      console.error('Failed to create campaign:', error);
      throw error;
    }
  }

  async getCampaigns(userId: string): Promise<AutoCampaign[]> {
    try {
      console.log('Loading campaigns for user:', userId);
      const campaigns = await apiClient.get<AutoCampaign[]>(`/auto-campaigns?userId=${userId}`);
      console.log('Raw campaigns response:', campaigns);

      if (!Array.isArray(campaigns)) {
        console.warn('Campaigns response is not an array:', campaigns);
        return [];
      }

      const normalized = campaigns.map(campaign => ({
        ...campaign,
        advertiserId: campaign.advertiserId || campaign.user?.id || ''
      }));
      console.log('Normalized campaigns:', normalized);
      return normalized;
    } catch (error) {
      console.error('Failed to get campaigns:', error);
      return [];
    }
  }

  async getCampaign(campaignId: string): Promise<AutoCampaign> {
    try {
      const campaign = await apiClient.get<AutoCampaign>(`/auto-campaigns/${campaignId}`);
      return {
        ...campaign,
        advertiserId: campaign.advertiserId || campaign.user?.id || ''
      };
    } catch (error) {
      console.error('Failed to get campaign:', error);
      throw error;
    }
  }

  async updateCampaign(campaignId: string, updates: Partial<AutoCampaign>): Promise<AutoCampaign> {
    try {
      const payload: Record<string, any> = {};

      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.platforms !== undefined) payload.platform = updates.platforms[0];
      if (updates.targetInfluencersCount !== undefined) payload.maxInfluencers = updates.targetInfluencersCount;
      if (updates.budgetMin !== undefined || updates.budgetMax !== undefined) {
        payload.budget = { amount: updates.budgetMax || updates.budgetMin || 0, currency: 'RUB' };
      }
      if (updates.audienceMin !== undefined || updates.audienceMax !== undefined) {
        payload.followerRange = { min: updates.audienceMin || 0, max: updates.audienceMax || 0 };
      }
      if (updates.targetAudienceInterests !== undefined) payload.targetInterests = updates.targetAudienceInterests;
      if (updates.targetCountries !== undefined) payload.targetCountries = updates.targetCountries;
      if (updates.enableChat !== undefined) payload.enableChat = updates.enableChat;
      if (updates.status !== undefined) payload.status = updates.status;

      return await apiClient.patch<AutoCampaign>(`/auto-campaigns/${campaignId}`, payload);
    } catch (error) {
      console.error('Failed to update campaign:', error);
      throw error;
    }
  }

  async activateCampaign(campaignId: string): Promise<AutoCampaign> {
    try {
      return await apiClient.post<AutoCampaign>(`/auto-campaigns/${campaignId}/activate`);
    } catch (error) {
      console.error('Failed to activate campaign:', error);
      throw error;
    }
  }

  async pauseCampaign(campaignId: string): Promise<AutoCampaign> {
    try {
      return await apiClient.post<AutoCampaign>(`/auto-campaigns/${campaignId}/pause`);
    } catch (error) {
      console.error('Failed to pause campaign:', error);
      throw error;
    }
  }

  async resumeCampaign(campaignId: string): Promise<AutoCampaign> {
    try {
      return await apiClient.post<AutoCampaign>(`/auto-campaigns/${campaignId}/resume`);
    } catch (error) {
      console.error('Failed to resume campaign:', error);
      throw error;
    }
  }

  async launchCampaign(campaignId: string, advertiserId: string): Promise<AutoCampaign> {
    try {
      const campaign = await apiClient.patch<AutoCampaign>(`/auto-campaigns/${campaignId}`, {
        status: 'active'
      });

      analytics.track('auto_campaign_launched', {
        campaignId,
        advertiserId
      });

      return campaign;
    } catch (error) {
      console.error('Failed to launch campaign:', error);
      throw error;
    }
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    try {
      await apiClient.delete(`/auto-campaigns/${campaignId}`);

      analytics.track('auto_campaign_deleted', {
        campaignId
      });
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      throw error;
    }
  }

  async getActiveCampaigns(currentUserId?: string): Promise<AutoCampaign[]> {
    try {
      console.log('Loading active campaigns, currentUserId:', currentUserId);
      const campaigns = await apiClient.get<AutoCampaign[]>('/auto-campaigns?status=active');
      console.log('Raw active campaigns response:', campaigns);

      if (!Array.isArray(campaigns)) {
        console.warn('Active campaigns response is not an array:', campaigns);
        return [];
      }

      const normalizedCampaigns = campaigns.map(campaign => ({
        ...campaign,
        advertiserId: campaign.advertiserId || campaign.user?.id || ''
      }));

      if (currentUserId) {
        const filtered = normalizedCampaigns.filter(c => c.advertiserId !== currentUserId);
        console.log('Filtered active campaigns (excluding current user):', filtered);
        return filtered;
      }
      console.log('All active campaigns:', normalizedCampaigns);
      return normalizedCampaigns;
    } catch (error) {
      console.error('Failed to get active campaigns:', error);
      return [];
    }
  }
}

export const autoCampaignService = new AutoCampaignService();
