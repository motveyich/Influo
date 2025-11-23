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
        target_age_groups: data.targetAgeGroups,
        target_genders: data.targetGenders,
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

    // Обновляем счетчики и статус
    // Кампания остается active если отправлено хотя бы одно предложение
    // Она закроется автоматически когда будет набрано нужное количество принятых
    const newStatus = sentCount > 0 ? 'active' : 'draft';

    await supabase
      .from(TABLES.AUTO_CAMPAIGNS)
      .update({
        sent_offers_count: sentCount,
        status: newStatus
      })
      .eq('id', campaignId);

    if (sentCount === 0) {
      throw new Error('Не найдено подходящих инфлюенсеров. Попробуйте изменить параметры кампании.');
    }

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

    // Фильтрация по платформе (если указана)
    if (campaign.platforms.length > 0) {
      query = query.in('platform', campaign.platforms);
    }

    const { data: cards, error } = await query;
    if (error) throw error;
    if (!cards || cards.length === 0) {
      console.log('No cards found');
      return [];
    }

    console.log(`Found ${cards.length} cards, filtering...`);
    console.log('Campaign filters:', {
      platforms: campaign.platforms,
      audienceMin: campaign.audienceMin,
      audienceMax: campaign.audienceMax,
      contentTypes: campaign.contentTypes
    });

    // Группируем карточки по инфлюенсерам
    const cardsByInfluencer = new Map<string, any[]>();

    for (const cardData of cards) {
      const influencerId = cardData.user_id;
      if (!cardsByInfluencer.has(influencerId)) {
        cardsByInfluencer.set(influencerId, []);
      }
      cardsByInfluencer.get(influencerId)!.push(cardData);
    }

    console.log(`Found ${cardsByInfluencer.size} unique influencers`);

    const matched: MatchedInfluencer[] = [];

    // Для каждого инфлюенсера ищем лучшую комбинацию карточка + формат
    for (const [influencerId, influencerCards] of cardsByInfluencer.entries()) {
      let bestMatch: MatchedInfluencer | null = null;
      let bestPrice = Infinity;

      console.log(`\nProcessing influencer ${influencerId} with ${influencerCards.length} cards:`);

      for (const cardData of influencerCards) {
        try {
          const reach = cardData.reach || {};
          const serviceDetails = cardData.service_details || {};
          const audienceDemographics = cardData.audience_demographics || {};
          const followers = reach.followers || 0;
          const pricing = serviceDetails.pricing || {};
          const contentTypes = serviceDetails.contentTypes || [];
          const cardInterests = audienceDemographics.interests || [];

          console.log(`  Card ${cardData.id} (${cardData.platform}):`, {
            followers,
            contentTypes,
            pricing,
            interests: cardInterests
          });

          // Проверяем размер аудитории
          if (followers < campaign.audienceMin || followers > campaign.audienceMax) {
            console.log(`    ✗ Filtered: audience ${followers} not in range [${campaign.audienceMin}, ${campaign.audienceMax}]`);
            continue;
          }

          // Проверяем интересы аудитории (если указаны в кампании)
          if (campaign.targetAudienceInterests && campaign.targetAudienceInterests.length > 0) {
            const hasMatchingInterest = campaign.targetAudienceInterests.some(interest =>
              cardInterests.includes(interest)
            );

            if (!hasMatchingInterest) {
              console.log(`    ✗ Filtered: no matching interests. Card has: [${cardInterests.join(', ')}], need one of: [${campaign.targetAudienceInterests.join(', ')}]`);
              continue;
            } else {
              const matchingInterests = campaign.targetAudienceInterests.filter(i => cardInterests.includes(i));
              console.log(`    ✓ Matching interests: ${matchingInterests.join(', ')}`);
            }
          }

          // Ищем ВСЕ совпадающие форматы контента для этой карточки
          const matchingFormats: Array<{format: string, price: number}> = [];

          for (const campaignFormat of campaign.contentTypes) {
            if (contentTypes.includes(campaignFormat)) {
              const price = pricing[campaignFormat];
              if (price && price > 0 && price >= campaign.budgetMin && price <= campaign.budgetMax) {
                matchingFormats.push({ format: campaignFormat, price });
                console.log(`    ✓ Matching: ${campaignFormat} = ${price} ₽`);
              } else if (price) {
                console.log(`    ✗ Format ${campaignFormat} price ${price} not in budget [${campaign.budgetMin}, ${campaign.budgetMax}]`);
              }
            }
          }

          if (matchingFormats.length === 0) {
            console.log(`    ✗ No matching formats with valid pricing`);
            continue;
          }

          // Находим формат с минимальной ценой для этой карточки
          const cheapest = matchingFormats.reduce((min, curr) =>
            curr.price < min.price ? curr : min
          );

          console.log(`    → Best option: ${cheapest.format} at ${cheapest.price} ₽`);

          // Если это лучшая цена для данного инфлюенсера
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
          console.error(`Error processing card ${cardData.id}:`, err);
          continue;
        }
      }

      // Если нашли хотя бы одну подходящую комбинацию для инфлюенсера
      if (bestMatch) {
        console.log(`  ✓ Selected best match for influencer: ${bestMatch.card.platform} - ${bestMatch.selectedFormat} at ${bestMatch.selectedPrice} ₽`);
        matched.push(bestMatch);
      } else {
        console.log(`  ✗ No valid matches for this influencer`);
      }
    }

    console.log(`\n=== Final result: ${matched.length} influencers matched ===`);

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
        enable_chat: campaign.enableChat,
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
      targetAgeGroups: data.target_age_groups || [],
      targetGenders: data.target_genders || [],
      targetCountries: data.target_countries || [],
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

}

export const autoCampaignService = new AutoCampaignService();
