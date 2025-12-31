import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';

@Injectable()
export class RolesService {
  constructor(private readonly supabase: SupabaseService) {}

  async getUserRole(userId: string): Promise<string> {
    // First check user_roles table for active role assignment
    const { data: roleData } = await this.supabase.getClient()
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (roleData) {
      return roleData.role;
    }

    // Fallback to role in user_profiles
    const { data: profileData } = await this.supabase.getClient()
      .from('user_profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    return profileData?.role || 'user';
  }

  async assignRole(targetUserId: string, role: string, assignedBy: string) {
    // Check if assigner has permission
    const assignerRole = await this.getUserRole(assignedBy);
    if (assignerRole !== 'admin') {
      throw new ForbiddenException('Only admins can assign roles');
    }

    // Deactivate existing role assignments
    await this.supabase.getClient()
      .from('user_roles')
      .update({ is_active: false })
      .eq('user_id', targetUserId);

    // Create new role assignment
    const newRole = {
      user_id: targetUserId,
      role: role,
      assigned_by: assignedBy,
      assigned_at: new Date().toISOString(),
      is_active: true,
      metadata: {}
    };

    const { data, error } = await this.supabase.getClient()
      .from('user_roles')
      .insert([newRole])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to assign role: ${error.message}`);
    }

    // Update role in user_profiles for quick access
    await this.supabase.getClient()
      .from('user_profiles')
      .update({ role: role })
      .eq('user_id', targetUserId);

    return this.transformFromDatabase(data);
  }

  async removeRole(targetUserId: string, removedBy: string) {
    // Check if remover has permission
    const removerRole = await this.getUserRole(removedBy);
    if (removerRole !== 'admin') {
      throw new ForbiddenException('Only admins can remove roles');
    }

    // Deactivate role assignments
    await this.supabase.getClient()
      .from('user_roles')
      .update({ is_active: false })
      .eq('user_id', targetUserId);

    // Reset to default user role
    await this.supabase.getClient()
      .from('user_profiles')
      .update({ role: 'user' })
      .eq('user_id', targetUserId);
  }

  async getUsersWithRoles() {
    const { data, error } = await this.supabase.getClient()
      .from('user_roles')
      .select(`
        *,
        user_profile:user_profiles(user_id, full_name, email, avatar, created_at)
      `)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get users with roles: ${error.message}`);
    }

    return data.map(item => ({
      ...this.transformFromDatabase(item),
      userProfile: item.user_profile
    }));
  }

  async checkPermission(userId: string, requiredRole: string): Promise<boolean> {
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
  }

  private transformFromDatabase(dbData: any) {
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
