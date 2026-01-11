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
      .select('user_type')
      .eq('user_id', userId)
      .maybeSingle();

    if (userError || !user) {
      throw new NotFoundException('User not found');
    }

    if (user.user_type !== 'advertiser') {
      throw new ForbiddenException('Only advertisers can create auto campaigns');
    }

    if (createAutoCampaignDto.followerRange.max <= createAutoCampaignDto.followerRange.min) {
      throw new BadRequestException('Max followers must be greater than min followers');
    }

    const campaignData = {
      user_id: userId,
      title: createAutoCampaignDto.title,
      description: createAutoCampaignDto.description,
      platform: createAutoCampaignDto.platform,
      max_influencers: createAutoCampaignDto.maxInfluencers,
      current_influencers: 0,
      budget: createAutoCampaignDto.budget,
      follower_range: createAutoCampaignDto.followerRange,
      min_engagement_rate: createAutoCampaignDto.minEngagementRate,
      target_interests: createAutoCampaignDto.targetInterests,
      target_age_groups: createAutoCampaignDto.targetAgeGroups || {},
      target_countries: createAutoCampaignDto.targetCountries || [],
      enable_chat: createAutoCampaignDto.enableChat ?? true,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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

  async findAll(filters?: { platform?: string; status?: string; userId?: string }) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('auto_campaigns')
      .select('*, user_profiles!auto_campaigns_user_id_fkey(*)');

    if (filters?.platform) {
      query = query.eq('platform', filters.platform);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    } else {
      query = query.in('status', ['active', 'in_progress']);
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
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
      .select('*, user_profiles!auto_campaigns_user_id_fkey(*)')
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
      .select('user_id, status')
      .eq('id', id)
      .maybeSingle();

    if (!existingCampaign) {
      throw new NotFoundException('Auto campaign not found');
    }

    if (existingCampaign.user_id !== userId) {
      throw new ForbiddenException('You can only update your own campaigns');
    }

    if (existingCampaign.status === 'completed') {
      throw new BadRequestException('Cannot update completed campaign');
    }

    if (updateAutoCampaignDto.followerRange) {
      if (updateAutoCampaignDto.followerRange.max <= updateAutoCampaignDto.followerRange.min) {
        throw new BadRequestException('Max followers must be greater than min followers');
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    const fieldMappings: Record<string, string> = {
      title: 'title',
      description: 'description',
      platform: 'platform',
      maxInfluencers: 'max_influencers',
      budget: 'budget',
      followerRange: 'follower_range',
      minEngagementRate: 'min_engagement_rate',
      targetInterests: 'target_interests',
      targetAgeGroups: 'target_age_groups',
      targetCountries: 'target_countries',
      enableChat: 'enable_chat',
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
      .select('*, user_profiles!auto_campaigns_user_id_fkey(*)')
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
      .select('user_id')
      .eq('id', id)
      .maybeSingle();

    if (!existingCampaign) {
      throw new NotFoundException('Auto campaign not found');
    }

    if (existingCampaign.user_id !== userId) {
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
      .eq('platform', campaign.platform)
      .eq('is_active', true)
      .gte('reach->>followers', campaign.followerRange.min)
      .lte('reach->>followers', campaign.followerRange.max)
      .gte('reach->>engagementRate', campaign.minEngagementRate);

    if (error) {
      this.logger.error(`Failed to find matches: ${error.message}`, error);
      return [];
    }

    const matchedCards = influencerCards.filter((card) => {
      const cardInterests = card.audience_demographics?.interests || [];
      const hasMatchingInterest = campaign.targetInterests.some((interest: string) =>
        cardInterests.includes(interest),
      );
      return hasMatchingInterest;
    });

    return matchedCards.slice(0, campaign.maxInfluencers - campaign.currentInfluencers);
  }

  async pauseCampaign(id: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: campaign } = await supabase
      .from('auto_campaigns')
      .select('user_id, status')
      .eq('id', id)
      .maybeSingle();

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.user_id !== userId) {
      throw new ForbiddenException('You can only pause your own campaigns');
    }

    if (campaign.status !== 'active' && campaign.status !== 'in_progress') {
      throw new BadRequestException('Can only pause active or in-progress campaigns');
    }

    const { error } = await supabase
      .from('auto_campaigns')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new ConflictException('Failed to pause campaign');
    }

    return { message: 'Campaign paused successfully', status: 'paused' };
  }

  async resumeCampaign(id: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: campaign } = await supabase
      .from('auto_campaigns')
      .select('user_id, status, current_influencers, max_influencers')
      .eq('id', id)
      .maybeSingle();

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.user_id !== userId) {
      throw new ForbiddenException('You can only resume your own campaigns');
    }

    if (campaign.status !== 'paused') {
      throw new BadRequestException('Can only resume paused campaigns');
    }

    const newStatus = campaign.current_influencers > 0 ? 'in_progress' : 'active';

    const { error } = await supabase
      .from('auto_campaigns')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new ConflictException('Failed to resume campaign');
    }

    return { message: 'Campaign resumed successfully', status: newStatus };
  }

  private transformCampaign(campaign: any) {
    return {
      id: campaign.id,
      userId: campaign.user_id,
      title: campaign.title,
      description: campaign.description,
      platform: campaign.platform,
      maxInfluencers: campaign.max_influencers,
      currentInfluencers: campaign.current_influencers,
      budget: campaign.budget,
      followerRange: campaign.follower_range,
      minEngagementRate: campaign.min_engagement_rate,
      targetInterests: campaign.target_interests,
      targetAgeGroups: campaign.target_age_groups,
      targetCountries: campaign.target_countries,
      enableChat: campaign.enable_chat,
      status: campaign.status,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at,
      user: campaign.user_profiles ? {
        id: campaign.user_profiles.user_id,
        fullName: campaign.user_profiles.full_name,
        username: campaign.user_profiles.username,
        avatar: campaign.user_profiles.avatar,
      } : undefined,
    };
  }
}
