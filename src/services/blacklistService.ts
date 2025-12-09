import { apiClient } from '../core/api';

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
      const response = await apiClient.get<{ isBlacklisted: boolean }>(
        `/blacklist/check?userId=${userId}&targetUserId=${targetUserId}`
      );
      return response.isBlacklisted;
    } catch (error) {
      console.error('Error checking blacklist:', error);
      return false;
    }
  }

  async addToBlacklist(blockedUserId: string, reason?: string): Promise<void> {
    try {
      await apiClient.post('/blacklist', { blockedUserId, reason });
    } catch (error) {
      console.error('Error adding to blacklist:', error);
      throw error;
    }
  }

  async removeFromBlacklist(blockedUserId: string): Promise<void> {
    try {
      await apiClient.delete(`/blacklist/${blockedUserId}`);
    } catch (error) {
      console.error('Error removing from blacklist:', error);
      throw error;
    }
  }

  async getMyBlacklist(): Promise<BlacklistEntry[]> {
    try {
      return await apiClient.get<BlacklistEntry[]>('/blacklist');
    } catch (error) {
      console.error('Error getting blacklist:', error);
      return [];
    }
  }

  async isInMyBlacklist(blockedUserId: string): Promise<boolean> {
    try {
      const blacklist = await this.getMyBlacklist();
      return blacklist.some(entry => entry.blockedId === blockedUserId);
    } catch (error) {
      console.error('Error checking if in blacklist:', error);
      return false;
    }
  }
}

export const blacklistService = new BlacklistService();
