import { database, TABLES } from '../core/database';
import { UserSettings } from '../core/types';
import { authService } from '../core/auth';
import { analytics } from '../core/analytics';

export class UserSettingsService {
  private settingsCache = new Map<string, UserSettings>();

  async getUserSettings(userId: string): Promise<UserSettings> {
    try {
      // Check cache first
      if (this.settingsCache.has(userId)) {
        return this.settingsCache.get(userId)!;
      }

      const { data, error } = await database
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      let settings: UserSettings;
      if (!data) {
        // Create default settings for new user
        settings = await this.createDefaultSettings(userId);
      } else {
        settings = this.transformFromDatabase(data);
      }

      // Cache the settings
      this.settingsCache.set(userId, settings);
      return settings;
    } catch (error) {
      console.error('Failed to get user settings:', error);
      return this.getDefaultSettings(userId);
    }
  }

  async updateSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const currentSettings = await this.getUserSettings(userId);
      const updatedSettings = {
        ...currentSettings,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const { data, error } = await database
        .from('user_settings')
        .upsert([this.transformToDatabase(updatedSettings)], {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;

      const transformedSettings = this.transformFromDatabase(data);
      
      // Update cache
      this.settingsCache.set(userId, transformedSettings);

      // Track settings change
      analytics.track('user_settings_updated', {
        user_id: userId,
        updated_sections: Object.keys(updates)
      });

      return transformedSettings;
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Verify current password by attempting to sign in
      const { data: user } = await database.auth.getUser();
      if (!user.user?.email) {
        throw new Error('User email not found');
      }

      // Update password using Database Auth
      const { error } = await database.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Update settings to track password change
      await this.updateSettings(userId, {
        security: {
          ...((await this.getUserSettings(userId)).security),
          passwordLastChanged: new Date().toISOString()
        }
      });

      // Track password change
      analytics.track('password_changed', {
        user_id: userId
      });
    } catch (error) {
      console.error('Failed to change password:', error);
      throw error;
    }
  }

  async enableTwoFactor(userId: string): Promise<{ qrCode: string; secret: string }> {
    try {
      // In a real implementation, this would generate TOTP secret
      // For now, we'll simulate the process
      const secret = this.generateTOTPSecret();
      const qrCode = `otpauth://totp/Influo:${userId}?secret=${secret}&issuer=Influo`;

      // Update settings
      await this.updateSettings(userId, {
        security: {
          ...((await this.getUserSettings(userId)).security),
          twoFactorEnabled: true
        }
      });

      analytics.track('two_factor_enabled', { user_id: userId });

      return { qrCode, secret };
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      throw error;
    }
  }

  async disableTwoFactor(userId: string, verificationCode: string): Promise<void> {
    try {
      // In a real implementation, verify the TOTP code
      if (!verificationCode || verificationCode.length !== 6) {
        throw new Error('Invalid verification code');
      }

      await this.updateSettings(userId, {
        security: {
          ...((await this.getUserSettings(userId)).security),
          twoFactorEnabled: false
        }
      });

      analytics.track('two_factor_disabled', { user_id: userId });
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      throw error;
    }
  }

  async signOutAllDevices(userId: string): Promise<void> {
    try {
      // Sign out from all sessions
      await database.auth.signOut({ scope: 'global' });

      // Clear active sessions in settings
      await this.updateSettings(userId, {
        security: {
          ...((await this.getUserSettings(userId)).security),
          activeSessions: []
        }
      });

      analytics.track('signed_out_all_devices', { user_id: userId });
    } catch (error) {
      console.error('Failed to sign out all devices:', error);
      throw error;
    }
  }

  async deactivateAccount(userId: string, reason?: string): Promise<void> {
    try {
      await this.updateSettings(userId, {
        account: {
          isActive: false,
          isDeactivated: true,
          deactivatedAt: new Date().toISOString(),
          deactivationReason: reason
        }
      });

      // Sign out user
      await authService.signOut();

      analytics.track('account_deactivated', {
        user_id: userId,
        reason: reason
      });
    } catch (error) {
      console.error('Failed to deactivate account:', error);
      throw error;
    }
  }

  async deleteAccount(userId: string, confirmationText: string): Promise<void> {
    try {
      if (confirmationText !== 'DELETE') {
        throw new Error('Confirmation text must be "DELETE"');
      }

      // Mark user profile as deleted
      const { error } = await database
        .from(TABLES.USER_PROFILES)
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: userId
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Sign out user
      await authService.signOut();

      analytics.track('account_deleted', { user_id: userId });
    } catch (error) {
      console.error('Failed to delete account:', error);
      throw error;
    }
  }

  private async createDefaultSettings(userId: string): Promise<UserSettings> {
    try {
      const defaultSettings = this.getDefaultSettings(userId);
      
      const { data, error } = await database
        .from('user_settings')
        .insert([this.transformToDatabase(defaultSettings)])
        .select()
        .single();

      if (error) throw error;

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to create default settings:', error);
      return this.getDefaultSettings(userId);
    }
  }

  private getDefaultSettings(userId: string): UserSettings {
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

  private generateTOTPSecret(): string {
    // Generate a random base32 secret for TOTP
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  private transformFromDatabase(dbData: any): UserSettings {
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

  private transformToDatabase(settings: UserSettings): any {
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

export const userSettingsService = new UserSettingsService();