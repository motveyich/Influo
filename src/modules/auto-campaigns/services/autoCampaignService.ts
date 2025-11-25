import { supabase, TABLES } from '../../../core/supabase';
import { AutoCampaign, AutoCampaignFormData, CollaborationOffer, InfluencerCard } from '../../../core/types';
import { OVERBOOKING_PERCENTAGE, OFFER_RATE_LIMIT_MS } from '../../../core/constants';
import { offerService } from '../../offers/services/offerService';
import { analytics } from '../../../core/analytics';

interface MatchedInfluencer {
  card: InfluencerCard;
  selectedFormat: string;
  selectedPrice: number;
  pricePerFollower: number;
  priceDifference: number;
}

interface FilteringStats {
  totalCards: number;
  afterPlatform: number;
  afterAudience: number;
  afterContentTypes: number;
  afterBudget: number;
  afterCountries: number;
  afterInterests: number;
  afterProductCategories: number;
  matched: number;
}

export class AutoCampaignService {

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

  async createCampaign(advertiserId: string, data: AutoCampaignFormData): Promise<AutoCampaign> {
    // Вычисляем идеальную цену за подписчика
    const avgBudget = (data.budgetMin + data.budgetMax) / 2;
    const avgAudience = (data.audienceMin + data.audienceMax) / 2;
    const targetPricePerFollower = avgAudience / avgBudget;

    // Нормализуем платформы в lowercase для совместимости с БД
    const normalizedPlatforms = data.platforms.map(p => p.toLowerCase());

    const { data: campaign, error } = await supabase
      .from(TABLES.AUTO_CAMPAIGNS)
      .insert({
        advertiser_id: advertiserId,
        title: data.title,
        description: data.description,
        status: 'draft',
        budget_min: data.budgetMin,
        budget_max: data.budgetMax,
        audience_min: data.audienceMin,
        audience_max: data.audienceMax,
        target_influencers_count: data.targetInfluencersCount,
        content_types: data.contentTypes,
        platforms: normalizedPlatforms,
        target_countries: data.targetCountries,
        target_audience_interests: data.targetAudienceInterests,
        product_categories: data.productCategories,
        enable_chat: data.enableChat,
        start_date: data.startDate,
        end_date: data.endDate,
        target_price_per_follower: targetPricePerFollower,
      })
      .select()
      .single();

    if (error) throw error;

    analytics.track('auto_campaign_created', {
      campaignId: campaign.id,
      advertiserId,
      targetCount: data.targetInfluencersCount
    });

    return this.mapCampaignFromDb(campaign);
  }

  async getCampaigns(userId: string): Promise<AutoCampaign[]> {
    const { data: ownCampaigns, error: ownError } = await supabase
      .from(TABLES.AUTO_CAMPAIGNS)
      .select('*')
      .eq('advertiser_id', userId)
      .order('created_at', { ascending: false});

    if (ownError) throw ownError;

    const { data: participatingOffers, error: offersError } = await supabase
      .from('offers')
      .select('auto_campaign_id')
      .eq('influencer_id', userId)
      .eq('status', 'accepted')
      .not('auto_campaign_id', 'is', null);

    if (offersError) throw offersError;

    const participatingCampaignIds = new Set(
      (participatingOffers || [])
        .map(o => o.auto_campaign_id)
        .filter(id => id !== null)
    );

    if (participatingCampaignIds.size === 0) {
      return (ownCampaigns || []).map(c => this.mapCampaignFromDb(c));
    }

    const { data: participatingCampaigns, error: participatingError } = await supabase
      .from(TABLES.AUTO_CAMPAIGNS)
      .select('*')
      .in('id', Array.from(participatingCampaignIds))
      .order('created_at', { ascending: false});

    if (participatingError) throw participatingError;

    const allCampaigns = [
      ...(ownCampaigns || []),
      ...(participatingCampaigns || [])
    ];

    const uniqueCampaigns = Array.from(
      new Map(allCampaigns.map(c => [c.id, c])).values()
    );

    return uniqueCampaigns
      .map(c => ({
        ...this.mapCampaignFromDb(c),
        isParticipating: participatingCampaignIds.has(c.id)
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getActiveCampaigns(currentUserId?: string): Promise<AutoCampaign[]> {
    const { data, error } = await supabase
      .from(TABLES.AUTO_CAMPAIGNS)
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const campaigns = (data || []).map(c => this.mapCampaignFromDb(c));

    if (!currentUserId) {
      return campaigns;
    }

    const { data: participatingOffers } = await supabase
      .from('offers')
      .select('auto_campaign_id')
      .eq('influencer_id', currentUserId)
      .eq('status', 'accepted')
      .not('auto_campaign_id', 'is', null);

    const participatingCampaignIds = new Set(
      (participatingOffers || [])
        .map(o => o.auto_campaign_id)
        .filter(id => id !== null)
    );

    return campaigns.filter(campaign => !participatingCampaignIds.has(campaign.id));
  }

  async getCampaign(campaignId: string): Promise<AutoCampaign | null> {
    try {
      console.log(`[getCampaign] Fetching campaign: ${campaignId}`);

      const { data, error } = await supabase
        .from(TABLES.AUTO_CAMPAIGNS)
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) {
        console.error('[getCampaign] Database error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });

        if (error.code === 'PGRST116') {
          console.log('[getCampaign] Campaign not found (404)');
          return null;
        }
        throw error;
      }

      if (!data) {
        console.log('[getCampaign] No data returned');
        return null;
      }

      console.log('[getCampaign] Campaign data received:', {
        id: data.id,
        title: data.title,
        status: data.status,
        platforms: data.platforms,
        contentTypes: data.content_types
      });

      return this.mapCampaignFromDb(data);
    } catch (error) {
      console.error('[getCampaign] Unexpected error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Ошибка сети: не удалось подключиться к базе данных. Проверьте соединение с интернетом.');
      }
      throw error;
    }
  }

  async updateCampaign(campaignId: string, updates: Partial<AutoCampaignFormData>): Promise<AutoCampaign> {
    const dbUpdates: any = {};

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.budgetMin !== undefined) dbUpdates.budget_min = updates.budgetMin;
    if (updates.budgetMax !== undefined) dbUpdates.budget_max = updates.budgetMax;
    if (updates.audienceMin !== undefined) dbUpdates.audience_min = updates.audienceMin;
    if (updates.audienceMax !== undefined) dbUpdates.audience_max = updates.audienceMax;
    if (updates.targetInfluencersCount !== undefined) dbUpdates.target_influencers_count = updates.targetInfluencersCount;
    if (updates.contentTypes !== undefined) dbUpdates.content_types = updates.contentTypes;
    if (updates.platforms !== undefined) {
      // Нормализуем платформы в lowercase
      dbUpdates.platforms = updates.platforms.map(p => p.toLowerCase());
    }
    if (updates.targetCountries !== undefined) dbUpdates.target_countries = updates.targetCountries;
    if (updates.targetAudienceInterests !== undefined) dbUpdates.target_audience_interests = updates.targetAudienceInterests;
    if (updates.productCategories !== undefined) dbUpdates.product_categories = updates.productCategories;
    if (updates.enableChat !== undefined) dbUpdates.enable_chat = updates.enableChat;
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
    if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;

    // Пересчитываем идеальную цену если изменились диапазоны
    if (updates.budgetMin !== undefined || updates.budgetMax !== undefined ||
        updates.audienceMin !== undefined || updates.audienceMax !== undefined) {
      const campaign = await this.getCampaign(campaignId);
      if (campaign) {
        const budgetMin = updates.budgetMin ?? campaign.budgetMin;
        const budgetMax = updates.budgetMax ?? campaign.budgetMax;
        const audienceMin = updates.audienceMin ?? campaign.audienceMin;
        const audienceMax = updates.audienceMax ?? campaign.audienceMax;

        const avgBudget = (budgetMin + budgetMax) / 2;
        const avgAudience = (audienceMin + audienceMax) / 2;
        // Исправлено: цена ЗА подписчика = бюджет / аудитория
        dbUpdates.target_price_per_follower = avgBudget / avgAudience;
      }
    }

    const { data, error } = await supabase
      .from(TABLES.AUTO_CAMPAIGNS)
      .update(dbUpdates)
      .eq('id', campaignId)
      .select()
      .single();

    if (error) throw error;
    return this.mapCampaignFromDb(data);
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.AUTO_CAMPAIGNS)
      .delete()
      .eq('id', campaignId);

    if (error) throw error;

    analytics.track('auto_campaign_deleted', { campaignId });
  }

  async launchCampaign(campaignId: string, advertiserId: string): Promise<void> {
    console.log('\n========== LAUNCHING CAMPAIGN ==========');
    console.log(`Campaign ID: ${campaignId}`);
    console.log(`Advertiser ID: ${advertiserId}`);

    let campaign: AutoCampaign | null;
    try {
      campaign = await this.getCampaign(campaignId);
    } catch (error) {
      console.error('[launchCampaign] Failed to fetch campaign:', error);
      throw new Error(`Не удалось загрузить данные кампании: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }

    if (!campaign) {
      throw new Error('Кампания не найдена. Возможно, она была удалена.');
    }

    if (campaign.status !== 'draft') {
      throw new Error(`Кампания уже запущена. Текущий статус: ${campaign.status}`);
    }

    console.log(`Campaign: ${campaign.title}`);
    console.log(`Target influencers: ${campaign.targetInfluencersCount}`);

    // Подбираем инфлюенсеров
    const result = await this.findMatchingInfluencers(campaign);

    if (result.length === 0) {
      console.log('⚠️  No matching influencers found');

      // Генерируем рекомендации на основе логов
      const recommendations: string[] = [];

      // Эти рекомендации должны быть основаны на реальной статистике фильтрации
      // Для простоты приведем общие рекомендации
      recommendations.push('💡 Попробуйте расширить параметры кампании:');
      recommendations.push('   • Увеличьте максимальный бюджет');
      recommendations.push('   • Расширьте диапазон аудитории (подписчиков)');
      recommendations.push('   • Добавьте больше типов контента');
      recommendations.push('   • Уберите фильтры по странам или интересам, если они указаны');

      const errorMessage = [
        'Не найдено инфлюенсеров по заданным критериям.',
        '',
        ...recommendations
      ].join('\n');

      throw new Error(errorMessage);
    }

    const matchedInfluencers = result;

    // Рассчитываем сколько отправлять приглашений
    // Применяем овербукинг (25%) для компенсации возможных отказов
    const target = campaign.targetInfluencersCount;
    const overbookTarget = Math.ceil(target * (1 + OVERBOOKING_PERCENTAGE));
    const available = matchedInfluencers.length;

    // Отправляем все доступные, но не больше чем ovebook target
    // Если доступен 1 инфлюенсер, а целевое число 1 - отправим этому 1
    const invitesToSend = Math.min(overbookTarget, available);

    console.log(`\n📊 Invitation calculation:`);
    console.log(`  Target: ${target} influencers`);
    console.log(`  With overbooking (+25%): ${overbookTarget} influencers`);
    console.log(`  Available matches: ${available} influencers`);
    console.log(`  Will send invites to: ${invitesToSend} influencers`);

    const influencersToInvite = matchedInfluencers.slice(0, invitesToSend);

    // Обновляем статус кампании на active
    console.log('\n🔄 Updating campaign status to active...');
    const { error: statusError } = await supabase
      .from(TABLES.AUTO_CAMPAIGNS)
      .update({ status: 'active' })
      .eq('id', campaignId);

    if (statusError) {
      console.error('❌ Failed to update campaign status:', statusError);
      throw new Error(`Не удалось обновить статус кампании: ${statusError.message}`);
    }
    console.log('✅ Campaign status updated to active');

    console.log(`\n📤 Sending offers to ${influencersToInvite.length} influencers...`);

    // Отправляем предложения
    let sentCount = 0;
    let skippedRateLimit = 0;
    let failedCount = 0;

    for (const matched of influencersToInvite) {
      try {
        // Проверяем rate limit (1 предложение в час между парой пользователей)
        const canSend = await this.checkRateLimit(advertiserId, matched.card.influencerId);
        if (!canSend) {
          console.log(`  ⏱️  Rate limit: skipping influencer ${matched.card.influencerId}`);
          skippedRateLimit++;
          continue;
        }

        // Создаем предложение
        await this.createAutoCampaignOffer(campaign, matched, advertiserId);
        sentCount++;
        console.log(`  ✅ Sent offer #${sentCount} to influencer ${matched.card.influencerId}`);
      } catch (error) {
        console.error(`  ❌ Failed to send offer to influencer ${matched.card.influencerId}:`, error);
        failedCount++;
      }
    }

    console.log(`\n📈 Sending complete:`);
    console.log(`  ✅ Sent: ${sentCount}`);
    console.log(`  ⏱️  Skipped (rate limit): ${skippedRateLimit}`);
    console.log(`  ❌ Failed: ${failedCount}`);

    // Обновляем счетчики
    // Кампания остается active даже если sentCount = 0
    // (возможно, все были пропущены по rate limit, но они станут доступны позже)
    console.log('\n🔄 Updating campaign counters...');
    const { error: counterError } = await supabase
      .from(TABLES.AUTO_CAMPAIGNS)
      .update({
        sent_offers_count: sentCount
      })
      .eq('id', campaignId);

    if (counterError) {
      console.error('❌ Failed to update counters:', counterError);
      // Не выбрасываем ошибку - кампания уже активна
    } else {
      console.log('✅ Campaign counters updated');
    }

    if (sentCount === 0) {
      console.log('⚠️  No offers were sent (all skipped by rate limit or failed)');
      // НЕ выбрасываем ошибку! Кампания активна, предложения можно отправить позже
    }

    analytics.track('auto_campaign_launched', {
      campaignId,
      targetCount: campaign.targetInfluencersCount,
      matchedCount: matchedInfluencers.length,
      invitedCount: influencersToInvite.length,
      sentCount,
      skippedRateLimit,
      failedCount
    });

    console.log(`========== CAMPAIGN LAUNCHED ==========\n`);
  }

  private async findMatchingInfluencers(campaign: AutoCampaign): Promise<MatchedInfluencer[]> {
    console.log('\n========== STARTING INFLUENCER MATCHING ==========');
    console.log('Campaign:', {
      id: campaign.id,
      title: campaign.title,
      platforms: campaign.platforms,
      contentTypes: campaign.contentTypes,
      audienceRange: [campaign.audienceMin, campaign.audienceMax],
      budgetRange: [campaign.budgetMin, campaign.budgetMax],
      targetCountries: campaign.targetCountries.length > 0 ? campaign.targetCountries : '(not set)',
      targetAudienceInterests: campaign.targetAudienceInterests.length > 0 ? campaign.targetAudienceInterests : '(not set)',
      productCategories: campaign.productCategories.length > 0 ? campaign.productCategories : '(not set)',
      targetPricePerFollower: campaign.targetPricePerFollower
    });

    // Получаем активные карточки инфлюенсеров
    console.log('\n📋 Building database query...');
    console.log('  Table:', TABLES.INFLUENCER_CARDS);
    console.log('  Filters:');
    console.log('    - is_active = true');
    console.log('    - is_deleted = false');
    console.log('    - user_id != advertiserId (exclude campaign creator cards)');

    // ВАЖНО: В БД платформы хранятся в lowercase, а в кампании в PascalCase
    // Нужно привести к lowercase для сравнения
    const platformsLowercase = campaign.platforms.map(p => p.toLowerCase());
    console.log('    - platform IN', platformsLowercase, '(converted from', campaign.platforms, ')');

    let query = supabase
      .from(TABLES.INFLUENCER_CARDS)
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .neq('user_id', campaign.advertiserId);

    // Фильтрация по платформе (ОБЯЗАТЕЛЬНОЕ поле - используем SQL)
    if (platformsLowercase.length > 0) {
      query = query.in('platform', platformsLowercase);
    }

    console.log('\n⏳ Executing query...');
    const { data: cards, error } = await query;

    if (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }

    console.log(`✅ Query returned ${cards?.length || 0} cards`);

    if (!cards || cards.length === 0) {
      console.log('\n❌ No cards found in database!');
      console.log('This could mean:');
      console.log('  1. No influencer cards exist with is_active=true and is_deleted=false');
      console.log('  2. No cards match platform filter:', campaign.platforms);
      console.log('  3. Table is empty or query is incorrect');

      // Давайте проверим есть ли вообще карточки
      const { data: allCards, error: countError } = await supabase
        .from(TABLES.INFLUENCER_CARDS)
        .select('id, platform, is_active, is_deleted')
        .limit(10);

      if (!countError && allCards) {
        console.log(`\nℹ️  Found ${allCards.length} total cards (including inactive):`);
        allCards.forEach(c => {
          console.log(`  - ${c.id}: platform=${c.platform}, active=${c.is_active}, deleted=${c.is_deleted}`);
        });
      }

      return [];
    }

    console.log(`\n✓ Found ${cards.length} active cards, starting filtering...`);

    // Статистика фильтрации
    const stats: FilteringStats = {
      totalCards: cards.length,
      afterPlatform: cards.length,
      afterAudience: 0,
      afterContentTypes: 0,
      afterBudget: 0,
      afterCountries: 0,
      afterInterests: 0,
      afterProductCategories: 0,
      matched: 0
    };

    // Группируем карточки по инфлюенсерам
    const cardsByInfluencer = new Map<string, any[]>();

    for (const cardData of cards) {
      const influencerId = cardData.user_id;
      if (!cardsByInfluencer.has(influencerId)) {
        cardsByInfluencer.set(influencerId, []);
      }
      cardsByInfluencer.get(influencerId)!.push(cardData);
    }

    console.log(`✓ Grouped into ${cardsByInfluencer.size} unique influencers\n`);

    const matched: MatchedInfluencer[] = [];
    let filteredByAudience = 0;
    let filteredByContentTypes = 0;
    let filteredByBudget = 0;
    let filteredByCountries = 0;
    let filteredByInterests = 0;
    let filteredByCategories = 0;

    // Для каждого инфлюенсера ищем лучшую комбинацию карточка + формат
    for (const [influencerId, influencerCards] of cardsByInfluencer.entries()) {
      let bestMatch: MatchedInfluencer | null = null;
      let bestPrice = Infinity;

      console.log(`\n▶ Influencer ${influencerId} (${influencerCards.length} cards):`);

      for (const cardData of influencerCards) {
        try {
          const reach = cardData.reach || {};
          const serviceDetails = cardData.service_details || {};
          const audienceDemographics = cardData.audience_demographics || {};
          const followers = reach.followers || 0;
          const pricing = serviceDetails.pricing || {};
          const contentTypes = serviceDetails.contentTypes || [];

          // Handle interests - can be array or object
          let cardInterests: string[] = [];
          const interestsData = audienceDemographics.interests;
          if (Array.isArray(interestsData)) {
            cardInterests = interestsData;
          } else if (interestsData && typeof interestsData === 'object') {
            cardInterests = Object.keys(interestsData);
          }

          // Handle topCountries - can be array or object {country: percentage}
          let cardCountries: string[] = [];
          const topCountries = audienceDemographics.topCountries;
          if (topCountries) {
            if (Array.isArray(topCountries)) {
              // Old format - array of strings or objects
              cardCountries = topCountries.map((c: any) =>
                typeof c === 'string' ? c : c.country
              );
            } else if (typeof topCountries === 'object') {
              // New format - object {country: percentage}
              cardCountries = Object.keys(topCountries);
            }
          }

          const cardProductCategories = serviceDetails.blacklistedProductCategories || [];

          console.log(`  Card ${cardData.id} (${cardData.platform}):`);
          console.log(`    Followers: ${followers} (range: ${campaign.audienceMin}-${campaign.audienceMax})`);
          console.log(`    Content types: [${contentTypes.join(', ')}] vs Campaign: [${campaign.contentTypes.join(', ')}]`);
          console.log(`    Pricing:`, pricing);
          console.log(`    Countries: [${cardCountries.join(', ')}]`);
          console.log(`    Interests: [${cardInterests.join(', ')}]`);

          // ============ ФИЛЬТРЫ ============

          // 1. Аудитория - диапазон (ОБЯЗАТЕЛЬНО)
          if (followers < campaign.audienceMin || followers > campaign.audienceMax) {
            console.log(`    ❌ FILTERED: Audience ${followers} not in [${campaign.audienceMin}, ${campaign.audienceMax}]`);
            filteredByAudience++;
            continue;
          }
          console.log(`    ✓ Audience: ${followers}`);

          // 2. Типы контента - хотя бы 1 совпадение (ОБЯЗАТЕЛЬНО) - case-insensitive
          const matchingContentTypes: string[] = [];
          for (const campaignType of campaign.contentTypes) {
            for (const cardType of contentTypes) {
              if (this.normalizeString(campaignType) === this.normalizeString(cardType)) {
                matchingContentTypes.push(cardType); // Используем оригинальное имя из карточки
                break;
              }
            }
          }

          if (matchingContentTypes.length === 0) {
            console.log(`    ❌ FILTERED: No content type overlap. Card: [${contentTypes.join(', ')}], Campaign: [${campaign.contentTypes.join(', ')}]`);
            filteredByContentTypes++;
            continue;
          }
          console.log(`    ✓ Content types: [${matchingContentTypes.join(', ')}]`);

          // 3. Страны - хотя бы 1 совпадение (если указано в кампании) - case-insensitive
          if (Array.isArray(campaign.targetCountries) && campaign.targetCountries.length > 0) {
            const hasCountryOverlap = this.arraysOverlap(campaign.targetCountries, cardCountries);
            if (!hasCountryOverlap) {
              console.log(`    ❌ FILTERED: No country overlap. Card: [${cardCountries.join(', ')}], Campaign: [${campaign.targetCountries.join(', ')}]`);
              filteredByCountries++;
              continue;
            }
            console.log(`    ✓ Countries match`);
          } else {
            console.log(`    ℹ️  Countries: not filtered (campaign has no country filter)`);
          }

          // 4. Интересы аудитории - хотя бы 1 совпадение (если указано в кампании) - case-insensitive
          if (Array.isArray(campaign.targetAudienceInterests) && campaign.targetAudienceInterests.length > 0) {
            const hasInterestOverlap = this.arraysOverlap(campaign.targetAudienceInterests, cardInterests);
            if (!hasInterestOverlap) {
              console.log(`    ❌ FILTERED: No interest overlap. Card: [${cardInterests.join(', ')}], Campaign: [${campaign.targetAudienceInterests.join(', ')}]`);
              filteredByInterests++;
              continue;
            }
            console.log(`    ✓ Interests match`);
          } else {
            console.log(`    ℹ️  Interests: not filtered (campaign has no interest filter)`);
          }

          // 5. Категории товаров - проверка черного списка инфлюенсера (если указано в кампании) - case-insensitive
          if (Array.isArray(campaign.productCategories) && campaign.productCategories.length > 0) {
            const hasBlacklistedCategory = this.arraysOverlap(campaign.productCategories, cardProductCategories);
            if (hasBlacklistedCategory) {
              console.log(`    ❌ FILTERED: Campaign categories in influencer blacklist`);
              filteredByCategories++;
              continue;
            }
            console.log(`    ✓ No blacklisted categories`);
          } else {
            console.log(`    ℹ️  Product categories: not filtered (campaign has no category filter)`);
          }

          // ============ PRICING SELECTION ============

          // Находим все подходящие форматы с ценами в бюджете - с использованием case-insensitive поиска
          const matchingFormats: Array<{format: string, price: number}> = [];

          for (const format of matchingContentTypes) {
            // Используем новую функцию для поиска цены с учетом регистра
            const price = this.findPriceForFormat(pricing, format);

            if (price && price > 0) {
              if (price >= campaign.budgetMin && price <= campaign.budgetMax) {
                matchingFormats.push({ format, price });
                console.log(`    💰 ${format}: ${price} ₽ (in budget)`);
              } else {
                console.log(`    ⚠️  ${format}: ${price} ₽ (out of budget [${campaign.budgetMin}, ${campaign.budgetMax}])`);
              }
            } else {
              console.log(`    ⚠️  ${format}: no price set`);
            }
          }

          if (matchingFormats.length === 0) {
            console.log(`    ❌ FILTERED: No formats with prices in budget range`);
            filteredByBudget++;
            continue;
          }

          // Выбираем формат с минимальной ценой
          const cheapest = matchingFormats.reduce((min, curr) =>
            curr.price < min.price ? curr : min
          );

          console.log(`    ✅ SELECTED: ${cheapest.format} at ${cheapest.price} ₽`);

          // Сравниваем с текущим лучшим вариантом для этого инфлюенсера
          if (cheapest.price < bestPrice) {
            bestPrice = cheapest.price;

            const cardPricePerFollower = followers > 0 ? cheapest.price / followers : Infinity;
            const priceDifference = Math.abs(cardPricePerFollower - (campaign.targetPricePerFollower || 0));

            bestMatch = {
              card: {
                id: cardData.id,
                influencerId: cardData.user_id,
                platform: cardData.platform,
                followersCount: followers,
                engagementRate: reach.engagementRate || 0,
                category: '',
                interests: [],
                averageViews: reach.averageViews || 0,
                contentTypes: contentTypes,
                integrationDetails: Object.entries(pricing).map(([format, price]) => ({
                  format,
                  price: Number(price),
                  description: serviceDetails.description || ''
                })),
                isActive: cardData.is_active,
                isDeleted: cardData.is_deleted || false,
                createdAt: cardData.created_at,
                updatedAt: cardData.updated_at
              } as InfluencerCard,
              selectedFormat: cheapest.format,
              selectedPrice: cheapest.price,
              pricePerFollower: cardPricePerFollower,
              priceDifference
            };
          }
        } catch (err) {
          console.error(`    ❌ ERROR processing card ${cardData.id}:`, err);
          continue;
        }
      }

      // Если нашли хотя бы одну подходящую комбинацию для инфлюенсера
      if (bestMatch) {
        console.log(`  ✅ BEST MATCH: ${bestMatch.card.platform} - ${bestMatch.selectedFormat} at ${bestMatch.selectedPrice} ₽ (PPF: ${bestMatch.pricePerFollower.toFixed(4)})`);
        matched.push(bestMatch);
      } else {
        console.log(`  ❌ No valid cards for this influencer`);
      }
    }

    console.log(`\n========== MATCHING COMPLETE ==========`);
    console.log(`✅ ${matched.length} influencers matched`);

    // Выводим детальную статистику фильтрации
    console.log(`\n📊 Filtering Statistics:`);
    console.log(`  Total cards found: ${stats.totalCards}`);
    console.log(`  After platform filter: ${stats.afterPlatform}`);

    if (filteredByAudience > 0) {
      console.log(`  ❌ Filtered by audience: ${filteredByAudience} cards`);
    }
    if (filteredByContentTypes > 0) {
      console.log(`  ❌ Filtered by content types: ${filteredByContentTypes} cards`);
    }
    if (filteredByBudget > 0) {
      console.log(`  ❌ Filtered by budget: ${filteredByBudget} cards`);
    }
    if (filteredByCountries > 0) {
      console.log(`  ❌ Filtered by countries: ${filteredByCountries} cards`);
    }
    if (filteredByInterests > 0) {
      console.log(`  ❌ Filtered by interests: ${filteredByInterests} cards`);
    }
    if (filteredByCategories > 0) {
      console.log(`  ❌ Filtered by blacklisted categories: ${filteredByCategories} cards`);
    }

    console.log(`  ✅ Final matches: ${matched.length}`);
    console.log(`=========================================\n`);

    // Сортируем по близости к идеальной цене
    matched.sort((a, b) => a.priceDifference - b.priceDifference);

    return matched;
  }

  private async checkRateLimit(senderId: string, receiverId: string): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - OFFER_RATE_LIMIT_MS).toISOString();

    const { data, error } = await supabase
      .from(TABLES.OFFERS)
      .select('offer_id, status')
      .eq('advertiser_id', senderId)
      .eq('influencer_id', receiverId)
      .gte('created_at', oneHourAgo)
      .in('status', ['pending', 'accepted'])
      .limit(1);

    if (error) {
      console.error('Rate limit check error:', error);
      return true;
    }

    return !data || data.length === 0;
  }

  private async createAutoCampaignOffer(
    campaign: AutoCampaign,
    matched: MatchedInfluencer,
    advertiserId: string
  ): Promise<void> {
    const newOffer = {
      influencer_id: matched.card.influencerId,
      advertiser_id: advertiserId,
      influencer_card_id: matched.card.id,
      auto_campaign_id: campaign.id,
      initiated_by: advertiserId,
      proposed_rate: matched.selectedPrice,
      currency: 'RUB',
      current_stage: 'negotiation',
      influencer_response: 'pending',
      advertiser_response: 'pending',
      enable_chat: campaign.enableChat,
      details: {
        title: campaign.title,
        description: campaign.description,
        proposed_rate: matched.selectedPrice,
        currency: 'RUB',
        deliverables: [matched.selectedFormat],
        platform: matched.card.platform,
        timeline: {
          start_date: campaign.startDate,
          end_date: campaign.endDate
        }
      },
      status: 'pending',
      timeline: {},
      final_terms: {},
      metadata: {
        isAutoCampaign: true,
        autoCampaignId: campaign.id,
        sourceType: 'auto_campaign',
        selectedFormat: matched.selectedFormat,
        calculatedPrice: matched.selectedPrice,
        enableChat: campaign.enableChat
      }
    };

    const { error } = await supabase
      .from(TABLES.OFFERS)
      .insert(newOffer);

    if (error) throw error;
  }

  async updateCampaignStats(campaignId: string): Promise<void> {
    // Получаем статистику предложений
    const { data: offers, error } = await supabase
      .from(TABLES.OFFERS)
      .select('status')
      .eq('auto_campaign_id', campaignId);

    if (error) throw error;
    if (!offers) return;

    const acceptedCount = offers.filter(o =>
      ['accepted', 'in_progress'].includes(o.status)
    ).length;

    const completedCount = offers.filter(o => o.status === 'completed').length;

    // Обновляем счетчики
    await supabase
      .from(TABLES.AUTO_CAMPAIGNS)
      .update({
        accepted_offers_count: acceptedCount,
        completed_offers_count: completedCount
      })
      .eq('id', campaignId);

    // Проверяем, нужно ли изменить статус кампании
    const campaign = await this.getCampaign(campaignId);
    if (campaign && campaign.status === 'active') {
      // Если набрано достаточно участников, переводим в in_progress
      if (acceptedCount >= campaign.targetInfluencersCount) {
        await this.updateCampaignStatus(campaignId, 'in_progress');
      }
    }

    // Проверяем, нужно ли завершить кампанию полностью
    if (campaign && campaign.status === 'in_progress') {
      // Если все офферы завершены или отменены
      if (completedCount + offers.filter(o => ['cancelled', 'declined', 'terminated'].includes(o.status)).length === offers.length) {
        await this.updateCampaignStatus(campaignId, 'completed');
      }
    }
  }

  private async closeCampaign(campaignId: string): Promise<void> {
    await supabase
      .from(TABLES.AUTO_CAMPAIGNS)
      .update({ status: 'closed' })
      .eq('id', campaignId);

    analytics.track('auto_campaign_closed', { campaignId });
  }

  private async completeCampaign(campaignId: string): Promise<void> {
    await supabase
      .from(TABLES.AUTO_CAMPAIGNS)
      .update({ status: 'completed' })
      .eq('id', campaignId);

    analytics.track('auto_campaign_completed', { campaignId });
  }

  private mapCampaignFromDb(data: any): AutoCampaign {
    return {
      id: data.id,
      advertiserId: data.advertiser_id,
      title: data.title,
      description: data.description,
      status: data.status,
      budgetMin: Number(data.budget_min),
      budgetMax: Number(data.budget_max),
      audienceMin: data.audience_min,
      audienceMax: data.audience_max,
      targetInfluencersCount: data.target_influencers_count,
      contentTypes: data.content_types || [],
      platforms: data.platforms || [],
      targetCountries: data.target_countries || [],
      targetAgeGroups: data.target_age_groups || [],
      targetGenders: data.target_genders || [],
      targetAudienceInterests: data.target_audience_interests || [],
      productCategories: data.product_categories || [],
      enableChat: data.enable_chat !== false,
      startDate: data.start_date,
      endDate: data.end_date,
      targetPricePerFollower: data.target_price_per_follower ? Number(data.target_price_per_follower) : undefined,
      sentOffersCount: data.sent_offers_count || 0,
      acceptedOffersCount: data.accepted_offers_count || 0,
      completedOffersCount: data.completed_offers_count || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  async incrementSentOffersCount(campaignId: string): Promise<void> {
    const { error } = await supabase
      .rpc('increment_auto_campaign_offers', {
        campaign_id: campaignId
      });

    if (error) {
      console.error('Failed to increment sent offers count:', error);
      throw error;
    }
  }

  async updateCampaignStatus(campaignId: string, status: 'draft' | 'active' | 'in_progress' | 'paused' | 'completed' | 'cancelled'): Promise<void> {
    const { error } = await supabase
      .from('auto_campaigns')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', campaignId);

    if (error) {
      console.error('Failed to update campaign status:', error);
      throw error;
    }

    // Автоматически отменяем pending офферы при завершении/отмене кампании
    if (status === 'completed' || status === 'cancelled') {
      await this.cancelPendingOffers(campaignId);
    }
  }

  private async cancelPendingOffers(campaignId: string): Promise<void> {
    const { data: pendingOffers } = await supabase
      .from(TABLES.OFFERS)
      .select('offer_id')
      .eq('auto_campaign_id', campaignId)
      .eq('status', 'pending');

    if (!pendingOffers || pendingOffers.length === 0) return;

    const expiredAt = new Date().toISOString();

    for (const offer of pendingOffers) {
      const { error } = await supabase
        .from(TABLES.OFFERS)
        .update({
          status: 'expired',
          updated_at: expiredAt
        })
        .eq('offer_id', offer.offer_id);

      if (error) {
        console.error(`Failed to expire offer ${offer.offer_id}:`, error);
      }
    }
  }

}

export const autoCampaignService = new AutoCampaignService();
