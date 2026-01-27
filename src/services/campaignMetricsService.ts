import { api } from '../core/api';

export class CampaignMetricsService {
  private trackedCampaigns = new Set<string>();

  async trackCampaignView(campaignId: string, userId?: string): Promise<void> {
    try {
      const key = `${campaignId}-${userId || 'anon'}`;

      if (this.trackedCampaigns.has(key)) {
        return;
      }

      await api.post(`/campaign-metrics/${campaignId}/views`);

      this.trackedCampaigns.add(key);

      setTimeout(() => {
        this.trackedCampaigns.delete(key);
      }, 60000);
    } catch (error) {
      console.error('Failed to track campaign view:', error);
    }
  }

  async getCampaignMetrics(campaignId: string): Promise<{
    applicants: number;
    accepted: number;
    impressions: number;
    engagement: number;
  }> {
    try {
      const data = await api.get(`/campaign-metrics/${campaignId}`);

      return data?.metrics || {
        applicants: 0,
        accepted: 0,
        impressions: 0,
        engagement: 0
      };
    } catch (error) {
      console.error('Failed to get campaign metrics:', error);
      return {
        applicants: 0,
        accepted: 0,
        impressions: 0,
        engagement: 0
      };
    }
  }

  async refreshCampaignMetrics(campaignId: string): Promise<void> {
    try {
      await api.post(`/campaign-metrics/${campaignId}/refresh`);
    } catch (error) {
      console.error('Failed to refresh campaign metrics:', error);
      throw error;
    }
  }
}

export const campaignMetricsService = new CampaignMetricsService();
