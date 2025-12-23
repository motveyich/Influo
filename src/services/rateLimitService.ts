import { showFeatureNotImplemented } from '../core/api';

export type InteractionType = 'application' | 'favorite' | 'automatic_offer' | 'manual_offer';

export interface RateLimitInteraction {
  id: string;
  userId: string;
  targetUserId: string;
  interactionType: InteractionType;
  cardId?: string;
  campaignId?: string;
  createdAt: string;
}

class RateLimitService {
  async isRateLimited(
    userId: string,
    targetUserId: string,
    interactionType?: InteractionType,
    cardId?: string
  ): Promise<boolean> {
    console.warn('Rate limiting not yet implemented in backend');
    return false;
  }

  async recordInteraction(
    targetUserId: string,
    interactionType: InteractionType,
    cardId?: string,
    campaignId?: string
  ): Promise<void> {
    console.warn('Rate limiting not yet implemented in backend');
  }

  async getLastInteraction(userId: string, targetUserId: string): Promise<RateLimitInteraction | null> {
    return null;
  }

  async getRemainingTime(userId: string, targetUserId: string): Promise<number> {
    return 0;
  }

  async canInteract(
    userId: string,
    targetUserId: string,
    interactionType?: InteractionType,
    cardId?: string
  ): Promise<{ allowed: boolean; remainingMinutes?: number; reason?: string }> {
    return { allowed: true };
  }
}

export const rateLimitService = new RateLimitService();
