import { supabase } from '../../../core/supabase';
import { apiClient } from '../../../core/apiClient';
import { showFeatureNotImplemented } from '../../../core/utils';
import { InfluencerCard } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class InfluencerCardService {
  async createCard(cardData: Partial<InfluencerCard>): Promise<InfluencerCard> {
    try {
      this.validateCardData(cardData);

      const payload = {
        user_id: cardData.userId,
        platform: cardData.platform,
        reach: cardData.reach,
        audience_demographics: cardData.audienceDemographics,
        service_details: cardData.serviceDetails,
        is_active: cardData.isActive !== undefined ? cardData.isActive : true,
      };

      const { data, error } = await supabase
        .from('influencer_cards')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      analytics.track('influencer_card_created', {
        user_id: cardData.userId,
        platform: cardData.platform,
        card_id: data.id
      });

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to create influencer card:', error);
      throw error;
    }
  }

  async updateCard(cardId: string, updates: Partial<InfluencerCard>): Promise<InfluencerCard> {
    try {
      this.validateCardData(updates, false);

      const payload = this.transformToApiPayload(updates);

      const { data, error } = await supabase
        .from('influencer_cards')
        .update(payload)
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;

      analytics.track('influencer_card_updated', {
        card_id: cardId,
        updated_fields: Object.keys(updates)
      });

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to update influencer card:', error);
      throw error;
    }
  }

  async getCard(cardId: string): Promise<InfluencerCard | null> {
    try {
      const { data, error } = await supabase
        .from('influencer_cards')
        .select('*')
        .eq('id', cardId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to get influencer card:', error);
      throw error;
    }
  }

  async getUserCards(userId: string): Promise<InfluencerCard[]> {
    try {
      const { data, error } = await supabase
        .from('influencer_cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(card => this.transformFromApi(card));
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
      let query = supabase.from('influencer_cards').select('*');

      if (filters?.platform && filters.platform !== 'all') {
        query = query.eq('platform', filters.platform);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.minFollowers) {
        query = query.gte('reach->>followers', filters.minFollowers);
      }

      if (filters?.maxFollowers) {
        query = query.lte('reach->>followers', filters.maxFollowers);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(card => this.transformFromApi(card));
    } catch (error) {
      console.error('Failed to get all cards:', error);
      throw error;
    }
  }

  async deleteCard(cardId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('influencer_cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

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
        .from('influencer_cards')
        .update({ is_active: isActive })
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;

      analytics.track('influencer_card_status_changed', {
        card_id: cardId,
        is_active: isActive
      });

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to toggle card status:', error);
      throw error;
    }
  }

  async getCardAnalytics(cardId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('influencer_cards')
        .select('rating, completed_campaigns')
        .eq('id', cardId)
        .maybeSingle();

      if (error) throw error;

      return data || { rating: 0, completed_campaigns: 0 };
    } catch (error) {
      console.error('Failed to get card analytics:', error);
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
        if (Object.values(cardData.serviceDetails.pricing).some(price => price < 0)) {
          errors.push('Pricing cannot be negative');
        }
      }

      if (cardData.serviceDetails.currency && !['RUB', 'USD', 'EUR'].includes(cardData.serviceDetails.currency)) {
        errors.push('Invalid currency');
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private transformFromApi(apiData: any): InfluencerCard {
    return {
      id: apiData.id,
      userId: apiData.userId || apiData.user_id,
      platform: apiData.platform,
      reach: apiData.reach,
      audienceDemographics: apiData.audienceDemographics || apiData.audience_demographics,
      serviceDetails: apiData.serviceDetails || apiData.service_details,
      rating: apiData.rating,
      completedCampaigns: apiData.completedCampaigns || apiData.completed_campaigns,
      isActive: apiData.isActive ?? apiData.is_active,
      lastUpdated: apiData.lastUpdated || apiData.last_updated,
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at,
      isDeleted: apiData.isDeleted || apiData.is_deleted || false,
      deletedAt: apiData.deletedAt || apiData.deleted_at,
      deletedBy: apiData.deletedBy || apiData.deleted_by
    } as any;
  }

  private transformToApiPayload(cardData: Partial<InfluencerCard>): any {
    const payload: any = {};

    if (cardData.platform) payload.platform = cardData.platform;
    if (cardData.reach) payload.reach = cardData.reach;
    if (cardData.audienceDemographics) payload.audience_demographics = cardData.audienceDemographics;
    if (cardData.serviceDetails) {
      payload.service_details = {
        ...cardData.serviceDetails,
        pricing: cardData.serviceDetails.pricing || {},
        currency: cardData.serviceDetails.currency || 'RUB'
      };
    }
    if (cardData.rating !== undefined) payload.rating = cardData.rating;
    if (cardData.completedCampaigns !== undefined) payload.completed_campaigns = cardData.completedCampaigns;
    if (cardData.isActive !== undefined) payload.is_active = cardData.isActive;

    return payload;
  }
}

export const influencerCardService = new InfluencerCardService();
