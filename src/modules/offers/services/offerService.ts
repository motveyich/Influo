import { database } from '../../../core/database';
import { apiClient } from '../../../core/apiClient';
import { showFeatureNotImplemented } from '../../../core/utils';
import { CollaborationOffer, OfferStatus, CollaborationStage } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class OfferService {
  async createOffer(offerData: Partial<CollaborationOffer>): Promise<CollaborationOffer> {
    try {
      this.validateOfferData(offerData);

      const payload = {
        influencerId: offerData.influencerId,
        advertiserId: offerData.advertiserId,
        influencerCardId: offerData.influencerCardId,
        campaignId: offerData.campaignId,
        initiatedBy: offerData.initiatedBy || offerData.influencerId,
        title: offerData.title,
        description: offerData.description,
        proposedRate: offerData.proposedRate,
        currency: offerData.currency || 'RUB',
        deliverables: offerData.deliverables || [],
        timeline: offerData.timeline,
        metadata: offerData.metadata || {},
      };

      const { data, error } = await apiClient.post<any>('/offers', payload);

      if (error) throw new Error(error.message);

      analytics.track('collaboration_offer_created', {
        offer_id: data.id,
        influencer_id: offerData.influencerId,
        advertiser_id: offerData.advertiserId,
        proposed_rate: offerData.proposedRate
      });

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to create offer:', error);
      throw error;
    }
  }

  async createOfferFromApplication(offerData: {
    influencerId: string;
    advertiserId: string;
    applicationId: string;
    applicantId: string;
    title: string;
    description: string;
    proposedRate: number;
    currency: string;
    deliverables: string[];
    timeline: string;
    metadata?: Record<string, any>;
  }): Promise<CollaborationOffer> {
    try {
      const payload = {
        influencerId: offerData.influencerId,
        advertiserId: offerData.advertiserId,
        initiatedBy: offerData.applicantId,
        title: offerData.title,
        description: offerData.description,
        proposedRate: offerData.proposedRate,
        currency: offerData.currency,
        deliverables: offerData.deliverables,
        timeline: offerData.timeline,
        metadata: {
          ...offerData.metadata,
          createdFromApplication: true,
          applicationId: offerData.applicationId
        },
      };

      const { data, error } = await apiClient.post<any>('/offers', payload);

      if (error) throw new Error(error.message);

      analytics.track('collaboration_offer_auto_created', {
        offer_id: data.id,
        application_id: offerData.applicationId,
        influencer_id: offerData.influencerId,
        advertiser_id: offerData.advertiserId
      });

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to create offer from application:', error);
      throw error;
    }
  }

  async updateOfferStatus(
    offerId: string,
    newStatus: OfferStatus,
    userId: string,
    additionalData?: any
  ): Promise<CollaborationOffer> {
    try {
      let endpoint = '';
      let payload: any = { userId };

      switch (newStatus) {
        case 'accepted':
          endpoint = `/offers/${offerId}/accept`;
          payload.acceptedRate = additionalData?.acceptedRate;
          payload.finalTerms = additionalData?.finalTerms;
          break;
        case 'declined':
          endpoint = `/offers/${offerId}/decline`;
          break;
        case 'in_progress':
          endpoint = `/offers/${offerId}/in-progress`;
          break;
        case 'completed':
          endpoint = `/offers/${offerId}/complete`;
          break;
        case 'terminated':
          endpoint = `/offers/${offerId}/terminate`;
          payload.reason = additionalData?.reason;
          break;
        case 'cancelled':
          endpoint = `/offers/${offerId}/cancel`;
          break;
        default:
          endpoint = `/offers/${offerId}`;
          payload.status = newStatus;
      }

      const { data, error } = await apiClient.post<any>(endpoint, payload);

      if (error) throw new Error(error.message);

      analytics.track('collaboration_offer_status_updated', {
        offer_id: offerId,
        new_status: newStatus,
        user_id: userId
      });

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to update offer status:', error);
      throw error;
    }
  }

  async getOffer(offerId: string): Promise<CollaborationOffer | null> {
    try {
      const { data, error } = await apiClient.get<any>(`/offers/${offerId}`);

      if (error) {
        if (error.status === 404) return null;
        throw new Error(error.message);
      }

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to get offer:', error);
      throw error;
    }
  }

  async getOfferById(offerId: string): Promise<CollaborationOffer | null> {
    return this.getOffer(offerId);
  }

  async getOffersByParticipant(userId: string): Promise<CollaborationOffer[]> {
    try {
      const { data, error } = await apiClient.get<any[]>(`/offers?participantId=${userId}`);

      if (error) throw new Error(error.message);

      return (data || []).map(offer => this.transformFromApi(offer));
    } catch (error) {
      console.error('Failed to get offers by participant:', error);
      throw error;
    }
  }

  async getOffersByCampaign(campaignId: string): Promise<CollaborationOffer[]> {
    try {
      const { data, error } = await apiClient.get<any[]>(`/offers?campaignId=${campaignId}`);

      if (error) throw new Error(error.message);

      return (data || []).map(offer => this.transformFromApi(offer));
    } catch (error) {
      console.error('Failed to get offers by campaign:', error);
      throw error;
    }
  }

  async getUserProfile(userId: string): Promise<any> {
    try {
      const { data, error } = await apiClient.get<any>(`/profiles/${userId}`);

      if (error) throw new Error(error.message);

      return data;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  async getOfferHistory(offerId: string): Promise<any[]> {
    try {
      const { data, error } = await apiClient.get<any[]>(`/offers/${offerId}/history`);

      if (error) throw new Error(error.message);

      return data || [];
    } catch (error) {
      console.error('Failed to get offer history:', error);
      return [];
    }
  }

  async confirmOfferTerms(offerId: string): Promise<void> {
    try {
      const { error } = await apiClient.post(`/offers/${offerId}/confirm-terms`);

      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Failed to confirm offer terms:', error);
      throw error;
    }
  }

  async createAutoCampaignOffer(offerData: {
    autoCampaignId: string;
    influencerId: string;
    advertiserId: string;
    title: string;
    description: string;
    proposedRate: number;
    currency: string;
    deliverables: string[];
    timeline: string;
    platform: string;
    contentType: string;
    enableChat: boolean;
  }): Promise<CollaborationOffer> {
    try {
      const payload = {
        influencerId: offerData.influencerId,
        advertiserId: offerData.advertiserId,
        initiatedBy: offerData.influencerId,
        title: offerData.title,
        description: offerData.description,
        proposedRate: offerData.proposedRate,
        currency: offerData.currency,
        deliverables: offerData.deliverables,
        timeline: offerData.timeline,
        platform: offerData.platform,
        contentType: offerData.contentType,
        metadata: {
          sourceType: 'auto_campaign',
          autoCampaignId: offerData.autoCampaignId,
          enableChat: offerData.enableChat,
          createdFromAutoCampaign: true
        },
      };

      const { data, error } = await apiClient.post<any>('/offers', payload);

      if (error) throw new Error(error.message);

      analytics.track('auto_campaign_offer_created', {
        offer_id: data.id,
        auto_campaign_id: offerData.autoCampaignId,
        influencer_id: offerData.influencerId,
        advertiser_id: offerData.advertiserId,
        proposed_rate: offerData.proposedRate
      });

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to create auto-campaign offer:', error);
      throw error;
    }
  }

  private validateOfferData(offerData: Partial<CollaborationOffer>): void {
    const errors: string[] = [];

    if (!offerData.influencerId) errors.push('Influencer ID is required');
    if (!offerData.advertiserId) errors.push('Advertiser ID is required');
    if (offerData.influencerId === offerData.advertiserId) errors.push('Cannot create offer to yourself');
    if (!offerData.title?.trim()) errors.push('Title is required');
    if (!offerData.description?.trim()) errors.push('Description is required');
    if (!offerData.proposedRate || offerData.proposedRate <= 0) errors.push('Valid proposed rate is required');
    if (!offerData.timeline?.trim()) errors.push('Timeline is required');
    if (!offerData.deliverables || offerData.deliverables.length === 0) errors.push('At least one deliverable is required');

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private transformFromApi(apiData: any): CollaborationOffer {
    const details = apiData.details || {};
    return {
      offer_id: apiData.offerId || apiData.offer_id || apiData.id,
      id: apiData.offerId || apiData.offer_id || apiData.id,
      influencerId: apiData.influencerId || apiData.influencer_id,
      advertiserId: apiData.advertiserId || apiData.advertiser_id,
      campaignId: apiData.campaignId || apiData.campaign_id,
      influencerCardId: apiData.influencerCardId || apiData.influencer_card_id,
      autoCampaignId: apiData.autoCampaignId || apiData.auto_campaign_id,
      initiatedBy: apiData.initiatedBy || apiData.initiated_by,
      title: apiData.title || details.title || '',
      description: apiData.description || details.description || '',
      proposedRate: apiData.proposedRate ? parseFloat(apiData.proposedRate) : (apiData.proposed_rate ? parseFloat(apiData.proposed_rate) : parseFloat(details.proposed_rate || 0)),
      currency: apiData.currency || details.currency || 'RUB',
      deliverables: apiData.deliverables || details.deliverables || [],
      timeline: apiData.timeline || details.timeline || '',
      platform: apiData.platform || details.platform,
      integrationType: apiData.integrationType || details.integrationType,
      contentType: apiData.contentType || details.contentType,
      suggestedBudget: apiData.suggestedBudget ? parseFloat(apiData.suggestedBudget) : undefined,
      status: apiData.status,
      currentStage: apiData.currentStage || apiData.current_stage || 'negotiation',
      acceptedAt: apiData.acceptedAt || details.accepted_at,
      acceptedRate: apiData.acceptedRate ? parseFloat(apiData.acceptedRate) : (details.accepted_rate ? parseFloat(details.accepted_rate) : undefined),
      finalTerms: apiData.finalTerms || apiData.final_terms || {},
      completedAt: apiData.completedAt || details.completed_at,
      terminatedAt: apiData.terminatedAt || details.terminated_at,
      terminationReason: apiData.terminationReason || details.termination_reason,
      influencerReviewed: apiData.influencerReviewed || apiData.influencer_reviewed || false,
      advertiserReviewed: apiData.advertiserReviewed || apiData.advertiser_reviewed || false,
      influencerResponse: apiData.influencerResponse || apiData.influencer_response || 'pending',
      advertiserResponse: apiData.advertiserResponse || apiData.advertiser_response || 'pending',
      metadata: apiData.metadata || {},
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at
    };
  }
}

export const offerService = new OfferService();
