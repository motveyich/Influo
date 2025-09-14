import { supabase, TABLES } from '../../../core/supabase';
import { CollaborationOffer, OfferStatus, CollaborationStage } from '../../../core/types';
import { analytics } from '../../../core/analytics';
import { chatService } from '../../chat/services/chatService';

export class OfferService {
  async createOffer(offerData: Partial<CollaborationOffer>): Promise<CollaborationOffer> {
    try {
      this.validateOfferData(offerData);

      const newOffer = {
        influencer_id: offerData.influencerId,
        advertiser_id: offerData.advertiserId,
        campaign_id: offerData.campaignId || null,
        influencer_card_id: offerData.influencerCardId || null,
        title: offerData.title,
        description: offerData.description,
        proposed_rate: offerData.proposedRate,
        currency: offerData.currency || 'USD',
        deliverables: offerData.deliverables || [],
        timeline: offerData.timeline,
        status: 'pending',
        current_stage: 'pre_payment',
        metadata: offerData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.COLLABORATION_OFFERS)
        .insert([newOffer])
        .select()
        .single();

      if (error) throw error;

      const transformedOffer = this.transformFromDatabase(data);

      // Send notification to advertiser
      await this.sendOfferNotification(transformedOffer);

      // Track analytics
      analytics.track('collaboration_offer_created', {
        offer_id: transformedOffer.id,
        influencer_id: offerData.influencerId,
        advertiser_id: offerData.advertiserId,
        proposed_rate: offerData.proposedRate
      });

      return transformedOffer;
    } catch (error) {
      console.error('Failed to create offer:', error);
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
      // Get current offer to validate permissions
      const currentOffer = await this.getOffer(offerId);
      if (!currentOffer) {
        throw new Error('Offer not found');
      }

      // Validate permission to update status
      this.validateStatusChangePermission(currentOffer, newStatus, userId);

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Handle acceptance
      if (newStatus === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
        updateData.accepted_rate = additionalData?.acceptedRate || currentOffer.proposedRate;
        updateData.final_terms = additionalData?.finalTerms || {};
        updateData.current_stage = 'work_in_progress';
      }

      // Handle completion
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.current_stage = 'completed';
      }

      // Handle termination
      if (newStatus === 'terminated') {
        updateData.terminated_at = new Date().toISOString();
        updateData.termination_reason = additionalData?.reason || '';
        updateData.current_stage = 'completed';
      }

      const { data, error } = await supabase
        .from(TABLES.COLLABORATION_OFFERS)
        .update(updateData)
        .eq('id', offerId)
        .select()
        .single();

      if (error) throw error;

      const updatedOffer = this.transformFromDatabase(data);

      // Send status update notification
      await this.sendStatusUpdateNotification(updatedOffer, newStatus);

      // Track analytics
      analytics.track('collaboration_offer_status_updated', {
        offer_id: offerId,
        previous_status: currentOffer.status,
        new_status: newStatus,
        user_id: userId
      });

      return updatedOffer;
    } catch (error) {
      console.error('Failed to update offer status:', error);
      throw error;
    }
  }

  async getOffer(offerId: string): Promise<CollaborationOffer | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.COLLABORATION_OFFERS)
        .select('*')
        .eq('id', offerId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to get offer:', error);
      throw error;
    }
  }

  async getUserOffers(userId: string, type: 'sent' | 'received'): Promise<CollaborationOffer[]> {
    try {
      const column = type === 'sent' ? 'influencer_id' : 'advertiser_id';
      
      const { data, error } = await supabase
        .from(TABLES.COLLABORATION_OFFERS)
        .select('*')
        .eq(column, userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(offer => this.transformFromDatabase(offer));
    } catch (error) {
      console.error('Failed to get user offers:', error);
      throw error;
    }
  }

  async getOfferHistory(offerId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('offer_status_history')
        .select(`
          *,
          changed_by_profile:user_profiles!changed_by(full_name, avatar)
        `)
        .eq('offer_id', offerId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get offer history:', error);
      return [];
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

  private validateStatusChangePermission(offer: CollaborationOffer, newStatus: OfferStatus, userId: string): void {
    // Only advertiser can accept/decline offers
    if ((newStatus === 'accepted' || newStatus === 'declined') && userId !== offer.advertiserId) {
      throw new Error('Only advertiser can accept or decline offers');
    }

    // Only influencer can cancel offers before acceptance
    if (newStatus === 'cancelled' && offer.status === 'pending' && userId !== offer.influencerId) {
      throw new Error('Only influencer can cancel pending offers');
    }

    // Both parties can complete or terminate after acceptance
    if ((newStatus === 'completed' || newStatus === 'terminated') && 
        offer.status === 'in_progress' &&
        userId !== offer.influencerId && userId !== offer.advertiserId) {
      throw new Error('Only participants can complete or terminate offers');
    }

    // Validate status transitions
    this.validateStatusTransition(offer.status, newStatus);
  }

  private validateStatusTransition(currentStatus: OfferStatus, newStatus: OfferStatus): void {
    const validTransitions: Record<OfferStatus, OfferStatus[]> = {
      'pending': ['accepted', 'declined', 'cancelled'],
      'accepted': ['in_progress'],
      'declined': [], // Final state
      'in_progress': ['completed', 'terminated'],
      'completed': [], // Final state
      'terminated': [], // Final state
      'cancelled': [] // Final state
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  private async sendOfferNotification(offer: CollaborationOffer): Promise<void> {
    try {
      // Get influencer name
      const { data: influencerProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', offer.influencerId)
        .single();

      const influencerName = influencerProfile?.full_name || 'Инфлюенсер';
      
      await chatService.sendMessage({
        senderId: offer.influencerId,
        receiverId: offer.advertiserId,
        messageContent: `📋 Новое предложение о сотрудничестве от ${influencerName}: "${offer.title}"`,
        messageType: 'offer',
        metadata: {
          offerId: offer.id,
          actionType: 'offer_created',
          proposedRate: offer.proposedRate,
          timeline: offer.timeline
        }
      });
    } catch (error) {
      console.error('Failed to send offer notification:', error);
    }
  }

  private async sendStatusUpdateNotification(offer: CollaborationOffer, newStatus: OfferStatus): Promise<void> {
    try {
      const isInfluencerAction = offer.influencerId;
      const senderId = isInfluencerAction ? offer.advertiserId : offer.influencerId;
      const receiverId = isInfluencerAction ? offer.influencerId : offer.advertiserId;

      let messageContent = '';
      switch (newStatus) {
        case 'accepted':
          messageContent = `✅ Ваше предложение "${offer.title}" принято!`;
          break;
        case 'declined':
          messageContent = `❌ Предложение "${offer.title}" отклонено`;
          break;
        case 'completed':
          messageContent = `🎉 Сотрудничество "${offer.title}" успешно завершено!`;
          break;
        case 'terminated':
          messageContent = `⚠️ Сотрудничество "${offer.title}" расторгнуто: ${offer.terminationReason || 'Без указания причины'}`;
          break;
        case 'cancelled':
          messageContent = `🚫 Предложение "${offer.title}" отменено`;
          break;
        default:
          return;
      }

      await chatService.sendMessage({
        senderId,
        receiverId,
        messageContent,
        messageType: 'offer',
        metadata: {
          offerId: offer.id,
          actionType: `offer_${newStatus}`,
          newStatus
        }
      });
    } catch (error) {
      console.error('Failed to send status update notification:', error);
    }
  }

  private transformFromDatabase(dbData: any): CollaborationOffer {
    return {
      id: dbData.id,
      influencerId: dbData.influencer_id,
      advertiserId: dbData.advertiser_id,
      campaignId: dbData.campaign_id,
      influencerCardId: dbData.influencer_card_id,
      title: dbData.title,
      description: dbData.description,
      proposedRate: parseFloat(dbData.proposed_rate),
      currency: dbData.currency,
      deliverables: dbData.deliverables || [],
      timeline: dbData.timeline,
      status: dbData.status,
      currentStage: dbData.current_stage,
      acceptedAt: dbData.accepted_at,
      acceptedRate: dbData.accepted_rate ? parseFloat(dbData.accepted_rate) : undefined,
      finalTerms: dbData.final_terms || {},
      completedAt: dbData.completed_at,
      terminatedAt: dbData.terminated_at,
      terminationReason: dbData.termination_reason,
      influencerReviewed: dbData.influencer_reviewed,
      advertiserReviewed: dbData.advertiser_reviewed,
      metadata: dbData.metadata || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }
}

export const offerService = new OfferService();