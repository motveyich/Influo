import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';

export interface UserStats {
  pendingApplications: number;
  unreadMessages: number;
  pendingPayouts: number;
  accountRating: number;
  totalReviews: number;
  completedDeals: number;
}

export interface PlatformUpdate {
  id: string;
  title: string;
  description: string;
  type: string;
  publishedAt: string;
  isImportant: boolean;
}

export interface PlatformEvent {
  id: string;
  title: string;
  description: string;
  type: string;
  participantCount?: number;
  publishedAt: string;
}

interface ProfileMetrics {
  completed_deals_count?: number;
  total_reviews_count?: number;
  average_rating?: number;
}

@Injectable()
export class HomeService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const supabase = this.supabaseService.getClient();

      const [pendingOffers, unreadMessages, offers, profileMetrics] = await Promise.all([
        supabase
          .from('offers')
          .select('id')
          .or(`influencer_id.eq.${userId},advertiser_id.eq.${userId}`)
          .eq('status', 'pending'),

        supabase
          .from('chat_messages')
          .select('id')
          .eq('receiver_id', userId)
          .eq('is_read', false),

        supabase
          .from('offers')
          .select('offer_id, influencer_id, advertiser_id')
          .or(`influencer_id.eq.${userId},advertiser_id.eq.${userId}`)
          .in('status', ['accepted', 'in_progress']),

        supabase
          .from('user_profiles')
          .select('completed_deals_count, total_reviews_count, average_rating')
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      let pendingPayoutsCount = 0;
      if (offers.data && offers.data.length > 0) {
        const offerIds = offers.data.map(o => o.offer_id);
        const { data: paymentRequests } = await supabase
          .from('payment_requests')
          .select('id, offer_id, status')
          .in('offer_id', offerIds);

        if (paymentRequests) {
          pendingPayoutsCount = paymentRequests.filter(pr => {
            const offer = offers.data.find(o => o.offer_id === pr.offer_id);
            if (!offer) return false;

            const isAdvertiser = offer.advertiser_id === userId;
            const isInfluencer = offer.influencer_id === userId;

            if (isAdvertiser && ['pending', 'paying'].includes(pr.status)) {
              return true;
            }

            if (isInfluencer && pr.status === 'paid') {
              return true;
            }

            return false;
          }).length;
        }
      }

      const metrics: ProfileMetrics = profileMetrics.data || {};

      return {
        pendingApplications: pendingOffers.data?.length || 0,
        unreadMessages: unreadMessages.data?.length || 0,
        pendingPayouts: pendingPayoutsCount,
        accountRating: Number((metrics.average_rating || 0).toFixed(1)),
        totalReviews: metrics.total_reviews_count || 0,
        completedDeals: metrics.completed_deals_count || 0
      };
    } catch (error) {
      console.error('Failed to get user stats:', error);
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

  async getPlatformUpdates(): Promise<PlatformUpdate[]> {
    try {
      const supabase = this.supabaseService.getClient();
      const { data, error } = await supabase
        .from('platform_updates')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      return data.map(update => ({
        id: update.id,
        title: update.title,
        description: update.description,
        type: update.type,
        publishedAt: update.published_at,
        isImportant: update.is_important
      }));
    } catch (error) {
      console.error('Failed to get platform updates:', error);
      return [];
    }
  }

  async getPlatformEvents(): Promise<PlatformEvent[]> {
    try {
      const supabase = this.supabaseService.getClient();
      const { data, error } = await supabase
        .from('platform_events')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      return data.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        type: event.type,
        participantCount: event.participant_count,
        publishedAt: event.published_at
      }));
    } catch (error) {
      console.error('Failed to get platform events:', error);
      return [];
    }
  }
}
