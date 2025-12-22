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
      advertiser_id: userId,
      title: createAutoCampaignDto.title,
      description: createAutoCampaignDto.description,
      platforms: [createAutoCampaignDto.platform],
      target_influencers_count: createAutoCampaignDto.maxInfluencers,
      budget_min: createAutoCampaignDto.budget?.amount || 0,
      budget_max: createAutoCampaignDto.budget?.amount || 0,
      audience_min: createAutoCampaignDto.followerRange.min,
      audience_max: createAutoCampaignDto.followerRange.max,
      target_audience_interests: createAutoCampaignDto.targetInterests || [],
      target_age_groups: createAutoCampaignDto.targetAgeGroups ? Object.keys(createAutoCampaignDto.targetAgeGroups) : [],
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
      .select('*, user_profiles!auto_campaigns_advertiser_id_fkey(*)');

    if (filters?.platform) {
      query = query.contains('platforms', [filters.platform]);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    } else {
      query = query.in('status', ['active', 'in_progress']);
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

    if (updateAutoCampaignDto.followerRange) {
      if (updateAutoCampaignDto.followerRange.max <= updateAutoCampaignDto.followerRange.min) {
        throw new BadRequestException('Max followers must be greater than min followers');
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updateAutoCampaignDto.title !== undefined) {
      updateData.title = updateAutoCampaignDto.title;
    }
    if (updateAutoCampaignDto.description !== undefined) {
      updateData.description = updateAutoCampaignDto.description;
    }
    if (updateAutoCampaignDto.platform !== undefined) {
      updateData.platforms = [updateAutoCampaignDto.platform];
    }
    if (updateAutoCampaignDto.maxInfluencers !== undefined) {
      updateData.target_influencers_count = updateAutoCampaignDto.maxInfluencers;
    }
    if (updateAutoCampaignDto.budget !== undefined) {
      updateData.budget_min = updateAutoCampaignDto.budget.amount;
      updateData.budget_max = updateAutoCampaignDto.budget.amount;
    }
    if (updateAutoCampaignDto.followerRange !== undefined) {
      updateData.audience_min = updateAutoCampaignDto.followerRange.min;
      updateData.audience_max = updateAutoCampaignDto.followerRange.max;
    }
    if (updateAutoCampaignDto.targetInterests !== undefined) {
      updateData.target_audience_interests = updateAutoCampaignDto.targetInterests;
    }
    if (updateAutoCampaignDto.targetAgeGroups !== undefined) {
      updateData.target_age_groups = Object.keys(updateAutoCampaignDto.targetAgeGroups);
    }
    if (updateAutoCampaignDto.targetCountries !== undefined) {
      updateData.target_countries = updateAutoCampaignDto.targetCountries;
    }
    if (updateAutoCampaignDto.enableChat !== undefined) {
      updateData.enable_chat = updateAutoCampaignDto.enableChat;
    }

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

    const platforms = campaign.platforms || [campaign.platform];
    const primaryPlatform = platforms[0];

    let query = supabase
      .from('influencer_cards')
      .select('*, user_profiles!inner(*)')
      .eq('is_active', true);

    if (primaryPlatform) {
      query = query.eq('platform', primaryPlatform);
    }

    const { data: influencerCards, error } = await query;

    if (error) {
      this.logger.error(`Failed to find matches: ${error.message}`, error);
      return [];
    }

    const matchedCards = influencerCards.filter((card) => {
      const followers = card.reach?.followers || 0;
      if (followers < campaign.audienceMin || followers > campaign.audienceMax) {
        return false;
      }

      const cardInterests = card.audience_demographics?.interests || [];
      const targetInterests = campaign.targetAudienceInterests || [];
      if (targetInterests.length > 0) {
        const hasMatchingInterest = targetInterests.some((interest: string) =>
          cardInterests.includes(interest),
        );
        if (!hasMatchingInterest) {
          return false;
        }
      }

      return true;
    });

    const remainingSlots = campaign.targetInfluencersCount - campaign.acceptedOffersCount;
    return matchedCards.slice(0, Math.max(0, remainingSlots));
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
      .select('advertiser_id, status, accepted_offers_count, target_influencers_count')
      .eq('id', id)
      .maybeSingle();

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.advertiser_id !== userId) {
      throw new ForbiddenException('You can only resume your own campaigns');
    }

    if (campaign.status !== 'paused') {
      throw new BadRequestException('Can only resume paused campaigns');
    }

    const newStatus = (campaign.accepted_offers_count || 0) > 0 ? 'in_progress' : 'active';

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
    const platforms = campaign.platforms || [];
    const primaryPlatform = platforms[0] || null;

    return {
      id: campaign.id,
      advertiserId: campaign.advertiser_id,
      userId: campaign.advertiser_id,
      title: campaign.title,
      description: campaign.description,
      platform: primaryPlatform,
      platforms: platforms,
      maxInfluencers: campaign.target_influencers_count,
      targetInfluencersCount: campaign.target_influencers_count,
      currentInfluencers: campaign.accepted_offers_count || 0,
      acceptedOffersCount: campaign.accepted_offers_count || 0,
      sentOffersCount: campaign.sent_offers_count || 0,
      completedOffersCount: campaign.completed_offers_count || 0,
      budget: {
        amount: campaign.budget_max || campaign.budget_min || 0,
        currency: 'RUB',
      },
      budgetMin: campaign.budget_min,
      budgetMax: campaign.budget_max,
      followerRange: {
        min: campaign.audience_min,
        max: campaign.audience_max,
      },
      audienceMin: campaign.audience_min,
      audienceMax: campaign.audience_max,
      minEngagementRate: 0,
      targetInterests: campaign.target_audience_interests || [],
      targetAudienceInterests: campaign.target_audience_interests || [],
      targetAgeGroups: campaign.target_age_groups || [],
      targetCountries: campaign.target_countries || [],
      enableChat: campaign.enable_chat,
      status: campaign.status,
      startDate: campaign.start_date,
      endDate: campaign.end_date,
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
