import { supabase, TABLES } from '../core/supabase';
import { UserProfile, Campaign, InfluencerCard, ContentReport, ModerationQueueItem, AdminLog, UserRole } from '../core/types';
import { roleService } from './roleService';

export class AdminService {
  async logAction(
    adminId: string,
    actionType: string,
    targetType?: string,
    targetId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      const logEntry = {
        admin_id: adminId,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        details: details || {},
        ip_address: null, // Would be populated by edge function
        user_agent: navigator.userAgent,
        session_id: `session_${Date.now()}`,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from(TABLES.ADMIN_LOGS)
        .insert([logEntry]);

      if (error) throw error;
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
      let query = supabase
        .from(TABLES.USER_PROFILES)
        .select('*');

      if (filters?.isDeleted !== undefined) {
        query = query.eq('is_deleted', filters.isDeleted);
      } else {
        query = query.eq('is_deleted', false);
      }

      if (filters?.role) {
        query = query.eq('role', filters.role);
      }

      if (filters?.searchQuery) {
        query = query.or(`full_name.ilike.%${filters.searchQuery}%,email.ilike.%${filters.searchQuery}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return data.map(user => this.transformUserFromDatabase(user));
    } catch (error) {
      console.error('Failed to get all users:', error);
      throw error;
    }
  }

  async deleteUser(userId: string, deletedBy: string, deleterUserRole: UserRole): Promise<void> {
    try {
      console.log('🔧 [AdminService] Starting user blocking process:', { userId, deletedBy });
      
      // Check permissions using provided role
      if (!['admin', 'moderator'].includes(deleterUserRole)) {
        console.error('❌ [AdminService] Insufficient permissions for user:', deletedBy, 'role:', deleterUserRole);
        throw new Error('Insufficient permissions');
      }

      console.log('✅ [AdminService] Permission check passed, admin role:', deleterUserRole);

      // Prevent self-blocking
      if (userId === deletedBy) {
        throw new Error('Cannot block yourself');
      }

      // Check if user is already blocked
      console.log('🔧 [AdminService] Checking if user is already blocked...');
      const { data: currentUser, error: checkError } = await supabase
        .from(TABLES.USER_PROFILES)
        .select('is_deleted, deleted_at')
        .eq('user_id', userId)
        .single();

      if (checkError) {
        console.error('❌ [AdminService] Failed to check user status:', checkError);
        throw new Error(`Failed to check user status: ${checkError.message}`);
      }

      if (currentUser.is_deleted === true) {
        console.log('⚠️ [AdminService] User is already blocked');
        throw new Error('User is already blocked');
      }

      // Block user by setting is_deleted to true
      console.log('🔧 [AdminService] Updating user_profiles table...');
      const { data, error } = await supabase
        .from(TABLES.USER_PROFILES)
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy
        })
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('❌ [AdminService] Database update failed:', error);
        throw new Error(`Database update failed: ${error.message}. This usually indicates RLS policy restrictions.`);
      }

      console.log('✅ [AdminService] User blocked successfully in database');
      
      // Verify the update worked
      console.log('🔧 [AdminService] Verifying database update...');
      if (!data || data.length === 0 || !data[0].is_deleted) {
        throw new Error('User blocking failed - RLS policy prevented database update. Please check Supabase RLS policies for user_profiles table.');
      }

      // Log the action
      try {
        await this.logAction(deletedBy, 'user_deleted', 'user_profile', userId);
      } catch (logError) {
        console.warn('⚠️ [AdminService] Failed to log action, but user was blocked successfully:', logError);
      }
      
      console.log('✅ [AdminService] Action logged successfully');
    } catch (error) {
      console.error('❌ [AdminService] Complete failure in deleteUser:', error);
      throw error;
    }
  }

  async restoreUser(userId: string, restoredBy: string): Promise<void> {
    try {
      const hasPermission = await roleService.checkPermission(restoredBy, 'admin');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      const { error } = await supabase
        .from(TABLES.USER_PROFILES)
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Log the action
      await this.logAction(restoredBy, 'user_restored', 'user_profile', userId);
    } catch (error) {
      console.error('Failed to restore user:', error);
      throw error;
    }
  }

  async getAllCampaigns(filters?: {
    status?: string;
    moderationStatus?: ModerationStatus;
    isDeleted?: boolean;
  }): Promise<Campaign[]> {
    try {
      let query = supabase
        .from(TABLES.CAMPAIGNS)
        .select('*');

      if (filters?.isDeleted !== undefined) {
        query = query.eq('is_deleted', filters.isDeleted);
      } else {
        query = query.eq('is_deleted', false);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.moderationStatus) {
        query = query.eq('moderation_status', filters.moderationStatus);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return data.map(campaign => this.transformCampaignFromDatabase(campaign));
    } catch (error) {
      console.error('Failed to get all campaigns:', error);
      throw error;
    }
  }

  async deleteCampaign(campaignId: string, deletedBy: string): Promise<void> {
    try {
      // Check permissions
      const hasPermission = await roleService.checkPermission(deletedBy, 'moderator');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      // Soft delete campaign
      const { error } = await supabase
        .from(TABLES.CAMPAIGNS)
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy
        })
        .eq('campaign_id', campaignId);

      if (error) throw error;

      // Log the action
      await this.logAction(deletedBy, 'campaign_deleted', 'campaign', campaignId);
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      throw error;
    }
  }

  async getAllInfluencerCards(filters?: {
    moderationStatus?: ModerationStatus;
    isDeleted?: boolean;
  }): Promise<InfluencerCard[]> {
    try {
      let query = supabase
        .from(TABLES.INFLUENCER_CARDS)
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

      if (error) throw error;

      return data.map(card => this.transformInfluencerCardFromDatabase(card));
    } catch (error) {
      console.error('Failed to get all influencer cards:', error);
      throw error;
    }
  }

  async deleteInfluencerCard(cardId: string, deletedBy: string): Promise<void> {
    try {
      // Check permissions
      const hasPermission = await roleService.checkPermission(deletedBy, 'moderator');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      // Soft delete card
      const { error } = await supabase
        .from(TABLES.INFLUENCER_CARDS)
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy
        })
        .eq('id', cardId);

      if (error) throw error;

      // Log the action
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
      let query = supabase
        .from(TABLES.ADMIN_LOGS)
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

      if (error) throw error;

      return data.map(log => this.transformLogFromDatabase(log));
    } catch (error) {
      console.error('Failed to get admin logs:', error);
      throw error;
    }
  }

  private transformUserFromDatabase(dbData: any): UserProfile {
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
      unifiedAccountInfo: {
        ...dbData.unified_account_info,
        accountType: dbData.user_type
      },
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
    
    // Add deletion fields
    return {
      ...baseProfile,
      is_deleted: dbData.is_deleted || false,
      deleted_at: dbData.deleted_at,
      deleted_by: dbData.deleted_by
    } as UserProfile & {
      is_deleted: boolean;
      deleted_at: string | null;
      deleted_by: string | null;
    };
  }

  private transformCampaignFromDatabase(dbData: any): Campaign {
    return {
      campaignId: dbData.campaign_id,
      advertiserId: dbData.advertiser_id,
      title: dbData.title,
      description: dbData.description,
      brand: dbData.brand,
      budget: dbData.budget,
      preferences: dbData.preferences,
      status: dbData.status,
      timeline: dbData.timeline,
      metrics: dbData.metrics,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }

  private transformInfluencerCardFromDatabase(dbData: any): InfluencerCard {
    return {
      id: dbData.id,
      userId: dbData.user_id,
      platform: dbData.platform,
      reach: dbData.reach,
      audienceDemographics: dbData.audience_demographics,
      serviceDetails: dbData.service_details,
      rating: dbData.rating,
      completedCampaigns: dbData.completed_campaigns,
      isActive: dbData.is_active,
      lastUpdated: dbData.last_updated,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }

  private transformLogFromDatabase(dbData: any): AdminLog {
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