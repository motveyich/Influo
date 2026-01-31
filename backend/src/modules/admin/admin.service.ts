import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';

@Injectable()
export class AdminService {
  constructor(private supabaseService: SupabaseService) {}

  async getAllUsers(filters?: {
    role?: string;
    searchQuery?: string;
    isDeleted?: boolean;
  }) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('user_profiles')
      .select('*');

    if (filters?.isDeleted !== undefined) {
      query = query.eq('is_deleted', filters.isDeleted);
    } else {
      query = query.eq('is_deleted', false);
    }

    if (filters?.role) {
      query = query.eq('user_type', filters.role);
    }

    if (filters?.searchQuery) {
      query = query.or(`full_name.ilike.%${filters.searchQuery}%,email.ilike.%${filters.searchQuery}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch users: ${error.message}`);
    }

    return data;
  }

  async getAllCampaigns(filters?: {
    status?: string;
    moderationStatus?: string;
    isDeleted?: boolean;
  }) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('auto_campaigns')
      .select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.moderationStatus) {
      query = query.eq('moderation_status', filters.moderationStatus);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch campaigns: ${error.message}`);
    }

    return data;
  }

  async getAllInfluencerCards(filters?: {
    moderationStatus?: string;
    isDeleted?: boolean;
  }) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('influencer_cards')
      .select('*');

    if (filters?.isDeleted !== undefined) {
      query = query.eq('is_deleted', filters.isDeleted);
    } else {
      query = query.eq('is_deleted', false);
    }

    if (filters?.moderationStatus) {
      query = query.eq('moderation_status', filters.moderationStatus);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch influencer cards: ${error.message}`);
    }

    return data;
  }

  async getAdminLogs(filters?: {
    adminId?: string;
    actionType?: string;
    limit?: number;
  }) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('admin_logs')
      .select('*');

    if (filters?.adminId) {
      query = query.eq('admin_id', filters.adminId);
    }

    if (filters?.actionType) {
      query = query.eq('action_type', filters.actionType);
    }

    query = query.order('created_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch admin logs: ${error.message}`);
    }

    return data || [];
  }

  async blockUser(userId: string, adminId: string, adminRole: string) {
    if (!['admin', 'moderator'].includes(adminRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (userId === adminId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const supabase = this.supabaseService.getClient();

    const { data: currentUser, error: checkError } = await supabase
      .from('user_profiles')
      .select('is_deleted')
      .eq('user_id', userId)
      .single();

    if (checkError) {
      throw new NotFoundException(`User not found: ${checkError.message}`);
    }

    if (currentUser.is_deleted === true) {
      throw new BadRequestException('User is already blocked');
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: adminId
      })
      .eq('user_id', userId)
      .select();

    if (error) {
      throw new BadRequestException(`Failed to block user: ${error.message}`);
    }

    await this.logAction(adminId, 'user_blocked', 'user_profile', userId);

    return { message: 'User blocked successfully', data };
  }

  async restoreUser(userId: string, adminId: string, adminRole: string) {
    if (!['admin', 'moderator'].includes(adminRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('user_profiles')
      .update({
        is_deleted: false,
        deleted_at: null,
        deleted_by: null
      })
      .eq('user_id', userId);

    if (error) {
      throw new BadRequestException(`Failed to restore user: ${error.message}`);
    }

    await this.logAction(adminId, 'user_restored', 'user_profile', userId);

    return { message: 'User restored successfully' };
  }

  async deleteCampaign(campaignId: string, adminId: string, adminRole: string) {
    if (!['admin', 'moderator'].includes(adminRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('auto_campaigns')
      .update({
        status: 'closed'
      })
      .eq('id', campaignId);

    if (error) {
      throw new BadRequestException(`Failed to delete campaign: ${error.message}`);
    }

    await this.logAction(adminId, 'campaign_deleted', 'campaign', campaignId);

    return { message: 'Campaign deleted successfully' };
  }

  async deleteInfluencerCard(cardId: string, adminId: string, adminRole: string) {
    if (!['admin', 'moderator'].includes(adminRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('influencer_cards')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: adminId
      })
      .eq('id', cardId);

    if (error) {
      throw new BadRequestException(`Failed to delete influencer card: ${error.message}`);
    }

    await this.logAction(adminId, 'influencer_card_deleted', 'influencer_card', cardId);

    return { message: 'Influencer card deleted successfully' };
  }

  private async logAction(
    adminId: string,
    actionType: string,
    targetType?: string,
    targetId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      const supabase = this.supabaseService.getClient();

      const logEntry = {
        admin_id: adminId,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        details: details || {},
        ip_address: null,
        user_agent: null,
        session_id: `session_${Date.now()}`,
        created_at: new Date().toISOString()
      };

      await supabase.from('admin_logs').insert([logEntry]);
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }
  }
}
