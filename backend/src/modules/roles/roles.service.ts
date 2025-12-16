import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { AssignRoleDto } from './dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private supabaseService: SupabaseService) {}

  async getUserRole(userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!profileError && profileData?.role) {
      return {
        success: true,
        data: { role: profileData.role },
      };
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!roleError && roleData?.role) {
      return {
        success: true,
        data: { role: roleData.role },
      };
    }

    return {
      success: true,
      data: { role: 'user' },
    };
  }

  async assignRole(assignerId: string, userId: string, assignRoleDto: AssignRoleDto) {
    const supabase = this.supabaseService.getAdminClient();

    const assignerRoleResponse = await this.getUserRole(assignerId);
    const assignerRole = assignerRoleResponse.data.role;

    if (assignerRole !== 'admin') {
      throw new ForbiddenException('Only admins can assign roles');
    }

    await supabase
      .from('user_roles')
      .update({ is_active: false })
      .eq('user_id', userId);

    const newRole = {
      user_id: userId,
      role: assignRoleDto.role,
      assigned_by: assignerId,
      assigned_at: new Date().toISOString(),
      is_active: true,
      metadata: assignRoleDto.metadata || {},
    };

    const { data, error } = await supabase
      .from('user_roles')
      .insert([newRole])
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to assign role: ${error.message}`);
      throw new BadRequestException('Failed to assign role');
    }

    await supabase
      .from('user_profiles')
      .update({ role: assignRoleDto.role })
      .eq('user_id', userId);

    return {
      success: true,
      data: this.transformRole(data),
      message: 'Role assigned successfully',
    };
  }

  async removeRole(removerId: string, userId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const removerRoleResponse = await this.getUserRole(removerId);
    const removerRole = removerRoleResponse.data.role;

    if (removerRole !== 'admin') {
      throw new ForbiddenException('Only admins can remove roles');
    }

    await supabase
      .from('user_roles')
      .update({ is_active: false })
      .eq('user_id', userId);

    await supabase
      .from('user_profiles')
      .update({ role: 'user' })
      .eq('user_id', userId);

    return {
      success: true,
      message: 'Role removed successfully',
    };
  }

  async getUsersWithRoles() {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        *,
        user_profile:user_profiles(user_id, full_name, email, avatar, created_at)
      `)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to get users with roles: ${error.message}`);
      throw new BadRequestException('Failed to get users with roles');
    }

    return {
      success: true,
      data: data.map(item => ({
        ...this.transformRole(item),
        userProfile: item.user_profile,
      })),
    };
  }

  async checkPermission(userId: string, requiredRole: string) {
    const userRoleResponse = await this.getUserRole(userId);
    const userRole = userRoleResponse.data.role;

    switch (requiredRole) {
      case 'user':
        return { success: true, data: { hasPermission: true } };
      case 'moderator':
        return {
          success: true,
          data: { hasPermission: userRole === 'moderator' || userRole === 'admin' },
        };
      case 'admin':
        return {
          success: true,
          data: { hasPermission: userRole === 'admin' },
        };
      default:
        return { success: true, data: { hasPermission: false } };
    }
  }

  private transformRole(dbRole: any) {
    return {
      id: dbRole.id,
      userId: dbRole.user_id,
      role: dbRole.role,
      assignedBy: dbRole.assigned_by,
      assignedAt: dbRole.assigned_at,
      expiresAt: dbRole.expires_at,
      isActive: dbRole.is_active,
      metadata: dbRole.metadata || {},
      createdAt: dbRole.created_at,
      updatedAt: dbRole.updated_at,
    };
  }
}
