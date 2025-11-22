import { supabase, TABLES } from '../../../core/supabase';
import { Campaign, InfluencerCard } from '../../../core/types';
import { analytics } from '../../../core/analytics';
import { influencerCardService } from '../../influencer-cards/services/influencerCardService';

interface InfluencerScore {
  influencerId: string;
  cardId: string;
  score: number;
  pricePerAudience: number;
  deviationFromIdeal: number;
  metrics: {
    followers: number;
    engagement: number;
    relevance: number;
    responseTime: number;
  };
}

interface AutomaticSettings {
  targetInfluencerCount: number;
  overbookingPercentage: number;
  batchSize: number;
  batchDelay: number;
  scoringWeights: {
    followers: number;
    engagement: number;
    relevance: number;
    responseTime: number;
  };
  autoReplacement: boolean;
  maxReplacements: number;
  unitAudienceCost?: number;
}

export class AutomaticCampaignService {
  private activeCampaigns = new Map<string, {
    campaign: Campaign;
    acceptedCount: number;
    sentOffers: string[];
    replacementCount: Map<string, number>;
  }>();

  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Запускаем мониторинг активных кампаний каждые 5 минут
    this.startCampaignMonitoring();
  }

  private convertTopCountries(countries: string[] | Record<string, number>): string[] {
      return Array.isArray(countries) ? countries : Object.keys(countries);
  }

  /**
   * Запускает периодический мониторинг активных кампаний
   */
  private startCampaignMonitoring(): void {
    if (this.monitoringInterval) return;

    this.monitoringInterval = setInterval(async () => {
      console.log('🔍 [Campaign Monitor] Checking active campaigns...');
      await this.checkAllActiveCampaigns();
    }, 5 * 60 * 1000); // каждые 5 минут
  }

  /**
   * Проверяет все активные автоматические кампании
   */
  private async checkAllActiveCampaigns(): Promise<void> {
    try {
      const { data: campaigns } = await supabase
        .from(TABLES.CAMPAIGNS)
        .select('*')
        .eq('status', 'active')
        .not('metadata->>isAutomatic', 'is', null);

      if (!campaigns || campaigns.length === 0) return;

      console.log(`📋 [Campaign Monitor] Found ${campaigns.length} active automatic campaigns`);

      for (const campaignData of campaigns) {
        await this.checkAndRefillIfNeeded(campaignData.campaign_id);
      }
    } catch (error) {
      console.error('❌ [Campaign Monitor] Error checking campaigns:', error);
    }
  }

  /**
   * Рассчитывает идеальную стоимость единицы аудитории для кампании
   * unitAudienceCost = avgBudget / avgAudience
   */
  calculateUnitAudienceCost(campaign: Campaign): number {
    const avgBudget = (campaign.budget.min + campaign.budget.max) / 2;
    const avgAudience = (campaign.preferences.audienceSize.min + campaign.preferences.audienceSize.max) / 2;

    if (avgAudience === 0) return 0;

    return avgBudget / avgAudience;
  }

  /**
   * Рассчитывает рекомендованный бюджет на основе рыночных данных
   */
  async calculateMarketBudgetRecommendation(
    minAudience: number,
    maxAudience: number,
    targetCount: number,
    platforms: string[]
  ): Promise<{ min: number; max: number; currency: string }> {
    try {
      // Получаем карточки инфлюенсеров, соответствующие критериям
      const cards = await influencerCardService.getAllCards({
        isActive: true,
        minFollowers: minAudience,
        maxFollowers: maxAudience || undefined
      });

      // Фильтруем по платформе
      const filteredCards = cards.filter(card => {
        const cardPlatform = card.platform.toLowerCase();
        return platforms.some(p => p.toLowerCase() === cardPlatform) || cardPlatform === 'multi';
      });

      if (filteredCards.length === 0) {
        // Используем средние рыночные значения по умолчанию
        const avgAudience = (minAudience + maxAudience) / 2;
        const marketRate = 0.05; // $0.05 за подписчика - средний рыночный показатель
        const avgBudgetPerInfluencer = avgAudience * marketRate;

        return {
          min: Math.round(avgBudgetPerInfluencer * 0.7),
          max: Math.round(avgBudgetPerInfluencer * 1.3),
          currency: 'RUB'
        };
      }

      // Рассчитываем среднюю стоимость за подписчика на рынке
      const pricesPerAudience: number[] = [];

      for (const card of filteredCards) {
        const pricing = card.serviceDetails.pricing;
        const followers = card.reach.followers;

        // Берём среднюю цену за все типы контента (не учитываем фильтр по contentTypes)
        let totalPrice = 0;
        let priceCount = 0;

        // Проходим по всем ценам в pricing
        for (const [key, value] of Object.entries(pricing)) {
          if (typeof value === 'number' && value > 0) {
            totalPrice += value;
            priceCount++;
          }
        }

        if (priceCount > 0 && followers > 0) {
          const avgPrice = totalPrice / priceCount;
          const pricePerFollower = avgPrice / followers;
          pricesPerAudience.push(pricePerFollower);
        }
      }

      if (pricesPerAudience.length === 0) {
        // Fallback к средним рыночным значениям
        const avgAudience = (minAudience + maxAudience) / 2;
        const marketRate = 0.05;
        const avgBudgetPerInfluencer = avgAudience * marketRate;

        return {
          min: Math.round(avgBudgetPerInfluencer * 0.7),
          max: Math.round(avgBudgetPerInfluencer * 1.3),
          currency: 'RUB'
        };
      }

      // Сортируем и берём медианную стоимость
      pricesPerAudience.sort((a, b) => a - b);
      const medianIndex = Math.floor(pricesPerAudience.length / 2);
      const medianPricePerFollower = pricesPerAudience[medianIndex];

      // Рассчитываем рекомендованный бюджет
      const avgAudience = (minAudience + maxAudience) / 2;
      const recommendedBudgetPerInfluencer = avgAudience * medianPricePerFollower;

      return {
        min: Math.round(recommendedBudgetPerInfluencer * 0.8),
        max: Math.round(recommendedBudgetPerInfluencer * 1.2),
        currency: 'RUB'
      };
    } catch (error) {
      console.error('Failed to calculate market budget recommendation:', error);

      // Fallback
      const avgAudience = (minAudience + maxAudience) / 2;
      const marketRate = 0.05;
      const avgBudgetPerInfluencer = avgAudience * marketRate;

      return {
        min: Math.round(avgBudgetPerInfluencer * 0.7),
        max: Math.round(avgBudgetPerInfluencer * 1.3),
        currency: 'RUB'
      };
    }
  }

  async createCampaign(campaignData: Partial<Campaign>): Promise<Campaign> {
    try {
      this.validateCampaignData(campaignData);

      // Рассчитываем unitAudienceCost
      const tempCampaign = campaignData as Campaign;
      const unitAudienceCost = this.calculateUnitAudienceCost(tempCampaign);

      const newCampaign = {
        advertiser_id: campaignData.advertiserId,
        title: campaignData.title,
        description: campaignData.description,
        brand: campaignData.brand,
        budget: campaignData.budget,
        preferences: {
          ...campaignData.preferences,
          demographics: {
            ...campaignData.preferences?.demographics,
            countries: (campaignData as any).targetCountries || []
          }
        },
        status: 'active',
        enable_chat: campaignData.enableChat || false,
        timeline: campaignData.timeline,
        metrics: {
          applicants: 0,
          accepted: 0,
          impressions: 0,
          engagement: 0
        },
        metadata: {
          ...campaignData.metadata,
          isAutomatic: true,
          productCategories: (campaignData as any).productCategories || [],
          targetCountries: (campaignData as any).targetCountries || [],
          automaticSettings: {
            ...campaignData.metadata?.automaticSettings,
            unitAudienceCost
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.CAMPAIGNS)
        .insert([newCampaign])
        .select()
        .single();

      if (error) {
        console.error('Database error creating campaign:', error);
        throw new Error(`Failed to save campaign: ${error.message}`);
      }

      const campaign = this.transformFromDatabase(data);

      // Инициализация отслеживания кампании
      this.activeCampaigns.set(campaign.campaignId, {
        campaign,
        acceptedCount: 0,
        sentOffers: [],
        replacementCount: new Map()
      });

      // Запуск автоматического подбора в фоновом режиме
      this.startAutomaticMatching(campaign).catch(error => {
        console.error('Background matching failed:', error);
      });

      analytics.trackCampaignCreated(campaign.campaignId, campaignData.advertiserId!);

      return campaign;
    } catch (error: any) {
      console.error('Failed to create automatic campaign:', error);
      throw new Error(error.message || 'Failed to create campaign');
    }
  }

  async updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign> {
    try {
      this.validateCampaignData(updates, false);

      const updateData: any = {
        title: updates.title,
        description: updates.description,
        brand: updates.brand,
        budget: updates.budget,
        preferences: updates.preferences ? {
          ...updates.preferences,
          demographics: {
            ...updates.preferences.demographics,
            countries: (updates as any).targetCountries || updates.preferences.demographics?.countries || []
          }
        } : undefined,
        enable_chat: updates.enableChat !== undefined ? updates.enableChat : undefined,
        timeline: updates.timeline,
        metadata: updates.metadata ? {
          ...updates.metadata,
          productCategories: (updates as any).productCategories || updates.metadata.productCategories,
          targetCountries: (updates as any).targetCountries || updates.metadata.targetCountries
        } : undefined,
        updated_at: new Date().toISOString()
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const { data, error } = await supabase
        .from(TABLES.CAMPAIGNS)
        .update(updateData)
        .eq('campaign_id', campaignId)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Database error updating campaign:', error);
        throw new Error(`Failed to update campaign: ${error.message}`);
      }

      if (!data) {
        throw new Error('Campaign not found or no changes made');
      }

      const updatedCampaign = this.transformFromDatabase(data);

      if (this.activeCampaigns.has(campaignId)) {
        const tracking = this.activeCampaigns.get(campaignId)!;
        tracking.campaign = updatedCampaign;
      }

      analytics.track('automatic_campaign_updated', {
        campaign_id: campaignId,
        updated_fields: Object.keys(updates)
      });

      return updatedCampaign;
    } catch (error: any) {
      console.error('Failed to update automatic campaign:', error);
      throw new Error(error.message || 'Failed to update campaign');
    }
  }

  async restartAutomaticMatching(campaignId: string): Promise<void> {
    const { data, error } = await supabase
      .from(TABLES.CAMPAIGNS)
      .select('*')
      .eq('campaign_id', campaignId)
      .single();

    if (error || !data) {
      throw new Error('Campaign not found');
    }

    const campaign = this.transformFromDatabase(data);
    await this.startAutomaticMatching(campaign);
  }

  /**
   * Проверка, является ли пользователь создателем кампании
   */
  checkCampaignOwnership(userId: string, campaign: Campaign): boolean {
    return userId === campaign.advertiserId;
  }

  private async startAutomaticMatching(campaign: Campaign): Promise<void> {
    try {
      const automaticSettings = (campaign as any).metadata?.automaticSettings as AutomaticSettings;
      if (!automaticSettings) {
        throw new Error('Automatic settings not found');
      }

      console.log('🚀 [Automatic Campaign] Starting matching for campaign:', campaign.campaignId);
      console.log('📊 [Automatic Campaign] Target count:', automaticSettings.targetInfluencerCount);
      console.log('📊 [Automatic Campaign] Overbooking:', automaticSettings.overbookingPercentage + '%');

      // Находим и оцениваем инфлюенсеров
      const scoredInfluencers = await this.findAndScoreInfluencers(campaign, automaticSettings);
      console.log('✅ [Automatic Campaign] Found influencers:', scoredInfluencers.length);

      if (scoredInfluencers.length > 0) {
        console.log('👥 [Automatic Campaign] Top 5 influencers:',
          scoredInfluencers.slice(0, 5).map(inf => ({
            id: inf.influencerId,
            cardId: inf.cardId,
            score: inf.score,
            pricePerAudience: inf.pricePerAudience.toFixed(4),
            deviation: inf.deviationFromIdeal.toFixed(4)
          }))
        );
      }

      if (scoredInfluencers.length === 0) {
        throw new Error('No matching influencers found');
      }

      // Рассчитываем количество предложений
      const target = automaticSettings.targetInfluencerCount;
      const overbookTarget = Math.ceil(target * (1 + automaticSettings.overbookingPercentage / 100));
      const available = scoredInfluencers.length;
      const invitesToSend = Math.min(overbookTarget, available);

      console.log('📊 [Automatic Campaign] Invites calculation:', {
        target,
        overbookTarget,
        available,
        invitesToSend
      });
      console.log('📤 [Automatic Campaign] Will send', invitesToSend, 'offers');

      // Берём топ-инфлюенсеров
      const topInfluencers = scoredInfluencers.slice(0, invitesToSend);

      // Отправляем предложения
      let sentCount = 0;
      const sentInfluencerIds: string[] = [];

      for (const influencer of topInfluencers) {
        try {
          await this.createOffer(campaign, influencer, automaticSettings);
          sentCount++;
          sentInfluencerIds.push(influencer.influencerId);
          console.log(`✉️ [Automatic Campaign] Offer sent to influencer: ${influencer.influencerId}`);
        } catch (error) {
          console.error(`❌ [Automatic Campaign] Failed to create offer for influencer ${influencer.influencerId}:`, error);
        }
      }

      console.log('🎉 [Automatic Campaign] Matching completed! Sent', sentCount, 'offers out of', invitesToSend, 'planned');
      console.log('📋 [Automatic Campaign] Sent to influencers:', sentInfluencerIds);

      // Проверяем достаточность набора
      const isRecruitmentComplete = sentCount < target;
      const recruitmentStatus = {
        requested: target,
        invited: sentCount,
        available: available,
        isComplete: isRecruitmentComplete,
        completedAt: isRecruitmentComplete ? new Date().toISOString() : null,
        reason: isRecruitmentComplete ? 'insufficient_influencers' : null
      };

      console.log('📊 [Automatic Campaign] Recruitment status:', recruitmentStatus);

      // Обновляем метаданные кампании
      await supabase
        .from(TABLES.CAMPAIGNS)
        .update({
          metadata: {
            ...(campaign as any).metadata,
            recruitmentStatus,
            lastMatchingAt: new Date().toISOString()
          }
        })
        .eq('campaign_id', campaign.campaignId);

      analytics.track('automatic_matching_completed', {
        campaign_id: campaign.campaignId,
        offers_sent: sentCount,
        target_count: target,
        recruitment_complete: isRecruitmentComplete
      });

      // Если набрано меньше target - отправляем уведомление
      if (isRecruitmentComplete) {
        console.log('⚠️ [Automatic Campaign] Recruitment partially completed, sending notification');
        await this.notifyPartialRecruitment(campaign, target, sentCount);
      }

      // Кампания остается active
      console.log('✅ [Automatic Campaign] Campaign remains active, waiting for influencer responses');

    } catch (error: any) {
      console.error('❌ [Automatic Campaign] Failed to start automatic matching:', error);

      // Только при ОШИБКЕ переводим в paused
      await supabase
        .from(TABLES.CAMPAIGNS)
        .update({
          status: 'paused',
          metadata: {
            ...(campaign as any).metadata,
            error: error.message
          }
        })
        .eq('campaign_id', campaign.campaignId);

      throw error;
    }
  }

  /**
   * Находит и оценивает инфлюенсеров по новому алгоритму с unitAudienceCost
   * ВАЖНО: Один инфлюенсер участвует только один раз (выбирается карточка с минимальной ценой)
   */
  private async findAndScoreInfluencers(campaign: Campaign, settings: AutomaticSettings): Promise<InfluencerScore[]> {
    try {
      console.log('🔍 [Find Influencers] Starting search with criteria:', {
        audienceMin: campaign.preferences.audienceSize.min,
        audienceMax: campaign.preferences.audienceSize.max,
        platforms: campaign.preferences.platforms,
        contentTypes: campaign.preferences.contentTypes,
        countries: campaign.preferences.demographics?.countries || []
      });

      // Получаем все активные карточки инфлюенсеров
      const influencerCards = await influencerCardService.getAllCards({
        isActive: true,
        minFollowers: campaign.preferences.audienceSize.min,
        maxFollowers: campaign.preferences.audienceSize.max || undefined
      });
      console.log('📦 [Find Influencers] Total cards from DB:', influencerCards.length);

      // Фильтруем по платформе
      const platformFiltered = influencerCards.filter(card => {
        const cardPlatform = card.platform.toLowerCase();
        return campaign.preferences.platforms.some(p =>
          p.toLowerCase() === cardPlatform
        ) || cardPlatform === 'multi';
      });
      console.log('🎯 [Find Influencers] After platform filter:', platformFiltered.length);

      // Фильтруем по географии
      const targetCountries = campaign.preferences.demographics?.countries || [];
      const geoFiltered = targetCountries.length > 0
        ? platformFiltered.filter(card => {
            const cardCountries = this.convertTopCountries(card.audienceDemographics?.topCountries) || [];
            return cardCountries.some(country =>
              targetCountries.some(target =>
                target.toLowerCase() === country.toLowerCase()
              )
            );
          })
        : platformFiltered;
      console.log('🌍 [Find Influencers] After geo filter:', geoFiltered.length);

      // Фильтруем по типам контента (ИЛИ - хотя бы один тип должен совпадать)
      const contentTypesFiltered = campaign.preferences.contentTypes.length > 0
        ? geoFiltered.filter(card => {
            const pricing = card.serviceDetails?.pricing || {};
            // Проверяем что хотя бы один из требуемых типов контента есть в карточке
            return campaign.preferences.contentTypes.some(type => {
              const typeKey = type.toLowerCase();
              return pricing[typeKey] && pricing[typeKey] > 0;
            });
          })
        : geoFiltered;
      console.log('📝 [Find Influencers] After content types filter (OR logic):', contentTypesFiltered.length);

      // ДЕДУПЛИКАЦИЯ: Группируем карточки по userId
      const cardsByUser = new Map<string, InfluencerCard[]>();
      for (const card of contentTypesFiltered) {
        if (!cardsByUser.has(card.userId)) {
          cardsByUser.set(card.userId, []);
        }
        cardsByUser.get(card.userId)!.push(card);
      }
      console.log('👤 [Find Influencers] Unique influencers before deduplication:', cardsByUser.size);

      // Для каждого инфлюенсера выбираем карточку с минимальной ценой
      const deduplicatedCards: InfluencerCard[] = [];
      for (const [userId, cards] of cardsByUser) {
        // Рассчитываем среднюю цену для каждой карточки
        const cardsWithPrice = cards.map(card => ({
          card,
          avgPrice: this.calculateInfluencerAveragePrice(card, campaign)
        }));

        // Сортируем по возрастанию цены и берём самую дешёвую
        cardsWithPrice.sort((a, b) => a.avgPrice - b.avgPrice);
        deduplicatedCards.push(cardsWithPrice[0].card);

        if (cards.length > 1) {
          console.log(`🔄 [Find Influencers] User ${userId} has ${cards.length} cards, selected cheapest: ${cardsWithPrice[0].avgPrice.toFixed(0)} RUB`);
        }
      }
      console.log('✅ [Find Influencers] After deduplication:', deduplicatedCards.length, 'unique influencers');

      // Рассчитываем идеальное соотношение цена/аудитория
      const idealUnitCost = settings.unitAudienceCost || this.calculateUnitAudienceCost(campaign);

      // Оцениваем каждого инфлюенсера
      const scoredInfluencers: InfluencerScore[] = [];

      for (const card of deduplicatedCards) {
        // Рассчитываем pricePerAudience для инфлюенсера
        const influencerPrice = this.calculateInfluencerAveragePrice(card, campaign);
        const influencerAudience = card.reach.followers;

        if (influencerAudience === 0 || influencerPrice === 0) continue;

        const pricePerAudience = influencerPrice / influencerAudience;

        // Рассчитываем отклонение от идеального соотношения
        const deviationFromIdeal = Math.abs(pricePerAudience - idealUnitCost);

        // Общий скор (чем меньше отклонение, тем выше score)
        const score = this.calculateInfluencerScore(card, campaign, settings, deviationFromIdeal);

        if (score.score > 0) {
          scoredInfluencers.push({
            influencerId: card.userId,
            cardId: card.id,
            pricePerAudience,
            deviationFromIdeal,
            ...score
          });
        }
      }

      // Сортируем по отклонению от идеального соотношения (меньше = лучше)
      return scoredInfluencers.sort((a, b) => a.deviationFromIdeal - b.deviationFromIdeal);
    } catch (error) {
      console.error('Failed to find and score influencers:', error);
      throw error;
    }
  }

  /**
   * Рассчитывает среднюю цену инфлюенсера за требуемые типы контента
   */
  private calculateInfluencerAveragePrice(card: InfluencerCard, campaign: Campaign): number {
    const pricing = card.serviceDetails.pricing;
    const contentTypes = campaign.preferences.contentTypes;

    let totalPrice = 0;
    let priceCount = 0;

    for (const type of contentTypes) {
      const typeKey = type.toLowerCase();
      if (pricing[typeKey] && pricing[typeKey] > 0) {
        totalPrice += pricing[typeKey];
        priceCount++;
      }
    }

    return priceCount > 0 ? totalPrice / priceCount : 0;
  }

  private calculateInfluencerScore(
    card: InfluencerCard,
    campaign: Campaign,
    settings: AutomaticSettings,
    deviationFromIdeal: number
  ): { score: number; metrics: any } {
    const weights = settings.scoringWeights;

    // Followers score (0-100)
    const followersScore = Math.min(100, (card.reach.followers / 1000000) * 100);

    // Engagement score (0-100)
    const engagementScore = Math.min(100, card.reach.engagementRate * 10);

    // Relevance score
    let relevanceScore = 0;

    const contentOverlap = campaign.preferences.contentTypes.filter(type => {
      const typeLower = type.toLowerCase();
      return card.serviceDetails.contentTypes.some(cardType => {
        const cardTypeLower = cardType.toLowerCase();
        return cardTypeLower === typeLower ||
          cardTypeLower.includes(typeLower) ||
          typeLower.includes(cardTypeLower);
      });
    }).length;
    relevanceScore += (contentOverlap / campaign.preferences.contentTypes.length) * 50;

    const countryOverlap = campaign.preferences.demographics?.countries?.filter(country =>
        this.convertTopCountries(card.audienceDemographics?.topCountries)?.includes(country)
    ).length || 0;
    if (campaign.preferences.demographics?.countries?.length > 0) {
      relevanceScore += (countryOverlap / campaign.preferences.demographics.countries.length) * 50;
    } else {
      relevanceScore += 50;
    }

    const responseTimeScore = 80;

    // Учитываем отклонение от идеального соотношения (бонус за близость)
    const deviationPenalty = Math.min(100, deviationFromIdeal * 1000);
    const proximityBonus = 100 - deviationPenalty;

    // Итоговый скор с учётом близости к идеальному соотношению
    const totalScore = (
      (followersScore * weights.followers / 100) +
      (engagementScore * weights.engagement / 100) +
      proximityBonus * 0.2
    );

    return {
      score: Math.round(totalScore),
      metrics: {
        followers: followersScore,
        engagement: engagementScore,
      }
    };
  }

  /**
   * Создаёт предложение для инфлюенсера
   */
  private async createOffer(
    campaign: Campaign,
    influencer: InfluencerScore,
    settings: AutomaticSettings
  ): Promise<void> {
    try {
      console.log(`💼 [Create Offer] Creating offer for influencer ${influencer.influencerId}, card ${influencer.cardId}`);

      // Получаем карточку инфлюенсера
      const { data: card, error: cardError } = await supabase
        .from(TABLES.INFLUENCER_CARDS)
        .select('*')
        .eq('id', influencer.cardId)
        .maybeSingle();

      if (cardError) {
        console.error('❌ [Create Offer] Error fetching card:', cardError);
        throw cardError;
      }

      if (!card) {
        console.error('❌ [Create Offer] Card not found:', influencer.cardId);
        throw new Error('Influencer card not found');
      }

      const pricing = card.service_details?.pricing || {};
      const contentTypes = campaign.preferences.contentTypes;

      // Рассчитываем бюджет предложения
      let totalPrice = 0;
      let priceCount = 0;

      for (const type of contentTypes) {
        const typeKey = type.toLowerCase();
        if (pricing[typeKey] && pricing[typeKey] > 0) {
          totalPrice += pricing[typeKey];
          priceCount++;
        }
      }

      const suggestedBudget = priceCount > 0
        ? Math.round(totalPrice / priceCount)
        : Math.round((campaign.budget.min + campaign.budget.max) / 2);

      // Создаём предложение
      const offerData = {
        campaign_id: campaign.campaignId,
        influencer_id: influencer.influencerId,
        advertiser_id: campaign.advertiserId,
        influencer_card_id: influencer.cardId,
        details: {
          title: campaign.title,
          description: campaign.description,
          contentTypes: contentTypes,
          suggestedBudget,
          deliverables: contentTypes.map((type: string) => ({
            type,
            quantity: 1,
            description: `Создание ${type.toLowerCase()}`
          }))
        },
        status: 'pending',
        timeline: campaign.timeline,
        metadata: {
          isAutomatic: true,
          campaignId: campaign.campaignId,
          score: influencer.score,
          pricePerAudience: influencer.pricePerAudience,
          deviationFromIdeal: influencer.deviationFromIdeal,
          unitAudienceCost: settings.unitAudienceCost,
          sentAt: new Date().toISOString()
        },
        current_stage: 'offer_sent',
        initiated_by: campaign.advertiserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log(`💾 [Create Offer] Inserting offer into DB:`, {
        campaign_id: offerData.campaign_id,
        influencer_id: offerData.influencer_id,
        suggestedBudget: offerData.details.suggestedBudget,
        contentTypes: offerData.details.contentTypes
      });

      const { data: insertedOffer, error } = await supabase
        .from(TABLES.OFFERS)
        .insert([offerData])
        .select()
        .maybeSingle();

      if (error) {
        console.error('❌ [Create Offer] DB insert error:', error);
        throw error;
      }

      console.log(`✅ [Create Offer] Offer created successfully! ID: ${insertedOffer?.offer_id}`);

    } catch (error) {
      console.error('❌ [Create Offer] Failed to create offer:', error);
      throw error;
    }
  }

  /**
   * Обрабатывает принятие/отклонение предложения
   */
  async handleOfferResponse(offerId: string, response: 'accepted' | 'rejected', userId: string): Promise<void> {
    try {
      // Проверяем предложение
      const { data: offer, error: offerError } = await supabase
        .from(TABLES.OFFERS)
        .select('*, campaigns!inner(*)')
        .eq('id', offerId)
        .single();

      if (offerError || !offer) {
        throw new Error('Offer not found');
      }

      // Проверяем, что это инфлюенсер
      if (offer.influencer_id !== userId) {
        throw new Error('Unauthorized');
      }

      // Получаем кампанию
      const campaign = offer.campaigns;

      // Проверка на "позднее принятие"
      if (response === 'accepted' && campaign.status !== 'active') {
        // Автоматический отказ
        await supabase
          .from(TABLES.OFFERS)
          .update({
            status: 'rejected',
            metadata: {
              ...offer.metadata,
              autoRejected: true,
              rejectionReason: 'Набор завершён, все места заняты',
              rejectedAt: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', offerId);

        // TODO: Отправить уведомление инфлюенсеру
        return;
      }

      // Обновляем статус предложения
      await supabase
        .from(TABLES.OFFERS)
        .update({
          status: response,
          updated_at: new Date().toISOString()
        })
        .eq('id', offerId);

      // Если принято - обновляем счётчик
      if (response === 'accepted') {
        const tracking = this.activeCampaigns.get(offer.campaign_id);
        const settings = campaign.metadata?.automaticSettings as AutomaticSettings;

        if (tracking) {
          tracking.acceptedCount++;

          // Проверяем достижение цели
          if (tracking.acceptedCount >= settings.targetInfluencerCount) {
            await this.completeRecruitment(offer.campaign_id);
          }
        } else {
          // Подсчитываем acceptedCount из базы
          const { count } = await supabase
            .from(TABLES.OFFERS)
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', offer.campaign_id)
            .eq('status', 'accepted');

          if (count && count >= settings.targetInfluencerCount) {
            await this.completeRecruitment(offer.campaign_id);
          }
        }
      }

      // Если предложение отклонено, проверяем нужен ли добор
      if (response === 'rejected' && campaign.status === 'active') {
        console.log('🔄 [Offer Response] Offer rejected, checking if need more influencers');
        await this.checkAndRefillIfNeeded(offer.campaign_id);
      }

      analytics.track('automatic_campaign_offer_response', {
        campaign_id: offer.campaign_id,
        offer_id: offerId,
        response: response
      });
    } catch (error) {
      console.error('Failed to handle offer response:', error);
      throw error;
    }
  }

  /**
   * Проверяет нужен ли добор инфлюенсеров и запускает новый раунд при необходимости
   */
  private async checkAndRefillIfNeeded(campaignId: string): Promise<void> {
    try {
      console.log('🔍 [Check Refill] Checking if refill needed for campaign:', campaignId);

      // Получаем кампанию
      const { data: campaignData, error: campaignError } = await supabase
        .from(TABLES.CAMPAIGNS)
        .select('*')
        .eq('campaign_id', campaignId)
        .maybeSingle();

      if (campaignError || !campaignData) {
        console.error('❌ [Check Refill] Campaign not found');
        return;
      }

      const campaign = this.transformFromDatabase(campaignData);
      const settings = (campaign as any).metadata?.automaticSettings as AutomaticSettings;

      if (!settings) {
        console.error('❌ [Check Refill] No automatic settings found');
        return;
      }

      // Подсчитываем текущее состояние
      const { data: offers } = await supabase
        .from(TABLES.OFFERS)
        .select('status, influencer_id')
        .eq('campaign_id', campaignId);

      if (!offers) return;

      const acceptedCount = offers.filter(o => o.status === 'accepted').length;
      const pendingCount = offers.filter(o => o.status === 'pending').length;
      const totalActiveCount = acceptedCount + pendingCount;

      console.log('📊 [Check Refill] Current state:', {
        accepted: acceptedCount,
        pending: pendingCount,
        totalActive: totalActiveCount,
        target: settings.targetInfluencerCount,
        overbooking: settings.overbookingPercentage
      });

      // Рассчитываем сколько нужно с учетом овербукинга
      const requiredWithOverbooking = Math.ceil(
        settings.targetInfluencerCount * (1 + settings.overbookingPercentage / 100)
      );

      // Если текущее количество (принятые + ожидающие) меньше требуемого с овербукингом
      if (totalActiveCount < requiredWithOverbooking) {
        const needToSend = requiredWithOverbooking - totalActiveCount;
        console.log(`🚀 [Check Refill] Need to send ${needToSend} more offers!`);

        // Получаем список инфлюенсеров которым уже отправлены офферы (чтобы не дублировать)
        const sentInfluencerIds = offers.map(o => o.influencer_id).filter(Boolean);

        // Находим новых инфлюенсеров
        const scoredInfluencers = await this.findAndScoreInfluencers(campaign, settings);
        const availableInfluencers = scoredInfluencers.filter(
          inf => !sentInfluencerIds.includes(inf.influencerId)
        );

        console.log(`✅ [Check Refill] Found ${availableInfluencers.length} new influencers available`);

        if (availableInfluencers.length === 0) {
          console.log('⚠️ [Check Refill] No more influencers available, pausing campaign');
          await supabase
            .from(TABLES.CAMPAIGNS)
            .update({
              status: 'paused',
              metadata: {
                ...(campaign as any).metadata,
                pauseReason: 'No more matching influencers available'
              }
            })
            .eq('campaign_id', campaignId);
          return;
        }

        // Отправляем новые офферы
        const toSend = Math.min(needToSend, availableInfluencers.length);
        let sentCount = 0;

        for (let i = 0; i < toSend; i++) {
          try {
            await this.createOffer(campaign, availableInfluencers[i], settings);
            sentCount++;
          } catch (error) {
            console.error(`❌ [Check Refill] Failed to create offer:`, error);
          }
        }

        console.log(`🎉 [Check Refill] Sent ${sentCount} additional offers!`);
      } else {
        console.log('✅ [Check Refill] No refill needed, have enough pending offers');
      }
    } catch (error) {
      console.error('❌ [Check Refill] Failed to check/refill:', error);
    }
  }

  /**
   * Завершает набор: переводит кампанию в "В работе", expired для остальных предложений
   */
  private async completeRecruitment(campaignId: string): Promise<void> {
    try {
      // Обновляем статус кампании
      await supabase
        .from(TABLES.CAMPAIGNS)
        .update({
          status: 'in_progress',
          metadata: supabase.raw(`
            jsonb_set(
              metadata,
              '{recruitmentCompletedAt}',
              to_jsonb(NOW())
            )
          `),
          updated_at: new Date().toISOString()
        })
        .eq('campaign_id', campaignId);

      // Переносим pending предложения в expired
      await supabase
        .from(TABLES.OFFERS)
        .update({
          status: 'expired',
          metadata: supabase.raw(`
            jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{expirationReason}',
              '"recruitment_completed"'::jsonb
            )
          `),
          updated_at: new Date().toISOString()
        })
        .eq('campaign_id', campaignId)
        .eq('status', 'pending');

      // TODO: Отправить уведомления

      analytics.track('automatic_campaign_recruitment_completed', {
        campaign_id: campaignId
      });
    } catch (error) {
      console.error('Failed to complete recruitment:', error);
      throw error;
    }
  }

  /**
   * Обрабатывает выбывание инфлюенсера и запускает добор
   */
  async handleInfluencerDropout(campaignId: string, influencerId: string): Promise<void> {
    try {
      const { data: campaign } = await supabase
        .from(TABLES.CAMPAIGNS)
        .select('*')
        .eq('campaign_id', campaignId)
        .single();

      if (!campaign) throw new Error('Campaign not found');

      const settings = campaign.metadata?.automaticSettings as AutomaticSettings;
      if (!settings || !settings.autoReplacement) return;

      // Проверяем лимит замен
      const tracking = this.activeCampaigns.get(campaignId);
      if (tracking) {
        const currentReplacements = tracking.replacementCount.get(influencerId) || 0;
        if (currentReplacements >= settings.maxReplacements) {
          console.log(`Max replacements reached for influencer ${influencerId}`);
          return;
        }
        tracking.replacementCount.set(influencerId, currentReplacements + 1);
      }

      // Приоритет 1: Реактивировать expired предложения
      const { data: expiredOffers } = await supabase
        .from(TABLES.OFFERS)
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'expired')
        .eq('metadata->>expirationReason', 'recruitment_completed')
        .order('metadata->>score', { ascending: false })
        .limit(1);

      if (expiredOffers && expiredOffers.length > 0) {
        // Реактивируем лучшее предложение
        await supabase
          .from(TABLES.OFFERS)
          .update({
            status: 'pending',
            metadata: {
              ...expiredOffers[0].metadata,
              reactivated: true,
              reactivatedAt: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('offer_id', expiredOffers[0].offer_id);

        analytics.track('automatic_campaign_offer_reactivated', {
          campaign_id: campaignId,
          offer_id: expiredOffers[0].offer_id
        });

        return;
      }

      // Приоритет 2: Найти нового инфлюенсера
      const transformedCampaign = this.transformFromDatabase(campaign);
      const scoredInfluencers = await this.findAndScoreInfluencers(transformedCampaign, settings);

      // Исключаем уже получивших предложение
      const { data: existingOffers } = await supabase
        .from(TABLES.OFFERS)
        .select('influencer_id')
        .eq('campaign_id', campaignId);

      const existingInfluencerIds = existingOffers?.map(o => o.influencer_id) || [];
      const availableInfluencers = scoredInfluencers.filter(
        inf => !existingInfluencerIds.includes(inf.influencerId)
      );

      if (availableInfluencers.length > 0) {
        await this.createOffer(transformedCampaign, availableInfluencers[0], settings);

        analytics.track('automatic_campaign_new_offer_sent', {
          campaign_id: campaignId,
          influencer_id: availableInfluencers[0].influencerId
        });
      }
    } catch (error) {
      console.error('Failed to handle influencer dropout:', error);
    }
  }

  private validateCampaignData(campaignData: Partial<Campaign>, isCreate: boolean = true): void {
    const errors: string[] = [];

    if (isCreate) {
      if (!campaignData.advertiserId) errors.push('Advertiser ID is required');
      if (!campaignData.title?.trim()) errors.push('Campaign title is required');
      if (!campaignData.brand?.trim()) errors.push('Brand name is required');
    }

    if (campaignData.title && campaignData.title.trim().length < 3) {
      errors.push('Campaign title must be at least 3 characters');
    }

    if (campaignData.description && campaignData.description.trim().length < 10) {
      errors.push('Campaign description must be at least 10 characters');
    }

    if (campaignData.budget) {
      if (campaignData.budget.min < 0 || campaignData.budget.max < 0) {
        errors.push('Budget amounts cannot be negative');
      }
      if (campaignData.budget.min > campaignData.budget.max) {
        errors.push('Minimum budget cannot be greater than maximum budget');
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  private transformFromDatabase(dbData: any): Campaign {
    return {
      campaignId: dbData.campaign_id,
      advertiserId: dbData.advertiser_id,
      title: dbData.title,
      description: dbData.description,
      brand: dbData.brand,
      budget: dbData.budget,
      preferences: dbData.preferences,
      status: dbData.status,
      enableChat: dbData.enable_chat || false,
      timeline: dbData.timeline,
      metrics: dbData.metrics,
      metadata: dbData.metadata,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }

  /**
   * Отправляет уведомление рекламодателю о частичном наборе инфлюенсеров
   */
  private async notifyPartialRecruitment(
    campaign: Campaign,
    requested: number,
    recruited: number
  ): Promise<void> {
    try {
      // Получаем email рекламодателя
      const { data: advertiserProfile } = await supabase
        .from(TABLES.USER_PROFILES)
        .select('user_id')
        .eq('user_id', campaign.advertiserId)
        .maybeSingle();

      if (!advertiserProfile) {
        console.error('❌ [Notification] Advertiser profile not found');
        return;
      }

      // Получаем email из auth.users
      const { data: authUser } = await supabase.auth.admin.getUserById(campaign.advertiserId);

      if (!authUser?.user?.email) {
        console.error('❌ [Notification] Advertiser email not found');
        return;
      }

      const email = authUser.user.email;

      // Отправляем email через edge function
      const emailData = {
        to: email,
        subject: `Автокампания "${campaign.title}" - частичный набор инфлюенсеров`,
        template: 'partial_recruitment',
        data: {
          campaignTitle: campaign.title,
          requested,
          recruited,
          campaignId: campaign.campaignId
        }
      };

      console.log('📧 [Notification] Sending email to:', email);

      await supabase.functions.invoke('send-email-notification', {
        body: emailData
      });

      console.log('✅ [Notification] Email sent successfully');

      // Сохраняем факт отправки уведомления в метаданные
      await supabase
        .from(TABLES.CAMPAIGNS)
        .update({
          metadata: {
            ...(campaign as any).metadata,
            partialRecruitmentNotificationSent: true,
            partialRecruitmentNotificationSentAt: new Date().toISOString()
          }
        })
        .eq('campaign_id', campaign.campaignId);

    } catch (error) {
      console.error('❌ [Notification] Failed to send partial recruitment notification:', error);
    }
  }
}

export const automaticCampaignService = new AutomaticCampaignService();
