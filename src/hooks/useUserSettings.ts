import { useState, useEffect } from 'react';
import { UserSettings } from '../core/types';
import { userSettingsService } from '../services/userSettingsService';
import { applyInterfaceSettings } from '../core/interfaceSettingsUtils';

export function useUserSettings(userId: string) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadSettings();
    }
  }, [userId]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userSettings = await userSettingsService.getUserSettings(userId);
      setSettings(userSettings);
      
      // Apply interface settings immediately
      if (userSettings.interface) {
        applyInterfaceSettings(userSettings.interface);
      }
    } catch (err: any) {
      console.error('Failed to load user settings:', err);
      setError(err.message || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!settings) return;

    try {
      const updatedSettings = await userSettingsService.updateSettings(userId, updates);
      setSettings(updatedSettings);
      
      // Apply interface settings if they were updated
      if (updates.interface && updatedSettings.interface) {
        applyInterfaceSettings(updatedSettings.interface);
      }
      
      return updatedSettings;
    } catch (err: any) {
      console.error('Failed to update settings:', err);
      setError(err.message || 'Failed to update settings');
      throw err;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await userSettingsService.changePassword(userId, currentPassword, newPassword);
      await loadSettings(); // Reload to get updated password change timestamp
    } catch (err: any) {
      console.error('Failed to change password:', err);
      throw err;
    }
  };

  const deactivateAccount = async (reason?: string) => {
    try {
      await userSettingsService.deactivateAccount(userId, reason);
      // User will be signed out, so no need to reload settings
    } catch (err: any) {
      console.error('Failed to deactivate account:', err);
      throw err;
    }
  };

  const deleteAccount = async (confirmationText: string) => {
    try {
      await userSettingsService.deleteAccount(userId, confirmationText);
      // User will be signed out, so no need to reload settings
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      throw err;
    }
  };

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    changePassword,
    deactivateAccount,
    deleteAccount,
    refresh: loadSettings
  };
}