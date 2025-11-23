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

export class AutoCampaignService {

  async createCampaign(advertiserId: string, data: AutoCampaignFormData): Promise<AutoCampaign> {
    // Вычисляем идеальную цену за подписчика
    const avgBudget = (data.budgetMin + data.budgetMax) / 2;
    const avgAudience = (data.audienceMin + data.audienceMax) / 2;
    const targetPricePerFollower = avgAudience / avgBudget;

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
        platforms: data.platforms,
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

  async getCampaigns(advertiserId: string): Promise<AutoCampaign[]> {
    const { data, error } = await supabase
      .from(TABLES.AUTO_CAMPAIGNS)
      .select('*')
      .eq('advertiser_id', advertiserId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(c => this.mapCampaignFromDb(c));
  }

  async getCampaign(campaignId: string): Promise<AutoCampaign | null> {
    const { data, error } = await supabase
      .from(TABLES.AUTO_CAMPAIGNS)
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapCampaignFromDb(data);
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
    if (updates.platforms !== undefined) dbUpdates.platforms = updates.platforms;
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
        dbUpdates.target_price_per_follower = avgAudience / avgBudget;
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
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    if (campaign.status !== 'draft') throw new Error('Campaign already launched');

    // Подбираем инфлюенсеров
    const matchedInfluencers = await this.findMatchingInfluencers(campaign);

    // Применяем овербукинг
    const overbookCount = Math.ceil(campaign.targetInfluencersCount * (1 + OVERBOOKING_PERCENTAGE));
    const influencersToInvite = matchedInfluencers.slice(0, overbookCount);

    // Обновляем статус кампании
    await supabase
      .from(TABLES.AUTO_CAMPAIGNS)
      .update({ status: 'active' })
      .eq('id', campaignId);

    // Отправляем предложения
    let sentCount = 0;
    for (const matched of influencersToInvite) {
      try {
        // Проверяем rate limit
        const canSend = await this.checkRateLimit(advertiserId, matched.card.influencerId);
        if (!canSend) continue;

        // Создаем предложение
        await this.createAutoCampaignOffer(campaign, matched, advertiserId);
        sentCount++;
      } catch (error) {
        console.error('Failed to send offer:', error);
      }
    }

    // Обновляем счетчики
    await supabase
      .from(TABLES.AUTO_CAMPAIGNS)
      .update({
        sent_offers_count: sentCount,
        status: sentCount > 0 ? 'active' : 'closed'
      })
      .eq('id', campaignId);

    analytics.track('auto_campaign_launched', {
      campaignId,
      targetCount: campaign.targetInfluencersCount,
      sentCount
    });
  }

  private async findMatchingInfluencers(campaign: AutoCampaign): Promise<MatchedInfluencer[]> {
    // Получаем активные карточки инфлюенсеров
    let query = supabase
      .from(TABLES.INFLUENCER_CARDS)
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false);

    // Фильтрация по размеру аудитории
    query = query
      .gte('followers_count', campaign.audienceMin)
      .lte('followers_count', campaign.audienceMax);

    // Фильтрация по платформе (если указана)
    if (campaign.platforms.length > 0) {
      query = query.in('platform', campaign.platforms);
    }

    const { data: cards, error } = await query;
    if (error) throw error;
    if (!cards || cards.length === 0) return [];

    const matched: MatchedInfluencer[] = [];

    for (const cardData of cards) {
      const card = this.mapInfluencerCardFromDb(cardData);

      // Проверяем пересечение типов контента
      const commonContentTypes = campaign.contentTypes.filter(ct =>
        card.integrationDetails?.some(detail => detail.format === ct)
      );

      if (commonContentTypes.length === 0) continue;

      // Выбираем формат с минимальной ценой среди пересекающихся
      const availableFormats = card.integrationDetails?.filter(detail =>
        commonContentTypes.includes(detail.format)
      ) || [];

      if (availableFormats.length === 0) continue;

      const minPriceFormat = availableFormats.reduce((min, current) =>
        current.price < min.price ? current : min
      );

      // Вычисляем цену за подписчика для этой карточки
      const cardPricePerFollower = card.followersCount / minPriceFormat.price;

      // Вычисляем разницу с идеальной ценой
      const priceDifference = Math.abs(cardPricePerFollower - (campaign.targetPricePerFollower || 0));

      matched.push({
        card,
        selectedFormat: minPriceFormat.format,
        selectedPrice: minPriceFormat.price,
        pricePerFollower: cardPricePerFollower,
        priceDifference
      });
    }

    // Сортируем по близости к идеальной цене
    matched.sort((a, b) => a.priceDifference - b.priceDifference);

    return matched;
  }

  private async checkRateLimit(senderId: string, receiverId: string): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - OFFER_RATE_LIMIT_MS).toISOString();

    const { data, error } = await supabase
      .from(TABLES.OFFERS)
      .select('id')
      .eq('advertiser_id', senderId)
      .eq('influencer_id', receiverId)
      .gte('created_at', oneHourAgo)
      .limit(1);

    if (error) {
      console.error('Rate limit check error:', error);
      return true; // В случае ошибки разрешаем отправку
    }

    return !data || data.length === 0;
  }

  private async createAutoCampaignOffer(
    campaign: AutoCampaign,
    matched: MatchedInfluencer,
    advertiserId: string
  ): Promise<void> {
    const { error } = await supabase
      .from(TABLES.OFFERS)
      .insert({
        advertiser_id: advertiserId,
        influencer_id: matched.card.influencerId,
        influencer_card_id: matched.card.id,
        auto_campaign_id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        budget: matched.selectedPrice,
        integration_type: matched.selectedFormat,
        platform: matched.card.platform,
        start_date: campaign.startDate,
        end_date: campaign.endDate,
        status: 'pending',
        metadata: {
          isAutoCampaign: true,
          campaignId: campaign.id,
          selectedFormat: matched.selectedFormat,
          calculatedPrice: matched.selectedPrice
        }
      });

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

    // Проверяем, нужно ли закрыть кампанию
    const campaign = await this.getCampaign(campaignId);
    if (campaign && campaign.status === 'active') {
      // Если набрано достаточно или больше нельзя отправить
      if (acceptedCount >= campaign.targetInfluencersCount) {
        await this.closeCampaign(campaignId);
      }
    }

    // Проверяем, нужно ли завершить кампанию полностью
    if (campaign && campaign.status === 'closed') {
      if (completedCount + offers.filter(o => o.status === 'cancelled').length === offers.length) {
        await this.completeCampaign(campaignId);
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

  private mapInfluencerCardFromDb(data: any): InfluencerCard {
    return {
      id: data.id,
      influencerId: data.influencer_id,
      platform: data.platform,
      followersCount: data.followers_count,
      engagementRate: data.engagement_rate,
      category: data.category,
      interests: data.interests || [],
      averageViews: data.average_views,
      contentTypes: data.content_types || [],
      integrationDetails: data.integration_details || [],
      isActive: data.is_active,
      isDeleted: data.is_deleted,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

export const autoCampaignService = new AutoCampaignService();
