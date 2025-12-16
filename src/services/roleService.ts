import { apiClient } from '../core/api';
import { UserRole, UserRoleData } from '../core/types';

export class RoleService {
  async getUserRole(userId: string): Promise<UserRole> {
    try {
      const response = await apiClient.get<{ success: boolean; data: { role: UserRole } }>(
        `/roles/user/${userId}`
      );
      return response.data.role;
    } catch (error) {
      console.error('Failed to get user role:', error);
      return 'user';
    }
  }

  async assignRole(userId: string, role: UserRole, metadata?: Record<string, any>): Promise<UserRoleData> {
    try {
      const response = await apiClient.post<{ success: boolean; data: UserRoleData }>(
        `/roles/user/${userId}/assign`,
        {
          role,
          metadata: metadata || {},
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to assign role:', error);
      throw error;
    }
  }

  async removeRole(userId: string): Promise<void> {
    try {
      await apiClient.delete(`/roles/user/${userId}`);
    } catch (error) {
      console.error('Failed to remove role:', error);
      throw error;
    }
  }

  async getUsersWithRoles(): Promise<Array<UserRoleData & { userProfile: any }>> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Array<UserRoleData & { userProfile: any }> }>(
        '/roles/users-with-roles'
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get users with roles:', error);
      throw error;
    }
  }

  async checkPermission(userId: string, requiredRole: UserRole): Promise<boolean> {
    try {
      const response = await apiClient.get<{ success: boolean; data: { hasPermission: boolean } }>(
        `/roles/check-permission/${userId}?requiredRole=${requiredRole}`
      );
      return response.data.hasPermission;
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  }
}

export const roleService = new RoleService();
