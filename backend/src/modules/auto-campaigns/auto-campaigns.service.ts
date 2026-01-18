import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { CreateAutoCampaignDto, UpdateAutoCampaignDto } from './dto';

@Injectable()
export class AutoCampaignsService {
  private readonly logger = new Logger(AutoCampaignsService.name);
  private readonly OVERBOOKING_PERCENTAGE = 0.25;
  private readonly OFFER_RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour

  constructor(private supabaseService: SupabaseService) {}

  // Helper functions for matching
  private normalizeString(str: string): string {
    return str.trim().toLowerCase();
  }

  private normalizeArray(arr: string[]): string[] {
    return arr.map(s => this.normalizeString(s));
  }

  private arraysOverlap(arr1: string[], arr2: string[]): boolean {
    const normalized1 = this.normalizeArray(arr1);
    const normalized2 = this.normalizeArray(arr2);
    return normalized1.some(item => normalized2.includes(item));
  }

  private findPriceForFormat(pricing: Record<string, number>, format: string): number | null {
    const normalizedFormat = this.normalizeString(format);

    for (const [key, value] of Object.entries(pricing)) {
      if (this.normalizeString(key) === normalizedFormat) {
        return value;
      }
    }

    return null;
  }

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
      target_countries: createAutoCampaignDto.targetCountries || [],
      target_audience_interests: createAutoCampaignDto.targetAudienceInterests || [],
      product_categories: createAutoCampaignDto.productCategories || [],
      enable_chat: createAutoCampaignDto.enableChat !== false,
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
      targetCountries: 'target_countries',
      targetAudienceInterests: 'target_audience_interests',
      productCategories: 'product_categories',
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

    this.logger.log(`========================================`);
    this.logger.log(`🚀 Starting auto-offer distribution for campaign ${campaignId}`);
    this.logger.log(`📊 Campaign criteria:`);
    this.logger.log(`   - Platforms: [${campaign.platforms}]`);
    this.logger.log(`   - Audience: ${campaign.audience_min}-${campaign.audience_max}`);
    this.logger.log(`   - Budget: ${campaign.budget_min}-${campaign.budget_max} RUB`);
    this.logger.log(`   - Target count: ${campaign.target_influencers_count}`);
    this.logger.log(`   - Content types: [${campaign.content_types}]`);
    this.logger.log(`   - Target countries: ${campaign.target_countries?.length > 0 ? campaign.target_countries : '(not set)'}`);
    this.logger.log(`   - Target interests: ${campaign.target_audience_interests?.length > 0 ? campaign.target_audience_interests : '(not set)'}`);
    this.logger.log(`   - Product categories: ${campaign.product_categories?.length > 0 ? campaign.product_categories : '(not set)'}`);

    if (!campaign.platforms || campaign.platforms.length === 0) {
      this.logger.error(`❌ Campaign ${campaignId} has no platforms specified`);
      return;
    }

    if (!campaign.audience_min || !campaign.audience_max) {
      this.logger.error(`❌ Campaign ${campaignId} has invalid audience range`);
      return;
    }

    if (!campaign.target_influencers_count || campaign.target_influencers_count <= 0) {
      this.logger.error(`❌ Campaign ${campaignId} has invalid target influencers count`);
      return;
    }

    // Fetch active influencer cards with platform filter
    const platformsLowercase = campaign.platforms.map((p: string) => p.toLowerCase());
    this.logger.log(`\n📋 Querying database for active cards...`);
    this.logger.log(`   - Platforms: [${platformsLowercase}]`);
    this.logger.log(`   - is_active = true`);
    this.logger.log(`   - is_deleted = false`);

    const { data: influencerCards, error } = await supabase
      .from('influencer_cards')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .neq('user_id', campaign.advertiser_id)
      .in('platform', platformsLowercase);

    if (error) {
      this.logger.error(`❌ Failed to query influencer cards: ${error.message}`, error);
      return;
    }

    if (!influencerCards || influencerCards.length === 0) {
      this.logger.warn(`⚠️ No active influencer cards found with platforms: [${platformsLowercase}]`);
      return;
    }

    this.logger.log(`✅ Found ${influencerCards.length} active influencer cards`);

    // Group cards by influencer
    const cardsByInfluencer = new Map<string, any[]>();
    for (const card of influencerCards) {
      const influencerId = card.user_id;
      if (!cardsByInfluencer.has(influencerId)) {
        cardsByInfluencer.set(influencerId, []);
      }
      const influencerCardsList = cardsByInfluencer.get(influencerId);
      if (influencerCardsList) {
        influencerCardsList.push(card);
      }
    }

    this.logger.log(`✓ Grouped into ${cardsByInfluencer.size} unique influencers\n`);

    // Filter and match influencers
    interface MatchedInfluencer {
      influencerId: string;
      cardId: string;
      platform: string;
      followers: number;
      selectedFormat: string;
      selectedPrice: number;
      pricePerFollower: number;
    }

    const matched: MatchedInfluencer[] = [];
    let stats = {
      filteredByAudience: 0,
      filteredByContentTypes: 0,
      filteredByBudget: 0,
      filteredByCountries: 0,
      filteredByInterests: 0,
      filteredByCategories: 0
    };

    // Process each influencer
    for (const [influencerId, influencerCards] of cardsByInfluencer.entries()) {
      let bestMatch: MatchedInfluencer | null = null;
      let bestPrice = Infinity;

      for (const card of influencerCards) {
        try {
          const reach = card.reach || {};
          const serviceDetails = card.service_details || {};
          const audienceDemographics = card.audience_demographics || {};
          const followers = reach.followers || 0;
          const pricing = serviceDetails.pricing || {};
          const contentTypes = serviceDetails.contentTypes || [];

          // 1. Filter by audience (REQUIRED)
          if (followers < campaign.audience_min || followers > campaign.audience_max) {
            stats.filteredByAudience++;
            continue;
          }

          // 2. Filter by content types (REQUIRED) - case-insensitive
          const matchingContentTypes: string[] = [];
          for (const campaignType of campaign.content_types || []) {
            for (const cardType of contentTypes) {
              if (this.normalizeString(campaignType) === this.normalizeString(cardType)) {
                matchingContentTypes.push(cardType);
                break;
              }
            }
          }

          if (matchingContentTypes.length === 0) {
            stats.filteredByContentTypes++;
            continue;
          }

          // 3. Filter by countries (if specified) - case-insensitive
          if (campaign.target_countries && campaign.target_countries.length > 0) {
            let cardCountries: string[] = [];
            const topCountries = audienceDemographics.topCountries;
            if (topCountries) {
              if (Array.isArray(topCountries)) {
                cardCountries = topCountries.map((c: any) => typeof c === 'string' ? c : c.country);
              } else if (typeof topCountries === 'object') {
                cardCountries = Object.keys(topCountries);
              }
            }

            if (!this.arraysOverlap(campaign.target_countries, cardCountries)) {
              stats.filteredByCountries++;
              continue;
            }
          }

          // 4. Filter by interests (if specified) - case-insensitive
          if (campaign.target_audience_interests && campaign.target_audience_interests.length > 0) {
            let cardInterests: string[] = [];
            const interestsData = audienceDemographics.interests;
            if (Array.isArray(interestsData)) {
              cardInterests = interestsData;
            } else if (interestsData && typeof interestsData === 'object') {
              cardInterests = Object.keys(interestsData);
            }

            if (!this.arraysOverlap(campaign.target_audience_interests, cardInterests)) {
              stats.filteredByInterests++;
              continue;
            }
          }

          // 5. Filter by product categories (blacklist check) - case-insensitive
          if (campaign.product_categories && campaign.product_categories.length > 0) {
            const blacklistedCategories = serviceDetails.blacklistedProductCategories || [];
            if (this.arraysOverlap(campaign.product_categories, blacklistedCategories)) {
              stats.filteredByCategories++;
              continue;
            }
          }

          // 6. Find matching formats with prices in budget - case-insensitive
          const matchingFormats: Array<{format: string, price: number}> = [];
          for (const format of matchingContentTypes) {
            const price = this.findPriceForFormat(pricing, format);
            if (price && price > 0 && price >= campaign.budget_min && price <= campaign.budget_max) {
              matchingFormats.push({ format, price });
            }
          }

          if (matchingFormats.length === 0) {
            stats.filteredByBudget++;
            continue;
          }

          // Select cheapest format
          const cheapest = matchingFormats.reduce((min, curr) => curr.price < min.price ? curr : min);

          // Compare with best match for this influencer
          if (cheapest.price < bestPrice) {
            bestPrice = cheapest.price;
            const pricePerFollower = followers > 0 ? cheapest.price / followers : Infinity;

            bestMatch = {
              influencerId,
              cardId: card.id,
              platform: card.platform,
              followers,
              selectedFormat: cheapest.format,
              selectedPrice: cheapest.price,
              pricePerFollower
            };
          }
        } catch (err) {
          this.logger.error(`Error processing card ${card.id}:`, err);
          continue;
        }
      }

      if (bestMatch) {
        matched.push(bestMatch);
      }
    }

    this.logger.log(`\n📊 Filtering results:`);
    this.logger.log(`   Total cards: ${influencerCards.length}`);
    this.logger.log(`   Filtered by audience: ${stats.filteredByAudience}`);
    this.logger.log(`   Filtered by content types: ${stats.filteredByContentTypes}`);
    this.logger.log(`   Filtered by budget: ${stats.filteredByBudget}`);
    if (stats.filteredByCountries > 0) this.logger.log(`   Filtered by countries: ${stats.filteredByCountries}`);
    if (stats.filteredByInterests > 0) this.logger.log(`   Filtered by interests: ${stats.filteredByInterests}`);
    if (stats.filteredByCategories > 0) this.logger.log(`   Filtered by blacklisted categories: ${stats.filteredByCategories}`);
    this.logger.log(`   ✅ Final matches: ${matched.length} influencers\n`);

    if (matched.length === 0) {
      this.logger.warn(`⚠️ No matching influencers found after filtering`);
      return;
    }

    // Sort by price per follower (best value first)
    matched.sort((a, b) => a.pricePerFollower - b.pricePerFollower);

    // Apply overbooking
    const target = campaign.target_influencers_count;
    const overbookTarget = Math.ceil(target * (1 + this.OVERBOOKING_PERCENTAGE));
    const invitesToSend = Math.min(overbookTarget, matched.length);

    this.logger.log(`📈 Overbooking calculation:`);
    this.logger.log(`   Target: ${target} influencers`);
    this.logger.log(`   With overbooking (+${this.OVERBOOKING_PERCENTAGE * 100}%): ${overbookTarget}`);
    this.logger.log(`   Available: ${matched.length}`);
    this.logger.log(`   Will invite: ${invitesToSend}\n`);

    const influencersToInvite = matched.slice(0, invitesToSend);

    // Send offers with rate limit check
    let sentCount = 0;
    let skippedRateLimit = 0;
    let failedCount = 0;

    this.logger.log(`📤 Sending offers...`);

    for (const match of influencersToInvite) {
      try {
        // Check rate limit
        const canSend = await this.checkRateLimit(campaign.advertiser_id, match.influencerId);
        if (!canSend) {
          this.logger.log(`   ⏱️ Rate limit: skipping influencer ${match.influencerId}`);
          skippedRateLimit++;
          continue;
        }

        // Create offer
        await this.createAutoCampaignOffer(campaign, match, campaignId);
        sentCount++;
        this.logger.log(`   ✅ Sent offer #${sentCount} to influencer ${match.influencerId} (${match.selectedFormat} @ ${match.selectedPrice} RUB)`);
      } catch (error) {
        this.logger.error(`   ❌ Failed to send offer to influencer ${match.influencerId}:`, error);
        failedCount++;
      }
    }

    this.logger.log(`\n📊 Final results:`);
    this.logger.log(`   ✅ Sent: ${sentCount}`);
    this.logger.log(`   ⏱️ Skipped (rate limit): ${skippedRateLimit}`);
    this.logger.log(`   ❌ Failed: ${failedCount}`);

    // Update campaign counters
    if (sentCount > 0) {
      const { error: updateError } = await supabase
        .from('auto_campaigns')
        .update({ sent_offers_count: sentCount })
        .eq('id', campaignId);

      if (updateError) {
        this.logger.error(`❌ Failed to update campaign counters:`, updateError);
      } else {
        this.logger.log(`\n✅ Campaign counters updated: ${sentCount} offers sent`);
      }
    }

    this.logger.log(`========================================\n`);
  }

  private async checkRateLimit(senderId: string, receiverId: string): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();
    const oneHourAgo = new Date(Date.now() - this.OFFER_RATE_LIMIT_MS).toISOString();

    const { data, error } = await supabase
      .from('offers')
      .select('offer_id')
      .eq('advertiser_id', senderId)
      .eq('influencer_id', receiverId)
      .gte('created_at', oneHourAgo)
      .in('status', ['pending', 'accepted'])
      .limit(1);

    if (error) {
      this.logger.error('Rate limit check error:', error);
      return true; // Allow sending on error
    }

    return !data || data.length === 0;
  }

  private async createAutoCampaignOffer(campaign: any, match: any, campaignId: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    const newOffer = {
      influencer_id: match.influencerId,
      advertiser_id: campaign.advertiser_id,
      campaign_id: null,
      auto_campaign_id: campaignId,
      initiated_by: campaign.advertiser_id,
      proposed_rate: match.selectedPrice,
      currency: 'RUB',
      status: 'pending',
      details: {
        title: `Предложение о сотрудничестве: ${campaign.title}`,
        description: campaign.description || 'Мы заинтересованы в сотрудничестве с вами.',
        content_type: match.selectedFormat,
        deliverables: [match.selectedFormat],
        platform: match.platform,
        influencer_card_id: match.cardId,
        current_stage: 'negotiation',
        influencer_response: 'pending',
        advertiser_response: 'pending',
        enable_chat: campaign.enable_chat !== false,
        timeline: {
          start_date: campaign.start_date,
          end_date: campaign.end_date
        }
      },
      timeline: {
        created_at: new Date().toISOString(),
        start_date: campaign.start_date,
        end_date: campaign.end_date
      },
      metadata: {
        viewCount: 0,
        isAutoCampaign: true,
        autoCampaignId: campaignId,
        sourceType: 'auto_campaign',
        selectedFormat: match.selectedFormat,
        calculatedPrice: match.selectedPrice,
        pricePerFollower: match.pricePerFollower,
        enableChat: campaign.enable_chat !== false,
        campaignTitle: campaign.title,
        campaignDescription: campaign.description,
        budgetMin: campaign.budget_min,
        budgetMax: campaign.budget_max,
        audienceMin: campaign.audience_min,
        audienceMax: campaign.audience_max,
        targetAudienceInterests: campaign.target_audience_interests || [],
        targetCountries: campaign.target_countries || [],
        productCategories: campaign.product_categories || [],
        contentTypes: campaign.content_types || [],
        platforms: campaign.platforms || [],
        influencerFollowers: match.followers,
        influencerPlatform: match.platform
      }
    };

    const { error } = await supabase
      .from('offers')
      .insert(newOffer);

    if (error) {
      throw new Error(`Failed to create offer: ${error.message}`);
    }
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
    const details = offer.details || {};
    const metadata = offer.metadata || {};

    return {
      id: offer.offer_id || offer.id,
      offerId: offer.offer_id || offer.id,
      advertiserId: offer.advertiser_id,
      influencerId: offer.influencer_id,
      initiatedBy: offer.initiated_by,
      autoCampaignId: offer.auto_campaign_id,
      title: details.title || offer.title || 'Без названия',
      description: details.description || offer.description || '',
      proposedRate: details.proposed_rate || offer.proposed_rate || offer.amount || 0,
      amount: offer.amount,
      currency: details.currency || offer.currency || 'RUB',
      contentType: details.content_type || offer.content_type || null,
      deliverables: details.deliverables || offer.deliverables || [],
      timeline: details.timeline || offer.timeline || null,
      platform: details.platform || offer.platform || null,
      integrationType: details.integration_type || offer.integration_type || null,
      status: offer.status,
      currentStage: details.current_stage || offer.current_stage || 'negotiation',
      metadata: metadata,
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
      targetCountries: campaign.target_countries || [],
      targetAudienceInterests: campaign.target_audience_interests || [],
      productCategories: campaign.product_categories || [],
      enableChat: campaign.enable_chat !== false,
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
