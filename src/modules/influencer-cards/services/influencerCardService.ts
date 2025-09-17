import { supabase, TABLES } from '../../../core/supabase';
import { InfluencerCard } from '../../../core/types';
import { analytics } from '../../../core/analytics';
import { moderationService } from '../../../services/moderationService';

export class InfluencerCardService {
  async createCard(cardData: Partial<InfluencerCard>): Promise<InfluencerCard> {
    try {
      // Validate required fields
      this.validateCardData(cardData);

      const newCard = {
        user_id: cardData.userId,
        platform: cardData.platform,
        reach: cardData.reach,
        audience_demographics: cardData.audienceDemographics,
        service_details: cardData.serviceDetails,
        rating: 0,
        completed_campaigns: 0,
        is_active: true,
        moderation_status: 'pending',
        is_deleted: false,
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.INFLUENCER_CARDS)
        .insert([newCard])
        .select()
        .single();

      if (error) throw error;

      // Check content for violations
      const description = cardData.serviceDetails?.description || '';
      const violations = await moderationService.checkContentForViolations(description, 'influencer_card');
      
      if (violations.shouldFlag) {
        await moderationService.addToModerationQueue('influencer_card', data.id, {
          auto_flagged: true,
          filter_matches: violations.matches,
          priority: Math.max(...violations.matches.map(m => m.severity))
        });
      } else {
        // Auto-approve if no violations
        await supabase
          .from(TABLES.INFLUENCER_CARDS)
          .update({ moderation_status: 'approved' })
          .eq('id', data.id);
      }

      // Track card creation
      analytics.track('influencer_card_created', {
        user_id: cardData.userId,
        platform: cardData.platform,
        card_id: data.id
      });

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to create influencer card:', error);
      throw error;
    }
  }

  async updateCard(cardId: string, updates: Partial<InfluencerCard>): Promise<InfluencerCard> {
    try {
      // Validate updates
      this.validateCardData(updates, false);

      const updateData = {
        ...this.transformToDatabase(updates),
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.INFLUENCER_CARDS)
        .update(updateData)
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;

      // Track card update
      analytics.track('influencer_card_updated', {
        card_id: cardId,
        updated_fields: Object.keys(updates)
      });

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to update influencer card:', error);
      throw error;
    }
  }

  async getCard(cardId: string): Promise<InfluencerCard | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.INFLUENCER_CARDS)
        .select('*')
        .eq('id', cardId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to get influencer card:', error);
      throw error;
    }
  }

  async getUserCards(userId: string): Promise<InfluencerCard[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.INFLUENCER_CARDS)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(card => this.transformFromDatabase(card));
    } catch (error) {
      console.error('Failed to get user cards:', error);
      throw error;
    }
  }

  async getAllCards(filters?: {
    platform?: string;
    minFollowers?: number;
    maxFollowers?: number;
    countries?: string[];
    searchQuery?: string;
    isActive?: boolean;
  }): Promise<InfluencerCard[]> {
    try {
      let query = supabase
        .from(TABLES.INFLUENCER_CARDS)
        .select('*')
        .eq('is_deleted', false)
        .in('moderation_status', ['approved', 'pending']);

      if (filters?.platform && filters.platform !== 'all') {
        query = query.eq('platform', filters.platform);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.minFollowers) {
        query = query.gte('reach->followers', filters.minFollowers);
      }

      if (filters?.maxFollowers) {
        query = query.lte('reach->followers', filters.maxFollowers);
      }

      if (filters?.countries && filters.countries.length > 0) {
        query = query.overlaps('audience_demographics->topCountries', filters.countries);
      }

      if (filters?.searchQuery) {
        query = query.or(`service_details->description.ilike.%${filters.searchQuery}%,audience_demographics->interests.cs.["${filters.searchQuery}"]`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return data.map(card => this.transformFromDatabase(card));
    } catch (error) {
      console.error('Failed to get all cards:', error);
      throw error;
    }
  }

  async deleteCard(cardId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.INFLUENCER_CARDS)
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      // Track card deletion
      analytics.track('influencer_card_deleted', {
        card_id: cardId
      });
    } catch (error) {
      console.error('Failed to delete influencer card:', error);
      throw error;
    }
  }

  async toggleCardStatus(cardId: string, isActive: boolean): Promise<InfluencerCard> {
    try {
      const { data, error } = await supabase
        .from(TABLES.INFLUENCER_CARDS)
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;

      // Track status change
      analytics.track('influencer_card_status_changed', {
        card_id: cardId,
        is_active: isActive
      });

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to toggle card status:', error);
      throw error;
    }
  }

  private validateCardData(cardData: Partial<InfluencerCard>, isCreate: boolean = true): void {
    const errors: string[] = [];

    if (isCreate) {
      if (!cardData.userId) errors.push('User ID is required');
      if (!cardData.platform) errors.push('Platform is required');
    }

    if (cardData.reach) {
      if (!cardData.reach.followers || cardData.reach.followers < 0) {
        errors.push('Valid follower count is required');
      }
      if (cardData.reach.engagementRate !== undefined && 
          (cardData.reach.engagementRate < 0 || cardData.reach.engagementRate > 100)) {
        errors.push('Engagement rate must be between 0 and 100');
      }
    }

    if (cardData.serviceDetails) {
      if (!cardData.serviceDetails.contentTypes || cardData.serviceDetails.contentTypes.length === 0) {
        errors.push('At least one content type is required');
      }
      if (!cardData.serviceDetails.description || cardData.serviceDetails.description.trim().length < 10) {
        errors.push('Service description must be at least 10 characters');
      }
      if (cardData.serviceDetails.pricing) {
        const pricing = cardData.serviceDetails.pricing;
        if (Object.values(pricing).some(price => price < 0)) {
          errors.push('Pricing cannot be negative');
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private transformFromDatabase(dbData: any): InfluencerCard {
    return {
      id: dbData.id,
      userId: dbData.user_id,
      platform: dbData.platform,
      reach: dbData.reach,
      audienceDemographics: dbData.audience_demographics,
      serviceDetails: dbData.service_details,
      rating: dbData.rating,
      completedCampaigns: dbData.completed_campaigns,
      isActive: dbData.is_active,
      lastUpdated: dbData.last_updated,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }

  private transformToDatabase(cardData: Partial<InfluencerCard>): any {
    const dbData: any = {};
    
    if (cardData.platform) dbData.platform = cardData.platform;
    if (cardData.reach) dbData.reach = cardData.reach;
    if (cardData.audienceDemographics) dbData.audience_demographics = cardData.audienceDemographics;
    if (cardData.serviceDetails) dbData.service_details = cardData.serviceDetails;
    if (cardData.rating !== undefined) dbData.rating = cardData.rating;
    if (cardData.completedCampaigns !== undefined) dbData.completed_campaigns = cardData.completedCampaigns;
    if (cardData.isActive !== undefined) dbData.is_active = cardData.isActive;

    return dbData;
  }
}

export const influencerCardService = new InfluencerCardService();