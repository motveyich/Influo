import { apiClient } from '../../../core/api';
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
      const response = await apiClient.get<PlatformUpdate[]>('/home/updates');
      return response || [];
    } catch (error) {
      console.error('Failed to fetch platform updates:', error);
      return [];
    }
  }

  async getPlatformEvents(): Promise<PlatformEvent[]> {
    try {
      const response = await apiClient.get<PlatformEvent[]>('/home/events');
      return response || [];
    } catch (error) {
      console.error('Failed to fetch platform events:', error);
      return [];
    }
  }

  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const response = await apiClient.get<UserStats>('/home/stats');
      return response || this.getEmptyStats();
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      return this.getEmptyStats();
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
