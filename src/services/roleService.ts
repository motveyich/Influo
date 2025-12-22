import { apiClient, showFeatureNotImplemented } from '../core/api';
import { UserRole, UserRoleData } from '../core/types';

export class RoleService {
  async getUserRole(userId: string): Promise<UserRole> {
    try {
      const { data, error } = await apiClient.get<any>(`/roles/user/${userId}`);

      if (error) {
        console.error('Failed to get user role:', error);
        return 'user';
      }

      return data?.role || 'user';
    } catch (error) {
      console.error('Failed to get user role:', error);
      return 'user';
    }
  }

  async assignRole(userId: string, role: UserRole, assignedBy: string): Promise<UserRoleData> {
    try {
      const { data, error } = await apiClient.post<any>('/roles/assign', {
        userId,
        role,
        assignedBy
      });

      if (error) throw new Error(error.message);

      return this.transformFromApi(data);
    } catch (error) {
      console.error('Failed to assign role:', error);
      throw error;
    }
  }

  async removeRole(userId: string, removedBy: string): Promise<void> {
    try {
      const { error } = await apiClient.delete(`/roles/user/${userId}?removedBy=${removedBy}`);

      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('Failed to remove role:', error);
      throw error;
    }
  }

  async getUsersWithRoles(): Promise<Array<UserRoleData & { userProfile: any }>> {
    try {
      const { data, error } = await apiClient.get<any[]>('/roles/users-with-roles');

      if (error) throw new Error(error.message);

      return (data || []).map(item => ({
        ...this.transformFromApi(item),
        userProfile: item.userProfile || item.user_profile
      }));
    } catch (error) {
      console.error('Failed to get users with roles:', error);
      throw error;
    }
  }

  async checkPermission(userId: string, requiredRole: UserRole): Promise<boolean> {
    try {
      const { data, error } = await apiClient.get<any>(`/roles/check-permission?userId=${userId}&requiredRole=${requiredRole}`);

      if (error) {
        console.error('Failed to check permission:', error);
        return false;
      }

      return data?.hasPermission === true;
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  }

  private transformFromApi(apiData: any): UserRoleData {
    return {
      id: apiData.id,
      userId: apiData.userId || apiData.user_id,
      role: apiData.role,
      assignedBy: apiData.assignedBy || apiData.assigned_by,
      assignedAt: apiData.assignedAt || apiData.assigned_at,
      expiresAt: apiData.expiresAt || apiData.expires_at,
      isActive: apiData.isActive ?? apiData.is_active,
      metadata: apiData.metadata || {},
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at
    };
  }
}

export const roleService = new RoleService();
