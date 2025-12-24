import { db } from '../api/database';
import { UserProfile, Campaign, InfluencerCard, AdminLog, UserRole } from '../core/types';

export class AdminService {
  async logAction(
    adminId: string,
    actionType: string,
    targetType?: string,
    targetId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      await db.from('admin_logs').insert({
        admin_id: adminId,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        details: details || {},
        user_agent: navigator.userAgent,
        session_id: `session_${Date.now()}`
      }).execute();
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }
  }

  async getAllUsers(filters?: {
    role?: UserRole;
    searchQuery?: string;
    isDeleted?: boolean;
  }): Promise<UserProfile[]> {
    try {
      let query = db
        .from('user_profiles')
        .select('*');

      if (filters?.role) {
        query = query.eq('role', filters.role);
      }

      if (filters?.searchQuery) {
        const searchPattern = `%${filters.searchQuery}%`;
        query = query.ilike('email', searchPattern).ilike('full_name', searchPattern);
      }

      if (filters?.isDeleted !== undefined) {
        query = query.eq('is_deleted', filters.isDeleted);
      }

      const { data, error } = await query.execute();

      if (error) throw error;

      return (data || []).map(user => this.transformUserFromDb(user));
    } catch (error) {
      console.error('Failed to get all users:', error);
      throw error;
    }
  }

  async deleteUser(userId: string, deletedBy: string, deleterUserRole: UserRole): Promise<void> {
    try {
      console.log('🔧 [AdminService] Starting user blocking process:', { userId, deletedBy });

      if (!['admin', 'moderator'].includes(deleterUserRole)) {
        console.error('❌ [AdminService] Insufficient permissions for user:', deletedBy, 'role:', deleterUserRole);
        throw new Error('Insufficient permissions');
      }

      if (userId === deletedBy) {
        throw new Error('Cannot block yourself');
      }

      const { error } = await db.rpc('admin_block_user', {
        p_user_id: userId,
        p_blocked_by: deletedBy
      });

      if (error) throw error;

      console.log('✅ [AdminService] User blocked successfully');

      await this.logAction(deletedBy, 'user_deleted', 'user_profile', userId);
    } catch (error) {
      console.error('❌ [AdminService] Complete failure in deleteUser:', error);
      throw error;
    }
  }

  async blockUser(userId: string, blockedBy: string): Promise<void> {
    try {
      const { error } = await db.rpc('admin_block_user', {
        p_user_id: userId,
        p_blocked_by: blockedBy
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to block user:', error);
      throw error;
    }
  }

  async restoreUser(userId: string, restoredBy: string): Promise<void> {
    try {
      console.log('🔧 [AdminService] Starting user restoration:', { userId, restoredBy });

      const { error } = await db.rpc('admin_unblock_user', {
        p_user_id: userId,
        p_unblocked_by: restoredBy
      });

      if (error) throw error;

      console.log('✅ [AdminService] User restored successfully');

      await this.logAction(restoredBy, 'user_restored', 'user_profile', userId);
    } catch (error) {
      console.error('Failed to restore user:', error);
      throw error;
    }
  }

  async getAllCampaigns(filters?: {
    status?: string;
    moderationStatus?: any;
    isDeleted?: boolean;
  }): Promise<Campaign[]> {
    try {
      let query = db
        .from('auto_campaigns')
        .select('*');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.isDeleted !== undefined) {
        query = query.eq('is_deleted', filters.isDeleted);
      }

      const { data, error } = await query.execute();

      if (error) {
        console.error('Failed to get campaigns:', error);
        return [];
      }

      return (data || []).map(campaign => this.transformCampaignFromDb(campaign));
    } catch (error) {
      console.error('Failed to get all campaigns:', error);
      return [];
    }
  }

  async deleteCampaign(campaignId: string, deletedBy: string): Promise<void> {
    try {
      const { error } = await db
        .from('auto_campaigns')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy
        })
        .eq('id', campaignId)
        .execute();

      if (error) throw error;

      await this.logAction(deletedBy, 'campaign_deleted', 'campaign', campaignId);
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      throw error;
    }
  }

  async getAllInfluencerCards(filters?: {
    moderationStatus?: any;
    isDeleted?: boolean;
  }): Promise<InfluencerCard[]> {
    try {
      let query = db
        .from('influencer_cards')
        .select('*');

      if (filters?.isDeleted !== undefined) {
        query = query.eq('is_deleted', filters.isDeleted);
      }

      const { data, error } = await query.execute();

      if (error) {
        console.error('Failed to get influencer cards:', error);
        return [];
      }

      return (data || []).map(card => this.transformInfluencerCardFromDb(card));
    } catch (error) {
      console.error('Failed to get all influencer cards:', error);
      return [];
    }
  }

  async deleteInfluencerCard(cardId: string, deletedBy: string): Promise<void> {
    try {
      const { error } = await db
        .from('influencer_cards')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy
        })
        .eq('id', cardId)
        .execute();

      if (error) throw error;

      await this.logAction(deletedBy, 'influencer_card_deleted', 'influencer_card', cardId);
    } catch (error) {
      console.error('Failed to delete influencer card:', error);
      throw error;
    }
  }

  async getAdminLogs(filters?: {
    adminId?: string;
    actionType?: string;
    limit?: number;
  }): Promise<AdminLog[]> {
    try {
      let query = db
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.adminId) {
        query = query.eq('admin_id', filters.adminId);
      }

      if (filters?.actionType) {
        query = query.eq('action_type', filters.actionType);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query.execute();

      if (error) {
        console.warn('Admin logs not available:', error);
        return [];
      }

      return (data || []).map(log => this.transformLogFromDb(log));
    } catch (error) {
      console.error('Failed to get admin logs:', error);
      return [];
    }
  }

  async getAdminStats(): Promise<any> {
    try {
      const usersResult = await db
        .from('user_profiles')
        .select('user_id')
        .execute();
      const totalUsers = Array.isArray(usersResult.data) ? usersResult.data.length : 0;

      const campaignsResult = await db
        .from('auto_campaigns')
        .select('id')
        .execute();
      const totalCampaigns = Array.isArray(campaignsResult.data) ? campaignsResult.data.length : 0;

      const cardsResult = await db
        .from('influencer_cards')
        .select('id')
        .execute();
      const totalInfluencerCards = Array.isArray(cardsResult.data) ? cardsResult.data.length : 0;

      const reportsResult = await db
        .from('content_reports')
        .select('id')
        .eq('status', 'pending')
        .execute();
      const pendingReports = Array.isArray(reportsResult.data) ? reportsResult.data.length : 0;

      return {
        totalUsers,
        totalCampaigns,
        totalInfluencerCards,
        pendingReports
      };
    } catch (error) {
      console.error('Failed to get admin stats:', error);
      return {};
    }
  }

  private transformUserFromDb(dbData: any): UserProfile {
    const baseProfile = {
      userId: dbData.user_id,
      email: dbData.email,
      fullName: dbData.full_name,
      username: dbData.username || '',
      phone: dbData.phone || '',
      userType: dbData.user_type,
      avatar: dbData.avatar,
      bio: dbData.bio,
      location: dbData.location,
      website: dbData.website,
      influencerData: dbData.influencer_data,
      advertiserData: dbData.advertiser_data,
      profileCompletion: dbData.profile_completion,
      unifiedAccountInfo: dbData.unified_account_info || {
        accountType: dbData.user_type
      },
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };

    return {
      ...baseProfile,
      is_deleted: dbData.is_deleted ?? false,
      deleted_at: dbData.deleted_at,
      deleted_by: dbData.deleted_by
    } as any;
  }

  private transformCampaignFromDb(dbData: any): Campaign {
    return {
      campaignId: dbData.id,
      advertiserId: dbData.advertiser_id,
      title: dbData.title,
      description: dbData.description,
      brand: dbData.brand_name || dbData.brand,
      budget: dbData.budget,
      preferences: dbData.target_criteria || {},
      status: dbData.status,
      timeline: { startDate: dbData.start_date, endDate: dbData.end_date },
      metrics: dbData.metrics || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }

  private transformInfluencerCardFromDb(dbData: any): InfluencerCard {
    return {
      id: dbData.id,
      userId: dbData.user_id,
      platform: dbData.platform,
      reach: dbData.reach,
      audienceDemographics: dbData.audience_demographics,
      serviceDetails: dbData.service_details,
      rating: dbData.rating,
      completedCampaigns: dbData.completed_campaigns,
      isActive: dbData.is_active ?? true,
      lastUpdated: dbData.updated_at,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    } as any;
  }

  private transformLogFromDb(dbData: any): AdminLog {
    return {
      id: dbData.id,
      adminId: dbData.admin_id,
      actionType: dbData.action_type,
      targetType: dbData.target_type,
      targetId: dbData.target_id,
      details: dbData.details || {},
      ipAddress: dbData.ip_address,
      userAgent: dbData.user_agent,
      sessionId: dbData.session_id,
      createdAt: dbData.created_at
    };
  }
}

export const adminService = new AdminService();
