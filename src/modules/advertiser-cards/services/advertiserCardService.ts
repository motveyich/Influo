import { supabase } from '../../../core/supabase';
import { apiClient } from '../../../core/apiClient';
import { showFeatureNotImplemented } from '../../../core/utils';
import { AdvertiserCard } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class AdvertiserCardService {
  async createCard(cardData: Partial<AdvertiserCard>): Promise<AdvertiserCard> {
    try {
      this.validateCardData(cardData);

      const payload = {
        user_id: cardData.userId,
        company_name: cardData.companyName,
        campaign_title: cardData.campaignTitle,
        campaign_description: cardData.campaignDescription,
        platform: cardData.platform,
        product_categories: cardData.productCategories,
        budget: cardData.budget,
        service_format: cardData.serviceFormat,
        campaign_duration: cardData.campaignDuration,
        influencer_requirements: cardData.influencerRequirements,
        target_audience: cardData.targetAudience,
        contact_info: cardData.contactInfo,
        is_active: cardData.isActive !== undefined ? cardData.isActive : true,
      };

      const { data, error } = await supabase
        .from('advertiser_cards')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      analytics.track('advertiser_card_created', {
        user_id: cardData.userId,
        company_name: cardData.companyName,
        card_id: data.id
      });

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to create advertiser card:', error);
      throw error;
    }
  }

  async updateCard(cardId: string, updates: Partial<AdvertiserCard>): Promise<AdvertiserCard> {
    try {
      this.validateCardData(updates, false);

      const payload = this.transformToApiPayload(updates);

      const { data, error } = await supabase
        .from('advertiser_cards')
        .update(payload)
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;

      analytics.track('advertiser_card_updated', {
        card_id: cardId,
        updated_fields: Object.keys(updates)
      });

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to update advertiser card:', error);
      throw error;
    }
  }

  async getCard(cardId: string): Promise<AdvertiserCard | null> {
    try {
      const { data, error } = await supabase
        .from('advertiser_cards')
        .select('*')
        .eq('id', cardId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to get advertiser card:', error);
      throw error;
    }
  }

  async getUserCards(userId: string): Promise<AdvertiserCard[]> {
    try {
      const { data, error } = await supabase
        .from('advertiser_cards')
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
    minBudget?: number;
    maxBudget?: number;
    productCategories?: string[];
    serviceFormats?: string[];
    searchQuery?: string;
    isActive?: boolean;
  }): Promise<AdvertiserCard[]> {
    try {
      let query = supabase.from('advertiser_cards').select('*');

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.platform && filters.platform !== 'all') {
        query = query.eq('platform', filters.platform);
      }

      if (filters?.minBudget) {
        query = query.gte('budget->>amount', filters.minBudget);
      }

      if (filters?.maxBudget) {
        query = query.lte('budget->>amount', filters.maxBudget);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(card => this.transformFromApi(card));
    } catch (error) {
      console.error('Failed to get all advertiser cards:', error);
      throw error;
    }
  }

  async deleteCard(cardId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('advertiser_cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      analytics.track('advertiser_card_deleted', {
        card_id: cardId
      });
    } catch (error) {
      console.error('Failed to delete advertiser card:', error);
      throw error;
    }
  }

  async toggleCardStatus(cardId: string, isActive: boolean): Promise<AdvertiserCard> {
    try {
      const { data, error } = await supabase
        .from('advertiser_cards')
        .update({ is_active: isActive })
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;

      analytics.track('advertiser_card_status_changed', {
        card_id: cardId,
        is_active: isActive
      });

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to toggle card status:', error);
      throw error;
    }
  }

  private validateCardData(cardData: Partial<AdvertiserCard>, isCreate: boolean = true): void {
    const errors: string[] = [];

    if (isCreate) {
      if (!cardData.userId) errors.push('User ID is required');
      if (!cardData.companyName?.trim()) errors.push('Company name is required');
      if (!cardData.campaignTitle?.trim()) errors.push('Campaign title is required');
    }

    if (cardData.campaignDescription && cardData.campaignDescription.trim().length < 20) {
      errors.push('Campaign description must be at least 20 characters');
    }

    if (cardData.productCategories && cardData.productCategories.length === 0) {
      errors.push('At least one product category is required');
    }

    if (cardData.budget) {
      if (!cardData.budget.amount || cardData.budget.amount <= 0) {
        errors.push('Valid budget amount is required');
      }
    }

    if (cardData.serviceFormat && cardData.serviceFormat.length === 0) {
      errors.push('At least one service format is required');
    }

    if (cardData.contactInfo) {
      if (!cardData.contactInfo.email?.trim()) {
        errors.push('Contact email is required');
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private transformFromApi(apiData: any): AdvertiserCard {
    return {
      id: apiData.id,
      userId: apiData.userId || apiData.user_id,
      companyName: apiData.companyName || apiData.company_name,
      campaignTitle: apiData.campaignTitle || apiData.campaign_title,
      campaignDescription: apiData.campaignDescription || apiData.campaign_description,
      platform: apiData.platform,
      productCategories: apiData.productCategories || apiData.product_categories || [],
      budget: apiData.budget,
      serviceFormat: apiData.serviceFormat || apiData.service_format,
      campaignDuration: apiData.campaignDuration || apiData.campaign_duration,
      influencerRequirements: apiData.influencerRequirements || apiData.influencer_requirements,
      targetAudience: apiData.targetAudience || apiData.target_audience || { interests: [] },
      contactInfo: apiData.contactInfo || apiData.contact_info,
      campaignStats: apiData.campaignStats || apiData.campaign_stats,
      isActive: apiData.isActive ?? apiData.is_active,
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at
    };
  }

  private transformToApiPayload(cardData: Partial<AdvertiserCard>): any {
    const payload: any = {};

    if (cardData.companyName) payload.company_name = cardData.companyName;
    if (cardData.campaignTitle) payload.campaign_title = cardData.campaignTitle;
    if (cardData.campaignDescription) payload.campaign_description = cardData.campaignDescription;
    if (cardData.platform) payload.platform = cardData.platform;
    if (cardData.productCategories) payload.product_categories = cardData.productCategories;
    if (cardData.budget) payload.budget = cardData.budget;
    if (cardData.serviceFormat) payload.service_format = cardData.serviceFormat;
    if (cardData.campaignDuration) payload.campaign_duration = cardData.campaignDuration;
    if (cardData.influencerRequirements) payload.influencer_requirements = cardData.influencerRequirements;
    if (cardData.targetAudience) payload.target_audience = cardData.targetAudience;
    if (cardData.contactInfo) payload.contact_info = cardData.contactInfo;
    if (cardData.isActive !== undefined) payload.is_active = cardData.isActive;

    return payload;
  }
}

export const advertiserCardService = new AdvertiserCardService();
