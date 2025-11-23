import { supabase } from '../core/supabase';

export class CampaignMetricsService {
  private trackedCampaigns = new Set<string>();

  async trackCampaignView(campaignId: string, userId?: string): Promise<void> {
    try {
      const key = `${campaignId}-${userId || 'anon'}`;

      if (this.trackedCampaigns.has(key)) {
        return;
      }

      const { error } = await supabase
        .from('campaign_views')
        .insert([{
          campaign_id: campaignId,
          user_id: userId || null,
          viewed_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Failed to track campaign view:', error);
        return;
      }

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
      const { data, error } = await supabase
        .from('campaigns')
        .select('metrics')
        .eq('campaign_id', campaignId)
        .maybeSingle();

      if (error) throw error;

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
      const { error } = await supabase.rpc('update_campaign_metrics', {
        p_campaign_id: campaignId
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to refresh campaign metrics:', error);
      throw error;
    }
  }
}

export const campaignMetricsService = new CampaignMetricsService();
