import { supabase } from '../../../core/supabase';
import { showFeatureNotImplemented } from '../../../core/utils';
import { InfluencerCard } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class InfluencerCardService {
  async createCard(cardData: Partial<InfluencerCard>): Promise<InfluencerCard> {
    try {
      this.validateCardData(cardData);

      const payload = {
        userId: cardData.userId,
        platform: cardData.platform,
        reach: cardData.reach,
        audienceDemographics: cardData.audienceDemographics,
        serviceDetails: cardData.serviceDetails,
      };

      const { data, error } = await apiClient.post<any>('/influencer-cards', payload);

      if (error) throw new Error(error.message);

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

      const { data, error } = await apiClient.patch<any>(`/influencer-cards/${cardId}`, payload);

      if (error) throw new Error(error.message);

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
      const { data, error } = await apiClient.get<any>(`/influencer-cards/${cardId}`);

      if (error) {
        if (error.status === 404) return null;
        throw new Error(error.message);
      }

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to get influencer card:', error);
      throw error;
    }
  }

  async getUserCards(userId: string): Promise<InfluencerCard[]> {
    try {
      const { data, error } = await apiClient.get<any[]>(`/influencer-cards?userId=${userId}`);

      if (error) throw new Error(error.message);

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
      const params = new URLSearchParams();

      if (filters?.platform && filters.platform !== 'all') {
        params.append('platform', filters.platform);
      }
      if (filters?.isActive !== undefined) {
        params.append('isActive', String(filters.isActive));
      }
      if (filters?.minFollowers) {
        params.append('minFollowers', String(filters.minFollowers));
      }
      if (filters?.maxFollowers) {
        params.append('maxFollowers', String(filters.maxFollowers));
      }
      if (filters?.countries && filters.countries.length > 0) {
        params.append('countries', filters.countries.join(','));
      }
      if (filters?.searchQuery) {
        params.append('search', filters.searchQuery);
      }

      const queryString = params.toString();
      const endpoint = queryString ? `/influencer-cards?${queryString}` : '/influencer-cards';

      const { data, error } = await apiClient.get<any[]>(endpoint);

      if (error) throw new Error(error.message);

      return (data || []).map(card => this.transformFromApi(card));
    } catch (error) {
      console.error('Failed to get all cards:', error);
      throw error;
    }
  }

  async deleteCard(cardId: string): Promise<void> {
    try {
      const { error } = await apiClient.delete(`/influencer-cards/${cardId}`);

      if (error) throw new Error(error.message);

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
      const { data, error } = await apiClient.patch<any>(`/influencer-cards/${cardId}`, {
        isActive
      });

      if (error) throw new Error(error.message);

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
      const { data, error } = await apiClient.get<any>(`/influencer-cards/${cardId}/analytics`);

      if (error) throw new Error(error.message);

      return data;
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
    if (cardData.audienceDemographics) payload.audienceDemographics = cardData.audienceDemographics;
    if (cardData.serviceDetails) {
      payload.serviceDetails = {
        ...cardData.serviceDetails,
        pricing: cardData.serviceDetails.pricing || {},
        currency: cardData.serviceDetails.currency || 'RUB'
      };
    }
    if (cardData.rating !== undefined) payload.rating = cardData.rating;
    if (cardData.completedCampaigns !== undefined) payload.completedCampaigns = cardData.completedCampaigns;
    if (cardData.isActive !== undefined) payload.isActive = cardData.isActive;

    return payload;
  }
}

export const influencerCardService = new InfluencerCardService();
