import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';

@Injectable()
export class RateLimitService {
  constructor(private readonly supabase: SupabaseService) {}

  async isRateLimited(
    userId: string,
    targetUserId: string,
    interactionType?: string,
    cardId?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.getClient().rpc('is_rate_limited', {
        p_user_id: userId,
        p_target_user_id: targetUserId,
        p_interaction_type: interactionType || null,
        p_card_id: cardId || null
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
    userId: string,
    targetUserId: string,
    interactionType: string,
    cardId?: string,
    campaignId?: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase.getClient()
        .from('rate_limit_interactions')
        .insert({
          user_id: userId,
          target_user_id: targetUserId,
          interaction_type: interactionType,
          card_id: cardId || null,
          campaign_id: campaignId || null
        });

      if (error) {
        throw new BadRequestException(`Failed to record interaction: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Error recording interaction:', error);
      throw error;
    }
  }

  async getLastInteraction(userId: string, targetUserId: string) {
    try {
      const { data, error } = await this.supabase.getClient()
        .from('rate_limit_interactions')
        .select('*')
        .eq('user_id', userId)
        .eq('target_user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new BadRequestException(`Failed to fetch last interaction: ${error.message}`);
      }

      if (!data) return null;

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
      console.error('Error fetching last interaction:', error);
      return null;
    }
  }

  async getRemainingTime(userId: string, targetUserId: string): Promise<number> {
    try {
      const lastInteraction = await this.getLastInteraction(userId, targetUserId);
      if (!lastInteraction) return 0;

      const interactionTime = new Date(lastInteraction.createdAt).getTime();
      const now = Date.now();
      const oneHourInMs = 60 * 60 * 1000;
      const elapsed = now - interactionTime;
      const remaining = oneHourInMs - elapsed;

      return Math.max(0, Math.ceil(remaining / 1000 / 60));
    } catch (error) {
      console.error('Error calculating remaining time:', error);
      return 0;
    }
  }

  async canInteract(
    userId: string,
    targetUserId: string,
    interactionType?: string,
    cardId?: string
  ) {
    try {
      const isLimited = await this.isRateLimited(userId, targetUserId, interactionType, cardId);

      if (isLimited) {
        const remainingMinutes = await this.getRemainingTime(userId, targetUserId);

        let message: string;
        if (interactionType === 'favorite') {
          message = `Вы недавно добавили эту карточку в избранное. Попробуйте через ${remainingMinutes} мин.`;
        } else if (interactionType === 'application') {
          message = `Вы недавно отправили заявку на эту карточку. Попробуйте через ${remainingMinutes} мин.`;
        } else {
          message = `Вы недавно взаимодействовали с этим пользователем. Попробуйте через ${remainingMinutes} мин.`;
        }

        return {
          allowed: false,
          remainingMinutes,
          reason: message
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking interaction permission:', error);
      return { allowed: true };
    }
  }
}
