import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { UpdateSettingsDto } from './dto';

@Injectable()
export class UserSettingsService {
  private readonly logger = new Logger(UserSettingsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getUserSettings(userId: string) {
    this.logger.debug(`Getting settings for user: ${userId}`);

    const { data, error } = await this.supabase.getAdminClient()
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to get user settings: ${error.message}`, error);
      throw new BadRequestException(`Failed to get user settings: ${error.message}`);
    }

    if (!data) {
      this.logger.log(`No settings found for user ${userId}, creating defaults`);
      return await this.createDefaultSettings(userId);
    }

    this.logger.debug(`Successfully retrieved settings for user: ${userId}`);
    return this.transformFromDatabase(data);
  }

  async updateSettings(userId: string, updates: UpdateSettingsDto) {
    this.logger.log(`Updating settings for user: ${userId}`);
    this.logger.debug(`Update data: ${JSON.stringify(updates)}`);

    const currentSettings = await this.getUserSettings(userId);

    // Merge updates with current settings, preserving nested objects
    const updatedSettings = {
      ...currentSettings,
      security: { ...currentSettings.security, ...updates.security },
      privacy: { ...currentSettings.privacy, ...updates.privacy },
      notifications: { ...currentSettings.notifications, ...updates.notifications },
      interface: { ...currentSettings.interface, ...updates.interface },
      account: { ...currentSettings.account, ...updates.account },
      updatedAt: new Date().toISOString()
    };

    const { data, error } = await this.supabase.getAdminClient()
      .from('user_settings')
      .upsert([this.transformToDatabase(updatedSettings)], {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update settings: ${error.message}`, error);
      throw new BadRequestException(`Failed to update settings: ${error.message}`);
    }

    this.logger.log(`Successfully updated settings for user: ${userId}`);
    return this.transformFromDatabase(data);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    this.logger.log(`Changing password for user: ${userId}`);

    // Get user email
    const { data: { user }, error: userError } = await this.supabase.getAdminClient().auth.admin.getUserById(userId);

    if (userError || !user?.email) {
      this.logger.error(`User not found: ${userId}`, userError);
      throw new NotFoundException('User not found');
    }

    // Update password using Supabase Auth Admin API
    const { error } = await this.supabase.getAdminClient().auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      this.logger.error(`Failed to change password: ${error.message}`, error);
      throw new BadRequestException(`Failed to change password: ${error.message}`);
    }

    // Update settings to track password change
    await this.updateSettings(userId, {
      security: {
        passwordLastChanged: new Date().toISOString()
      }
    });

    this.logger.log(`Successfully changed password for user: ${userId}`);
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
    this.logger.log(`Deleting account for user: ${userId}`);

    // Mark user profile as deleted
    const { error } = await this.supabase.getAdminClient()
      .from('user_profiles')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId
      })
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Failed to delete account: ${error.message}`, error);
      throw new BadRequestException(`Failed to delete account: ${error.message}`);
    }

    this.logger.log(`Successfully deleted account for user: ${userId}`);
  }

  private async createDefaultSettings(userId: string) {
    this.logger.log(`Creating default settings for user: ${userId}`);

    const defaultSettings = this.getDefaultSettings(userId);

    const { data, error } = await this.supabase.getAdminClient()
      .from('user_settings')
      .insert([this.transformToDatabase(defaultSettings)])
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create default settings: ${error.message}`, error);
      throw new BadRequestException(`Failed to create default settings: ${error.message}`);
    }

    this.logger.log(`Successfully created default settings for user: ${userId}`);
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
