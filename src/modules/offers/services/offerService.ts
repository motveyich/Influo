import { supabase, TABLES } from '../../../core/supabase';
import { CollaborationOffer, OfferStatus, CollaborationStage } from '../../../core/types';
import { analytics } from '../../../core/analytics';
import { chatService } from '../../chat/services/chatService';
import { blacklistService } from '../../../services/blacklistService';
import { rateLimitService } from '../../../services/rateLimitService';

export class OfferService {
  async createOffer(offerData: Partial<CollaborationOffer>): Promise<CollaborationOffer> {
    try {
      this.validateOfferData(offerData);

      // Check blacklist
      const isBlacklisted = await blacklistService.isBlacklisted(
        offerData.initiatedBy || offerData.influencerId!,
        offerData.initiatedBy === offerData.influencerId ? offerData.advertiserId! : offerData.influencerId!
      );
      if (isBlacklisted) {
        throw new Error('Вы не можете взаимодействовать с этим пользователем');
      }

      // Check rate limit
      const rateLimitCheck = await rateLimitService.canInteract(
        offerData.initiatedBy || offerData.influencerId!,
        offerData.initiatedBy === offerData.influencerId ? offerData.advertiserId! : offerData.influencerId!
      );
      if (!rateLimitCheck.allowed) {
        throw new Error(`Предложение уже отправлено этому пользователю. Попробуйте через ${rateLimitCheck.remainingMinutes} мин.`);
      }

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
        .from(TABLES.OFFERS)
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

      // Record rate limit interaction
      try {
        const targetUserId = offerData.initiatedBy === offerData.influencerId ? offerData.advertiserId! : offerData.influencerId!;
        await rateLimitService.recordInteraction(
          targetUserId,
          'manual_offer',
          offerData.influencerCardId,
          offerData.campaignId
        );
      } catch (rateLimitError) {
        console.error('Failed to record rate limit:', rateLimitError);
      }

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
      // Create offer with pending status
      const newOffer = {
        influencer_id: offerData.influencerId,
        advertiser_id: offerData.advertiserId,
        initiated_by: offerData.applicantId, // Заявитель является инициатором
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
        .from(TABLES.OFFERS)
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

      // Проверяем статус автокампании перед принятием оффера
      if (newStatus === 'accepted' && currentOffer.autoCampaignId) {
        await this.validateCampaignStatus(currentOffer.autoCampaignId);
      }

      // Validate permission to update status
      this.validateStatusChangePermission(currentOffer, newStatus, userId);

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Get current details to merge with updates
      const { data: currentData } = await supabase
        .from(TABLES.OFFERS)
        .select('details')
        .eq('offer_id', offerId)
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

      // Update auto-campaign stats if this offer belongs to a campaign
      if (data.auto_campaign_id) {
        const { autoCampaignService } = await import('../../auto-campaigns/services/autoCampaignService');
        await autoCampaignService.updateCampaignStats(data.auto_campaign_id);
      }

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

  async getOfferById(offerId: string): Promise<CollaborationOffer | null> {
    return this.getOffer(offerId);
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

    // Инициатор или инфлюенсер может отменить предложение до принятия
    if (newStatus === 'cancelled' && offer.status === 'pending') {
      const initiatedBy = (offer as any).initiated_by;
      // Разрешаем отмену инициатору или инфлюенсеру (для автоофферов)
      if (userId !== initiatedBy && userId !== offer.influencerId) {
        throw new Error('Only the initiator or influencer can cancel pending offers');
      }
    }

    // Both parties can complete or terminate after acceptance or in progress
    if ((newStatus === 'completed' || newStatus === 'terminated') &&
        (offer.status === 'accepted' || offer.status === 'in_progress') &&
        userId !== offer.influencerId && userId !== offer.advertiserId) {
      throw new Error('Only participants can complete or terminate offers');
    }

    // Validate status transitions
    this.validateStatusTransition(offer.status, newStatus);
  }

  private validateStatusTransition(currentStatus: OfferStatus, newStatus: OfferStatus): void {
    const validTransitions: Record<OfferStatus, OfferStatus[]> = {
      'pending': ['accepted', 'declined', 'cancelled'],
      'accepted': ['in_progress', 'completed', 'terminated'],
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
      offer_id: dbData.offer_id,
      id: dbData.offer_id,
      influencerId: dbData.influencer_id,
      advertiserId: dbData.advertiser_id,
      campaignId: dbData.campaign_id,
      influencerCardId: dbData.influencer_card_id,
      initiatedBy: dbData.initiated_by,
      title: details.title || '',
      description: details.description || '',
      proposedRate: dbData.proposed_rate ? parseFloat(dbData.proposed_rate) : parseFloat(details.proposed_rate || 0),
      currency: dbData.currency || details.currency || 'RUB',
      deliverables: details.deliverables || [],
      timeline: typeof dbData.timeline === 'object' && dbData.timeline
        ? `${new Date(dbData.timeline.startDate || dbData.timeline.start_date).toLocaleDateString('ru-RU')} - ${new Date(dbData.timeline.endDate || dbData.timeline.end_date).toLocaleDateString('ru-RU')}`
        : (details.timeline || ''),
      platform: details.platform || dbData.metadata?.platform,
      integrationType: details.integrationType || dbData.metadata?.chosenIntegration,
      contentType: details.contentType,
      suggestedBudget: details.suggestedBudget ? parseFloat(details.suggestedBudget) : undefined,
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

  async confirmOfferTerms(offerId: string): Promise<void> {
    try {
      const { data: currentData } = await supabase
        .from(TABLES.OFFERS)
        .select('details')
        .eq('offer_id', offerId)
        .single();

      const currentDetails = currentData?.details || {};

      const { error } = await supabase
        .from(TABLES.OFFERS)
        .update({
          details: {
            ...currentDetails,
            terms_confirmed_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('offer_id', offerId);

      if (error) throw error;
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
      // Check blacklist
      const isBlacklisted = await blacklistService.isBlacklisted(
        offerData.influencerId,
        offerData.advertiserId
      );
      if (isBlacklisted) {
        throw new Error('Вы не можете взаимодействовать с этим рекламодателем');
      }

      // Check rate limit for auto-campaigns
      const rateLimitCheck = await rateLimitService.canInteract(
        offerData.influencerId,
        offerData.advertiserId
      );
      if (!rateLimitCheck.allowed) {
        throw new Error(`Предложение уже отправлено этому рекламодателю. Попробуйте через ${rateLimitCheck.remainingMinutes} мин.`);
      }

      // Check if user already applied to this auto-campaign
      const { data: existingOffer } = await supabase
        .from(TABLES.OFFERS)
        .select('offer_id')
        .eq('influencer_id', offerData.influencerId)
        .eq('advertiser_id', offerData.advertiserId)
        .contains('metadata', { autoCampaignId: offerData.autoCampaignId })
        .single();

      if (existingOffer) {
        throw new Error('Вы уже откликнулись на эту автокампанию');
      }

      const newOffer = {
        influencer_id: offerData.influencerId,
        advertiser_id: offerData.advertiserId,
        initiated_by: offerData.influencerId,
        details: {
          title: offerData.title,
          description: offerData.description,
          proposed_rate: offerData.proposedRate,
          currency: offerData.currency,
          deliverables: offerData.deliverables,
          timeline: offerData.timeline,
          platform: offerData.platform,
          contentType: offerData.contentType
        },
        status: 'pending',
        current_stage: 'negotiation',
        influencer_response: 'pending',
        advertiser_response: 'pending',
        final_terms: '{}',
        timeline: {},
        metadata: {
          sourceType: 'auto_campaign',
          autoCampaignId: offerData.autoCampaignId,
          enableChat: offerData.enableChat,
          createdFromAutoCampaign: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.OFFERS)
        .insert([newOffer])
        .select()
        .single();

      if (error) throw error;

      // Update auto-campaign sent offers count
      const { autoCampaignService } = await import('../../auto-campaigns/services/autoCampaignService');
      await autoCampaignService.incrementSentOffersCount(offerData.autoCampaignId);

      const transformedOffer = this.transformFromDatabase(data);

      // Send notification to advertiser
      await this.sendOfferNotification(transformedOffer);

      // Track analytics
      analytics.track('auto_campaign_offer_created', {
        offer_id: transformedOffer.id,
        auto_campaign_id: offerData.autoCampaignId,
        influencer_id: offerData.influencerId,
        advertiser_id: offerData.advertiserId,
        proposed_rate: offerData.proposedRate
      });

      // Record rate limit interaction
      try {
        await rateLimitService.recordInteraction(
          offerData.influencerId,
          'auto_campaign_offer',
          undefined,
          offerData.autoCampaignId
        );
      } catch (rateLimitError) {
        console.error('Failed to record rate limit:', rateLimitError);
      }

      return transformedOffer;
    } catch (error) {
      console.error('Failed to create auto-campaign offer:', error);
      throw error;
    }
  }

  private async validateCampaignStatus(campaignId: string): Promise<void> {
    const { data: campaign, error } = await supabase
      .from('auto_campaigns')
      .select('status')
      .eq('id', campaignId)
      .single();

    if (error) {
      console.error('Failed to fetch campaign status:', error);
      throw new Error('Не удалось проверить статус кампании');
    }

    if (!campaign) {
      throw new Error('Кампания не найдена');
    }

    if (campaign.status === 'completed' || campaign.status === 'cancelled') {
      throw new Error('Этот оффер больше недействителен. Кампания завершена.');
    }

    if (campaign.status === 'in_progress') {
      throw new Error('Набор участников для этой кампании завершен.');
    }
  }
}

export const offerService = new OfferService();