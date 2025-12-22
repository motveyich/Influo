import { apiClient } from '../core/api';
import { authService } from '../core/auth';

export interface BlacklistEntry {
  id: string;
  blockerId: string;
  blockedId: string;
  reason?: string;
  createdAt: string;
}

class BlacklistService {
  async isBlacklisted(userId: string, targetUserId: string): Promise<boolean> {
    try {
      const { data, error } = await apiClient.get<any>(`/blacklist/check?userId=${userId}&targetUserId=${targetUserId}`);

      if (error) {
        console.error('Error checking blacklist:', error);
        return false;
      }

      return data?.isBlacklisted === true;
    } catch (error) {
      console.error('Error checking blacklist:', error);
      return false;
    }
  }

  async addToBlacklist(blockedUserId: string, reason?: string): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await apiClient.post('/blacklist', {
        blockerId: user.id,
        blockedId: blockedUserId,
        reason: reason || null
      });

      if (error) {
        if (error.message?.includes('already')) {
          console.log('User already in blacklist, treating as success');
          return;
        }
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Error adding to blacklist:', error);
      throw new Error(error.message || 'Failed to add to blacklist');
    }
  }

  async removeFromBlacklist(blockedUserId: string): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await apiClient.delete(`/blacklist?blockerId=${user.id}&blockedId=${blockedUserId}`);

      if (error) throw new Error(error.message);
    } catch (error: any) {
      console.error('Error removing from blacklist:', error);
      throw new Error(error.message || 'Failed to remove from blacklist');
    }
  }

  async getMyBlacklist(): Promise<BlacklistEntry[]> {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await apiClient.get<any[]>(`/blacklist?blockerId=${user.id}`);

      if (error) throw new Error(error.message);

      return (data || []).map(item => ({
        id: item.id,
        blockerId: item.blockerId || item.blocker_id,
        blockedId: item.blockedId || item.blocked_id,
        reason: item.reason,
        createdAt: item.createdAt || item.created_at
      }));
    } catch (error: any) {
      console.error('Error fetching blacklist:', error);
      return [];
    }
  }

  async isInMyBlacklist(userId: string): Promise<boolean> {
    try {
      const user = authService.getCurrentUser();
      if (!user) return false;

      const { data, error } = await apiClient.get<any>(`/blacklist/check?userId=${user.id}&targetUserId=${userId}`);

      if (error) throw new Error(error.message);

      return data?.isBlacklisted === true;
    } catch (error) {
      console.error('Error checking blacklist status:', error);
      return false;
    }
  }
}

export const blacklistService = new BlacklistService();
