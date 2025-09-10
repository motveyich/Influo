import { supabase, TABLES } from '../../../core/supabase';
import { analytics } from '../../../core/analytics';
import { contentManagementService } from '../../../services/contentManagementService';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: string;
  category: 'industry' | 'platform' | 'trends';
}

interface PlatformUpdate {
  id: string;
  title: string;
  description: string;
  type: 'feature' | 'improvement' | 'announcement';
  publishedAt: string;
  isImportant: boolean;
}

interface PlatformEvent {
  id: string;
  title: string;
  description: string;
  type: 'campaign_launch' | 'achievement' | 'contest' | 'milestone';
  participantCount?: number;
  publishedAt: string;
}

interface TopUser {
  id: string;
  name: string;
  avatar?: string;
  userType: 'influencer' | 'advertiser';
  rating: number;
  completedDeals: number;
  totalReach?: number;
  successRate: number;
}

interface CampaignStats {
  activeCampaigns: number;
  pendingApplications: number;
  unreadMessages: number;
  pendingPayouts: number;
  accountRating: number;
  totalReviews: number;
  completedDeals: number;
}

export class HomeService {
  async getNews(): Promise<NewsItem[]> {
    try {
      // Получаем новости из базы данных
      const dbNews = await contentManagementService.getPublishedNews();
      
      // Преобразуем в формат NewsItem
      const transformedNews = dbNews.map(news => ({
        id: news.id,
        title: news.title,
        summary: news.summary,
        url: news.url || '#',
        publishedAt: news.publishedAt,
        source: news.source,
        category: news.category as 'industry' | 'platform' | 'trends'
      }));
      
      // Если нет новостей в БД, возвращаем моковые данные
      return transformedNews.length > 0 ? transformedNews : this.getMockNews();
    } catch (error) {
      console.error('Failed to fetch news:', error);
      return this.getMockNews();
    }
  }

  async getPlatformUpdates(): Promise<PlatformUpdate[]> {
    try {
      // Получаем обновления из базы данных
      const dbUpdates = await contentManagementService.getPublishedUpdates();
      
      // Преобразуем в формат PlatformUpdate
      const transformedUpdates = dbUpdates.map(update => ({
        id: update.id,
        title: update.title,
        description: update.description,
        type: update.type as 'feature' | 'improvement' | 'announcement',
        publishedAt: update.publishedAt,
        isImportant: update.isImportant
      }));
      
      // Если нет обновлений в БД, возвращаем моковые данные
      return transformedUpdates.length > 0 ? transformedUpdates : this.getMockPlatformUpdates();
    } catch (error) {
      console.error('Failed to fetch platform updates:', error);
      return this.getMockPlatformUpdates();
    }
  }

  async getPlatformEvents(): Promise<PlatformEvent[]> {
    try {
      // Получаем события из базы данных
      const dbEvents = await contentManagementService.getPublishedEvents();
      
      // Преобразуем в формат PlatformEvent
      const transformedEvents = dbEvents.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        type: event.type as 'campaign_launch' | 'achievement' | 'contest' | 'milestone',
        participantCount: event.participantCount,
        publishedAt: event.publishedAt
      }));
      
      // Получаем реальные события из базы данных (кампании и достижения)
      const recentCampaigns = await this.getRecentCampaignLaunches();
      const achievements = await this.getRecentAchievements();
      
      // Объединяем все события
      const allEvents = [...transformedEvents, ...recentCampaigns, ...achievements];
      
      // Если мало событий, добавляем моковые данные
      return allEvents.length > 0 ? allEvents : [...allEvents, ...this.getMockEvents()];
    } catch (error) {
      console.error('Failed to fetch platform events:', error);
      return this.getMockEvents();
    }
  }

  async getTopInfluencers(): Promise<TopUser[]> {
    try {
      // Получаем топ инфлюенсеров из базы данных
      const { data, error } = await supabase
        .from(TABLES.USER_PROFILES)
        .select(`
          user_id,
          full_name,
          avatar,
          user_type
        `)
        .eq('user_type', 'influencer')
        .limit(5);

      if (error) throw error;

      // Дополняем данными из карточек инфлюенсеров
      const influencersWithStats = await Promise.all(
        data.map(async (user) => {
          const { data: cards } = await supabase
            .from(TABLES.INFLUENCER_CARDS)
            .select('rating, completed_campaigns, reach')
            .eq('user_id', user.user_id);

          const totalRating = cards?.reduce((sum, card) => sum + (card.rating || 0), 0) || 0;
          const totalCampaigns = cards?.reduce((sum, card) => sum + (card.completed_campaigns || 0), 0) || 0;
          const totalReach = cards?.reduce((sum, card) => sum + (card.reach?.followers || 0), 0) || 0;
          const avgRating = cards?.length ? totalRating / cards.length : 0;

          return {
            id: user.user_id,
            name: user.full_name || 'Пользователь',
            avatar: user.avatar,
            userType: 'influencer' as const,
            rating: avgRating,
            completedDeals: totalCampaigns,
            totalReach: totalReach,
            successRate: totalCampaigns > 0 ? Math.min(95, 70 + Math.random() * 25) : 0
          };
        })
      );

      // Сортируем по рейтингу и количеству сделок
      return influencersWithStats
        .sort((a, b) => (b.rating * b.completedDeals) - (a.rating * a.completedDeals))
        .slice(0, 5);
    } catch (error) {
      console.error('Failed to fetch top influencers:', error);
      return this.getMockTopInfluencers();
    }
  }

  async getTopAdvertisers(): Promise<TopUser[]> {
    try {
      // Получаем топ рекламодателей из базы данных
      const { data, error } = await supabase
        .from(TABLES.USER_PROFILES)
        .select(`
          user_id,
          full_name,
          avatar,
          user_type
        `)
        .eq('user_type', 'advertiser')
        .limit(5);

      if (error) throw error;

      // Дополняем данными из кампаний
      const advertisersWithStats = await Promise.all(
        data.map(async (user) => {
          const { data: campaigns } = await supabase
            .from(TABLES.CAMPAIGNS)
            .select('status, metrics')
            .eq('advertiser_id', user.user_id);

          const totalCampaigns = campaigns?.length || 0;
          const completedCampaigns = campaigns?.filter(c => c.status === 'completed').length || 0;
          const successRate = totalCampaigns > 0 ? (completedCampaigns / totalCampaigns) * 100 : 0;

          return {
            id: user.user_id,
            name: user.full_name || 'Пользователь',
            avatar: user.avatar,
            userType: 'advertiser' as const,
            rating: Math.min(5, 3.5 + Math.random() * 1.5), // Моковый рейтинг
            completedDeals: completedCampaigns,
            successRate: Math.round(successRate)
          };
        })
      );

      // Сортируем по количеству завершенных кампаний и рейтингу
      return advertisersWithStats
        .sort((a, b) => (b.completedDeals * b.rating) - (a.completedDeals * a.rating))
        .slice(0, 5);
    } catch (error) {
      console.error('Failed to fetch top advertisers:', error);
      return this.getMockTopAdvertisers();
    }
  }

  async getCampaignStats(userId: string): Promise<CampaignStats> {
    try {
      return await this.getUserActualStats(userId);
    } catch (error) {
      console.error('Failed to fetch campaign stats:', error);
      return this.getEmptyStats();
    }
  }

  async getUserActualStats(userId: string): Promise<CampaignStats> {
    try {
      // 1. Активные кампании (если пользователь - рекламодатель)
      const { data: userProfile } = await supabase
        .from(TABLES.USER_PROFILES)
        .select('user_type')
        .eq('user_id', userId)
        .single();

      let activeCampaigns = 0;
      if (userProfile?.user_type === 'advertiser') {
        const { data: campaigns } = await supabase
          .from(TABLES.CAMPAIGNS)
          .select('campaign_id')
          .eq('advertiser_id', userId)
          .eq('status', 'active')
          .eq('is_deleted', false);
        activeCampaigns = campaigns?.length || 0;
      }

      // 2. Заявки на сотрудничество (полученные пользователем)
      const { data: applications } = await supabase
        .from(TABLES.APPLICATIONS)
        .select('id')
        .eq('target_id', userId)
        .eq('status', 'sent');
      const pendingApplications = applications?.length || 0;

      // 3. Неотвеченные сообщения
      const { data: unreadMessages } = await supabase
        .from(TABLES.CHAT_MESSAGES)
        .select('id')
        .eq('receiver_id', userId)
        .eq('is_read', false);
      const unreadCount = unreadMessages?.length || 0;

      // 4. Ждут выплат (deals в статусе pending payout)
      let pendingPayoutsCount = 0;
      try {
        // Считаем окна оплаты в ожидании
        const { data: pendingPaymentWindows } = await supabase
          .from('payment_windows')
          .select('id')
          .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
          .in('status', ['pending', 'paying', 'paid']);
        pendingPayoutsCount = pendingPaymentWindows?.length || 0;
      } catch (dealsError) {
        // Таблица payment_windows еще не создана, возвращаем 0
        console.log('Deals table not yet created:', dealsError);
        pendingPayoutsCount = 0;
      }

      // 5. Рейтинг аккаунта
      let totalReviews = 0;
      let averageRating = 0;
      try {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('reviewee_id', userId)
          .eq('is_public', true);
        
        totalReviews = reviews?.length || 0;
        averageRating = totalReviews > 0 
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
          : 0;
      } catch (reviewsError) {
        // Таблица reviews еще не создана, возвращаем 0
        console.log('Reviews table not yet created:', reviewsError);
        totalReviews = 0;
        averageRating = 0;
      }

      // 6. Завершенные сделки
      let completedDealsCount = 0;
      try {
        const { data: completedDeals } = await supabase
          .from('deals')
          .select('id')
          .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
          .eq('deal_status', 'completed');
        completedDealsCount = completedDeals?.length || 0;
      } catch (dealsError) {
        // Таблица deals еще не создана, возвращаем 0
        console.log('Deals table not yet created:', dealsError);
        completedDealsCount = 0;
      }

      return {
        activeCampaigns,
        pendingApplications,
        unreadMessages: unreadCount,
        pendingPayouts: pendingPayoutsCount,
        accountRating: Number(averageRating.toFixed(1)),
        totalReviews,
        completedDeals: completedDealsCount
      };
    } catch (error) {
      console.error('Failed to get user actual stats:', error);
      return this.getEmptyStats();
    }
  }

  async getPendingPaymentsCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('payment_windows')
        .select('id')
        .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
        .in('status', ['pending', 'paying', 'paid']);

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      if (error?.code === '42P01') {
        console.log('Payment windows table not yet created');
        return 0;
      }
      console.error('Failed to get pending payments count:', error);
      return 0;
    }
  }

  private getEmptyStats(): CampaignStats {
    return {
      activeCampaigns: 0,
      pendingApplications: 0,
      unreadMessages: 0,
      pendingPayouts: 0,
      accountRating: 0,
      totalReviews: 0,
      completedDeals: 0
    };
  }

  private async getRecentCampaignLaunches(): Promise<PlatformEvent[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.CAMPAIGNS)
        .select('campaign_id, title, brand, created_at, metrics')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      return data.map(campaign => ({
        id: campaign.campaign_id,
        title: `Запущена кампания "${campaign.title}"`,
        description: `Бренд ${campaign.brand} запустил новую кампанию. Уже ${campaign.metrics?.applicants || 0} заявок получено.`,
        type: 'campaign_launch' as const,
        participantCount: campaign.metrics?.applicants || 0,
        publishedAt: campaign.created_at
      }));
    } catch (error) {
      console.error('Failed to fetch recent campaigns:', error);
      return [];
    }
  }

  private async getRecentAchievements(): Promise<PlatformEvent[]> {
    try {
      // Получаем пользователей с высокими достижениями
      const { data, error } = await supabase
        .from(TABLES.USER_PROFILES)
        .select('user_id, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      if (error) throw error;

      return data.map(user => ({
        id: `achievement_${user.user_id}`,
        title: `${user.full_name} присоединился к платформе`,
        description: `Добро пожаловать в сообщество Influo!`,
        type: 'achievement' as const,
        publishedAt: user.created_at
      }));
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
      return [];
    }
  }

  private getMockNews(): NewsItem[] {
    return [
      {
        id: 'news_1',
        title: 'Инфлюенс-маркетинг показал рост на 67% в 2024 году',
        summary: 'Согласно новому исследованию, рынок инфлюенс-маркетинга продолжает активно расти, достигнув отметки в $21.1 миллиард.',
        url: 'https://example.com/news/1',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        source: 'Marketing Land',
        category: 'industry'
      },
      {
        id: 'news_2',
        title: 'TikTok запускает новые инструменты для брендов',
        summary: 'Платформа представила обновленный Creator Marketplace с улучшенной аналитикой и инструментами таргетинга.',
        url: 'https://example.com/news/2',
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        source: 'TikTok Business',
        category: 'platform'
      },
      {
        id: 'news_3',
        title: 'Микро-инфлюенсеры демонстрируют лучшую вовлеченность',
        summary: 'Исследование показало, что инфлюенсеры с аудиторией 10K-100K показывают на 60% лучшую вовлеченность.',
        url: 'https://example.com/news/3',
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        source: 'Influencer Marketing Hub',
        category: 'trends'
      },
      {
        id: 'news_4',
        title: 'Instagram тестирует новый формат рекламы в Stories',
        summary: 'Новый интерактивный формат позволит брендам создавать более вовлекающий контент с инфлюенсерами.',
        url: 'https://example.com/news/4',
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        source: 'Instagram Business',
        category: 'platform'
      },
      {
        id: 'news_5',
        title: 'Аутентичность контента становится ключевым трендом',
        summary: 'Потребители все больше ценят честные отзывы и аутентичный контент от инфлюенсеров.',
        url: 'https://example.com/news/5',
        publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        source: 'Social Media Today',
        category: 'trends'
      }
    ];
  }

  private getMockPlatformUpdates(): PlatformUpdate[] {
    return [
      {
        id: 'update_1',
        title: 'Новая система аналитики',
        description: 'Запущена обновленная система отслеживания эффективности кампаний с детальными метриками.',
        type: 'feature',
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        isImportant: true
      },
      {
        id: 'update_2',
        title: 'Улучшена система чата',
        description: 'Добавлены уведомления в реальном времени и улучшена стабильность соединения.',
        type: 'improvement',
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        isImportant: false
      },
      {
        id: 'update_3',
        title: 'Техническое обслуживание',
        description: 'Плановое обслуживание серверов 15 февраля с 02:00 до 04:00 МСК.',
        type: 'announcement',
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        isImportant: true
      },
      {
        id: 'update_4',
        title: 'Новые фильтры поиска',
        description: 'Добавлены расширенные фильтры для поиска инфлюенсеров по географии и тематике.',
        type: 'feature',
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        isImportant: false
      }
    ];
  }

  private getMockEvents(): PlatformEvent[] {
    return [
      {
        id: 'event_1',
        title: 'Конкурс "Лучшая кампания месяца"',
        description: 'Участвуйте в конкурсе и выиграйте бесплатную рекламу вашей кампании на главной странице.',
        type: 'contest',
        participantCount: 24,
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'event_2',
        title: 'Платформа достигла 10,000 пользователей',
        description: 'Мы рады сообщить о достижении важной вехи - 10,000 активных пользователей!',
        type: 'milestone',
        publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  private getMockTopInfluencers(): TopUser[] {
    return [
      {
        id: 'inf_1',
        name: 'Анна Модникова',
        userType: 'influencer',
        rating: 4.9,
        completedDeals: 45,
        totalReach: 250000,
        successRate: 92
      },
      {
        id: 'inf_2',
        name: 'Максим Техноблог',
        userType: 'influencer',
        rating: 4.8,
        completedDeals: 38,
        totalReach: 180000,
        successRate: 89
      },
      {
        id: 'inf_3',
        name: 'Елена Путешествия',
        userType: 'influencer',
        rating: 4.7,
        completedDeals: 32,
        totalReach: 320000,
        successRate: 85
      },
      {
        id: 'inf_4',
        name: 'Дмитрий Фитнес',
        userType: 'influencer',
        rating: 4.6,
        completedDeals: 28,
        totalReach: 150000,
        successRate: 88
      },
      {
        id: 'inf_5',
        name: 'София Красота',
        userType: 'influencer',
        rating: 4.5,
        completedDeals: 25,
        totalReach: 200000,
        successRate: 83
      }
    ];
  }

  private getMockTopAdvertisers(): TopUser[] {
    return [
      {
        id: 'adv_1',
        name: 'EcoStyle',
        userType: 'advertiser',
        rating: 4.8,
        completedDeals: 15,
        successRate: 94
      },
      {
        id: 'adv_2',
        name: 'TechWave',
        userType: 'advertiser',
        rating: 4.6,
        completedDeals: 12,
        successRate: 87
      },
      {
        id: 'adv_3',
        name: 'FitLife',
        userType: 'advertiser',
        rating: 4.5,
        completedDeals: 10,
        successRate: 85
      },
      {
        id: 'adv_4',
        name: 'BeautyBrand',
        userType: 'advertiser',
        rating: 4.4,
        completedDeals: 8,
        successRate: 82
      },
      {
        id: 'adv_5',
        name: 'TravelCorp',
        userType: 'advertiser',
        rating: 4.3,
        completedDeals: 7,
        successRate: 80
      }
    ];
  }

  private getMockCampaignStats(): CampaignStats {
    return {
      totalCampaigns: 156,
      activeCampaigns: 23,
      averageBudget: 3500,
      averageConversion: 78,
      newApplicationsThisWeek: 47,
      totalBudgetThisMonth: 125000,
      successfulDeals: 89,
      averageResponseTime: 3
    };
  }
}

export const homeService = new HomeService();