import { apiClient } from '../../../core/api';
import { InfluencerCard } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class InfluencerCardService {
  async createCard(cardData: Partial<InfluencerCard>): Promise<InfluencerCard> {
    try {
      this.validateCardData(cardData);

      const payload = {
        platform: cardData.platform,
        reach: cardData.reach,
        audienceDemographics: cardData.audienceDemographics,
        serviceDetails: cardData.serviceDetails,
      };

      const card = await apiClient.post<InfluencerCard>('/influencer-cards', payload);

      analytics.track('influencer_card_created', {
        user_id: cardData.userId,
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

      const card = await apiClient.patch<InfluencerCard>(`/influencer-cards/${cardId}`, updates);

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
      return await apiClient.get<InfluencerCard>(`/influencer-cards/${cardId}`);
    } catch (error) {
      console.error('Failed to get influencer card:', error);
      throw error;
    }
  }

  async getMyCards(userId: string): Promise<InfluencerCard[]> {
    try {
      const cards = await apiClient.get<InfluencerCard[]>(`/influencer-cards?userId=${userId}`);
      return Array.isArray(cards) ? cards : [];
    } catch (error) {
      console.error('Failed to get user cards:', error);
      return [];
    }
  }

  async getCards(filters?: any): Promise<InfluencerCard[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.keys(filters).forEach(key => {
          const value = filters[key];

          if (value === undefined || value === null || value === '') {
            return;
          }

          if (Array.isArray(value)) {
            if (value.length === 0) return;
            value.forEach(item => queryParams.append(key, String(item)));
          } else {
            queryParams.append(key, String(value));
          }
        });
      }
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      console.log('Loading influencer cards with query:', queryString);
      const cards = await apiClient.get<InfluencerCard[]>(`/influencer-cards${queryString}`);
      return Array.isArray(cards) ? cards : [];
    } catch (error) {
      console.error('Failed to get cards:', error);
      return [];
    }
  }

  async deleteCard(cardId: string): Promise<void> {
    try {
      await apiClient.delete(`/influencer-cards/${cardId}`);

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
      return await apiClient.patch<InfluencerCard>(`/influencer-cards/${cardId}`, { isActive });
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
