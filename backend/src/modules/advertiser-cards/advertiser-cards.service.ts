import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { CreateAdvertiserCardDto, UpdateAdvertiserCardDto } from './dto';

@Injectable()
export class AdvertiserCardsService {
  private readonly logger = new Logger(AdvertiserCardsService.name);

  constructor(private supabaseService: SupabaseService) {}

  async create(userId: string, createAdvertiserCardDto: CreateAdvertiserCardDto) {
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
      throw new ForbiddenException('Only advertisers can create advertiser cards');
    }

    const startDate = new Date(createAdvertiserCardDto.campaignDuration.startDate);
    const endDate = new Date(createAdvertiserCardDto.campaignDuration.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    if (startDate < new Date()) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    const cardData = {
      user_id: userId,
      company_name: createAdvertiserCardDto.companyName,
      campaign_title: createAdvertiserCardDto.campaignTitle,
      campaign_description: createAdvertiserCardDto.campaignDescription,
      platform: createAdvertiserCardDto.platform,
      product_categories: createAdvertiserCardDto.productCategories,
      budget: createAdvertiserCardDto.budget,
      service_format: createAdvertiserCardDto.serviceFormat,
      campaign_duration: createAdvertiserCardDto.campaignDuration,
      influencer_requirements: createAdvertiserCardDto.influencerRequirements,
      target_audience: createAdvertiserCardDto.targetAudience,
      contact_info: createAdvertiserCardDto.contactInfo,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: card, error } = await supabase
      .from('advertiser_cards')
      .insert(cardData)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create advertiser card: ${error.message}`, error);
      throw new ConflictException('Failed to create advertiser card');
    }

    return this.transformCard(card);
  }

  async findAll(filters?: { platform?: string; minBudget?: number; maxBudget?: number; userId?: string }) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('advertiser_cards')
      .select('*, user_profiles!inner(*)')
      .eq('is_active', true)
      .gte('campaign_duration->>endDate', new Date().toISOString());

    if (filters?.platform) {
      query = query.eq('platform', filters.platform);
    }

    if (filters?.minBudget) {
      query = query.gte('budget->>amount', filters.minBudget);
    }

    if (filters?.maxBudget) {
      query = query.lte('budget->>amount', filters.maxBudget);
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    const { data: cards, error } = await query.order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch advertiser cards: ${error.message}`, error);
      return [];
    }

    return cards.map((card) => this.transformCard(card));
  }

  async findOne(id: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: card, error } = await supabase
      .from('advertiser_cards')
      .select('*, user_profiles!inner(*)')
      .eq('id', id)
      .maybeSingle();

    if (error || !card) {
      throw new NotFoundException('Advertiser card not found');
    }

    return this.transformCard(card);
  }

  async update(id: string, userId: string, updateAdvertiserCardDto: UpdateAdvertiserCardDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: existingCard } = await supabase
      .from('advertiser_cards')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();

    if (!existingCard) {
      throw new NotFoundException('Advertiser card not found');
    }

    if (existingCard.user_id !== userId) {
      throw new ForbiddenException('You can only update your own cards');
    }

    if (updateAdvertiserCardDto.campaignDuration) {
      const startDate = new Date(updateAdvertiserCardDto.campaignDuration.startDate);
      const endDate = new Date(updateAdvertiserCardDto.campaignDuration.endDate);

      if (endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    const fieldMappings: Record<string, string> = {
      companyName: 'company_name',
      campaignTitle: 'campaign_title',
      campaignDescription: 'campaign_description',
      platform: 'platform',
      productCategories: 'product_categories',
      budget: 'budget',
      serviceFormat: 'service_format',
      campaignDuration: 'campaign_duration',
      influencerRequirements: 'influencer_requirements',
      targetAudience: 'target_audience',
      contactInfo: 'contact_info',
    };

    Object.entries(fieldMappings).forEach(([dtoKey, dbKey]) => {
      if ((updateAdvertiserCardDto as any)[dtoKey] !== undefined) {
        updateData[dbKey] = (updateAdvertiserCardDto as any)[dtoKey];
      }
    });

    const { data: updatedCard, error } = await supabase
      .from('advertiser_cards')
      .update(updateData)
      .eq('id', id)
      .select('*, user_profiles!inner(*)')
      .single();

    if (error) {
      this.logger.error(`Failed to update advertiser card: ${error.message}`, error);
      throw new ConflictException('Failed to update advertiser card');
    }

    return this.transformCard(updatedCard);
  }

  async delete(id: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: existingCard } = await supabase
      .from('advertiser_cards')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();

    if (!existingCard) {
      throw new NotFoundException('Advertiser card not found');
    }

    if (existingCard.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own cards');
    }

    const { error } = await supabase
      .from('advertiser_cards')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete advertiser card: ${error.message}`, error);
      throw new ConflictException('Failed to delete advertiser card');
    }

    return { message: 'Advertiser card deleted successfully' };
  }

  private transformCard(card: any) {
    return {
      id: card.id,
      userId: card.user_id,
      companyName: card.company_name,
      campaignTitle: card.campaign_title,
      campaignDescription: card.campaign_description,
      platform: card.platform,
      productCategories: card.product_categories,
      budget: card.budget,
      serviceFormat: card.service_format,
      campaignDuration: card.campaign_duration,
      influencerRequirements: card.influencer_requirements,
      targetAudience: card.target_audience,
      contactInfo: card.contact_info,
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
