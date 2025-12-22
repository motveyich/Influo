import { apiClient, showFeatureNotImplemented } from '../../../core/api';
import { Favorite } from '../../../core/types';
import { analytics } from '../../../core/analytics';

export class FavoriteService {
  async addToFavorites(favoriteData: Partial<Favorite>): Promise<Favorite> {
    try {
      const payload = {
        userId: favoriteData.userId,
        targetType: favoriteData.targetType,
        targetId: favoriteData.targetId,
        metadata: favoriteData.metadata || {}
      };

      const { data, error } = await apiClient.post<any>('/favorites', payload);

      if (error) throw new Error(error.message);

      analytics.track('favorite_added', {
        user_id: favoriteData.userId,
        target_type: favoriteData.targetType,
        target_id: favoriteData.targetId
      });

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to add to favorites:', error);
      throw error;
    }
  }

  async removeFromFavorites(userId: string, targetType: string, targetId: string): Promise<void> {
    try {
      const { error } = await apiClient.delete(`/favorites?userId=${userId}&targetType=${targetType}&targetId=${targetId}`);

      if (error) throw new Error(error.message);

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
      const params = new URLSearchParams();
      params.append('userId', userId);
      if (targetType) {
        params.append('targetType', targetType);
      }

      const { data, error } = await apiClient.get<any[]>(`/favorites?${params.toString()}`);

      if (error) throw new Error(error.message);

      return (data || []).map(fav => this.transformFromApi(fav));
    } catch (error) {
      console.error('Failed to get user favorites:', error);
      throw error;
    }
  }

  async getFavorite(userId: string, targetType: string, targetId: string): Promise<Favorite | null> {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(targetId)) {
        console.warn(`Invalid UUID format for targetId: ${targetId}`);
        return null;
      }

      const { data, error } = await apiClient.get<any>(`/favorites/check?userId=${userId}&targetType=${targetType}&targetId=${targetId}`);

      if (error) {
        if (error.status === 404) return null;
        throw new Error(error.message);
      }

      if (!data) return null;

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to get favorite:', error);
      throw error;
    }
  }

  async isFavorite(userId: string, targetType: string, targetId: string): Promise<boolean> {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(targetId)) {
        console.warn(`Invalid UUID format for targetId: ${targetId}`);
        return false;
      }

      const { data, error } = await apiClient.get<any>(`/favorites/check?userId=${userId}&targetType=${targetType}&targetId=${targetId}`);

      if (error) {
        if (error.status === 404) return false;
        console.error('Error checking favorite:', error);
        return false;
      }

      return data?.isFavorite ?? !!data;
    } catch (error) {
      console.error('Failed to check if favorite:', error);
      return false;
    }
  }

  async sendBulkApplications(userId: string, favoriteIds: string[], applicationData: any): Promise<{
    total: number;
    sent: number;
    skipped: number;
    failed: number;
    errors: Array<{ cardId: string; reason: string }>;
  }> {
    try {
      const { data, error } = await apiClient.post<any>('/favorites/bulk-apply', {
        userId,
        favoriteIds,
        applicationData
      });

      if (error) throw new Error(error.message);

      analytics.track('bulk_applications_sent', {
        user_id: userId,
        total: data.total,
        sent: data.sent,
        skipped: data.skipped,
        failed: data.failed
      });

      return data;
    } catch (error) {
      console.error('Failed to send bulk applications:', error);
      throw error;
    }
  }

  async getFavoriteStatistics(userId: string): Promise<any> {
    try {
      const { data, error } = await apiClient.get<any>(`/favorites/statistics?userId=${userId}`);

      if (error) throw new Error(error.message);

      return data;
    } catch (error) {
      console.error('Failed to get favorite statistics:', error);
      throw error;
    }
  }

  private transformFromApi(apiData: any): Favorite {
    return {
      id: apiData.id,
      userId: apiData.userId || apiData.user_id,
      targetType: apiData.targetType || apiData.target_type,
      targetId: apiData.targetId || apiData.target_id,
      metadata: apiData.metadata || {},
      createdAt: apiData.createdAt || apiData.created_at
    };
  }
}

export const favoriteService = new FavoriteService();
