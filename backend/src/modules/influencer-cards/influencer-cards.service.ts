import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { CreateInfluencerCardDto, UpdateInfluencerCardDto } from './dto';

@Injectable()
export class InfluencerCardsService {
  private readonly logger = new Logger(InfluencerCardsService.name);

  constructor(private supabaseService: SupabaseService) {}

  async create(userId: string, createInfluencerCardDto: CreateInfluencerCardDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', userId)
      .maybeSingle();

    if (userError || !user) {
      throw new NotFoundException('User not found');
    }

    if (user.user_type !== 'influencer') {
      throw new ForbiddenException('Only influencers can create influencer cards');
    }

    const cardData = {
      user_id: userId,
      platform: createInfluencerCardDto.platform,
      reach: createInfluencerCardDto.reach,
      audience_demographics: createInfluencerCardDto.audienceDemographics,
      service_details: createInfluencerCardDto.serviceDetails,
      rating: 0,
      completed_campaigns: 0,
      is_active: createInfluencerCardDto.isActive ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: card, error } = await supabase
      .from('influencer_cards')
      .insert(cardData)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create influencer card: ${error.message}`, error);
      throw new ConflictException('Failed to create influencer card');
    }

    return this.transformCard(card);
  }

  async findAll(filters?: {
    platform?: string;
    minFollowers?: number;
    maxFollowers?: number;
    userId?: string;
    countries?: string[];
    searchQuery?: string;
  }) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('influencer_cards')
      .select('*, user_profiles!inner(*)')
      .eq('is_active', true);

    if (filters?.platform) {
      query = query.eq('platform', filters.platform);
    }

    if (filters?.minFollowers) {
      query = query.gte('reach->>followers', filters.minFollowers);
    }

    if (filters?.maxFollowers) {
      query = query.lte('reach->>followers', filters.maxFollowers);
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    const { data: cards, error } = await query.order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch influencer cards: ${error.message}`, error);
      return [];
    }

    let filteredCards = cards;

    if (filters?.countries && filters.countries.length > 0) {
      const countriesToFilter = filters.countries;
      filteredCards = filteredCards.filter((card) => {
        const topCountries = card.audience_demographics?.topCountries || [];
        return countriesToFilter.some((country) =>
          topCountries.some((tc: string) => tc.toLowerCase().includes(country.toLowerCase()))
        );
      });
    }

    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      filteredCards = filteredCards.filter((card) => {
        const description = card.service_details?.description?.toLowerCase() || '';
        const contentTypes = (card.service_details?.contentTypes || []).join(' ').toLowerCase();
        const interests = (card.audience_demographics?.interests || []).join(' ').toLowerCase();
        return (
          description.includes(searchLower) ||
          contentTypes.includes(searchLower) ||
          interests.includes(searchLower)
        );
      });
    }

    return filteredCards.map((card) => this.transformCard(card));
  }

  async findOne(id: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: card, error } = await supabase
      .from('influencer_cards')
      .select('*, user_profiles!inner(*)')
      .eq('id', id)
      .maybeSingle();

    if (error || !card) {
      throw new NotFoundException('Influencer card not found');
    }

    return this.transformCard(card);
  }

  async update(id: string, userId: string, updateInfluencerCardDto: UpdateInfluencerCardDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: existingCard } = await supabase
      .from('influencer_cards')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();

    if (!existingCard) {
      throw new NotFoundException('Influencer card not found');
    }

    if (existingCard.user_id !== userId) {
      throw new ForbiddenException('You can only update your own cards');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updateInfluencerCardDto.platform !== undefined) {
      updateData.platform = updateInfluencerCardDto.platform;
    }
    if (updateInfluencerCardDto.reach !== undefined) {
      updateData.reach = updateInfluencerCardDto.reach;
    }
    if (updateInfluencerCardDto.audienceDemographics !== undefined) {
      updateData.audience_demographics = updateInfluencerCardDto.audienceDemographics;
    }
    if (updateInfluencerCardDto.serviceDetails !== undefined) {
      updateData.service_details = updateInfluencerCardDto.serviceDetails;
    }
    if (updateInfluencerCardDto.isActive !== undefined) {
      updateData.is_active = updateInfluencerCardDto.isActive;
    }

    const { data: updatedCard, error } = await supabase
      .from('influencer_cards')
      .update(updateData)
      .eq('id', id)
      .select('*, user_profiles!inner(*)')
      .single();

    if (error) {
      this.logger.error(`Failed to update influencer card: ${error.message}`, error);
      throw new ConflictException('Failed to update influencer card');
    }

    return this.transformCard(updatedCard);
  }

  async delete(id: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: existingCard } = await supabase
      .from('influencer_cards')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();

    if (!existingCard) {
      throw new NotFoundException('Influencer card not found');
    }

    if (existingCard.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own cards');
    }

    const { error } = await supabase
      .from('influencer_cards')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete influencer card: ${error.message}`, error);
      throw new ConflictException('Failed to delete influencer card');
    }

    return { message: 'Influencer card deleted successfully' };
  }

  async getCardAnalytics(id: string) {
    const card = await this.findOne(id);

    return {
      cardId: card.id,
      platform: card.platform,
      followers: card.reach.followers,
      engagementRate: card.reach.engagementRate,
      averageViews: card.reach.averageViews,
      rating: card.rating,
      completedCampaigns: card.completedCampaigns,
      topAgeGroup: this.getTopValue(card.audienceDemographics.ageGroups),
      topGender: this.getTopValue(card.audienceDemographics.genderSplit),
      topCountries: card.audienceDemographics.topCountries.slice(0, 3),
    };
  }

  private getTopValue(obj: Record<string, number>): string {
    return Object.entries(obj).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  }

  private transformCard(card: any) {
    return {
      id: card.id,
      userId: card.user_id,
      platform: card.platform,
      reach: card.reach,
      audienceDemographics: card.audience_demographics,
      serviceDetails: card.service_details,
      rating: card.rating,
      completedCampaigns: card.completed_campaigns,
      isActive: card.is_active,
      createdAt: card.created_at,
      updatedAt: card.updated_at,
      user: card.user_profiles ? {
        id: card.user_profiles.user_id,
        fullName: card.user_profiles.full_name,
        username: card.user_profiles.username,
        avatar: card.user_profiles.avatar,
      } : undefined,
    };
  }
}
