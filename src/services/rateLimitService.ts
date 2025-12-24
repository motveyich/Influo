import { database } from '../core/database';
import { authService } from '../core/auth';

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
    try {
      const { data, error } = await database.rpc('is_rate_limited', {
        p_user_id: userId,
        p_target_user_id: targetUserId
      });

      if (error) {
        console.error('Error checking rate limit:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return false;
    }
  }

  async recordInteraction(
    targetUserId: string,
    interactionType: InteractionType,
    cardId?: string,
    campaignId?: string
  ): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      await database.from('rate_limit_interactions').insert({
        user_id: user.id,
        target_user_id: targetUserId,
        interaction_type: interactionType,
        card_id: cardId,
        campaign_id: campaignId
      });
    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  }

  async getLastInteraction(userId: string, targetUserId: string): Promise<RateLimitInteraction | null> {
    try {
      const { data, error } = await database
        .from('rate_limit_interactions')
        .select('*')
        .eq('user_id', userId)
        .eq('target_user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        targetUserId: data.target_user_id,
        interactionType: data.interaction_type,
        cardId: data.card_id,
        campaignId: data.campaign_id,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error getting last interaction:', error);
      return null;
    }
  }

  async getRemainingTime(userId: string, targetUserId: string): Promise<number> {
    try {
      const lastInteraction = await this.getLastInteraction(userId, targetUserId);
      if (!lastInteraction) return 0;

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const interactionTime = new Date(lastInteraction.createdAt);

      if (interactionTime < oneHourAgo) return 0;

      const remainingMs = (interactionTime.getTime() + 60 * 60 * 1000) - Date.now();
      return Math.ceil(remainingMs / (60 * 1000));
    } catch (error) {
      console.error('Error getting remaining time:', error);
      return 0;
    }
  }

  async canInteract(
    userId: string,
    targetUserId: string,
    interactionType?: InteractionType,
    cardId?: string
  ): Promise<{ allowed: boolean; remainingMinutes?: number; reason?: string }> {
    try {
      const isLimited = await this.isRateLimited(userId, targetUserId);

      if (isLimited) {
        const remainingMinutes = await this.getRemainingTime(userId, targetUserId);
        return {
          allowed: false,
          remainingMinutes,
          reason: `Please wait ${remainingMinutes} minutes before interacting again`
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking if can interact:', error);
      return { allowed: true };
    }
  }
}

export const rateLimitService = new RateLimitService();
