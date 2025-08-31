import { supabase } from '../../../core/supabase';
import { Favorite } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class FavoriteService {
  async addToFavorites(favoriteData: Partial<Favorite>): Promise<Favorite> {
    try {
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

          // Check for existing application to this user
          const { data: existingApplication } = await supabase
            .from('applications')
            .select('id')
            .eq('applicant_id', userId)
            .eq('target_id', influencerCard.user_id)
            .eq('target_type', 'influencer_card')
            .neq('status', 'cancelled')
            .maybeSingle();

          if (existingApplication) {
            console.log(`Skipping duplicate application to user ${influencerCard.user_id}`);
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