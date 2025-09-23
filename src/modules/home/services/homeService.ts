import { supabase, TABLES } from '../../../core/supabase';
import { analytics } from '../../../core/analytics';
import { contentManagementService } from '../../../services/contentManagementService';

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
      
      // Возвращаем только реальные данные из БД
      return transformedUpdates;
    } catch (error) {
      console.error('Failed to fetch platform updates:', error);
      return [];
    }
  }

  async getPlatformEvents(): Promise<PlatformEvent[]> {
    try {
      // Получаем только события, созданные вручную через админ-панель
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
      
      return transformedEvents;
    } catch (error) {
      console.error('Failed to fetch platform events:', error);
      return [];
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
        // Count payment requests awaiting confirmation
        const { data: pendingPaymentRequests } = await supabase
          .from('payment_windows')
          .select('id')
          .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
          .in('status', ['pending', 'paying', 'paid']);
        pendingPayoutsCount = pendingPaymentRequests?.length || 0;
      } catch (dealsError) {
        console.log('Payment windows table not yet created:', dealsError);
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

}

export const homeService = new HomeService();