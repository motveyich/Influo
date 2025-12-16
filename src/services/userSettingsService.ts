import { apiClient } from '../core/api';
import { UserSettings } from '../core/types';
import { analytics } from '../core/analytics';

export class UserSettingsService {
  private settingsCache = new Map<string, UserSettings>();

  async getUserSettings(userId: string): Promise<UserSettings> {
    try {
      if (this.settingsCache.has(userId)) {
        return this.settingsCache.get(userId)!;
      }

      const settings = await apiClient.get<{data: UserSettings}>('/settings');

      if (settings?.data) {
        this.settingsCache.set(userId, settings.data);
        return settings.data;
      }

      return this.getDefaultSettings(userId);
    } catch (error) {
      console.error('Failed to get user settings:', error);
      return this.getDefaultSettings(userId);
    }
  }

  async updateSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const updatedSettings = await apiClient.put<{data: UserSettings}>('/settings', updates);

      if (updatedSettings?.data) {
        this.settingsCache.set(userId, updatedSettings.data);

        analytics.track('user_settings_updated', {
          user_id: userId,
          updated_sections: Object.keys(updates)
        });

        return updatedSettings;
      }

      throw new Error('Failed to update settings');
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post('/settings/password', {
        currentPassword,
        newPassword
      });

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
      const response = await apiClient.post<{ qrCode: string; secret: string }>('/settings/two-factor/enable', {});

      analytics.track('two_factor_enabled', { user_id: userId });

      return response;
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      throw error;
    }
  }

  async disableTwoFactor(userId: string, verificationCode: string): Promise<void> {
    try {
      await apiClient.post('/settings/two-factor/disable', {
        verificationCode
      });

      analytics.track('two_factor_disabled', { user_id: userId });
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      throw error;
    }
  }

  async signOutAllDevices(userId: string): Promise<void> {
    try {
      await apiClient.post('/settings/sessions/signout-all', {});

      analytics.track('signed_out_all_devices', { user_id: userId });
    } catch (error) {
      console.error('Failed to sign out all devices:', error);
      throw error;
    }
  }

  async deactivateAccount(userId: string, reason?: string): Promise<void> {
    try {
      await apiClient.post('/settings/account/deactivate', { reason });

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

      await apiClient.delete('/settings/account', {
        data: { confirmationText }
      });

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
}

export const userSettingsService = new UserSettingsService();
