import { api } from '../../../core/api';
import { CardAnalytics } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class CardAnalyticsService {
  async trackCardView(cardType: 'influencer' | 'advertiser', cardId: string, viewerId: string): Promise<void> {
    try {
      analytics.track('card_viewed', {
        card_type: cardType,
        card_id: cardId,
        viewer_id: viewerId
      });

      await api.post('/card-analytics/track-view', {
        cardId,
        cardType: `${cardType}_cards`,
        viewerId
      });
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
      analytics.track('card_interaction', {
        card_type: cardType,
        card_id: cardId,
        user_id: userId,
        interaction_type: interactionType
      });

      await api.post('/card-analytics/track-view', {
        cardId,
        cardType: `${cardType}_cards`,
        viewerId: userId
      });
    } catch (error) {
      console.error('Failed to track card interaction:', error);
    }
  }

  async getCardAnalytics(cardType: 'influencer' | 'advertiser', cardId: string): Promise<CardAnalytics | null> {
    try {
      const data = await api.get(`/card-analytics/card/${cardId}`, {
        params: { cardType: `${cardType}_cards` }
      });

      return this.transformFromAPI(data);
    } catch (error) {
      console.error('Failed to get card analytics:', error);
      return this.createInitialAnalytics(cardType, cardId);
    }
  }

  async getUserCardAnalytics(userId: string, cardType?: 'influencer' | 'advertiser'): Promise<CardAnalytics[]> {
    try {
      const data = await api.get('/card-analytics/user');
      return data.map((item: any) => this.transformFromAPI(item));
    } catch (error) {
      console.error('Failed to get user card analytics:', error);
      throw error;
    }
  }

  private createInitialAnalytics(cardType: 'influencer' | 'advertiser', cardId: string): CardAnalytics {
    return {
      id: `temp_${Date.now()}`,
      cardType,
      cardId,
      ownerId: '',
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

  private transformFromAPI(data: any): CardAnalytics {
    return {
      id: data.id || `temp_${Date.now()}`,
      cardType: data.card_type?.replace('_cards', '') || 'influencer',
      cardId: data.card_id,
      ownerId: data.owner_id || '',
      metrics: {
        totalViews: data.views_count || 0,
        uniqueViews: data.views_count || 0,
        applications: data.applications_count || 0,
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
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString()
    };
  }
}

export const cardAnalyticsService = new CardAnalyticsService();
