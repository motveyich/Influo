import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { CreateOfferDto, UpdateOfferDto } from './dto';

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(private supabaseService: SupabaseService) {}

  async create(userId: string, createOfferDto: CreateOfferDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: advertiser } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', userId)
      .maybeSingle();

    if (!advertiser || advertiser.user_type !== 'advertiser') {
      throw new ForbiddenException('Only advertisers can create offers');
    }

    const { data: influencer } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', createOfferDto.influencerId)
      .maybeSingle();

    if (!influencer || influencer.user_type !== 'influencer') {
      throw new NotFoundException('Influencer not found');
    }

    const offerData = {
      advertiser_id: userId,
      influencer_id: createOfferDto.influencerId,
      title: createOfferDto.title,
      description: createOfferDto.description,
      amount: createOfferDto.amount,
      currency: createOfferDto.currency,
      content_type: createOfferDto.contentType,
      deadline: createOfferDto.deadline,
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

  async findOne(id: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: offer, error } = await supabase
      .from('offers')
      .select(`
        *,
        advertiser:advertiser_id(*),
        influencer:influencer_id(*)
      `)
      .eq('id', id)
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
      .eq('id', id)
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
      .eq('id', id)
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

  async markCompleted(id: string, userId: string) {
    return this.updateStatus(id, userId, 'completed', 'influencer');
  }

  async cancel(id: string, userId: string) {
    return this.updateStatus(id, userId, 'cancelled', 'advertiser');
  }

  private async updateStatus(id: string, userId: string, status: string, requiredRole: 'advertiser' | 'influencer') {
    const supabase = this.supabaseService.getAdminClient();

    const { data: offer } = await supabase
      .from('offers')
      .select('advertiser_id, influencer_id, status')
      .eq('id', id)
      .maybeSingle();

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const hasPermission = requiredRole === 'advertiser'
      ? offer.advertiser_id === userId
      : offer.influencer_id === userId;

    if (!hasPermission) {
      throw new ForbiddenException(`Only ${requiredRole} can perform this action`);
    }

    const validTransitions: Record<string, string[]> = {
      pending: ['accepted', 'cancelled'],
      accepted: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (!validTransitions[offer.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${offer.status} to ${status}`);
    }

    const { data: updated, error } = await supabase
      .from('offers')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        advertiser:advertiser_id(*),
        influencer:influencer_id(*)
      `)
      .single();

    if (error) {
      throw new ConflictException('Failed to update offer status');
    }

    return this.transformOffer(updated);
  }

  private transformOffer(offer: any) {
    return {
      id: offer.id,
      offer_id: offer.offer_id || offer.id,
      advertiserId: offer.advertiser_id,
      influencerId: offer.influencer_id,
      campaignId: offer.campaign_id || null,
      influencerCardId: offer.influencer_card_id || null,
      initiatedBy: offer.initiated_by || offer.advertiser_id,

      title: offer.title || 'Без названия',
      description: offer.description || '',
      proposedRate: offer.proposed_rate || offer.amount || 0,
      currency: offer.currency || 'RUB',
      deliverables: offer.deliverables || [],

      status: offer.status,
      currentStage: offer.current_stage || 'negotiation',

      timeline: offer.timeline || {
        deadline: offer.deadline,
        startDate: offer.created_at,
      },

      details: offer.details || {},
      metadata: offer.metadata || { viewCount: 0 },

      influencerResponse: offer.influencer_response || 'pending',
      advertiserResponse: offer.advertiser_response || 'pending',

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
}
