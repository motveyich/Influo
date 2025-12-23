import { apiClient, showFeatureNotImplemented } from '../core/api';
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
      await apiClient.post('/admin/logs', {
        adminId,
        actionType,
        targetType,
        targetId,
        details: details || {},
        userAgent: navigator.userAgent,
        sessionId: `session_${Date.now()}`
      });
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
      const params = new URLSearchParams();
      if (filters?.role) params.append('role', filters.role);
      if (filters?.searchQuery) params.append('search', filters.searchQuery);
      if (filters?.isDeleted !== undefined) params.append('isDeleted', String(filters.isDeleted));

      const queryString = params.toString();
      const endpoint = queryString ? `/admin/users?${queryString}` : '/admin/users';

      const { data, error } = await apiClient.get<any[]>(endpoint);

      if (error) throw new Error(error.message);

      return (data || []).map(user => this.transformUserFromApi(user));
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

      const { error } = await apiClient.post('/admin/block', {
        userId,
        blockedBy: deletedBy
      });

      if (error) throw new Error(error.message);

      console.log('✅ [AdminService] User blocked successfully');

      await this.logAction(deletedBy, 'user_deleted', 'user_profile', userId);
    } catch (error) {
      console.error('❌ [AdminService] Complete failure in deleteUser:', error);
      throw error;
    }
  }

  async blockUser(userId: string, reason?: string): Promise<void> {
    try {
      const { error } = await apiClient.post('/admin/block', {
        userId,
        reason
      });

      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Failed to block user:', error);
      throw error;
    }
  }

  async restoreUser(userId: string, restoredBy: string): Promise<void> {
    try {
      console.log('🔧 [AdminService] Starting user restoration:', { userId, restoredBy });

      const { error } = await apiClient.post('/admin/unblock', {
        userId,
        unblockedBy: restoredBy
      });

      if (error) throw new Error(error.message);

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
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.moderationStatus) params.append('moderationStatus', filters.moderationStatus);
      if (filters?.isDeleted !== undefined) params.append('isDeleted', String(filters.isDeleted));

      const queryString = params.toString();
      const endpoint = queryString ? `/admin/campaigns?${queryString}` : '/admin/campaigns';

      const { data, error } = await apiClient.get<any[]>(endpoint);

      if (error) {
        console.error('Failed to get campaigns:', error);
        return [];
      }

      return (data || []).map(campaign => this.transformCampaignFromApi(campaign));
    } catch (error) {
      console.error('Failed to get all campaigns:', error);
      return [];
    }
  }

  async deleteCampaign(campaignId: string, deletedBy: string): Promise<void> {
    try {
      const { error } = await apiClient.delete(`/admin/campaigns/${campaignId}?deletedBy=${deletedBy}`);

      if (error) throw new Error(error.message);

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
      const params = new URLSearchParams();
      if (filters?.moderationStatus) params.append('moderationStatus', filters.moderationStatus);
      if (filters?.isDeleted !== undefined) params.append('isDeleted', String(filters.isDeleted));

      const queryString = params.toString();
      const endpoint = queryString ? `/admin/influencer-cards?${queryString}` : '/admin/influencer-cards';

      const { data, error } = await apiClient.get<any[]>(endpoint);

      if (error) {
        console.error('Failed to get influencer cards:', error);
        return [];
      }

      return (data || []).map(card => this.transformInfluencerCardFromApi(card));
    } catch (error) {
      console.error('Failed to get all influencer cards:', error);
      return [];
    }
  }

  async deleteInfluencerCard(cardId: string, deletedBy: string): Promise<void> {
    try {
      const { error } = await apiClient.delete(`/admin/influencer-cards/${cardId}?deletedBy=${deletedBy}`);

      if (error) throw new Error(error.message);

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
      const params = new URLSearchParams();
      if (filters?.adminId) params.append('adminId', filters.adminId);
      if (filters?.actionType) params.append('actionType', filters.actionType);
      if (filters?.limit) params.append('limit', String(filters.limit));

      const queryString = params.toString();
      const endpoint = queryString ? `/admin/logs?${queryString}` : '/admin/logs';

      const { data, error } = await apiClient.get<any[]>(endpoint);

      if (error) {
        console.warn('Admin logs not available:', error);
        return [];
      }

      return (data || []).map(log => this.transformLogFromApi(log));
    } catch (error) {
      console.error('Failed to get admin logs:', error);
      return [];
    }
  }

  async getAdminStats(): Promise<any> {
    try {
      const { data, error } = await apiClient.get<any>('/admin/stats');

      if (error) {
        console.warn('Admin stats not available:', error);
        return {};
      }

      return data || {};
    } catch (error) {
      console.error('Failed to get admin stats:', error);
      return {};
    }
  }

  private transformUserFromApi(apiData: any): UserProfile {
    const baseProfile = {
      userId: apiData.userId || apiData.user_id,
      email: apiData.email,
      fullName: apiData.fullName || apiData.full_name,
      username: apiData.username || '',
      phone: apiData.phone || '',
      userType: apiData.userType || apiData.user_type,
      avatar: apiData.avatar,
      bio: apiData.bio,
      location: apiData.location,
      website: apiData.website,
      influencerData: apiData.influencerData || apiData.influencer_data,
      advertiserData: apiData.advertiserData || apiData.advertiser_data,
      profileCompletion: apiData.profileCompletion || apiData.profile_completion,
      unifiedAccountInfo: apiData.unifiedAccountInfo || apiData.unified_account_info || {
        accountType: apiData.userType || apiData.user_type
      },
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at
    };

    return {
      ...baseProfile,
      is_deleted: apiData.isDeleted ?? apiData.is_deleted ?? false,
      deleted_at: apiData.deletedAt || apiData.deleted_at,
      deleted_by: apiData.deletedBy || apiData.deleted_by
    } as any;
  }

  private transformCampaignFromApi(apiData: any): Campaign {
    return {
      campaignId: apiData.campaignId || apiData.campaign_id,
      advertiserId: apiData.advertiserId || apiData.advertiser_id,
      title: apiData.title,
      description: apiData.description,
      brand: apiData.brand,
      budget: apiData.budget,
      preferences: apiData.preferences,
      status: apiData.status,
      timeline: apiData.timeline,
      metrics: apiData.metrics,
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at
    };
  }

  private transformInfluencerCardFromApi(apiData: any): InfluencerCard {
    return {
      id: apiData.id,
      userId: apiData.userId || apiData.user_id,
      platform: apiData.platform,
      reach: apiData.reach,
      audienceDemographics: apiData.audienceDemographics || apiData.audience_demographics,
      serviceDetails: apiData.serviceDetails || apiData.service_details,
      rating: apiData.rating,
      completedCampaigns: apiData.completedCampaigns || apiData.completed_campaigns,
      isActive: apiData.isActive ?? apiData.is_active,
      lastUpdated: apiData.lastUpdated || apiData.last_updated,
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at
    } as any;
  }

  private transformLogFromApi(apiData: any): AdminLog {
    return {
      id: apiData.id,
      adminId: apiData.adminId || apiData.admin_id,
      actionType: apiData.actionType || apiData.action_type,
      targetType: apiData.targetType || apiData.target_type,
      targetId: apiData.targetId || apiData.target_id,
      details: apiData.details || {},
      ipAddress: apiData.ipAddress || apiData.ip_address,
      userAgent: apiData.userAgent || apiData.user_agent,
      sessionId: apiData.sessionId || apiData.session_id,
      createdAt: apiData.createdAt || apiData.created_at
    };
  }
}

export const adminService = new AdminService();
