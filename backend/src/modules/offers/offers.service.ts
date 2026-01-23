import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { CreateOfferDto, UpdateOfferDto } from './dto';

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(private supabaseService: SupabaseService) {}

  async create(userId: string, createOfferDto: CreateOfferDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: creator } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!creator) {
      throw new NotFoundException('User not found');
    }

    let advertiserId: string;
    let influencerId: string;

    if (createOfferDto.autoCampaignId) {
      const { data: campaign, error: campaignError } = await supabase
        .from('auto_campaigns')
        .select('id, status, advertiser_id')
        .eq('id', createOfferDto.autoCampaignId)
        .maybeSingle();

      if (campaignError || !campaign) {
        throw new NotFoundException('Auto campaign not found');
      }

      if (campaign.status === 'closed' || campaign.status === 'completed') {
        throw new BadRequestException('Cannot create offer for closed or completed campaign');
      }

      if (campaign.status === 'paused') {
        throw new BadRequestException('Cannot create offer for paused campaign');
      }

      influencerId = userId;
      advertiserId = campaign.advertiser_id;

      const { data: advertiser } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', advertiserId)
        .maybeSingle();

      if (!advertiser) {
        throw new NotFoundException('Campaign advertiser not found');
      }

      const { data: existingOffer } = await supabase
        .from('offers')
        .select('offer_id')
        .eq('auto_campaign_id', createOfferDto.autoCampaignId)
        .eq('influencer_id', userId)
        .maybeSingle();

      if (existingOffer) {
        throw new ConflictException('You have already applied to this campaign');
      }
    } else {
      influencerId = createOfferDto.influencerId;
      advertiserId = userId;

      const { data: targetUser } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', influencerId)
        .maybeSingle();

      if (!targetUser) {
        throw new NotFoundException('Target user not found');
      }
    }

    const offerData = {
      advertiser_id: advertiserId,
      influencer_id: influencerId,
      initiated_by: userId,
      auto_campaign_id: createOfferDto.autoCampaignId || null,
      details: {
        title: createOfferDto.title,
        description: createOfferDto.description,
        contentType: createOfferDto.contentType,
        deliverables: createOfferDto.deliverables || [],
        proposed_rate: createOfferDto.amount,
        currency: createOfferDto.currency,
      },
      timeline: createOfferDto.timeline || {},
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { data: offer, error } = await supabase
      .from('offers')
      .insert(offerData)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create offer: ${error.message}`, error);
      throw new ConflictException('Failed to create offer');
    }

    if (createOfferDto.autoCampaignId) {
      const { data: campaign } = await supabase
        .from('auto_campaigns')
        .select('sent_offers_count')
        .eq('id', createOfferDto.autoCampaignId)
        .single();

      if (campaign) {
        await supabase
          .from('auto_campaigns')
          .update({ sent_offers_count: campaign.sent_offers_count + 1 })
          .eq('id', createOfferDto.autoCampaignId);
      }
    }

    return this.transformOffer(offer);
  }

  async findAll(userId: string, filters?: { status?: string; asInfluencer?: boolean }) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('offers')
      .select(`
        *,
        advertiser:advertiser_id(*),
        influencer:influencer_id(*)
      `);

    if (filters?.asInfluencer) {
      query = query.eq('influencer_id', userId);
    } else {
      query = query.eq('advertiser_id', userId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data: offers, error } = await query.order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch offers: ${error.message}`, error);
      return [];
    }

    return offers.map((offer) => this.transformOffer(offer));
  }

  async findByParticipant(userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: offers, error } = await supabase
      .from('offers')
      .select(`
        *,
        advertiser:advertiser_id(*),
        influencer:influencer_id(*)
      `)
      .or(`advertiser_id.eq.${userId},influencer_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch offers by participant: ${error.message}`, error);
      return [];
    }

    return offers.map((offer) => this.transformOffer(offer));
  }

  async findByAutoCampaign(campaignId: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: campaign, error: campaignError } = await supabase
      .from('auto_campaigns')
      .select('advertiser_id')
      .eq('id', campaignId)
      .maybeSingle();

    if (campaignError || !campaign) {
      throw new NotFoundException('Auto campaign not found');
    }

    if (campaign.advertiser_id !== userId) {
      throw new ForbiddenException('You can only view offers for your own campaign');
    }

    const { data: offers, error } = await supabase
      .from('offers')
      .select(`
        *,
        advertiser:advertiser_id(*),
        influencer:influencer_id(*)
      `)
      .eq('auto_campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch offers by auto campaign: ${error.message}`, error);
      return [];
    }

    return offers.map((offer) => this.transformOffer(offer));
  }

  async findOne(id: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: offer, error } = await supabase
      .from('offers')
      .select(`
        *,
        advertiser:advertiser_id(*),
        influencer:influencer_id(*)
      `)
      .eq('offer_id', id)
      .maybeSingle();

    if (error || !offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.advertiser_id !== userId && offer.influencer_id !== userId) {
      throw new ForbiddenException('You can only view your own offers');
    }

    return this.transformOffer(offer);
  }

  async update(id: string, userId: string, updateOfferDto: UpdateOfferDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: existingOffer } = await supabase
      .from('offers')
      .select('advertiser_id, status')
      .eq('offer_id', id)
      .maybeSingle();

    if (!existingOffer) {
      throw new NotFoundException('Offer not found');
    }

    if (existingOffer.advertiser_id !== userId) {
      throw new ForbiddenException('Only offer creator can update it');
    }

    if (existingOffer.status !== 'pending') {
      throw new BadRequestException('Can only update pending offers');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    const fieldMappings: Record<string, string> = {
      title: 'title',
      description: 'description',
      amount: 'amount',
      currency: 'currency',
      contentType: 'content_type',
      deadline: 'deadline',
    };

    Object.entries(fieldMappings).forEach(([dtoKey, dbKey]) => {
      if ((updateOfferDto as any)[dtoKey] !== undefined) {
        updateData[dbKey] = (updateOfferDto as any)[dtoKey];
      }
    });

    const { data: updatedOffer, error } = await supabase
      .from('offers')
      .update(updateData)
      .eq('offer_id', id)
      .select(`
        *,
        advertiser:advertiser_id(*),
        influencer:influencer_id(*)
      `)
      .single();

    if (error) {
      throw new ConflictException('Failed to update offer');
    }

    return this.transformOffer(updatedOffer);
  }

  async accept(id: string, userId: string) {
    return this.updateStatus(id, userId, 'accepted', 'influencer');
  }

  async decline(id: string, userId: string) {
    return this.updateStatus(id, userId, 'cancelled', 'influencer');
  }

  async markInProgress(id: string, userId: string) {
    return this.updateStatus(id, userId, 'in_progress', 'influencer');
  }

  async markCompleted(id: string, userId: string, screenshotUrl?: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: offer } = await supabase
      .from('offers')
      .select('advertiser_id, influencer_id, status, completion_initiated_by, metadata')
      .eq('offer_id', id)
      .maybeSingle();

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const isParticipant = offer.advertiser_id === userId || offer.influencer_id === userId;
    if (!isParticipant) {
      throw new ForbiddenException('Not authorized to update this offer');
    }

    if (offer.status !== 'in_progress') {
      throw new ConflictException('Can only request completion for offers in progress');
    }

    if (!screenshotUrl) {
      throw new BadRequestException('Screenshot URL is required to complete the offer');
    }

    const metadata = offer.metadata || {};
    metadata.completion_screenshot_url = screenshotUrl;
    metadata.completion_screenshot_uploaded_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('offers')
      .update({
        status: 'pending_completion',
        completion_initiated_by: userId,
        completion_requested_at: new Date().toISOString(),
        metadata: metadata,
        updated_at: new Date().toISOString()
      })
      .eq('offer_id', id)
      .select(`
        *,
        advertiser:advertiser_id(*),
        influencer:influencer_id(*)
      `)
      .single();

    if (error) {
      this.logger.error(`Failed to request completion: ${error.message}`, error);
      throw new ConflictException('Failed to request completion');
    }

    this.logger.log(`Offer ${id} completion requested by user ${userId}`);
    return this.transformOffer(updated);
  }

  async terminate(id: string, userId: string) {
    return this.updateStatus(id, userId, 'terminated', null);
  }

  async cancel(id: string, userId: string) {
    return this.updateStatus(id, userId, 'cancelled', 'advertiser');
  }

  private async updateStatus(id: string, userId: string, status: string, requiredRole: 'advertiser' | 'influencer' | null) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: offer, error: fetchError } = await supabase
      .from('offers')
      .select('advertiser_id, influencer_id, status, initiated_by, auto_campaign_id')
      .eq('offer_id', id)
      .maybeSingle();

    if (fetchError || !offer) {
      this.logger.error(`Offer not found: ${id}`, fetchError);
      throw new NotFoundException('Offer not found');
    }

    const isParticipant = offer.advertiser_id === userId || offer.influencer_id === userId;
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this offer');
    }

    const initiatedBy = offer.initiated_by || offer.advertiser_id;
    const isRecipient = userId !== initiatedBy;
    const isSender = userId === initiatedBy;
    const isInfluencer = userId === offer.influencer_id;
    const isAdvertiser = userId === offer.advertiser_id;
    const isAutoCampaignApplication = !!offer.auto_campaign_id;

    this.logger.log(`Status update request for offer ${id}: status=${status}, userId=${userId}, isInfluencer=${isInfluencer}, isAdvertiser=${isAdvertiser}, isRecipient=${isRecipient}, isSender=${isSender}, isAutoCampaignApplication=${isAutoCampaignApplication}`);

    if (status === 'accepted' && !isRecipient) {
      throw new ForbiddenException('Only the recipient can accept the offer');
    }

    if (status === 'cancelled') {
      if (requiredRole === 'advertiser' && !isSender) {
        throw new ForbiddenException('Only the sender can cancel the offer');
      }
      if (requiredRole === 'influencer' && !isRecipient) {
        throw new ForbiddenException('Only the recipient can decline the offer');
      }
    }

    if (status === 'in_progress') {
      if (isAutoCampaignApplication) {
        // Для заявок на авто-кампании: только инфлюенсер может начать работу
        if (!isInfluencer) {
          throw new ForbiddenException('Only the influencer can start work on this application');
        }
      } else {
        // Для обычных предложений: только получатель может начать работу
        if (!isRecipient) {
          throw new ForbiddenException('Only the recipient can start work');
        }
      }
    }

    // Для terminate: обе стороны могут расторгнуть сотрудничество
    if (status === 'terminated') {
      if (!isParticipant) {
        throw new ForbiddenException('Only participants can terminate the collaboration');
      }
    }

    const validTransitions: Record<string, string[]> = {
      pending: ['accepted', 'cancelled', 'declined'],
      accepted: ['in_progress', 'cancelled', 'terminated'],
      in_progress: ['pending_completion', 'cancelled', 'terminated'],
      pending_completion: ['completed', 'in_progress'],
      completed: [],
      cancelled: [],
      terminated: [],
      declined: [],
    };

    if (!validTransitions[offer.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${offer.status} to ${status}`);
    }

    const { data: updated, error } = await supabase
      .from('offers')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('offer_id', id)
      .select(`
        *,
        advertiser:advertiser_id(*),
        influencer:influencer_id(*)
      `)
      .single();

    if (error) {
      this.logger.error(`Failed to update offer status: ${error.message}`, error);
      throw new ConflictException('Failed to update offer status');
    }

    // Обновляем счетчики и статус автокампании, если оффер связан с автокампанией
    if (offer.auto_campaign_id) {
      await this.updateAutoCampaignCounters(offer.auto_campaign_id, offer.status, status);
    }

    this.logger.log(`Offer ${id} status updated to ${status} by user ${userId}`);
    return this.transformOffer(updated);
  }

  private async updateAutoCampaignCounters(campaignId: string, oldStatus: string, newStatus: string) {
    const supabase = this.supabaseService.getAdminClient();

    try {
      // Получаем текущее состояние кампании
      const { data: campaign, error: fetchError } = await supabase
        .from('auto_campaigns')
        .select('accepted_offers_count, completed_offers_count, target_influencers_count, status')
        .eq('id', campaignId)
        .maybeSingle();

      if (fetchError || !campaign) {
        this.logger.error(`Failed to fetch campaign ${campaignId}:`, fetchError);
        return;
      }

      // Не изменяем статус если кампания на паузе или уже завершена
      if (campaign.status === 'paused' || campaign.status === 'completed') {
        this.logger.log(`Campaign ${campaignId} is ${campaign.status}, skipping status update`);
        return;
      }

      let acceptedDelta = 0;
      let completedDelta = 0;

      // Отслеживаем изменения счетчиков для accepted статуса
      if (oldStatus !== 'accepted' && oldStatus !== 'in_progress' && oldStatus !== 'pending_completion' && oldStatus !== 'completed' &&
          (newStatus === 'accepted' || newStatus === 'in_progress' || newStatus === 'pending_completion' || newStatus === 'completed')) {
        acceptedDelta = 1;
      } else if ((oldStatus === 'accepted' || oldStatus === 'in_progress' || oldStatus === 'pending_completion' || oldStatus === 'completed') &&
                 newStatus !== 'accepted' && newStatus !== 'in_progress' && newStatus !== 'pending_completion' && newStatus !== 'completed') {
        acceptedDelta = -1;
      }

      // Отслеживаем изменения счетчиков для completed статуса
      if (oldStatus !== 'completed' && newStatus === 'completed') {
        completedDelta = 1;
      } else if (oldStatus === 'completed' && newStatus !== 'completed') {
        completedDelta = -1;
      }

      // Вычисляем новые значения
      const newAcceptedCount = Math.max(0, campaign.accepted_offers_count + acceptedDelta);
      const newCompletedCount = Math.max(0, campaign.completed_offers_count + completedDelta);

      // Определяем новый статус кампании
      let newCampaignStatus = campaign.status;

      // Переход active -> in_progress когда хотя бы один оффер принят
      if (campaign.status === 'active' && newAcceptedCount > 0 && newAcceptedCount < campaign.target_influencers_count) {
        newCampaignStatus = 'in_progress';
      }

      // Переход active/in_progress -> closed когда достигнута цель по принятым офферам
      if ((campaign.status === 'active' || campaign.status === 'in_progress') && newAcceptedCount >= campaign.target_influencers_count) {
        newCampaignStatus = 'closed';
      }

      // Переход в completed когда достигнута цель по завершенным офферам
      if ((campaign.status === 'in_progress' || campaign.status === 'closed') && newCompletedCount >= campaign.target_influencers_count) {
        newCampaignStatus = 'completed';
      }

      // Обновляем кампанию
      const { error: updateError } = await supabase
        .from('auto_campaigns')
        .update({
          accepted_offers_count: newAcceptedCount,
          completed_offers_count: newCompletedCount,
          status: newCampaignStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (updateError) {
        this.logger.error(`Failed to update campaign counters: ${updateError.message}`, updateError);
      } else {
        this.logger.log(`Campaign ${campaignId} updated: accepted=${newAcceptedCount}, completed=${newCompletedCount}, status=${campaign.status}->${newCampaignStatus}`);
      }
    } catch (error) {
      this.logger.error(`Error updating campaign counters:`, error);
    }
  }

  async getOfferHistory(offerId: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: offer } = await supabase
      .from('offers')
      .select('advertiser_id, influencer_id')
      .eq('offer_id', offerId)
      .maybeSingle();

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const isParticipant = offer.advertiser_id === userId || offer.influencer_id === userId;
    if (!isParticipant) {
      throw new ForbiddenException('You can only view history of your own offers');
    }

    const { data: history, error } = await supabase
      .from('offer_status_history')
      .select(`
        *,
        changed_by_profile:user_profiles!offer_status_history_changed_by_fkey(
          user_id,
          full_name,
          username,
          avatar
        )
      `)
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to get offer history: ${error.message}`, error);
      return [];
    }

    return history || [];
  }

  async confirmCompletion(id: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: offer } = await supabase
      .from('offers')
      .select('advertiser_id, influencer_id, status, completion_initiated_by')
      .eq('offer_id', id)
      .maybeSingle();

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const isParticipant = offer.advertiser_id === userId || offer.influencer_id === userId;
    if (!isParticipant) {
      throw new ForbiddenException('Not authorized to update this offer');
    }

    if (offer.status !== 'pending_completion') {
      throw new ConflictException('Offer is not pending completion');
    }

    if (offer.completion_initiated_by === userId) {
      throw new ForbiddenException('Cannot confirm your own completion request');
    }

    const { data: updated, error } = await supabase
      .from('offers')
      .update({
        status: 'completed',
        completion_initiated_by: null,
        completion_requested_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('offer_id', id)
      .select(`
        *,
        advertiser:advertiser_id(*),
        influencer:influencer_id(*)
      `)
      .single();

    if (error) {
      this.logger.error(`Failed to confirm completion: ${error.message}`, error);
      throw new ConflictException('Failed to confirm completion');
    }

    this.logger.log(`Offer ${id} completion confirmed by user ${userId}`);
    return this.transformOffer(updated);
  }

  async rejectCompletion(id: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: offer } = await supabase
      .from('offers')
      .select('advertiser_id, influencer_id, status, completion_initiated_by')
      .eq('offer_id', id)
      .maybeSingle();

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const isParticipant = offer.advertiser_id === userId || offer.influencer_id === userId;
    if (!isParticipant) {
      throw new ForbiddenException('Not authorized to update this offer');
    }

    if (offer.status !== 'pending_completion') {
      throw new ConflictException('Offer is not pending completion');
    }

    if (offer.completion_initiated_by === userId) {
      throw new ForbiddenException('Cannot reject your own completion request');
    }

    const { data: updated, error } = await supabase
      .from('offers')
      .update({
        status: 'in_progress',
        completion_initiated_by: null,
        completion_requested_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('offer_id', id)
      .select(`
        *,
        advertiser:advertiser_id(*),
        influencer:influencer_id(*)
      `)
      .single();

    if (error) {
      this.logger.error(`Failed to reject completion: ${error.message}`, error);
      throw new ConflictException('Failed to reject completion');
    }

    this.logger.log(`Offer ${id} completion rejected by user ${userId}`);
    return this.transformOffer(updated);
  }

  private transformOffer(offer: any) {
    const details = offer.details || {};

    return {
      id: offer.offer_id || offer.id,
      offer_id: offer.offer_id || offer.id,
      advertiserId: offer.advertiser_id,
      influencerId: offer.influencer_id,
      campaignId: offer.campaign_id || null,
      autoCampaignId: offer.auto_campaign_id || null,
      influencerCardId: offer.influencer_card_id || null,
      initiatedBy: offer.initiated_by || offer.advertiser_id,
      completionInitiatedBy: offer.completion_initiated_by || null,
      completionRequestedAt: offer.completion_requested_at || null,

      title: details.title || offer.title || 'Без названия',
      description: details.description || offer.description || '',
      proposedRate: details.proposed_rate || offer.proposed_rate || offer.amount || 0,
      currency: details.currency || offer.currency || 'RUB',
      deliverables: details.deliverables || offer.deliverables || [],
      platform: details.platform || offer.platform || null,
      contentType: details.content_type || offer.content_type || null,
      integrationType: details.integration_type || offer.integration_type || null,

      status: offer.status,
      currentStage: details.current_stage || offer.current_stage || 'negotiation',

      timeline: details.timeline || offer.timeline || {
        deadline: offer.deadline,
        startDate: offer.created_at,
      },

      details: details,
      metadata: offer.metadata || { viewCount: 0 },

      influencerResponse: details.influencer_response || offer.influencer_response || 'pending',
      advertiserResponse: details.advertiser_response || offer.advertiser_response || 'pending',

      createdAt: offer.created_at,
      updatedAt: offer.updated_at || offer.created_at,

      advertiser: offer.advertiser ? {
        id: offer.advertiser.user_id || offer.advertiser.id,
        fullName: offer.advertiser.full_name,
        username: offer.advertiser.username,
        avatar: offer.advertiser.avatar,
      } : undefined,
      influencer: offer.influencer ? {
        id: offer.influencer.user_id || offer.influencer.id,
        fullName: offer.influencer.full_name,
        username: offer.influencer.username,
        avatar: offer.influencer.avatar,
      } : undefined,
    };
  }

  async uploadCompletionScreenshot(offerId: string, userId: string, file: Express.Multer.File): Promise<{ url: string }> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('influencer_id, advertiser_id')
      .eq('offer_id', offerId)
      .maybeSingle();

    if (offerError || !offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.influencer_id !== userId && offer.advertiser_id !== userId) {
      throw new ForbiddenException('Not authorized to upload screenshot for this offer');
    }

    const { data: existingFiles } = await supabase.storage
      .from('completion-screenshots')
      .list(offerId);

    if (existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles.map(f => `${offerId}/${f.name}`);
      await supabase.storage
        .from('completion-screenshots')
        .remove(filesToRemove);
    }

    const fileExt = file.originalname.split('.').pop();
    const fileName = `${offerId}/completion-screenshot-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('completion-screenshots')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      this.logger.error(`Failed to upload completion screenshot: ${uploadError.message}`, {
        uploadError,
        offerId,
        userId,
      });
      throw new ConflictException('Failed to upload screenshot');
    }

    const { data: urlData } = supabase.storage
      .from('completion-screenshots')
      .getPublicUrl(fileName);

    return { url: urlData.publicUrl };
  }
}
