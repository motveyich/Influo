import { supabase } from '../../../core/supabase';
import { AdvertiserCard } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class AdvertiserCardService {
  private transformCard(data: any): AdvertiserCard {
    return {
      id: data.id,
      oderedAt: data.ordered_at,
      userId: data.user_id,
      companyName: data.company_name,
      campaignTitle: data.campaign_title,
      campaignDescription: data.campaign_description,
      platform: data.platform,
      productCategories: data.product_categories,
      budget: data.budget,
      serviceFormat: data.service_format,
      campaignDuration: data.campaign_duration,
      influencerRequirements: data.influencer_requirements,
      targetAudience: data.target_audience,
      contactInfo: data.contact_info,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      user: data.user_profiles ? {
        id: data.user_profiles.user_id,
        fullName: data.user_profiles.full_name,
        avatar: data.user_profiles.avatar_url,
        email: data.user_profiles.email,
        rating: data.user_profiles.rating,
        reviewsCount: data.user_profiles.reviews_count,
      } : undefined,
    };
  }

  async createCard(cardData: Partial<AdvertiserCard>): Promise<AdvertiserCard> {
    try {
      this.validateCardData(cardData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('advertiser_cards')
        .insert({
          user_id: user.id,
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
          is_active: true,
        })
        .select(`*, user_profiles(user_id, full_name, avatar_url, email, rating, reviews_count)`)
        .single();

      if (error) throw error;

      const card = this.transformCard(data);

      analytics.track('advertiser_card_created', {
        user_id: user.id,
        company_name: cardData.companyName,
        card_id: card.id
      });

      return card;
    } catch (error) {
      console.error('Failed to create advertiser card:', error);
      throw error;
    }
  }

  async updateCard(cardId: string, updates: Partial<AdvertiserCard>): Promise<AdvertiserCard> {
    try {
      this.validateCardData(updates, false);

      const payload: any = { updated_at: new Date().toISOString() };

      if (updates.companyName !== undefined) payload.company_name = updates.companyName;
      if (updates.campaignTitle !== undefined) payload.campaign_title = updates.campaignTitle;
      if (updates.campaignDescription !== undefined) payload.campaign_description = updates.campaignDescription;
      if (updates.platform !== undefined) payload.platform = updates.platform;
      if (updates.productCategories !== undefined) payload.product_categories = updates.productCategories;
      if (updates.budget !== undefined) payload.budget = updates.budget;
      if (updates.serviceFormat !== undefined) payload.service_format = updates.serviceFormat;
      if (updates.campaignDuration !== undefined) payload.campaign_duration = updates.campaignDuration;
      if (updates.influencerRequirements !== undefined) payload.influencer_requirements = updates.influencerRequirements;
      if (updates.targetAudience !== undefined) payload.target_audience = updates.targetAudience;
      if (updates.contactInfo !== undefined) payload.contact_info = updates.contactInfo;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;

      const { data, error } = await supabase
        .from('advertiser_cards')
        .update(payload)
        .eq('id', cardId)
        .select(`*, user_profiles(user_id, full_name, avatar_url, email, rating, reviews_count)`)
        .single();

      if (error) throw error;

      const card = this.transformCard(data);

      analytics.track('advertiser_card_updated', {
        card_id: cardId,
        updated_fields: Object.keys(updates)
      });

      return card;
    } catch (error) {
      console.error('Failed to update advertiser card:', error);
      throw error;
    }
  }

  async getCard(cardId: string): Promise<AdvertiserCard | null> {
    try {
      const { data, error } = await supabase
        .from('advertiser_cards')
        .select(`*, user_profiles(user_id, full_name, avatar_url, email, rating, reviews_count)`)
        .eq('id', cardId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformCard(data);
    } catch (error) {
      console.error('Failed to get advertiser card:', error);
      return null;
    }
  }

  async getMyCards(userId: string): Promise<AdvertiserCard[]> {
    try {
      const { data, error } = await supabase
        .from('advertiser_cards')
        .select(`*, user_profiles(user_id, full_name, avatar_url, email, rating, reviews_count)`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => this.transformCard(item));
    } catch (error) {
      console.error('Failed to get user cards:', error);
      throw error;
    }
  }

  async getCards(filters?: any): Promise<AdvertiserCard[]> {
    try {
      let query = supabase
        .from('advertiser_cards')
        .select(`*, user_profiles(user_id, full_name, avatar_url, email, rating, reviews_count)`)
        .eq('is_active', true);

      if (filters?.platform) {
        query = query.eq('platform', filters.platform);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(item => this.transformCard(item));
    } catch (error) {
      console.error('Failed to get cards:', error);
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
      const result = await this.updateCard(cardId, { isActive });
      if (!result) throw new Error('Card not found');
      return result;
    } catch (error) {
      console.error('Failed to toggle card status:', error);
      throw error;
    }
  }

  private validateCardData(cardData: Partial<AdvertiserCard>, requireAll: boolean = true): void {
    if (requireAll) {
      if (!cardData.companyName || !cardData.campaignTitle || !cardData.campaignDescription) {
        throw new Error('Company name, campaign title, and description are required');
      }
    }
  }
}

export const advertiserCardService = new AdvertiserCardService();
