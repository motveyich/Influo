import { CardAnalytics } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class CardAnalyticsService {
  async trackCardView(cardType: 'influencer' | 'advertiser', cardId: string, viewerId: string): Promise<void> {
    try {
      // Track view in client-side analytics only
      // Server should handle database updates
      analytics.track('card_viewed', {
        card_type: cardType,
        card_id: cardId,
        viewer_id: viewerId
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
      // Track interaction in client-side analytics only
      // Server should handle database updates
      analytics.track('card_interaction', {
        card_type: cardType,
        card_id: cardId,
        user_id: userId,
        interaction_type: interactionType
      });
    } catch (error) {
      console.error('Failed to track card interaction:', error);
    }
  }

  async getCardAnalytics(cardType: 'influencer' | 'advertiser', cardId: string): Promise<CardAnalytics | null> {
    // Card analytics should be fetched from backend API
    // This is a stub method returning initial empty analytics
    return this.createInitialAnalytics(cardType, cardId);
  }

  async getUserCardAnalytics(userId: string, cardType?: 'influencer' | 'advertiser'): Promise<CardAnalytics[]> {
    // Card analytics should be fetched from backend API
    // This is a stub method returning empty array
    return [];
  }

  private async createInitialAnalytics(cardType: 'influencer' | 'advertiser', cardId: string): Promise<CardAnalytics> {
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
}

export const cardAnalyticsService = new CardAnalyticsService();