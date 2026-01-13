import { apiClient } from '../../../core/api';
import { CollaborationOffer, OfferStatus, CollaborationStage } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class OfferService {
  async createOffer(offerData: Partial<CollaborationOffer>): Promise<CollaborationOffer> {
    try {
      this.validateOfferData(offerData);

      const payload = {
        influencerId: offerData.influencerId,
        advertiserId: offerData.advertiserId,
        influencerCardId: offerData.influencerCardId || null,
        campaignId: offerData.campaignId || null,
        initiatedBy: offerData.initiatedBy || offerData.influencerId,
        title: offerData.title,
        description: offerData.description,
        proposedRate: offerData.proposedRate,
        currency: offerData.currency || 'USD',
        deliverables: offerData.deliverables || [],
        timeline: offerData.timeline,
        metadata: offerData.metadata || {},
      };

      const offer = await apiClient.post<CollaborationOffer>('/offers', payload);

      analytics.track('collaboration_offer_created', {
        offer_id: offer.id,
        influencer_id: offerData.influencerId,
        advertiser_id: offerData.advertiserId,
        proposed_rate: offerData.proposedRate
      });

      return offer;
    } catch (error) {
      console.error('Failed to create offer:', error);
      throw error;
    }
  }

  async getOffers(params?: { status?: string; asInfluencer?: boolean }): Promise<CollaborationOffer[]> {
    try {
      let queryString = '';
      if (params) {
        const queryParams = new URLSearchParams();
        if (params.status) queryParams.append('status', params.status);
        if (params.asInfluencer !== undefined) queryParams.append('asInfluencer', String(params.asInfluencer));
        queryString = `?${queryParams.toString()}`;
      }

      return await apiClient.get<CollaborationOffer[]>(`/offers${queryString}`);
    } catch (error) {
      console.error('Failed to get offers:', error);
      throw error;
    }
  }

  async getOffersByParticipant(userId: string): Promise<CollaborationOffer[]> {
    try {
      console.log('[OfferService] Loading offers for participant:', userId);
      const offers = await apiClient.get<CollaborationOffer[]>(`/offers/participant/${userId}`);
      console.log('[OfferService] Loaded offers:', offers);
      return offers;
    } catch (error) {
      console.error('[OfferService] Failed to get offers by participant:', error);
      throw error;
    }
  }

  async getOffer(offerId: string): Promise<CollaborationOffer> {
    try {
      return await apiClient.get<CollaborationOffer>(`/offers/${offerId}`);
    } catch (error) {
      console.error('Failed to get offer:', error);
      throw error;
    }
  }

  async updateOffer(offerId: string, updates: Partial<CollaborationOffer>): Promise<CollaborationOffer> {
    try {
      return await apiClient.patch<CollaborationOffer>(`/offers/${offerId}`, updates);
    } catch (error) {
      console.error('Failed to update offer:', error);
      throw error;
    }
  }

  async acceptOffer(offerId: string): Promise<CollaborationOffer> {
    try {
      return await apiClient.post<CollaborationOffer>(`/offers/${offerId}/accept`);
    } catch (error) {
      console.error('Failed to accept offer:', error);
      throw error;
    }
  }

  async declineOffer(offerId: string): Promise<CollaborationOffer> {
    try {
      return await apiClient.post<CollaborationOffer>(`/offers/${offerId}/decline`);
    } catch (error) {
      console.error('Failed to decline offer:', error);
      throw error;
    }
  }

  async markInProgress(offerId: string): Promise<CollaborationOffer> {
    try {
      return await apiClient.post<CollaborationOffer>(`/offers/${offerId}/in-progress`);
    } catch (error) {
      console.error('Failed to mark offer in progress:', error);
      throw error;
    }
  }

  async markCompleted(offerId: string): Promise<CollaborationOffer> {
    try {
      return await apiClient.post<CollaborationOffer>(`/offers/${offerId}/complete`);
    } catch (error) {
      console.error('Failed to mark offer completed:', error);
      throw error;
    }
  }

  async cancelOffer(offerId: string): Promise<CollaborationOffer> {
    try {
      return await apiClient.post<CollaborationOffer>(`/offers/${offerId}/cancel`);
    } catch (error) {
      console.error('Failed to cancel offer:', error);
      throw error;
    }
  }

  async terminateOffer(offerId: string): Promise<CollaborationOffer> {
    try {
      return await apiClient.post<CollaborationOffer>(`/offers/${offerId}/terminate`);
    } catch (error) {
      console.error('Failed to terminate offer:', error);
      throw error;
    }
  }

  async getOfferHistory(offerId: string): Promise<any[]> {
    try {
      return await apiClient.get<any[]>(`/offers/${offerId}/history`);
    } catch (error) {
      console.error('Failed to get offer history:', error);
      return [];
    }
  }

  async updateOfferStatus(
    offerId: string,
    newStatus: OfferStatus,
    userId: string,
    additionalData?: any
  ): Promise<CollaborationOffer> {
    try {
      switch (newStatus) {
        case 'accepted':
          return await this.acceptOffer(offerId);

        case 'declined':
          return await this.declineOffer(offerId);

        case 'cancelled':
          return await this.cancelOffer(offerId);

        case 'in_progress':
          return await this.markInProgress(offerId);

        case 'completed':
          return await this.markCompleted(offerId);

        case 'terminated':
          return await this.terminateOffer(offerId);

        default:
          throw new Error(`Unsupported status transition: ${newStatus}`);
      }
    } catch (error) {
      console.error(`Failed to update offer status to ${newStatus}:`, error);
      throw error;
    }
  }

  private validateOfferData(offerData: Partial<CollaborationOffer>): void {
    if (!offerData.influencerId || !offerData.advertiserId) {
      throw new Error('Influencer ID and Advertiser ID are required');
    }
    if (!offerData.title || !offerData.description) {
      throw new Error('Title and description are required');
    }
    if (!offerData.proposedRate || offerData.proposedRate <= 0) {
      throw new Error('Proposed rate must be greater than 0');
    }
  }
}

export const offerService = new OfferService();
