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

    const matchedCards = influencerCards.filter((card) => {
      const reach = card.reach || {};
      const followers = reach.followers || 0;

      const matchesPlatform = campaign.platforms.includes(card.platform);
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
      .select('advertiser_id, status')
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

    return { message: 'Campaign launched successfully', status: 'active' };
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
