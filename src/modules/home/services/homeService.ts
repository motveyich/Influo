import { apiClient, showFeatureNotImplemented } from '../../../core/api';
import { analytics } from '../../../core/analytics';

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
      const { data, error } = await apiClient.get<any[]>('/home/updates');

      if (error) {
        console.error('Failed to fetch platform updates:', error);
        return [];
      }

      return (data || []).map(update => ({
        id: update.id,
        title: update.title,
        description: update.description,
        type: update.type as 'feature' | 'improvement' | 'announcement',
        publishedAt: update.publishedAt || update.published_at,
        isImportant: update.isImportant ?? update.is_important
      }));
    } catch (error) {
      console.error('Failed to fetch platform updates:', error);
      return [];
    }
  }

  async getPlatformEvents(): Promise<PlatformEvent[]> {
    try {
      const { data, error } = await apiClient.get<any[]>('/home/events');

      if (error) {
        console.error('Failed to fetch platform events:', error);
        return [];
      }

      return (data || []).map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        type: event.type as 'campaign_launch' | 'achievement' | 'contest' | 'milestone',
        participantCount: event.participantCount || event.participant_count,
        publishedAt: event.publishedAt || event.published_at
      }));
    } catch (error) {
      console.error('Failed to fetch platform events:', error);
      return [];
    }
  }

  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const { data, error } = await apiClient.get<any>(`/home/stats?userId=${userId}`);

      if (error) {
        console.error('Failed to fetch user stats:', error);
        return this.getEmptyStats();
      }

      return {
        pendingApplications: data.pendingApplications || data.pending_applications || 0,
        unreadMessages: data.unreadMessages || data.unread_messages || 0,
        pendingPayouts: data.pendingPayouts || data.pending_payouts || 0,
        accountRating: Number((data.accountRating || data.account_rating || 0).toFixed(1)),
        totalReviews: data.totalReviews || data.total_reviews || 0,
        completedDeals: data.completedDeals || data.completed_deals || 0
      };
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      return this.getEmptyStats();
    }
  }

  async getUserActualStats(userId: string): Promise<UserStats> {
    return this.getUserStats(userId);
  }

  async getPendingPaymentsCount(userId: string): Promise<number> {
    try {
      const { data, error } = await apiClient.get<any>(`/home/stats?userId=${userId}`);

      if (error) {
        console.error('Failed to get pending payments count:', error);
        return 0;
      }

      return data?.pendingPayouts || data?.pending_payouts || 0;
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
