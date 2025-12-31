import { apiClient } from '../core/api';
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

      const settings = await apiClient.get<UserSettings>(`/user-settings/${userId}`);

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
      const updatedSettings = await apiClient.put<UserSettings>(`/user-settings/${userId}`, updates);

      // Update cache
      this.settingsCache.set(userId, updatedSettings);

      // Track settings change
      analytics.track('user_settings_updated', {
        user_id: userId,
        updated_sections: Object.keys(updates)
      });

      return updatedSettings;
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post(`/user-settings/${userId}/change-password`, {
        currentPassword,
        newPassword
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
      // Sign out locally
      await authService.signOut();

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
      await apiClient.post(`/user-settings/${userId}/deactivate`, { reason });

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

      await apiClient.delete(`/user-settings/${userId}`);

      // Sign out user
      await authService.signOut();

      analytics.track('account_deleted', { user_id: userId });
    } catch (error) {
      console.error('Failed to delete account:', error);
      throw error;
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

}

export const userSettingsService = new UserSettingsService();