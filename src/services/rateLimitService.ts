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
    // Rate limiting should be enforced server-side for security
    // This is a stub method that always returns false (not limited)
    return false;
  }

  async recordInteraction(
    targetUserId: string,
    interactionType: InteractionType,
    cardId?: string,
    campaignId?: string
  ): Promise<void> {
    // Rate limiting should be enforced server-side for security
    // This is a stub method
  }

  async getLastInteraction(userId: string, targetUserId: string): Promise<RateLimitInteraction | null> {
    // Rate limiting should be enforced server-side for security
    // This is a stub method that always returns null
    return null;
  }

  async getRemainingTime(userId: string, targetUserId: string): Promise<number> {
    // Rate limiting should be enforced server-side for security
    // This is a stub method that always returns 0 (no wait time)
    return 0;
  }

  async canInteract(
    userId: string,
    targetUserId: string,
    interactionType?: InteractionType,
    cardId?: string
  ): Promise<{ allowed: boolean; remainingMinutes?: number; reason?: string }> {
    // Rate limiting should be enforced server-side for security
    // This is a stub method that always allows interaction
    return { allowed: true };
  }
}

export const rateLimitService = new RateLimitService();
