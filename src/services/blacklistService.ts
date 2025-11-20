import { supabase } from '../core/supabase';

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if already blacklisted
      const existing = await this.isInMyBlacklist(blockedUserId);
      if (existing) {
        // Already blacklisted - this is OK, not an error
        console.log('User already in blacklist, skipping insert');
        return;
      }

      const { error } = await supabase
        .from('blacklist')
        .insert({
          blocker_id: user.id,
          blocked_id: blockedUserId,
          reason: reason || null
        });

      // Handle duplicate key error gracefully (409 conflict)
      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation - user already blocked
          console.log('User already in blacklist (duplicate key), treating as success');
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
      const { data: { user } } = await supabase.auth.getUser();
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('blacklist')
        .select('*')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('blacklist')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .maybeSingle();

      if (error) throw error;

      return !!data;
    } catch (error) {
      console.error('Error checking blacklist status:', error);
      return false;
    }
  }
}

export const blacklistService = new BlacklistService();
