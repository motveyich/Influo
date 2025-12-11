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
      const { data } = await supabase
        .from('blacklist')
        .select('id')
        .or(`and(blocker_id.eq.${userId},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${userId})`)
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Error checking blacklist:', error);
      return false;
    }
  }

  async addToBlacklist(blockedUserId: string, reason?: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('blacklist')
        .insert({
          blocker_id: user.id,
          blocked_id: blockedUserId,
          reason: reason,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding to blacklist:', error);
      throw error;
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
    } catch (error) {
      console.error('Error removing from blacklist:', error);
      throw error;
    }
  }

  async getMyBlacklist(): Promise<BlacklistEntry[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

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
        createdAt: item.created_at,
      }));
    } catch (error) {
      console.error('Error getting blacklist:', error);
      return [];
    }
  }

  async isInMyBlacklist(blockedUserId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from('blacklist')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId)
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Error checking if in blacklist:', error);
      return false;
    }
  }
}

export const blacklistService = new BlacklistService();
