import { supabase, TABLES } from '../core/supabase';
import { UserRole, UserRoleData } from '../core/types';
import { adminService } from './adminService';

export class RoleService {
  async getUserRole(userId: string): Promise<UserRole> {
    try {
      // First check user_roles table for active role assignment
      const { data: roleData } = await supabase
        .from(TABLES.USER_ROLES)
        .select('role')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (roleData) {
        return roleData.role;
      }

      // Fallback to role in user_profiles
      const { data: profileData } = await supabase
        .from(TABLES.USER_PROFILES)
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      return profileData?.role || 'user';
    } catch (error) {
      console.error('Failed to get user role:', error);
      return 'user';
    }
  }

  async assignRole(userId: string, role: UserRole, assignedBy: string): Promise<UserRoleData> {
    try {
      // Check if assigner has permission
      const assignerRole = await this.getUserRole(assignedBy);
      if (assignerRole !== 'admin') {
        throw new Error('Only admins can assign roles');
      }

      // Deactivate existing role assignments
      await supabase
        .from(TABLES.USER_ROLES)
        .update({ is_active: false })
        .eq('user_id', userId);

      // Create new role assignment
      const newRole = {
        user_id: userId,
        role: role,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString(),
        is_active: true,
        metadata: {}
      };

      const { data, error } = await supabase
        .from(TABLES.USER_ROLES)
        .insert([newRole])
        .select()
        .single();

      if (error) throw error;

      // Update role in user_profiles for quick access
      await supabase
        .from(TABLES.USER_PROFILES)
        .update({ role: role })
        .eq('user_id', userId);

      // Log the action
      await adminService.logAction(assignedBy, 'role_assigned', 'user_profile', userId, {
        new_role: role,
        previous_role: await this.getUserRole(userId)
      });

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to assign role:', error);
      throw error;
    }
  }

  async removeRole(userId: string, removedBy: string): Promise<void> {
    try {
      // Check if remover has permission
      const removerRole = await this.getUserRole(removedBy);
      if (removerRole !== 'admin') {
        throw new Error('Only admins can remove roles');
      }

      // Deactivate role assignments
      await supabase
        .from(TABLES.USER_ROLES)
        .update({ is_active: false })
        .eq('user_id', userId);

      // Reset to default user role
      await supabase
        .from(TABLES.USER_PROFILES)
        .update({ role: 'user' })
        .eq('user_id', userId);

      // Log the action
      await adminService.logAction(removedBy, 'role_removed', 'user_profile', userId, {
        previous_role: await this.getUserRole(userId)
      });
    } catch (error) {
      console.error('Failed to remove role:', error);
      throw error;
    }
  }

  async getUsersWithRoles(): Promise<Array<UserRoleData & { userProfile: any }>> {
    try {
      const { data, error } = await supabase
        .from(TABLES.USER_ROLES)
        .select(`
          *,
          user_profile:user_profiles(user_id, full_name, email, avatar, created_at)
        `)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        ...this.transformFromDatabase(item),
        userProfile: item.user_profile
      }));
    } catch (error) {
      console.error('Failed to get users with roles:', error);
      throw error;
    }
  }

  async checkPermission(userId: string, requiredRole: UserRole): Promise<boolean> {
    try {
      const userRole = await this.getUserRole(userId);
      
      switch (requiredRole) {
        case 'user':
          return true;
        case 'moderator':
          return userRole === 'moderator' || userRole === 'admin';
        case 'admin':
          return userRole === 'admin';
        default:
          return false;
      }
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  }

  private transformFromDatabase(dbData: any): UserRoleData {
    return {
      id: dbData.id,
      userId: dbData.user_id,
      role: dbData.role,
      assignedBy: dbData.assigned_by,
      assignedAt: dbData.assigned_at,
      expiresAt: dbData.expires_at,
      isActive: dbData.is_active,
      metadata: dbData.metadata || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }
}

export const roleService = new RoleService();