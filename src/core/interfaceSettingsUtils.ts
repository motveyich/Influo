import { i18n } from './i18n';
import { UserSettings } from './types';

export function applyInterfaceSettings(interfaceSettings: UserSettings['interface']) {
  try {
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
  } catch (error) {
    console.error('Failed to apply interface settings:', error);
  }
}