import { supabase } from '../core/supabase';
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
      const { data, error } = await supabase.rpc('is_user_blacklisted', {
        p_user_id: userId,
        p_target_user_id: targetUserId
      });

      if (error) {
        console.error('Error checking blacklist:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error checking blacklist:', error);
      return false;
    }
  }

  async addToBlacklist(blockedUserId: string, reason?: string): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('blacklist')
        .insert({
          blocker_id: user.id,
          blocked_id: blockedUserId,
          reason: reason || null
        });

      if (error) {
        if (error.code === '23505') {
          console.log('User already in blacklist, treating as success');
          return;
        }
        throw error;
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

      const { error } = await supabase
        .from('blacklist')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error removing from blacklist:', error);
      throw new Error(error.message || 'Failed to remove from blacklist');
    }
  }

  async getMyBlacklist(): Promise<BlacklistEntry[]> {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('blacklist')
        .select('*')
        .eq('blocker_id', user.id);

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        blockerId: item.blocker_id,
        blockedId: item.blocked_id,
        reason: item.reason,
        createdAt: item.created_at
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

      const { data, error } = await supabase.rpc('is_user_blacklisted', {
        p_user_id: user.id,
        p_target_user_id: userId
      });

      if (error) throw error;

      return data === true;
    } catch (error) {
      console.error('Error checking blacklist status:', error);
      return false;
    }
  }
}

export const blacklistService = new BlacklistService();
