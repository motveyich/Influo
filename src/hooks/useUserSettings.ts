import { useState, useEffect } from 'react';
import { UserSettings } from '../core/types';
import { userSettingsService } from '../services/userSettingsService';
import { i18n } from '../core/i18n';

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
      applyInterfaceSettings(userSettings.interface);
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
      if (updates.interface) {
        applyInterfaceSettings(updatedSettings.interface);
      }
      
      return updatedSettings;
    } catch (err: any) {
      console.error('Failed to update settings:', err);
      setError(err.message || 'Failed to update settings');
      throw err;
    }
  };

  const applyInterfaceSettings = (interfaceSettings: UserSettings['interface']) => {
    // Apply theme
    if (interfaceSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (interfaceSettings.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    // Apply language
    if (interfaceSettings.language) {
      i18n.setLanguage(interfaceSettings.language);
    }

    // Apply font size
    const fontSizeClasses = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg'
    };
    
    // Remove existing font size classes
    document.documentElement.classList.remove('text-sm', 'text-base', 'text-lg');
    document.documentElement.classList.add(fontSizeClasses[interfaceSettings.fontSize]);

    // Apply timezone
    if (interfaceSettings.timezone) {
      // Store timezone for date formatting
      localStorage.setItem('user_timezone', interfaceSettings.timezone);
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

  const enableTwoFactor = async () => {
    try {
      const result = await userSettingsService.enableTwoFactor(userId);
      await loadSettings(); // Reload settings
      return result;
    } catch (err: any) {
      console.error('Failed to enable 2FA:', err);
      throw err;
    }
  };

  const disableTwoFactor = async (verificationCode: string) => {
    try {
      await userSettingsService.disableTwoFactor(userId, verificationCode);
      await loadSettings(); // Reload settings
    } catch (err: any) {
      console.error('Failed to disable 2FA:', err);
      throw err;
    }
  };

  const signOutAllDevices = async () => {
    try {
      await userSettingsService.signOutAllDevices(userId);
      // User will be signed out, so no need to reload settings
    } catch (err: any) {
      console.error('Failed to sign out all devices:', err);
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
    enableTwoFactor,
    disableTwoFactor,
    signOutAllDevices,
    deactivateAccount,
    deleteAccount,
    refresh: loadSettings
  };
}