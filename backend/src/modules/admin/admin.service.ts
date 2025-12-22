import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { BlockUserDto, SearchUsersDto } from './dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private supabaseService: SupabaseService) {}

  async getAllUsers(filters: SearchUsersDto) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase.from('user_profiles').select('*');

    if (filters.isDeleted !== undefined) {
      query = query.eq('is_deleted', filters.isDeleted);
    } else {
      query = query.eq('is_deleted', false);
    }

    if (filters.role) {
      query = query.eq('role', filters.role);
    }

    if (filters.searchQuery) {
      query = query.or(
        `full_name.ilike.%${filters.searchQuery}%,email.ilike.%${filters.searchQuery}%`,
      );
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to get users: ${error.message}`);
      throw new BadRequestException('Failed to get users');
    }

    return {
      success: true,
      data: data.map(user => this.transformUser(user)),
    };
  }

  async blockUser(adminId: string, userId: string, blockUserDto: BlockUserDto) {
    const supabase = this.supabaseService.getAdminClient();

    if (adminId === userId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', adminId)
      .single();

    if (!adminProfile || !['admin', 'moderator'].includes(adminProfile.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const { data: currentUser, error: checkError } = await supabase
      .from('user_profiles')
      .select('is_deleted, deleted_at')
      .eq('user_id', userId)
      .single();

    if (checkError) {
      this.logger.error(`Failed to check user: ${checkError.message}`);
      throw new BadRequestException('User not found');
    }

    if (currentUser.is_deleted) {
      throw new BadRequestException('User is already blocked');
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: adminId,
      })
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Failed to block user: ${error.message}`);
      throw new BadRequestException('Failed to block user');
    }

    await this.logAction(adminId, 'user_blocked', 'user_profile', userId, {
      reason: blockUserDto.reason,
    });

    return {
      success: true,
      message: 'User blocked successfully',
    };
  }

  async unblockUser(adminId: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', adminId)
      .single();

    if (!adminProfile || !['admin', 'moderator'].includes(adminProfile.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
      })
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Failed to unblock user: ${error.message}`);
      throw new BadRequestException('Failed to unblock user');
    }

    await this.logAction(adminId, 'user_unblocked', 'user_profile', userId, {});

    return {
      success: true,
      message: 'User unblocked successfully',
    };
  }

  async getAdminLogs(limit = 100, offset = 0) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error(`Failed to get admin logs: ${error.message}`);
      throw new BadRequestException('Failed to get admin logs');
    }

    return {
      success: true,
      data: data || [],
    };
  }

  async getPlatformStats() {
    const supabase = this.supabaseService.getAdminClient();

    const [usersResult, cardsResult, offersResult, campaignsResult] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('influencer_cards').select('*', { count: 'exact', head: true }),
      supabase.from('offers').select('*', { count: 'exact', head: true }),
      supabase.from('auto_campaigns').select('*', { count: 'exact', head: true }),
    ]);

    return {
      success: true,
      data: {
        totalUsers: usersResult.count || 0,
        totalCards: cardsResult.count || 0,
        totalOffers: offersResult.count || 0,
        totalCampaigns: campaignsResult.count || 0,
      },
    };
  }

  async logAction(
    adminId: string,
    actionType: string,
    targetType?: string,
    targetId?: string,
    details?: Record<string, any>,
  ) {
    const supabase = this.supabaseService.getAdminClient();

    const logEntry = {
      admin_id: adminId,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      details: details || {},
      ip_address: null,
      user_agent: null,
      session_id: `session_${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('admin_logs').insert([logEntry]);

    if (error) {
      this.logger.error(`Failed to log action: ${error.message}`);
    }
  }

  private transformUser(dbUser: any) {
    return {
      userId: dbUser.user_id,
      email: dbUser.email,
      fullName: dbUser.full_name,
      userType: dbUser.user_type,
      avatar: dbUser.avatar,
      role: dbUser.role,
      isDeleted: dbUser.is_deleted,
      deletedAt: dbUser.deleted_at,
      deletedBy: dbUser.deleted_by,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };
  }
}
