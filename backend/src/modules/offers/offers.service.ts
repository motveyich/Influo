import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { CreateOfferDto, UpdateOfferDto, OfferSourceType } from './dto';

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(private supabaseService: SupabaseService) {}

  async create(userId: string, createOfferDto: CreateOfferDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: currentUser } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', userId)
      .maybeSingle();

    if (!currentUser) {
      throw new ForbiddenException('User profile not found');
    }

    const sourceType = createOfferDto.sourceType || OfferSourceType.DIRECT;
    let advertiserId: string;
    let influencerId: string;

    if (sourceType === OfferSourceType.INFLUENCER_CARD) {
      if (currentUser.user_type !== 'advertiser') {
        throw new ForbiddenException('Only advertisers can apply to influencer cards');
      }
      advertiserId = userId;
      influencerId = createOfferDto.influencerId!;

      const { data: influencer } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('user_id', influencerId)
        .maybeSingle();

      if (!influencer || influencer.user_type !== 'influencer') {
        throw new NotFoundException('Influencer not found');
      }
    } else if (sourceType === OfferSourceType.ADVERTISER_CARD) {
      if (currentUser.user_type !== 'influencer') {
        throw new ForbiddenException('Only influencers can apply to advertiser cards');
      }
      influencerId = userId;
      advertiserId = createOfferDto.advertiserId!;

      const { data: advertiser } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('user_id', advertiserId)
        .maybeSingle();

      if (!advertiser || advertiser.user_type !== 'advertiser') {
        throw new NotFoundException('Advertiser not found');
      }
    } else if (sourceType === OfferSourceType.CAMPAIGN) {
      if (currentUser.user_type !== 'influencer') {
        throw new ForbiddenException('Only influencers can apply to campaigns');
      }
      influencerId = userId;
      advertiserId = createOfferDto.advertiserId!;
    } else {
      if (currentUser.user_type !== 'advertiser') {
        throw new ForbiddenException('Only advertisers can create direct offers');
      }
      advertiserId = userId;
      influencerId = createOfferDto.influencerId!;

      const { data: influencer } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('user_id', influencerId)
        .maybeSingle();

      if (!influencer || influencer.user_type !== 'influencer') {
        throw new NotFoundException('Influencer not found');
      }
    }

    const details = {
      title: createOfferDto.title,
      description: createOfferDto.description,
      contentType: createOfferDto.contentType,
      deadline: createOfferDto.deadline,
      deliverables: createOfferDto.deliverables || [],
    };

    const offerData: Record<string, any> = {
      advertiser_id: advertiserId,
      influencer_id: influencerId,
      details: details,
      proposed_rate: createOfferDto.amount,
      currency: createOfferDto.currency,
      timeline: createOfferDto.timeline,
      source_type: sourceType,
      source_card_id: createOfferDto.sourceCardId,
      campaign_id: createOfferDto.campaignId,
      initiated_by: userId,
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
        advertiser:user_profiles!offers_advertiser_id_fkey(*),
        influencer:user_profiles!offers_influencer_id_fkey(*)
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

  async findOne(id: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: offer, error } = await supabase
      .from('offers')
      .select(`
        *,
        advertiser:user_profiles!offers_advertiser_id_fkey(*),
        influencer:user_profiles!offers_influencer_id_fkey(*)
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
      .select('advertiser_id, status, details')
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

    const currentDetails = existingOffer.details || {};
    let detailsUpdated = false;

    if (updateOfferDto.title !== undefined) {
      currentDetails.title = updateOfferDto.title;
      detailsUpdated = true;
    }
    if (updateOfferDto.description !== undefined) {
      currentDetails.description = updateOfferDto.description;
      detailsUpdated = true;
    }
    if (updateOfferDto.contentType !== undefined) {
      currentDetails.contentType = updateOfferDto.contentType;
      detailsUpdated = true;
    }
    if (updateOfferDto.deadline !== undefined) {
      currentDetails.deadline = updateOfferDto.deadline;
      detailsUpdated = true;
    }

    if (detailsUpdated) {
      updateData.details = currentDetails;
    }

    if (updateOfferDto.amount !== undefined) {
      updateData.proposed_rate = updateOfferDto.amount;
    }
    if (updateOfferDto.currency !== undefined) {
      updateData.currency = updateOfferDto.currency;
    }

    const { data: updatedOffer, error } = await supabase
      .from('offers')
      .update(updateData)
      .eq('offer_id', id)
      .select(`
        *,
        advertiser:user_profiles!offers_advertiser_id_fkey(*),
        influencer:user_profiles!offers_influencer_id_fkey(*)
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
      .eq('offer_id', id)
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
      .eq('offer_id', id)
      .select(`
        *,
        advertiser:user_profiles!offers_advertiser_id_fkey(*),
        influencer:user_profiles!offers_influencer_id_fkey(*)
      `)
      .single();

    if (error) {
      throw new ConflictException('Failed to update offer status');
    }

    return this.transformOffer(updated);
  }

  private transformOffer(offer: any) {
    const details = offer.details || {};

    return {
      id: offer.offer_id,
      advertiserId: offer.advertiser_id,
      influencerId: offer.influencer_id,
      title: details.title || '',
      description: details.description || '',
      amount: offer.proposed_rate,
      currency: offer.currency,
      contentType: details.contentType || '',
      deadline: details.deadline || null,
      timeline: offer.timeline,
      deliverables: details.deliverables || offer.deliverables || [],
      sourceType: offer.source_type,
      sourceCardId: offer.source_card_id,
      campaignId: offer.campaign_id,
      initiatedBy: offer.initiated_by,
      status: offer.status,
      createdAt: offer.created_at,
      updatedAt: offer.updated_at,
      advertiser: offer.advertiser ? {
        id: offer.advertiser.user_id,
        fullName: offer.advertiser.full_name,
        username: offer.advertiser.username,
        avatar: offer.advertiser.avatar,
      } : undefined,
      influencer: offer.influencer ? {
        id: offer.influencer.user_id,
        fullName: offer.influencer.full_name,
        username: offer.influencer.username,
        avatar: offer.influencer.avatar,
      } : undefined,
    };
  }
}
