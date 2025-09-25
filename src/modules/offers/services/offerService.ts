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
        influencer_card_id: offerData.influencerCardId || null,
        campaign_id: offerData.campaignId || null,
        initiated_by: offerData.initiatedBy || offerData.influencerId, // По умолчанию инициатор - инфлюенсер
        details: {
          title: offerData.title,
          description: offerData.description,
          proposed_rate: offerData.proposedRate,
          currency: offerData.currency || 'USD',
          deliverables: offerData.deliverables || [],
          timeline: offerData.timeline
        },
        status: 'pending',
        current_stage: 'negotiation',
        influencer_response: 'pending',
        advertiser_response: 'pending',
        final_terms: '{}',
        timeline: {},
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

  async createOfferFromApplication(offerData: {
    influencerId: string;
    advertiserId: string;
    applicationId: string;
    title: string;
    description: string;
    proposedRate: number;
    currency: string;
    deliverables: string[];
    timeline: string;
    metadata?: Record<string, any>;
  }): Promise<CollaborationOffer> {
    try {
      // Create offer with pending status
      const newOffer = {
        influencer_id: offerData.influencerId,
        advertiser_id: offerData.advertiserId,
        initiated_by: offerData.influencerId, // Инфлюенсер инициирует через заявку
        details: {
          title: offerData.title,
          description: offerData.description,
          proposed_rate: offerData.proposedRate,
          currency: offerData.currency,
          deliverables: offerData.deliverables,
          timeline: offerData.timeline
        },
        status: 'pending',
        current_stage: 'negotiation',
        influencer_response: 'pending',
        advertiser_response: 'pending',
        final_terms: '{}',
        timeline: {},
        metadata: {
          ...offerData.metadata,
          createdFromApplication: true,
          applicationId: offerData.applicationId
        },
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

      // Track analytics
      analytics.track('collaboration_offer_auto_created', {
        offer_id: transformedOffer.id,
        application_id: offerData.applicationId,
        influencer_id: offerData.influencerId,
        advertiser_id: offerData.advertiserId
      });

      return transformedOffer;
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

      // Get current details to merge with updates
      const { data: currentData } = await supabase
        .from(TABLES.COLLABORATION_OFFERS)
        .select('details')
        .eq('id', offerId)
        .single();

      const currentDetails = currentData?.details || {};

      // Handle acceptance
      if (newStatus === 'accepted') {
        updateData.details = {
          ...currentDetails,
          accepted_at: new Date().toISOString(),
          accepted_rate: additionalData?.acceptedRate || currentOffer.proposedRate,
          final_terms: additionalData?.finalTerms || {}
        };
        
        // Обновляем поля ответов в зависимости от того, кто принимает
        if (userId === currentOffer.influencerId) {
          updateData.influencer_response = 'accepted';
        } else if (userId === currentOffer.advertiserId) {
          updateData.advertiser_response = 'accepted';
        }
        
        // Переводим в статус "в работе" если обе стороны согласились
        updateData.current_stage = 'work';
      }

      // Handle completion
      if (newStatus === 'completed') {
        updateData.details = {
          ...currentDetails,
          completed_at: new Date().toISOString()
        };
        updateData.current_stage = 'completion';
      }

      // Handle termination
      if (newStatus === 'terminated') {
        updateData.details = {
          ...currentDetails,
          terminated_at: new Date().toISOString(),
          termination_reason: additionalData?.reason || ''
        };
      }
      
      // Handle decline
      if (newStatus === 'declined') {
        if (userId === currentOffer.influencerId) {
          updateData.influencer_response = 'declined';
        } else if (userId === currentOffer.advertiserId) {
          updateData.advertiser_response = 'declined';
        }
      }

      const { data, error } = await supabase
        .from('offers')
        .update(updateData)
        .eq('offer_id', offerId)
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
        .from('offers')
        .select('*')
        .eq('offer_id', offerId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to get offer:', error);
      throw error;
    }
  }

  async getOffersByParticipant(userId: string): Promise<CollaborationOffer[]> {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .or(`influencer_id.eq.${userId},advertiser_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(offer => this.transformFromDatabase(offer));
    } catch (error) {
      console.error('Failed to get offers by participant:', error);
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
    // Получатель предложения может принять/отклонить
    if (newStatus === 'accepted' || newStatus === 'declined') {
      // Определяем, кто является получателем на основе инициатора
      const isInfluencerInitiated = offer.influencerId === (offer as any).initiated_by;
      const receiver = isInfluencerInitiated ? offer.advertiserId : offer.influencerId;
      
      if (userId !== receiver) {
        throw new Error('Only the receiver can accept or decline offers');
      }
    }

    // Инициатор может отменить предложение до принятия
    if (newStatus === 'cancelled' && offer.status === 'pending') {
      if (userId !== (offer as any).initiated_by) {
        throw new Error('Only the initiator can cancel pending offers');
      }
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
    const details = dbData.details || {};
    return {
      id: dbData.offer_id,
      influencerId: dbData.influencer_id,
      advertiserId: dbData.advertiser_id,
      campaignId: dbData.campaign_id,
      initiatedBy: dbData.initiated_by,
      title: details.title || '',
      description: details.description || '',
      proposedRate: parseFloat(details.proposed_rate || 0),
      currency: details.currency || 'USD',
      deliverables: details.deliverables || [],
      timeline: details.timeline || '',
      status: dbData.status,
      currentStage: dbData.current_stage || 'negotiation',
      acceptedAt: details.accepted_at,
      acceptedRate: details.accepted_rate ? parseFloat(details.accepted_rate) : undefined,
      finalTerms: dbData.final_terms || {},
      completedAt: details.completed_at,
      terminatedAt: details.terminated_at,
      terminationReason: details.termination_reason,
      influencerReviewed: dbData.influencer_reviewed || false,
      advertiserReviewed: dbData.advertiser_reviewed || false,
      influencerResponse: dbData.influencer_response || 'pending',
      advertiserResponse: dbData.advertiser_response || 'pending',
      metadata: dbData.metadata || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }
}

export const offerService = new OfferService();