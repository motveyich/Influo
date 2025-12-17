import { apiClient } from '../../../core/api';
import { Favorite } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class FavoriteService {
  async addToFavorites(favoriteData: Partial<Favorite>): Promise<Favorite> {
    try {
      const payload = {
        targetId: favoriteData.targetId,
        targetType: favoriteData.targetType,
      };

      const favorite = await apiClient.post<Favorite>('/favorites', payload);

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
      await apiClient.delete(`/favorites/${favoriteId}`);

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
      let queryString = '';
      if (params?.targetType) {
        queryString = `?targetType=${params.targetType}`;
      }
      const favorites = await apiClient.get<Favorite[]>(`/favorites${queryString}`);
      return Array.isArray(favorites) ? favorites : [];
    } catch (error) {
      console.error('Failed to get favorites:', error);
      return [];
    }
  }

  async isFavorite(targetId: string, targetType: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites({ targetType });
      return favorites.some(fav => fav.targetId === targetId);
    } catch (error) {
      console.error('Failed to check favorite status:', error);
      return false;
    }
  }
}

export const favoriteService = new FavoriteService();
