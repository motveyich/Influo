import { api } from '../../../core/api';
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
      const stats = await api.get(`/profiles/${userId}/stats`);
      return stats;
    } catch (error) {
      console.error('Failed to get user actual stats:', error);
      return this.getEmptyStats();
    }
  }

  async getPendingPaymentsCount(userId: string): Promise<number> {
    try {
      const stats = await api.get(`/profiles/${userId}/stats`);
      return stats.pendingPayouts || 0;
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