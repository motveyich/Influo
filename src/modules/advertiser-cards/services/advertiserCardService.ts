import { apiClient } from '../../../core/api';
import { AdvertiserCard } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class AdvertiserCardService {
  async createCard(cardData: Partial<AdvertiserCard>): Promise<AdvertiserCard> {
    try {
      this.validateCardData(cardData);

      const payload = {
        companyName: cardData.companyName,
        campaignTitle: cardData.campaignTitle,
        campaignDescription: cardData.campaignDescription,
        platform: cardData.platform,
        productCategories: cardData.productCategories,
        budget: cardData.budget,
        serviceFormat: cardData.serviceFormat,
        campaignDuration: cardData.campaignDuration,
        influencerRequirements: cardData.influencerRequirements,
        targetAudience: cardData.targetAudience,
        contactInfo: cardData.contactInfo,
      };

      const card = await apiClient.post<AdvertiserCard>('/advertiser-cards', payload);

      analytics.track('advertiser_card_created', {
        user_id: cardData.userId,
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

      const card = await apiClient.patch<AdvertiserCard>(`/advertiser-cards/${cardId}`, updates);

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
      return await apiClient.get<AdvertiserCard>(`/advertiser-cards/${cardId}`);
    } catch (error) {
      console.error('Failed to get advertiser card:', error);
      return null;
    }
  }

  async getMyCards(userId: string): Promise<AdvertiserCard[]> {
    try {
      const cards = await apiClient.get<AdvertiserCard[]>(`/advertiser-cards?userId=${userId}`);
      return Array.isArray(cards) ? cards : [];
    } catch (error) {
      console.error('Failed to get user cards:', error);
      return [];
    }
  }

  async getCards(filters?: any): Promise<AdvertiserCard[]> {
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
      console.log('Loading advertiser cards with query:', queryString);
      const cards = await apiClient.get<AdvertiserCard[]>(`/advertiser-cards${queryString}`);
      return Array.isArray(cards) ? cards : [];
    } catch (error) {
      console.error('Failed to get cards:', error);
      return [];
    }
  }

  async deleteCard(cardId: string): Promise<void> {
    try {
      await apiClient.delete(`/advertiser-cards/${cardId}`);

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
      return await apiClient.patch<AdvertiserCard>(`/advertiser-cards/${cardId}`, { isActive });
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
