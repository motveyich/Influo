import { supabase } from '../../../core/supabase';
import { CollaborationOffer, OfferStatus, CollaborationStage } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class OfferService {
  private transformOffer(data: any): CollaborationOffer {
    const details = data.details || {};
    return {
      id: data.offer_id,
      influencerId: data.influencer_id,
      advertiserId: data.advertiser_id,
      influencerCardId: details.influencer_card_id,
      campaignId: data.campaign_id,
      initiatedBy: details.initiated_by || data.advertiser_id,
      title: details.title || 'Предложение о сотрудничестве',
      description: details.description || '',
      proposedRate: details.proposed_rate || 0,
      acceptedRate: details.accepted_rate,
      currency: details.currency || 'USD',
      status: data.status,
      deliverables: details.deliverables || [],
      timeline: data.timeline || {},
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      advertiser: data.advertiser_profile ? {
        id: data.advertiser_profile.user_id,
        fullName: data.advertiser_profile.full_name,
        avatar: data.advertiser_profile.avatar,
        email: data.advertiser_profile.email,
      } : undefined,
      influencer: data.influencer_profile ? {
        id: data.influencer_profile.user_id,
        fullName: data.influencer_profile.full_name,
        avatar: data.influencer_profile.avatar,
        email: data.influencer_profile.email,
      } : undefined,
    };
  }

  async createOffer(offerData: Partial<CollaborationOffer>): Promise<CollaborationOffer> {
    try {
      this.validateOfferData(offerData);

      const details = {
        influencer_card_id: offerData.influencerCardId || null,
        initiated_by: offerData.initiatedBy || offerData.advertiserId,
        title: offerData.title,
        description: offerData.description,
        proposed_rate: offerData.proposedRate,
        currency: offerData.currency || 'USD',
        deliverables: offerData.deliverables || [],
      };

      const { data, error } = await supabase
        .from('offers')
        .insert({
          influencer_id: offerData.influencerId,
          advertiser_id: offerData.advertiserId,
          campaign_id: offerData.campaignId || null,
          details,
          timeline: offerData.timeline || {},
          metadata: offerData.metadata || {},
          status: 'pending',
        })
        .select(`
          *,
          advertiser_profile:user_profiles!offers_advertiser_id_fkey(user_id, full_name, avatar, email),
          influencer_profile:user_profiles!offers_influencer_id_fkey(user_id, full_name, avatar, email)
        `)
        .single();

      if (error) throw error;

      const offer = this.transformOffer(data);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('offers')
        .select(`
          *,
          advertiser_profile:user_profiles!offers_advertiser_id_fkey(user_id, full_name, avatar, email),
          influencer_profile:user_profiles!offers_influencer_id_fkey(user_id, full_name, avatar, email)
        `);

      if (params?.asInfluencer) {
        query = query.eq('influencer_id', user.id);
      } else {
        query = query.eq('advertiser_id', user.id);
      }

      if (params?.status) {
        query = query.eq('status', params.status);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(item => this.transformOffer(item));
    } catch (error) {
      console.error('Failed to get offers:', error);
      throw error;
    }
  }

  async getOffersByParticipant(userId: string): Promise<CollaborationOffer[]> {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          advertiser_profile:user_profiles!offers_advertiser_id_fkey(user_id, full_name, avatar, email),
          influencer_profile:user_profiles!offers_influencer_id_fkey(user_id, full_name, avatar, email)
        `)
        .or(`influencer_id.eq.${userId},advertiser_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => this.transformOffer(item));
    } catch (error) {
      console.error('Failed to get offers by participant:', error);
      throw error;
    }
  }

  async getOffer(offerId: string): Promise<CollaborationOffer> {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          advertiser_profile:user_profiles!offers_advertiser_id_fkey(user_id, full_name, avatar, email),
          influencer_profile:user_profiles!offers_influencer_id_fkey(user_id, full_name, avatar, email)
        `)
        .eq('offer_id', offerId)
        .single();

      if (error) throw error;

      return this.transformOffer(data);
    } catch (error) {
      console.error('Failed to get offer:', error);
      throw error;
    }
  }

  async updateOffer(offerId: string, updates: Partial<CollaborationOffer>): Promise<CollaborationOffer> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('offers')
        .select('details')
        .eq('offer_id', offerId)
        .single();

      if (fetchError) throw fetchError;

      const currentDetails = existing?.details || {};
      const newDetails = { ...currentDetails };

      if (updates.title !== undefined) newDetails.title = updates.title;
      if (updates.description !== undefined) newDetails.description = updates.description;
      if (updates.proposedRate !== undefined) newDetails.proposed_rate = updates.proposedRate;
      if (updates.currency !== undefined) newDetails.currency = updates.currency;
      if (updates.deliverables !== undefined) newDetails.deliverables = updates.deliverables;

      const payload: any = {
        details: newDetails,
        updated_at: new Date().toISOString()
      };

      if (updates.timeline !== undefined) payload.timeline = updates.timeline;
      if (updates.metadata !== undefined) payload.metadata = updates.metadata;

      const { data, error } = await supabase
        .from('offers')
        .update(payload)
        .eq('offer_id', offerId)
        .select(`
          *,
          advertiser_profile:user_profiles!offers_advertiser_id_fkey(user_id, full_name, avatar, email),
          influencer_profile:user_profiles!offers_influencer_id_fkey(user_id, full_name, avatar, email)
        `)
        .single();

      if (error) throw error;

      return this.transformOffer(data);
    } catch (error) {
      console.error('Failed to update offer:', error);
      throw error;
    }
  }

  private async updateStatus(offerId: string, status: string): Promise<CollaborationOffer> {
    const { data, error } = await supabase
      .from('offers')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('offer_id', offerId)
      .select(`
        *,
        advertiser_profile:user_profiles!offers_advertiser_id_fkey(user_id, full_name, avatar, email),
        influencer_profile:user_profiles!offers_influencer_id_fkey(user_id, full_name, avatar, email)
      `)
      .single();

    if (error) throw error;

    return this.transformOffer(data);
  }

  async acceptOffer(offerId: string): Promise<CollaborationOffer> {
    try {
      return await this.updateStatus(offerId, 'accepted');
    } catch (error) {
      console.error('Failed to accept offer:', error);
      throw error;
    }
  }

  async declineOffer(offerId: string): Promise<CollaborationOffer> {
    try {
      return await this.updateStatus(offerId, 'declined');
    } catch (error) {
      console.error('Failed to decline offer:', error);
      throw error;
    }
  }

  async markInProgress(offerId: string): Promise<CollaborationOffer> {
    try {
      return await this.updateStatus(offerId, 'in_progress');
    } catch (error) {
      console.error('Failed to mark offer in progress:', error);
      throw error;
    }
  }

  async markCompleted(offerId: string): Promise<CollaborationOffer> {
    try {
      return await this.updateStatus(offerId, 'completed');
    } catch (error) {
      console.error('Failed to mark offer completed:', error);
      throw error;
    }
  }

  async cancelOffer(offerId: string): Promise<CollaborationOffer> {
    try {
      return await this.updateStatus(offerId, 'cancelled');
    } catch (error) {
      console.error('Failed to cancel offer:', error);
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
