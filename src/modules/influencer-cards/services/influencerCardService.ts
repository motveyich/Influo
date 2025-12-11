import { supabase } from '../../../core/supabase';
import { InfluencerCard } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class InfluencerCardService {
  private transformCard(data: any): InfluencerCard {
    return {
      id: data.id,
      oderedAt: data.ordered_at,
      userId: data.user_id,
      platform: data.platform,
      reach: data.reach,
      audienceDemographics: data.audience_demographics,
      serviceDetails: data.service_details,
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

  async createCard(cardData: Partial<InfluencerCard>): Promise<InfluencerCard> {
    try {
      this.validateCardData(cardData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('influencer_cards')
        .insert({
          user_id: user.id,
          platform: cardData.platform,
          reach: cardData.reach,
          audience_demographics: cardData.audienceDemographics,
          service_details: cardData.serviceDetails,
          is_active: true,
        })
        .select(`*, user_profiles(user_id, full_name, avatar_url, email, rating, reviews_count)`)
        .single();

      if (error) throw error;

      const card = this.transformCard(data);

      analytics.track('influencer_card_created', {
        user_id: user.id,
        platform: cardData.platform,
        card_id: card.id
      });

      return card;
    } catch (error) {
      console.error('Failed to create influencer card:', error);
      throw error;
    }
  }

  async updateCard(cardId: string, updates: Partial<InfluencerCard>): Promise<InfluencerCard> {
    try {
      this.validateCardData(updates, false);

      const payload: any = { updated_at: new Date().toISOString() };

      if (updates.platform !== undefined) payload.platform = updates.platform;
      if (updates.reach !== undefined) payload.reach = updates.reach;
      if (updates.audienceDemographics !== undefined) payload.audience_demographics = updates.audienceDemographics;
      if (updates.serviceDetails !== undefined) payload.service_details = updates.serviceDetails;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;

      const { data, error } = await supabase
        .from('influencer_cards')
        .update(payload)
        .eq('id', cardId)
        .select(`*, user_profiles(user_id, full_name, avatar_url, email, rating, reviews_count)`)
        .single();

      if (error) throw error;

      const card = this.transformCard(data);

      analytics.track('influencer_card_updated', {
        card_id: cardId,
        updated_fields: Object.keys(updates)
      });

      return card;
    } catch (error) {
      console.error('Failed to update influencer card:', error);
      throw error;
    }
  }

  async getCard(cardId: string): Promise<InfluencerCard> {
    try {
      const { data, error } = await supabase
        .from('influencer_cards')
        .select(`*, user_profiles(user_id, full_name, avatar_url, email, rating, reviews_count)`)
        .eq('id', cardId)
        .single();

      if (error) throw error;

      return this.transformCard(data);
    } catch (error) {
      console.error('Failed to get influencer card:', error);
      throw error;
    }
  }

  async getMyCards(userId: string): Promise<InfluencerCard[]> {
    try {
      const { data, error } = await supabase
        .from('influencer_cards')
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

  async getCards(filters?: any): Promise<InfluencerCard[]> {
    try {
      let query = supabase
        .from('influencer_cards')
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
      return await this.updateCard(cardId, { isActive });
    } catch (error) {
      console.error('Failed to toggle card status:', error);
      throw error;
    }
  }

  private validateCardData(cardData: Partial<InfluencerCard>, requireAll: boolean = true): void {
    if (requireAll) {
      if (!cardData.platform || !cardData.reach || !cardData.serviceDetails) {
        throw new Error('Platform, reach, and service details are required');
      }
    }
  }
}

export const influencerCardService = new InfluencerCardService();
