import { supabase } from '../../../core/supabase';
import { CardAnalytics } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class CardAnalyticsService {
  async trackCardView(cardType: 'influencer' | 'advertiser', cardId: string, viewerId: string): Promise<void> {
    try {
      // Проверяем, что таблица существует
      const { error: tableError } = await supabase
        .from('card_analytics')
        .select('id')
        .limit(1);
      
      if (tableError && tableError.code === '42P01') {
        console.warn('Card analytics table does not exist yet');
        return;
      }

      // Получаем владельца карточки
      const ownerId = await this.getCardOwnerId(cardType, cardId);
      
      // Track view in analytics
      analytics.track('card_viewed', {
        card_type: cardType,
        card_id: cardId,
        viewer_id: viewerId
      });

      // Update card analytics only if viewer is the owner
      if (ownerId && viewerId === ownerId) {
        await this.updateCardMetrics(cardType, cardId, 'view');
      }
    } catch (error) {
      console.error('Failed to track card view:', error);
    }
  }

  async trackCardInteraction(
    cardType: 'influencer' | 'advertiser', 
    cardId: string, 
    userId: string, 
    interactionType: 'application' | 'message' | 'favorite'
  ): Promise<void> {
    try {
      // Track interaction in analytics
      analytics.track('card_interaction', {
        card_type: cardType,
        card_id: cardId,
        user_id: userId,
        interaction_type: interactionType
      });

      // Update card analytics
      await this.updateCardMetrics(cardType, cardId, interactionType);
    } catch (error) {
      console.error('Failed to track card interaction:', error);
    }
  }

  async getCardAnalytics(cardType: 'influencer' | 'advertiser', cardId: string): Promise<CardAnalytics | null> {
    try {
      // Проверяем, что таблица существует
      const { error: tableError } = await supabase
        .from('card_analytics')
        .select('id')
        .limit(1);
      
      if (tableError && tableError.code === '42P01') {
        console.warn('Card analytics table does not exist yet');
        return this.createInitialAnalytics(cardType, cardId);
      }

      const { data, error } = await supabase
        .from('card_analytics')
        .select('*')
        .eq('card_type', cardType)
        .eq('card_id', cardId)
        .eq('date_recorded', new Date().toISOString().split('T')[0])
        .maybeSingle();

      if (error) throw error;
      if (!data) return this.createInitialAnalytics(cardType, cardId);

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to get card analytics:', error);
      return null;
    }
  }

  async getUserCardAnalytics(userId: string, cardType?: 'influencer' | 'advertiser'): Promise<CardAnalytics[]> {
    try {
      let query = supabase
        .from('card_analytics')
        .select('*')
        .eq('owner_id', userId);

      if (cardType) {
        query = query.eq('card_type', cardType);
      }

      query = query.order('date_recorded', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return data.map(analytics => this.transformFromDatabase(analytics));
    } catch (error) {
      console.error('Failed to get user card analytics:', error);
      throw error;
    }
  }

  private async updateCardMetrics(
    cardType: 'influencer' | 'advertiser', 
    cardId: string, 
    metricType: 'view' | 'application' | 'message' | 'favorite'
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const ownerId = await this.getCardOwnerId(cardType, cardId);
      
      // Prepare the upsert data
      const baseRecord = {
        card_type: cardType,
        card_id: cardId,
        owner_id: ownerId,
        date_recorded: today,
        metrics: {
          totalViews: 0,
          uniqueViews: 0,
          applications: 0,
          acceptanceRate: 0,
          averageResponseTime: 0,
          rating: 0,
          completedProjects: 0
        },
        daily_stats: {},
        campaign_stats: [],
        engagement_data: {
          clickThroughRate: 0,
          messageRate: 0,
          favoriteRate: 0
        }
      };

      // Get existing record to merge metrics
      const { data: existing } = await supabase
        .from('card_analytics')
        .select('*')
        .eq('card_type', cardType)
        .eq('card_id', cardId)
        .eq('date_recorded', today)
        .maybeSingle();

      // Prepare metrics update
      const currentMetrics = existing?.metrics || baseRecord.metrics;
      const updatedMetrics = { ...currentMetrics };
      
      if (metricType === 'view') {
        updatedMetrics.totalViews = (currentMetrics.totalViews || 0) + 1;
        updatedMetrics.uniqueViews = (currentMetrics.uniqueViews || 0) + 1;
      } else if (metricType === 'application') {
        updatedMetrics.applications = (currentMetrics.applications || 0) + 1;
      }

      // Prepare daily stats update
      const currentDailyStats = existing?.daily_stats || {};
      const todayStats = currentDailyStats[today] || { views: 0, applications: 0, messages: 0 };
      
      if (metricType === 'view') {
        todayStats.views = (todayStats.views || 0) + 1;
      } else if (metricType === 'application') {
        todayStats.applications = (todayStats.applications || 0) + 1;
      } else if (metricType === 'message') {
        todayStats.messages = (todayStats.messages || 0) + 1;
      }

      const updatedDailyStats = {
        ...currentDailyStats,
        [today]: todayStats
      };

      // Use upsert to handle conflicts
      const upsertData = {
        ...baseRecord,
        metrics: updatedMetrics,
        daily_stats: updatedDailyStats,
        campaign_stats: existing?.campaign_stats || [],
        engagement_data: existing?.engagement_data || baseRecord.engagement_data
      };

      const { error } = await supabase
        .from('card_analytics')
        .upsert(upsertData, {
          onConflict: 'card_type,card_id,date_recorded'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update card metrics:', error);
    }
  }

  private async getCardOwnerId(cardType: 'influencer' | 'advertiser', cardId: string): Promise<string> {
    try {
      if (cardType === 'influencer') {
        const { data } = await supabase
          .from('influencer_cards')
          .select('user_id')
          .eq('id', cardId)
          .single();
        return data?.user_id || '';
      } else {
        // For advertiser cards, we'll need to implement this when we have the table
        return '';
      }
    } catch (error) {
      console.error('Failed to get card owner ID:', error);
      return '';
    }
  }

  private async createInitialAnalytics(cardType: 'influencer' | 'advertiser', cardId: string): Promise<CardAnalytics> {
    const ownerId = await this.getCardOwnerId(cardType, cardId);
    
    return {
      id: `temp_${Date.now()}`,
      cardType,
      cardId,
      ownerId,
      metrics: {
        totalViews: 0,
        uniqueViews: 0,
        applications: 0,
        acceptanceRate: 0,
        averageResponseTime: 0,
        rating: 0,
        completedProjects: 0
      },
      dailyStats: {},
      campaignStats: [],
      engagementData: {
        clickThroughRate: 0,
        messageRate: 0,
        favoriteRate: 0
      },
      dateRecorded: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private transformFromDatabase(dbData: any): CardAnalytics {
    return {
      id: dbData.id,
      cardType: dbData.card_type,
      cardId: dbData.card_id,
      ownerId: dbData.owner_id,
      metrics: dbData.metrics || {},
      dailyStats: dbData.daily_stats || {},
      campaignStats: dbData.campaign_stats || [],
      engagementData: dbData.engagement_data || {},
      dateRecorded: dbData.date_recorded,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }
}

export const cardAnalyticsService = new CardAnalyticsService();