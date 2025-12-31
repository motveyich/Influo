import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { UpdateSettingsDto } from './dto';

@Injectable()
export class UserSettingsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getUserSettings(userId: string) {
    const { data, error } = await this.supabase.client
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get user settings: ${error.message}`);
    }

    if (!data) {
      return await this.createDefaultSettings(userId);
    }

    return this.transformFromDatabase(data);
  }

  async updateSettings(userId: string, updates: UpdateSettingsDto) {
    const currentSettings = await this.getUserSettings(userId);
    const updatedSettings = {
      ...currentSettings,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const { data, error } = await this.supabase.client
      .from('user_settings')
      .upsert([this.transformToDatabase(updatedSettings)], {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update settings: ${error.message}`);
    }

    return this.transformFromDatabase(data);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    // Get user email
    const { data: { user }, error: userError } = await this.supabase.client.auth.admin.getUserById(userId);

    if (userError || !user?.email) {
      throw new NotFoundException('User not found');
    }

    // Update password using Supabase Auth Admin API
    const { error } = await this.supabase.client.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      throw new BadRequestException(`Failed to change password: ${error.message}`);
    }

    // Update settings to track password change
    await this.updateSettings(userId, {
      security: {
        passwordLastChanged: new Date().toISOString()
      }
    });
  }

  async deactivateAccount(userId: string, reason?: string) {
    await this.updateSettings(userId, {
      account: {
        isActive: false,
        isDeactivated: true,
        deactivatedAt: new Date().toISOString(),
        deactivationReason: reason
      }
    });
  }

  async deleteAccount(userId: string) {
    // Mark user profile as deleted
    const { error } = await this.supabase.client
      .from('user_profiles')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete account: ${error.message}`);
    }
  }

  private async createDefaultSettings(userId: string) {
    const defaultSettings = this.getDefaultSettings(userId);

    const { data, error } = await this.supabase.client
      .from('user_settings')
      .insert([this.transformToDatabase(defaultSettings)])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create default settings: ${error.message}`);
    }

    return this.transformFromDatabase(data);
  }

  private getDefaultSettings(userId: string) {
    return {
      id: userId,
      userId,
      security: {
        twoFactorEnabled: false,
        passwordLastChanged: new Date().toISOString(),
        activeSessions: []
      },
      privacy: {
        hideEmail: false,
        hidePhone: false,
        hideSocialMedia: false,
        profileVisibility: 'public'
      },
      notifications: {
        email: {
          applications: true,
          messages: true,
          payments: true,
          reviews: true,
          marketing: false
        },
        push: {
          enabled: true,
          applications: true,
          messages: true,
          payments: true,
          reviews: true
        },
        frequency: 'immediate',
        soundEnabled: true
      },
      interface: {
        theme: 'light',
        language: 'ru',
        fontSize: 'medium',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        timezone: 'Europe/Moscow'
      },
      account: {
        isActive: true,
        isDeactivated: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private transformFromDatabase(dbData: any) {
    return {
      id: dbData.id,
      userId: dbData.user_id,
      security: dbData.security || {},
      privacy: dbData.privacy || {},
      notifications: dbData.notifications || {},
      interface: dbData.interface || {},
      account: dbData.account || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }

  private transformToDatabase(settings: any) {
    return {
      id: settings.id,
      user_id: settings.userId,
      security: settings.security,
      privacy: settings.privacy,
      notifications: settings.notifications,
      interface: settings.interface,
      account: settings.account,
      created_at: settings.createdAt,
      updated_at: settings.updatedAt
    };
  }
}
