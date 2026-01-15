import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { CreateAutoCampaignDto, UpdateAutoCampaignDto } from './dto';

@Injectable()
export class AutoCampaignsService {
  private readonly logger = new Logger(AutoCampaignsService.name);

  constructor(private supabaseService: SupabaseService) {}

  async create(userId: string, createAutoCampaignDto: CreateAutoCampaignDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (userError || !user) {
      throw new NotFoundException('User not found');
    }

    if (createAutoCampaignDto.budgetMax < createAutoCampaignDto.budgetMin) {
      throw new BadRequestException('Budget max must be greater than or equal to budget min');
    }

    if (createAutoCampaignDto.audienceMax < createAutoCampaignDto.audienceMin) {
      throw new BadRequestException('Audience max must be greater than or equal to audience min');
    }

    const campaignData = {
      advertiser_id: userId,
      title: createAutoCampaignDto.title,
      description: createAutoCampaignDto.description || null,
      status: 'draft',
      budget_min: createAutoCampaignDto.budgetMin,
      budget_max: createAutoCampaignDto.budgetMax,
      audience_min: createAutoCampaignDto.audienceMin,
      audience_max: createAutoCampaignDto.audienceMax,
      target_influencers_count: createAutoCampaignDto.targetInfluencersCount,
      content_types: createAutoCampaignDto.contentTypes,
      platforms: createAutoCampaignDto.platforms,
      start_date: createAutoCampaignDto.startDate || null,
      end_date: createAutoCampaignDto.endDate || null,
      target_price_per_follower: createAutoCampaignDto.targetPricePerFollower || null,
      sent_offers_count: 0,
      accepted_offers_count: 0,
      completed_offers_count: 0,
    };

    const { data: campaign, error } = await supabase
      .from('auto_campaigns')
      .insert(campaignData)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create auto campaign: ${error.message}`, error);
      throw new ConflictException('Failed to create auto campaign');
    }

    return this.transformCampaign(campaign);
  }

  async findAll(filters?: { status?: string; userId?: string }) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('auto_campaigns')
      .select('*, user_profiles!auto_campaigns_advertiser_id_fkey(*)');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    } else {
      query = query.in('status', ['draft', 'active', 'closed']);
    }

    if (filters?.userId) {
      query = query.eq('advertiser_id', filters.userId);
    }

    const { data: campaigns, error } = await query.order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch auto campaigns: ${error.message}`, error);
      return [];
    }

    return campaigns.map((campaign) => this.transformCampaign(campaign));
  }

  async findOne(id: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: campaign, error } = await supabase
      .from('auto_campaigns')
      .select('*, user_profiles!auto_campaigns_advertiser_id_fkey(*)')
      .eq('id', id)
      .maybeSingle();

    if (error || !campaign) {
      throw new NotFoundException('Auto campaign not found');
    }

    return this.transformCampaign(campaign);
  }

  async update(id: string, userId: string, updateAutoCampaignDto: UpdateAutoCampaignDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: existingCampaign } = await supabase
      .from('auto_campaigns')
      .select('advertiser_id, status')
      .eq('id', id)
      .maybeSingle();

    if (!existingCampaign) {
      throw new NotFoundException('Auto campaign not found');
    }

    if (existingCampaign.advertiser_id !== userId) {
      throw new ForbiddenException('You can only update your own campaigns');
    }

    if (existingCampaign.status === 'completed') {
      throw new BadRequestException('Cannot update completed campaign');
    }

    if (updateAutoCampaignDto.budgetMin !== undefined && updateAutoCampaignDto.budgetMax !== undefined) {
      if (updateAutoCampaignDto.budgetMax < updateAutoCampaignDto.budgetMin) {
        throw new BadRequestException('Budget max must be greater than or equal to budget min');
      }
    }

    if (updateAutoCampaignDto.audienceMin !== undefined && updateAutoCampaignDto.audienceMax !== undefined) {
      if (updateAutoCampaignDto.audienceMax < updateAutoCampaignDto.audienceMin) {
        throw new BadRequestException('Audience max must be greater than or equal to audience min');
      }
    }

    const updateData: any = {};

    const fieldMappings: Record<string, string> = {
      title: 'title',
      description: 'description',
      budgetMin: 'budget_min',
      budgetMax: 'budget_max',
      audienceMin: 'audience_min',
      audienceMax: 'audience_max',
      targetInfluencersCount: 'target_influencers_count',
      contentTypes: 'content_types',
      platforms: 'platforms',
      startDate: 'start_date',
      endDate: 'end_date',
      targetPricePerFollower: 'target_price_per_follower',
    };

    Object.entries(fieldMappings).forEach(([dtoKey, dbKey]) => {
      if ((updateAutoCampaignDto as any)[dtoKey] !== undefined) {
        updateData[dbKey] = (updateAutoCampaignDto as any)[dtoKey];
      }
    });

    const { data: updatedCampaign, error } = await supabase
      .from('auto_campaigns')
      .update(updateData)
      .eq('id', id)
      .select('*, user_profiles!auto_campaigns_advertiser_id_fkey(*)')
      .single();

    if (error) {
      this.logger.error(`Failed to update auto campaign: ${error.message}`, error);
      throw new ConflictException('Failed to update auto campaign');
    }

    return this.transformCampaign(updatedCampaign);
  }

  async delete(id: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: existingCampaign } = await supabase
      .from('auto_campaigns')
      .select('advertiser_id')
      .eq('id', id)
      .maybeSingle();

    if (!existingCampaign) {
      throw new NotFoundException('Auto campaign not found');
    }

    if (existingCampaign.advertiser_id !== userId) {
      throw new ForbiddenException('You can only delete your own campaigns');
    }

    const { error } = await supabase
      .from('auto_campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete auto campaign: ${error.message}`, error);
      throw new ConflictException('Failed to delete auto campaign');
    }

    return { message: 'Auto campaign deleted successfully' };
  }

  async getMatches(campaignId: string) {
    const campaign = await this.findOne(campaignId);
    const supabase = this.supabaseService.getAdminClient();

    const { data: influencerCards, error } = await supabase
      .from('influencer_cards')
      .select('*, user_profiles!influencer_cards_user_id_fkey(*)')
      .eq('is_active', true);

    if (error) {
      this.logger.error(`Failed to find matches: ${error.message}`, error);
      return [];
    }

    const campaignPlatformsLower = campaign.platforms.map((p: string) => p.toLowerCase());

    const matchedCards = influencerCards.filter((card) => {
      const reach = card.reach || {};
      const followers = reach.followers || 0;

      const matchesPlatform = campaignPlatformsLower.includes(card.platform.toLowerCase());
      const matchesAudience = followers >= campaign.audienceMin && followers <= campaign.audienceMax;

      return matchesPlatform && matchesAudience;
    });

    const remaining = campaign.targetInfluencersCount - campaign.sentOffersCount;
    return matchedCards.slice(0, remaining);
  }

  async launchCampaign(id: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: campaign } = await supabase
      .from('auto_campaigns')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.advertiser_id !== userId) {
      throw new ForbiddenException('You can only launch your own campaigns');
    }

    if (campaign.status !== 'draft') {
      throw new BadRequestException('Can only launch draft campaigns');
    }

    const { error } = await supabase
      .from('auto_campaigns')
      .update({ status: 'active' })
      .eq('id', id);

    if (error) {
      throw new ConflictException('Failed to launch campaign');
    }

    await this.sendOffersToMatchingInfluencers(id, campaign);

    return { message: 'Campaign launched successfully', status: 'active' };
  }

  private async sendOffersToMatchingInfluencers(campaignId: string, campaign: any) {
    const supabase = this.supabaseService.getAdminClient();

    this.logger.log(`Starting auto-offer distribution for campaign ${campaignId}`);
    this.logger.log(`Campaign criteria: platforms=[${campaign.platforms}], audience=${campaign.audience_min}-${campaign.audience_max}, target=${campaign.target_influencers_count}`);

    if (!campaign.platforms || campaign.platforms.length === 0) {
      this.logger.error(`Campaign ${campaignId} has no platforms specified`);
      return;
    }

    if (!campaign.audience_min || !campaign.audience_max) {
      this.logger.error(`Campaign ${campaignId} has invalid audience range`);
      return;
    }

    if (!campaign.target_influencers_count || campaign.target_influencers_count <= 0) {
      this.logger.error(`Campaign ${campaignId} has invalid target influencers count`);
      return;
    }

    const { data: influencerCards, error } = await supabase
      .from('influencer_cards')
      .select('*, user_profiles!influencer_cards_user_id_fkey(*)')
      .eq('is_active', true);

    if (error || !influencerCards) {
      this.logger.error(`Failed to find influencer cards: ${error?.message}`, error);
      return;
    }

    this.logger.log(`Found ${influencerCards.length} active influencer cards`);

    const campaignPlatformsLower = campaign.platforms.map((p: string) => p.toLowerCase());

    const matchedCards = influencerCards.filter((card) => {
      const reach = card.reach || {};
      const followers = reach.followers || 0;

      const matchesPlatform = campaignPlatformsLower.includes(card.platform.toLowerCase());
      const matchesAudience = followers >= campaign.audience_min && followers <= campaign.audience_max;

      return matchesPlatform && matchesAudience;
    });

    this.logger.log(`Matched ${matchedCards.length} cards after platform and audience filtering`);

    if (matchedCards.length === 0) {
      this.logger.warn(`No matching cards found for campaign ${campaignId}. Check platforms and audience criteria.`);
      return;
    }

    const { data: existingOffers } = await supabase
      .from('offers')
      .select('influencer_id')
      .eq('auto_campaign_id', campaignId);

    const existingInfluencerIds = new Set((existingOffers || []).map(o => o.influencer_id));

    const availableCards = matchedCards.filter(card =>
      !existingInfluencerIds.has(card.user_id)
    );

    this.logger.log(`Available cards after excluding existing offers: ${availableCards.length} (excluded ${existingInfluencerIds.size} already contacted)`);

    const cardsToSend = availableCards.slice(0, campaign.target_influencers_count);

    if (cardsToSend.length === 0) {
      this.logger.warn(`No cards available to send offers for campaign ${campaignId}. All matching influencers already received offers.`);
      return;
    }

    this.logger.log(`Will create ${cardsToSend.length} offers`);

    const avgBudget = (campaign.budget_min + campaign.budget_max) / 2;

    const offersToCreate = cardsToSend.map(card => ({
      advertiser_id: campaign.advertiser_id,
      influencer_id: card.user_id,
      initiated_by: campaign.advertiser_id,
      auto_campaign_id: campaignId,
      title: `Предложение о сотрудничестве: ${campaign.title}`,
      description: campaign.description || 'Мы заинтересованы в сотрудничестве с вами.',
      amount: avgBudget,
      proposed_rate: avgBudget,
      currency: 'RUB',
      content_type: campaign.content_types[0] || 'post',
      deliverables: campaign.content_types,
      status: 'pending',
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('offers')
      .insert(offersToCreate);

    if (insertError) {
      this.logger.error(`Failed to create offers: ${insertError.message}`, insertError);
      return;
    }

    const { data: currentCampaign } = await supabase
      .from('auto_campaigns')
      .select('sent_offers_count')
      .eq('id', campaignId)
      .maybeSingle();

    const newSentCount = (currentCampaign?.sent_offers_count || 0) + offersToCreate.length;

    await supabase
      .from('auto_campaigns')
      .update({ sent_offers_count: newSentCount })
      .eq('id', campaignId);

    this.logger.log(`Successfully created ${offersToCreate.length} offers for campaign ${campaignId}. Total sent: ${newSentCount}`);
  }

  async pauseCampaign(id: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: campaign } = await supabase
      .from('auto_campaigns')
      .select('advertiser_id, status')
      .eq('id', id)
      .maybeSingle();

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.advertiser_id !== userId) {
      throw new ForbiddenException('You can only pause your own campaigns');
    }

    if (campaign.status !== 'active') {
      throw new BadRequestException('Can only pause active campaigns');
    }

    const { error } = await supabase
      .from('auto_campaigns')
      .update({ status: 'closed' })
      .eq('id', id);

    if (error) {
      throw new ConflictException('Failed to pause campaign');
    }

    return { message: 'Campaign paused successfully', status: 'closed' };
  }

  async resumeCampaign(id: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: campaign } = await supabase
      .from('auto_campaigns')
      .select('advertiser_id, status')
      .eq('id', id)
      .maybeSingle();

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.advertiser_id !== userId) {
      throw new ForbiddenException('You can only resume your own campaigns');
    }

    if (campaign.status === 'completed') {
      throw new BadRequestException('Cannot resume completed campaigns');
    }

    const { error } = await supabase
      .from('auto_campaigns')
      .update({ status: 'active' })
      .eq('id', id);

    if (error) {
      throw new ConflictException('Failed to resume campaign');
    }

    return { message: 'Campaign resumed successfully', status: 'active' };
  }

  async getCampaignOffers(campaignId: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: campaign } = await supabase
      .from('auto_campaigns')
      .select('advertiser_id')
      .eq('id', campaignId)
      .maybeSingle();

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.advertiser_id !== userId) {
      throw new ForbiddenException('You can only view offers for your own campaigns');
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
      this.logger.error(`Failed to fetch campaign offers: ${error.message}`, error);
      return [];
    }

    return offers.map((offer) => this.transformOffer(offer));
  }

  private transformOffer(offer: any) {
    return {
      id: offer.offer_id || offer.id,
      offerId: offer.offer_id || offer.id,
      advertiserId: offer.advertiser_id,
      influencerId: offer.influencer_id,
      initiatedBy: offer.initiated_by,
      autoCampaignId: offer.auto_campaign_id,
      title: offer.title,
      description: offer.description,
      proposedRate: offer.proposed_rate || offer.amount,
      amount: offer.amount,
      currency: offer.currency,
      contentType: offer.content_type,
      deliverables: offer.deliverables || [],
      timeline: offer.timeline,
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

  private transformCampaign(campaign: any) {
    return {
      id: campaign.id,
      advertiserId: campaign.advertiser_id,
      title: campaign.title,
      description: campaign.description,
      status: campaign.status,
      budgetMin: campaign.budget_min,
      budgetMax: campaign.budget_max,
      audienceMin: campaign.audience_min,
      audienceMax: campaign.audience_max,
      targetInfluencersCount: campaign.target_influencers_count,
      contentTypes: campaign.content_types,
      platforms: campaign.platforms,
      startDate: campaign.start_date,
      endDate: campaign.end_date,
      targetPricePerFollower: campaign.target_price_per_follower,
      sentOffersCount: campaign.sent_offers_count,
      acceptedOffersCount: campaign.accepted_offers_count,
      completedOffersCount: campaign.completed_offers_count,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at,
      advertiser: campaign.user_profiles ? {
        id: campaign.user_profiles.user_id,
        fullName: campaign.user_profiles.full_name,
        username: campaign.user_profiles.username,
        avatar: campaign.user_profiles.avatar,
      } : undefined,
    };
  }
}
