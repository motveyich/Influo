import { supabase } from '../core/supabase';
import { UserRole, UserRoleData } from '../core/types';

export class RoleService {
  async getUserRole(userId: string): Promise<UserRole> {
    try {
      const { data, error } = await supabase.rpc('get_user_role', {
        p_user_id: userId
      });

      if (error) {
        console.error('Failed to get user role:', error);
        return 'user';
      }

      return data || 'user';
    } catch (error) {
      console.error('Failed to get user role:', error);
      return 'user';
    }
  }

  async assignRole(userId: string, role: UserRole, assignedBy: string): Promise<UserRoleData> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
          assigned_by: assignedBy
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('user_profiles')
        .update({ role })
        .eq('user_id', userId);

      return this.transformFromDb(data);
    } catch (error) {
      console.error('Failed to assign role:', error);
      throw error;
    }
  }

  async removeRole(userId: string, removedBy: string): Promise<void> {
    try {
      await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('user_id', userId);

      await supabase
        .from('user_profiles')
        .update({ role: 'user' })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Failed to remove role:', error);
      throw error;
    }
  }

  async getUsersWithRoles(): Promise<Array<UserRoleData & { userProfile: any }>> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          user_profiles (*)
        `)
        .eq('is_active', true);

      if (error) throw error;

      return (data || []).map(item => ({
        ...this.transformFromDb(item),
        userProfile: item.user_profiles
      }));
    } catch (error) {
      console.error('Failed to get users with roles:', error);
      throw error;
    }
  }

  async checkPermission(userId: string, requiredRole: UserRole): Promise<boolean> {
    try {
      const userRole = await this.getUserRole(userId);

      const roleHierarchy: Record<UserRole, number> = {
        'user': 0,
        'moderator': 1,
        'admin': 2
      };

      return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  }

  private transformFromDb(dbData: any): UserRoleData {
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
