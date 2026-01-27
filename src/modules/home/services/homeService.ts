import { apiClient } from '../../../core/api';
import { analytics } from '../../../core/analytics';
import { contentManagementService } from '../../../services/contentManagementService';
import { chatService } from '../../chat/services/chatService';
import { offerService } from '../../offers/services/offerService';
import { paymentRequestService } from '../../offers/services/paymentRequestService';

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

interface UserStats {
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

  async getUserStats(userId: string): Promise<UserStats> {
    try {
      return await this.getUserActualStats(userId);
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      return this.getEmptyStats();
    }
  }

  async getUserActualStats(userId: string): Promise<UserStats> {
    try {
      // 1. Pending offers from API
      const offers = await offerService.getOffers({ status: 'pending' });
      const pendingApplications = offers.length;

      // 2. Unread messages from chat service
      const unreadCount = await chatService.getUnreadCount();

      // 3. Pending payouts from payment service
      let pendingPayoutsCount = 0;
      try {
        const paymentRequests = await paymentRequestService.getPaymentRequests();
        pendingPayoutsCount = paymentRequests.filter(pr =>
          ['pending', 'paying', 'paid'].includes(pr.status)
        ).length;
      } catch (error) {
        console.log('Error counting payment requests:', error);
        pendingPayoutsCount = 0;
      }

      // 4. Profile metrics from API
      let totalReviews = 0;
      let averageRating = 0;
      let completedDealsCount = 0;
      try {
        const metrics = await apiClient.get<{
          completedDealsCount: number;
          totalReviewsCount: number;
          averageRating: number;
        }>(`/profiles/${userId}/metrics`);

        totalReviews = metrics.totalReviewsCount || 0;
        averageRating = metrics.averageRating || 0;
        completedDealsCount = metrics.completedDealsCount || 0;
      } catch (metricsError) {
        console.log('Failed to get user metrics:', metricsError);
      }

      return {
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
      const paymentRequests = await paymentRequestService.getPaymentRequests();
      return paymentRequests.filter(pr =>
        ['pending', 'paying', 'paid'].includes(pr.status)
      ).length;
    } catch (error) {
      console.error('Failed to get pending payments count:', error);
      return 0;
    }
  }

  private getEmptyStats(): UserStats {
    return {
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