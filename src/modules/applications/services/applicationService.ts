import { apiClient } from '../../../core/api';
import { analytics } from '../../../core/analytics';

export type OfferSourceType = 'direct' | 'influencer_card' | 'advertiser_card' | 'campaign';

export interface CreateOfferFromCardData {
  cardId: string;
  cardType: 'influencer' | 'advertiser';
  cardOwnerId: string;
  message: string;
  proposedRate: number;
  currency?: string;
  timeline: string;
  deliverables: string[];
  contentType?: string;
}

export interface OfferResponse {
  id: string;
  advertiserId: string;
  influencerId: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  contentType: string;
  deadline?: string;
  timeline?: string;
  deliverables?: string[];
  sourceType: OfferSourceType;
  sourceCardId?: string;
  campaignId?: string;
  initiatedBy?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  advertiser?: {
    id: string;
    fullName: string;
    username?: string;
    avatar?: string;
  };
  influencer?: {
    id: string;
    fullName: string;
    username?: string;
    avatar?: string;
  };
}

export class ApplicationService {
  async createApplication(data: CreateOfferFromCardData): Promise<OfferResponse> {
    try {
      const sourceType: OfferSourceType = data.cardType === 'influencer'
        ? 'influencer_card'
        : 'advertiser_card';

      const payload: Record<string, any> = {
        title: `Application for ${data.cardType} card`,
        description: data.message,
        amount: data.proposedRate,
        currency: data.currency || 'USD',
        contentType: data.contentType || 'collaboration',
        timeline: data.timeline,
        deliverables: data.deliverables,
        sourceType,
        sourceCardId: data.cardId,
      };

      if (data.cardType === 'influencer') {
        payload.influencerId = data.cardOwnerId;
      } else {
        payload.advertiserId = data.cardOwnerId;
      }

      const offer = await apiClient.post<OfferResponse>('/offers', payload);

      analytics.track('offer_created_from_card', {
        offer_id: offer.id,
        source_type: sourceType,
        card_id: data.cardId,
      });

      return offer;
    } catch (error) {
      console.error('Failed to create offer from card:', error);
      throw error;
    }
  }

  async getApplications(params?: { status?: string }): Promise<OfferResponse[]> {
    try {
      let queryString = '';
      if (params?.status) {
        queryString = `?status=${params.status}`;
      }
      const offers = await apiClient.get<OfferResponse[]>(`/offers${queryString}`);
      return Array.isArray(offers) ? offers : [];
    } catch (error) {
      console.error('Failed to get offers:', error);
      return [];
    }
  }

  async getApplication(offerId: string): Promise<OfferResponse> {
    try {
      return await apiClient.get<OfferResponse>(`/offers/${offerId}`);
    } catch (error) {
      console.error('Failed to get offer:', error);
      throw error;
    }
  }

  async acceptApplication(offerId: string): Promise<OfferResponse> {
    try {
      return await apiClient.post<OfferResponse>(`/offers/${offerId}/accept`);
    } catch (error) {
      console.error('Failed to accept offer:', error);
      throw error;
    }
  }

  async rejectApplication(offerId: string): Promise<OfferResponse> {
    try {
      return await apiClient.post<OfferResponse>(`/offers/${offerId}/decline`);
    } catch (error) {
      console.error('Failed to decline offer:', error);
      throw error;
    }
  }
}

export const applicationService = new ApplicationService();
