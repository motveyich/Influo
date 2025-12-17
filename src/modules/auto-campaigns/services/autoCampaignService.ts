import { apiClient } from '../../../core/api';
import { AutoCampaign, AutoCampaignFormData } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class AutoCampaignService {
  async createCampaign(advertiserId: string, data: AutoCampaignFormData): Promise<AutoCampaign> {
    try {
      const payload = {
        title: data.title,
        description: data.description,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
        audienceMin: data.audienceMin,
        audienceMax: data.audienceMax,
        targetInfluencersCount: data.targetInfluencersCount,
        contentTypes: data.contentTypes,
        platforms: data.platforms,
        targetCountries: data.targetCountries,
        targetAudienceInterests: data.targetAudienceInterests,
        productCategories: data.productCategories,
        enableChat: data.enableChat,
        startDate: data.startDate,
        endDate: data.endDate,
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
      const campaigns = await apiClient.get<AutoCampaign[]>(`/auto-campaigns?userId=${userId}`);
      return campaigns.map(campaign => ({
        ...campaign,
        advertiserId: campaign.advertiserId || campaign.user?.id || ''
      }));
    } catch (error) {
      console.error('Failed to get campaigns:', error);
      throw error;
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
      return await apiClient.patch<AutoCampaign>(`/auto-campaigns/${campaignId}`, updates);
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
      const campaigns = await apiClient.get<AutoCampaign[]>('/auto-campaigns?status=active');
      const normalizedCampaigns = campaigns.map(campaign => ({
        ...campaign,
        advertiserId: campaign.advertiserId || campaign.user?.id || ''
      }));

      if (currentUserId) {
        return normalizedCampaigns.filter(c => c.advertiserId !== currentUserId);
      }
      return normalizedCampaigns;
    } catch (error) {
      console.error('Failed to get active campaigns:', error);
      throw error;
    }
  }
}

export const autoCampaignService = new AutoCampaignService();
