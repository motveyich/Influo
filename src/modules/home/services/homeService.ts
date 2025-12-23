import { supabase } from '../../../core/supabase';
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
      const { data, error } = await supabase
        .from('platform_updates')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Failed to fetch platform updates:', error);
        return [];
      }

      return (data || []).map(update => ({
        id: update.id,
        title: update.title,
        description: update.description,
        type: update.type,
        publishedAt: update.published_at,
        isImportant: update.is_important
      }));
    } catch (error) {
      console.error('Failed to fetch platform updates:', error);
      return [];
    }
  }

  async getPlatformEvents(): Promise<PlatformEvent[]> {
    try {
      const { data, error } = await supabase
        .from('platform_events')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false})
        .limit(5);

      if (error) {
        console.error('Failed to fetch platform events:', error);
        return [];
      }

      return (data || []).map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        type: event.type,
        participantCount: event.participant_count,
        publishedAt: event.published_at
      }));
    } catch (error) {
      console.error('Failed to fetch platform events:', error);
      return [];
    }
  }

  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const { count: pendingApplications } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('influencer_id', userId)
        .eq('status', 'pending');

      const { count: unreadMessages } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);

      const { count: pendingPayouts } = await supabase
        .from('payment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('influencer_id', userId)
        .eq('status', 'pending');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const { count: totalReviews } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('reviewed_user_id', userId);

      const { count: completedDeals } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('influencer_id', userId)
        .eq('status', 'completed');

      return {
        pendingApplications: pendingApplications || 0,
        unreadMessages: unreadMessages || 0,
        pendingPayouts: pendingPayouts || 0,
        accountRating: profile?.rating || 0,
        totalReviews: totalReviews || 0,
        completedDeals: completedDeals || 0
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
      const { count } = await supabase
        .from('payment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('influencer_id', userId)
        .eq('status', 'pending');

      return count || 0;
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
