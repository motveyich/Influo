import { supabase } from '../../../core/supabase';
import { Favorite } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class FavoriteService {
  private transformFavorite(data: any): Favorite {
    return {
      id: data.id,
      userId: data.user_id,
      targetId: data.card_id,
      targetType: data.card_type,
      createdAt: data.created_at,
    };
  }

  async addToFavorites(favoriteData: Partial<Favorite>): Promise<Favorite> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          card_id: favoriteData.targetId,
          card_type: favoriteData.targetType,
        })
        .select()
        .single();

      if (error) throw error;

      const favorite = this.transformFavorite(data);

      analytics.track('favorite_added', {
        target_type: favoriteData.targetType,
        target_id: favoriteData.targetId
      });

      return favorite;
    } catch (error) {
      console.error('Failed to add to favorites:', error);
      throw error;
    }
  }

  async removeFromFavorites(favoriteId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      analytics.track('favorite_removed', {
        favorite_id: favoriteId
      });
    } catch (error) {
      console.error('Failed to remove from favorites:', error);
      throw error;
    }
  }

  async getFavorites(params?: { targetType?: string }): Promise<Favorite[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id);

      if (params?.targetType) {
        query = query.eq('card_type', params.targetType);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(item => this.transformFavorite(item));
    } catch (error) {
      console.error('Failed to get favorites:', error);
      throw error;
    }
  }

  async isFavorite(targetId: string, targetType: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('card_id', targetId)
        .eq('card_type', targetType)
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Failed to check favorite status:', error);
      return false;
    }
  }
}

export const favoriteService = new FavoriteService();
