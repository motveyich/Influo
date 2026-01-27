import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';

@Injectable()
export class CampaignMetricsService {
  constructor(private supabase: SupabaseService) {}

  async trackCampaignView(userId: string, campaignId: string) {
    const { error } = await this.supabase.getClient()
      .from('campaign_views')
      .insert({
        user_id: userId,
        campaign_id: campaignId,
        viewed_at: new Date().toISOString(),
      });

    if (error) throw error;
    return { success: true };
  }

  async getCampaignMetrics(campaignId: string) {
    const { data, error } = await this.supabase.getClient()
      .from('auto_campaigns')
      .select(`
        views_count,
        clicks_count,
        applications_count,
        conversions_count,
        total_budget,
        spent_budget
      `)
      .eq('id', campaignId)
      .single();

    if (error) throw error;
    return data;
  }

  async refreshCampaignMetrics(campaignId: string) {
    const { error } = await this.supabase.getClient()
      .rpc('update_campaign_metrics', {
        p_campaign_id: campaignId,
      });

    if (error) throw error;
    return { success: true, message: 'Metrics refreshed successfully' };
  }
}
