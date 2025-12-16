import { apiClient } from '../core/api';
import { UserProfile, UserRole } from '../core/types';

export class AdminService {
  async getAllUsers(filters?: {
    role?: UserRole;
    searchQuery?: string;
    isDeleted?: boolean;
  }): Promise<UserProfile[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.role) params.append('role', filters.role);
      if (filters?.searchQuery) params.append('searchQuery', filters.searchQuery);
      if (filters?.isDeleted !== undefined) params.append('isDeleted', String(filters.isDeleted));

      const queryString = params.toString();
      const url = `/admin/users${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<{ success: boolean; data: any[] }>(url);
      return response.data.map(user => this.transformUser(user));
    } catch (error) {
      console.error('Failed to get all users:', error);
      throw error;
    }
  }

  async deleteUser(userId: string, reason?: string): Promise<void> {
    try {
      await apiClient.post(`/admin/users/${userId}/block`, {
        reason: reason || 'Blocked by administrator',
      });
    } catch (error) {
      console.error('Failed to block user:', error);
      throw error;
    }
  }

  async unblockUser(userId: string): Promise<void> {
    try {
      await apiClient.patch(`/admin/users/${userId}/unblock`);
    } catch (error) {
      console.error('Failed to unblock user:', error);
      throw error;
    }
  }

  async getAdminLogs(limit = 100, offset = 0): Promise<any[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: any[] }>(
        `/admin/logs?limit=${limit}&offset=${offset}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get admin logs:', error);
      throw error;
    }
  }

  async getPlatformStats(): Promise<{
    totalUsers: number;
    totalCards: number;
    totalOffers: number;
    totalCampaigns: number;
  }> {
    try {
      const response = await apiClient.get<{ success: boolean; data: any }>('/admin/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get platform stats:', error);
      throw error;
    }
  }

  async logAction(
    actionType: string,
    targetType?: string,
    targetId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    console.log('Admin action logged (client-side):', { actionType, targetType, targetId, details });
  }

  private transformUser(dbUser: any): UserProfile {
    return {
      userId: dbUser.userId || dbUser.user_id,
      email: dbUser.email,
      fullName: dbUser.fullName || dbUser.full_name,
      userType: dbUser.userType || dbUser.user_type,
      avatar: dbUser.avatar,
      role: dbUser.role,
      isDeleted: dbUser.isDeleted !== undefined ? dbUser.isDeleted : dbUser.is_deleted,
      deletedAt: dbUser.deletedAt || dbUser.deleted_at,
      deletedBy: dbUser.deletedBy || dbUser.deleted_by,
      createdAt: dbUser.createdAt || dbUser.created_at,
      updatedAt: dbUser.updatedAt || dbUser.updated_at,
      username: dbUser.username,
      bio: dbUser.bio,
      socialLinks: dbUser.socialLinks || dbUser.social_links || {},
      preferences: dbUser.preferences || {},
      stats: dbUser.stats || {},
    };
  }
}

export const adminService = new AdminService();
