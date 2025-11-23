import { supabase, isSupabaseConfigured } from '../../../core/supabase';
import { Favorite } from '../../../core/types';
import { analytics } from '../../../core/analytics';
import { blacklistService } from '../../../services/blacklistService';
import { rateLimitService } from '../../../services/rateLimitService';

export class FavoriteService {
  private async getCardOwnerId(targetType: string, targetId: string): Promise<string | null> {
    try {
      let ownerId: string | null = null;

      if (targetType === 'influencer_card' || targetType === 'card') {
        const { data } = await supabase
          .from('influencer_cards')
          .select('user_id')
          .eq('card_id', targetId)
          .maybeSingle();
        ownerId = data?.user_id || null;
      } else if (targetType === 'advertiser_card') {
        const { data } = await supabase
          .from('advertiser_cards')
          .select('user_id')
          .eq('card_id', targetId)
          .maybeSingle();
        ownerId = data?.user_id || null;
      } else if (targetType === 'campaign') {
        const { data } = await supabase
          .from('campaigns')
          .select('advertiser_id')
          .eq('campaign_id', targetId)
          .maybeSingle();
        ownerId = data?.advertiser_id || null;
      }

      return ownerId;
    } catch (error) {
      console.error('Error getting card owner:', error);
      return null;
    }
  }

  async addToFavorites(favoriteData: Partial<Favorite>): Promise<Favorite> {
    try {
      // Get card owner
      const targetUserId = await this.getCardOwnerId(favoriteData.targetType!, favoriteData.targetId!);
      if (!targetUserId) {
        throw new Error('Cannot find card owner');
      }

      // Check blacklist
      const isBlacklisted = await blacklistService.isBlacklisted(
        favoriteData.userId!,
        targetUserId
      );
      if (isBlacklisted) {
        throw new Error('Вы не можете взаимодействовать с этим пользователем');
      }

      // Check rate limit
      const rateLimitCheck = await rateLimitService.canInteract(
        favoriteData.userId!,
        targetUserId
      );
      if (!rateLimitCheck.allowed) {
        throw new Error(rateLimitCheck.reason || 'Слишком частые действия. Попробуйте позже');
      }

      // Check if already in favorites
      const existing = await this.getFavorite(favoriteData.userId!, favoriteData.targetType!, favoriteData.targetId!);
      if (existing) {
        throw new Error('Already in favorites');
      }

      const newFavorite = {
        user_id: favoriteData.userId,
        target_type: favoriteData.targetType,
        target_id: favoriteData.targetId,
        metadata: {
          addedAt: new Date().toISOString(),
          ...favoriteData.metadata
        },
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('favorites')
        .insert([newFavorite])
        .select()
        .single();

      if (error) throw error;

      // Track analytics
      analytics.track('favorite_added', {
        user_id: favoriteData.userId,
        target_type: favoriteData.targetType,
        target_id: favoriteData.targetId
      });

      // Record rate limit interaction
      try {
        await rateLimitService.recordInteraction(
          targetUserId,
          'favorite',
          favoriteData.targetId
        );
      } catch (rateLimitError) {
        console.error('Failed to record rate limit:', rateLimitError);
      }

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to add to favorites:', error);
      throw error;
    }
  }

  async removeFromFavorites(userId: string, targetType: string, targetId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      if (error) throw error;

      // Track analytics
      analytics.track('favorite_removed', {
        user_id: userId,
        target_type: targetType,
        target_id: targetId
      });
    } catch (error) {
      console.error('Failed to remove from favorites:', error);
      throw error;
    }
  }

  async getUserFavorites(userId: string, targetType?: string): Promise<Favorite[]> {
    try {
      let query = supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId);

      if (targetType) {
        query = query.eq('target_type', targetType);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return data.map(fav => this.transformFromDatabase(fav));
    } catch (error) {
      console.error('Failed to get user favorites:', error);
      throw error;
    }
  }

  async getFavorite(userId: string, targetType: string, targetId: string): Promise<Favorite | null> {
    try {
      // Validate UUID format for targetId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(targetId)) {
        console.warn(`Invalid UUID format for targetId: ${targetId}`);
        return null;
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to get favorite:', error);
      throw error;
    }
  }

  async isFavorite(userId: string, targetType: string, targetId: string): Promise<boolean> {
    try {
      // Validate UUID format for targetId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(targetId)) {
        console.warn(`Invalid UUID format for targetId: ${targetId}`);
        return false;
      }

      // Check if Supabase is configured before making any requests
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, returning false for favorite check');
        return false;
      }

      // Проверяем, что таблица существует
      const { error: tableError } = await supabase
        .from('favorites')
        .select('id')
        .limit(1);
      
      if (tableError && tableError.code === '42P01') {
        console.warn('Favorites table does not exist yet');
        return false;
      }

      const favorite = await this.getFavorite(userId, targetType, targetId);
      return !!favorite;
    } catch (error) {
      console.error('Failed to check if favorite:', error);
      return false;
    }
  }

  async sendBulkApplications(userId: string, favoriteIds: string[], applicationData: any): Promise<void> {
    try {
      // Get user's favorites for influencer cards
      const favorites = await this.getUserFavorites(userId, 'influencer_card');
      const targetFavorites = favorites.filter(fav => favoriteIds.includes(fav.targetId));
      
      for (const favorite of targetFavorites) {
        try {
          // Get the influencer card to retrieve the user_id
          const { data: influencerCard, error: cardError } = await supabase
            .from('influencer_cards')
            .select('user_id')
            .eq('id', favorite.targetId)
            .single();

          if (cardError || !influencerCard) {
            console.error(`Failed to get influencer card ${favorite.targetId}:`, cardError);
            continue;
          }

          // Check for recent application (within last hour) to this card
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const { data: recentApplication } = await supabase
            .from('applications')
            .select('id, created_at')
            .eq('applicant_id', userId)
            .eq('target_reference_id', favorite.targetId)
            .eq('target_type', 'influencer_card')
            .gte('created_at', oneHourAgo)
            .maybeSingle();

          if (recentApplication) {
            console.log(`Skipping - recent application to card ${favorite.targetId} within last hour`);
            continue;
          }

          // Create application for each favorite
          const { applicationService } = await import('../../applications/services/applicationService');
          
          await applicationService.createApplication({
            applicantId: userId,
            targetId: influencerCard.user_id, // Use the user_id from the card
            targetType: 'influencer_card',
            targetReferenceId: favorite.targetId,
            applicationData: {
              message: applicationData.message || 'Заинтересован в сотрудничестве',
              proposedRate: applicationData.proposedRate || 1000,
              timeline: applicationData.timeline || '2 недели',
              deliverables: applicationData.deliverables || ['Пост в Instagram']
            }
          });
        } catch (error) {
          console.error(`Failed to create application for favorite ${favorite.id}:`, error);
        }
      }

      // Track bulk application
      analytics.track('bulk_applications_sent', {
        user_id: userId,
        count: targetFavorites.length,
        target_types: ['influencer_card']
      });
    } catch (error) {
      console.error('Failed to send bulk applications:', error);
      throw error;
    }
  }

  private transformFromDatabase(dbData: any): Favorite {
    return {
      id: dbData.id,
      userId: dbData.user_id,
      targetType: dbData.target_type,
      targetId: dbData.target_id,
      metadata: dbData.metadata || {},
      createdAt: dbData.created_at
    };
  }
}

export const favoriteService = new FavoriteService();