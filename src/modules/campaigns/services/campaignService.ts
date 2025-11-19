import { supabase, TABLES } from '../../../core/supabase';
import { Campaign } from '../../../core/types';
import { analytics } from '../../../core/analytics';
import { moderationService } from '../../../services/moderationService';

export class CampaignService {
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
        status: campaignData.status || 'draft',
        enable_chat: campaignData.enableChat || false,
        timeline: campaignData.timeline,
        moderation_status: 'pending',
        is_deleted: false,
        metrics: {
          applicants: 0,
          accepted: 0,
          impressions: 0,
          engagement: 0
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.CAMPAIGNS)
        .insert([newCampaign])
        .select()
        .single();

      if (error) throw error;

      // Check content for violations
      const content = `${campaignData.title} ${campaignData.description}`;
      const violations = await moderationService.checkContentForViolations(content, 'campaign');
      
      if (violations.shouldFlag) {
        await moderationService.addToModerationQueue('campaign', data.campaign_id, {
          auto_flagged: true,
          filter_matches: violations.matches,
          priority: Math.max(...violations.matches.map(m => m.severity))
        });
      } else {
        // Auto-approve if no violations
        await supabase
          .from(TABLES.CAMPAIGNS)
          .update({ moderation_status: 'approved' })
          .eq('campaign_id', data.campaign_id);
      }

      // Track campaign creation
      analytics.trackCampaignCreated(data.campaign_id, campaignData.advertiserId!);

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to create campaign:', error);
      throw error;
    }
  }

  async updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign> {
    try {
      // Validate updates
      this.validateCampaignData(updates, false);

      const updateData = {
        ...this.transformToDatabase(updates),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.CAMPAIGNS)
        .update(updateData)
        .eq('campaign_id', campaignId)
        .select()
        .single();

      if (error) throw error;

      // Track campaign update
      analytics.track('campaign_updated', {
        campaign_id: campaignId,
        updated_fields: Object.keys(updates)
      });

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to update campaign:', error);
      throw error;
    }
  }

  async getCampaign(campaignId: string): Promise<Campaign | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.CAMPAIGNS)
        .select('*')
        .eq('campaign_id', campaignId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to get campaign:', error);
      throw error;
    }
  }

  async getAdvertiserCampaigns(advertiserId: string): Promise<Campaign[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.CAMPAIGNS)
        .select('*')
        .eq('advertiser_id', advertiserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(campaign => this.transformFromDatabase(campaign));
    } catch (error) {
      console.error('Failed to get advertiser campaigns:', error);
      throw error;
    }
  }

  async getAllCampaigns(filters?: {
    status?: string;
    platform?: string;
    minBudget?: number;
    maxBudget?: number;
    searchQuery?: string;
  }): Promise<Campaign[]> {
    try {
      let query = supabase
        .from(TABLES.CAMPAIGNS)
        .select('*')
        .eq('is_deleted', false)
        .in('moderation_status', ['approved', 'pending']);

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.minBudget) {
        query = query.gte('budget->min', filters.minBudget);
      }

      if (filters?.maxBudget) {
        query = query.lte('budget->max', filters.maxBudget);
      }

      if (filters?.platform && filters.platform !== 'all') {
        query = query.contains('preferences->platforms', [filters.platform]);
      }

      if (filters?.searchQuery) {
        query = query.or(`title.ilike.%${filters.searchQuery}%,brand.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return data.map(campaign => this.transformFromDatabase(campaign));
    } catch (error) {
      console.error('Failed to get all campaigns:', error);
      throw error;
    }
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.CAMPAIGNS)
        .delete()
        .eq('campaign_id', campaignId);

      if (error) throw error;

      // Track campaign deletion
      analytics.track('campaign_deleted', {
        campaign_id: campaignId
      });
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      throw error;
    }
  }

  async findMatchingInfluencers(campaignId: string): Promise<any[]> {
    try {
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) throw new Error('Campaign not found');

      const { preferences } = campaign;
      
      let query = supabase
        .from(TABLES.INFLUENCER_CARDS)
        .select('*')
        .eq('is_active', true);

      // Filter by platform
      if (preferences.platforms && preferences.platforms.length > 0) {
        query = query.in('platform', preferences.platforms);
      }

      // Filter by audience size
      if (preferences.audienceSize) {
        if (preferences.audienceSize.min) {
          query = query.gte('reach->followers', preferences.audienceSize.min);
        }
        if (preferences.audienceSize.max) {
          query = query.lte('reach->followers', preferences.audienceSize.max);
        }
      }

      // Filter by countries
      if (preferences.demographics?.countries && preferences.demographics.countries.length > 0) {
        query = query.overlaps('audience_demographics->topCountries', preferences.demographics.countries);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;

      // Track matching search
      analytics.track('influencer_matching_performed', {
        campaign_id: campaignId,
        matches_found: data.length,
        criteria: preferences
      });

      return data || [];
    } catch (error) {
      console.error('Failed to find matching influencers:', error);
      throw error;
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

    if (campaignData.preferences) {
      if (!campaignData.preferences.platforms || campaignData.preferences.platforms.length === 0) {
        errors.push('At least one platform must be selected');
      }
      if (!campaignData.preferences.contentTypes || campaignData.preferences.contentTypes.length === 0) {
        errors.push('At least one content type must be selected');
      }
    }

    if (campaignData.timeline) {
      const startDate = new Date(campaignData.timeline.startDate);
      const endDate = new Date(campaignData.timeline.endDate);
      
      if (startDate >= endDate) {
        errors.push('End date must be after start date');
      }
      
      if (startDate < new Date()) {
        errors.push('Start date cannot be in the past');
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
      enableChat: dbData.enable_chat || false,
      timeline: dbData.timeline,
      metrics: dbData.metrics,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }

  private transformToDatabase(campaignData: Partial<Campaign>): any {
    const dbData: any = {};

    if (campaignData.title) dbData.title = campaignData.title;
    if (campaignData.description) dbData.description = campaignData.description;
    if (campaignData.brand) dbData.brand = campaignData.brand;
    if (campaignData.budget) dbData.budget = campaignData.budget;
    if (campaignData.preferences) dbData.preferences = campaignData.preferences;
    if (campaignData.status) dbData.status = campaignData.status;
    if (campaignData.enableChat !== undefined) dbData.enable_chat = campaignData.enableChat;
    if (campaignData.timeline) dbData.timeline = campaignData.timeline;
    if (campaignData.metrics) dbData.metrics = campaignData.metrics;

    return dbData;
  }
}

export const campaignService = new CampaignService();