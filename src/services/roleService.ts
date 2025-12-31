import { apiClient } from '../core/api';
import { UserRole, UserRoleData } from '../core/types';

export class RoleService {
  async getUserRole(userId: string): Promise<UserRole> {
    try {
      const response = await apiClient.get<{ role: UserRole }>(`/roles/${userId}`);
      return response.role;
    } catch (error) {
      console.error('Failed to get user role:', error);
      return 'user';
    }
  }

  async assignRole(userId: string, role: UserRole, assignedBy: string): Promise<UserRoleData> {
    try {
      return await apiClient.post<UserRoleData>('/roles/assign', {
        userId,
        role
      });
    } catch (error) {
      console.error('Failed to assign role:', error);
      throw error;
    }
  }

  async removeRole(userId: string, removedBy: string): Promise<void> {
    try {
      await apiClient.delete(`/roles/${userId}`);
    } catch (error) {
      console.error('Failed to remove role:', error);
      throw error;
    }
  }

  async getUsersWithRoles(): Promise<Array<UserRoleData & { userProfile: any }>> {
    try {
      return await apiClient.get<Array<UserRoleData & { userProfile: any }>>('/roles');
    } catch (error) {
      console.error('Failed to get users with roles:', error);
      throw error;
    }
  }

  async checkPermission(userId: string, requiredRole: UserRole): Promise<boolean> {
    try {
      const response = await apiClient.get<{ hasPermission: boolean }>(
        `/roles/${userId}/check/${requiredRole}`
      );
      return response.hasPermission;
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  }
}

export const roleService = new RoleService();
