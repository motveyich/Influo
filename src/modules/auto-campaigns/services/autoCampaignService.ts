import { supabase } from '../../../core/supabase';
import { AutoCampaign, AutoCampaignFormData } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class AutoCampaignService {
  private transformCampaign(data: any): AutoCampaign {
    return {
      id: data.id,
      advertiserId: data.advertiser_id,
      title: data.title,
      description: data.description,
      budgetMin: data.budget_min,
      budgetMax: data.budget_max,
      audienceMin: data.audience_min,
      audienceMax: data.audience_max,
      targetInfluencersCount: data.target_influencers_count,
      currentOffersCount: data.current_offers_count,
      contentTypes: data.content_types,
      platforms: data.platforms,
      targetCountries: data.target_countries,
      targetAudienceInterests: data.target_audience_interests,
      productCategories: data.product_categories,
      enableChat: data.enable_chat,
      startDate: data.start_date,
      endDate: data.end_date,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async createCampaign(advertiserId: string, data: AutoCampaignFormData): Promise<AutoCampaign> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: campaign, error } = await supabase
        .from('auto_campaigns')
        .insert({
          advertiser_id: user.id,
          title: data.title,
          description: data.description,
          budget_min: data.budgetMin,
          budget_max: data.budgetMax,
          audience_min: data.audienceMin,
          audience_max: data.audienceMax,
          target_influencers_count: data.targetInfluencersCount,
          content_types: data.contentTypes,
          platforms: data.platforms,
          target_countries: data.targetCountries,
          target_audience_interests: data.targetAudienceInterests,
          product_categories: data.productCategories,
          enable_chat: data.enableChat,
          start_date: data.startDate,
          end_date: data.endDate,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      const result = this.transformCampaign(campaign);

      analytics.track('auto_campaign_created', {
        campaignId: result.id,
        advertiserId,
        targetCount: data.targetInfluencersCount
      });

      return result;
    } catch (error) {
      console.error('Failed to create campaign:', error);
      throw error;
    }
  }

  async getCampaigns(userId: string): Promise<AutoCampaign[]> {
    try {
      const { data, error } = await supabase
        .from('auto_campaigns')
        .select('*')
        .eq('advertiser_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => this.transformCampaign(item));
    } catch (error) {
      console.error('Failed to get campaigns:', error);
      throw error;
    }
  }

  async getCampaign(campaignId: string): Promise<AutoCampaign> {
    try {
      const { data, error } = await supabase
        .from('auto_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw error;

      return this.transformCampaign(data);
    } catch (error) {
      console.error('Failed to get campaign:', error);
      throw error;
    }
  }

  async updateCampaign(campaignId: string, updates: Partial<AutoCampaign>): Promise<AutoCampaign> {
    try {
      const payload: any = { updated_at: new Date().toISOString() };

      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.budgetMin !== undefined) payload.budget_min = updates.budgetMin;
      if (updates.budgetMax !== undefined) payload.budget_max = updates.budgetMax;
      if (updates.audienceMin !== undefined) payload.audience_min = updates.audienceMin;
      if (updates.audienceMax !== undefined) payload.audience_max = updates.audienceMax;
      if (updates.targetInfluencersCount !== undefined) payload.target_influencers_count = updates.targetInfluencersCount;
      if (updates.contentTypes !== undefined) payload.content_types = updates.contentTypes;
      if (updates.platforms !== undefined) payload.platforms = updates.platforms;
      if (updates.targetCountries !== undefined) payload.target_countries = updates.targetCountries;
      if (updates.targetAudienceInterests !== undefined) payload.target_audience_interests = updates.targetAudienceInterests;
      if (updates.productCategories !== undefined) payload.product_categories = updates.productCategories;
      if (updates.enableChat !== undefined) payload.enable_chat = updates.enableChat;
      if (updates.startDate !== undefined) payload.start_date = updates.startDate;
      if (updates.endDate !== undefined) payload.end_date = updates.endDate;
      if (updates.status !== undefined) payload.status = updates.status;

      const { data, error } = await supabase
        .from('auto_campaigns')
        .update(payload)
        .eq('id', campaignId)
        .select()
        .single();

      if (error) throw error;

      return this.transformCampaign(data);
    } catch (error) {
      console.error('Failed to update campaign:', error);
      throw error;
    }
  }

  async activateCampaign(campaignId: string): Promise<AutoCampaign> {
    try {
      return await this.updateCampaign(campaignId, { status: 'active' });
    } catch (error) {
      console.error('Failed to activate campaign:', error);
      throw error;
    }
  }

  async pauseCampaign(campaignId: string): Promise<AutoCampaign> {
    try {
      return await this.updateCampaign(campaignId, { status: 'paused' });
    } catch (error) {
      console.error('Failed to pause campaign:', error);
      throw error;
    }
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('auto_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      analytics.track('auto_campaign_deleted', {
        campaignId
      });
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      throw error;
    }
  }

  async getActiveCampaigns(): Promise<AutoCampaign[]> {
    try {
      const { data, error } = await supabase
        .from('auto_campaigns')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => this.transformCampaign(item));
    } catch (error) {
      console.error('Failed to get active campaigns:', error);
      throw error;
    }
  }
}

export const autoCampaignService = new AutoCampaignService();
