import { UserProfile, Campaign, InfluencerCard, AdminLog, UserRole } from '../core/types';
import { apiClient } from '../core/api';

export class AdminService {
  async logAction(
    adminId: string,
    actionType: string,
    targetType?: string,
    targetId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      console.log('[AdminService] Logging action via API:', { actionType, targetType, targetId });
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

      if (filters?.role) {
        params.append('role', filters.role);
      }

      if (filters?.searchQuery) {
        params.append('searchQuery', filters.searchQuery);
      }

      if (filters?.isDeleted !== undefined) {
        params.append('isDeleted', String(filters.isDeleted));
      }

      const queryString = params.toString();
      const endpoint = queryString ? `/admin/users?${queryString}` : '/admin/users';

      console.log('[AdminService] Fetching users from API:', endpoint);

      const data = await apiClient.get<any[]>(endpoint);

      return data.map(user => this.transformUserFromDatabase(user));
    } catch (error) {
      console.error('Failed to get all users:', error);
      throw error;
    }
  }

  async deleteUser(userId: string, deletedBy: string, deleterUserRole: UserRole): Promise<void> {
    try {
      console.log('[AdminService] Blocking user via API:', { userId, deletedBy });

      await apiClient.patch(`/admin/users/${userId}/block`, {});

      console.log('[AdminService] User blocked successfully');
    } catch (error) {
      console.error('[AdminService] Failed to block user:', error);
      throw error;
    }
  }

  async blockUser(userId: string, reason?: string): Promise<void> {
    try {
      await apiClient.patch(`/admin/users/${userId}/block`, {});
    } catch (error) {
      console.error('Failed to block user:', error);
      throw error;
    }
  }

  async restoreUser(userId: string, restoredBy: string): Promise<void> {
    try {
      console.log('[AdminService] Restoring user via API:', { userId, restoredBy });

      await apiClient.patch(`/admin/users/${userId}/restore`, {});

      console.log('[AdminService] User restored successfully');
    } catch (error) {
      console.error('Failed to restore user:', error);
      throw error;
    }
  }

  async getAllCampaigns(filters?: {
    status?: string;
    moderationStatus?: string;
    isDeleted?: boolean;
  }): Promise<Campaign[]> {
    try {
      const params = new URLSearchParams();

      if (filters?.status) {
        params.append('status', filters.status);
      }

      if (filters?.moderationStatus) {
        params.append('moderationStatus', filters.moderationStatus);
      }

      if (filters?.isDeleted !== undefined) {
        params.append('isDeleted', String(filters.isDeleted));
      }

      const queryString = params.toString();
      const endpoint = queryString ? `/admin/campaigns?${queryString}` : '/admin/campaigns';

      const data = await apiClient.get<any[]>(endpoint);

      return data.map(campaign => this.transformCampaignFromDatabase(campaign));
    } catch (error) {
      console.error('Failed to get all campaigns:', error);
      throw error;
    }
  }

  async deleteCampaign(campaignId: string, deletedBy: string): Promise<void> {
    try {
      await apiClient.delete(`/admin/campaigns/${campaignId}`);
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      throw error;
    }
  }

  async getAllInfluencerCards(filters?: {
    moderationStatus?: string;
    isDeleted?: boolean;
  }): Promise<InfluencerCard[]> {
    try {
      const params = new URLSearchParams();

      if (filters?.moderationStatus) {
        params.append('moderationStatus', filters.moderationStatus);
      }

      if (filters?.isDeleted !== undefined) {
        params.append('isDeleted', String(filters.isDeleted));
      }

      const queryString = params.toString();
      const endpoint = queryString ? `/admin/influencer-cards?${queryString}` : '/admin/influencer-cards';

      const data = await apiClient.get<any[]>(endpoint);

      return data.map(card => this.transformInfluencerCardFromDatabase(card));
    } catch (error) {
      console.error('Failed to get all influencer cards:', error);
      throw error;
    }
  }

  async deleteInfluencerCard(cardId: string, deletedBy: string): Promise<void> {
    try {
      await apiClient.delete(`/admin/influencer-cards/${cardId}`);
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

      if (filters?.adminId) {
        params.append('adminId', filters.adminId);
      }

      if (filters?.actionType) {
        params.append('actionType', filters.actionType);
      }

      if (filters?.limit) {
        params.append('limit', String(filters.limit));
      }

      const queryString = params.toString();
      const endpoint = queryString ? `/admin/logs?${queryString}` : '/admin/logs';

      const data = await apiClient.get<any[]>(endpoint);

      return data.map(log => this.transformLogFromDatabase(log));
    } catch (error) {
      console.error('Failed to get admin logs:', error);
      return [];
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
