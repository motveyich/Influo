import { i18n } from './i18n';
import { UserSettings } from './types';

export function applyInterfaceSettings(interfaceSettings: UserSettings['interface']) {
  try {
    console.log('🎨 Applying interface settings:', interfaceSettings);
    
    // Apply theme
    if (interfaceSettings.theme === 'dark') {
      console.log('🌙 Applying dark theme');
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      console.log('☀️ Applying light theme');
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }

    // Apply language
    if (interfaceSettings.language) {
      console.log('🌐 Applying language:', interfaceSettings.language);
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
    if (interfaceSettings.fontSize && fontSizeClasses[interfaceSettings.fontSize]) {
      document.documentElement.classList.add(fontSizeClasses[interfaceSettings.fontSize]);
      console.log('📝 Applied font size:', interfaceSettings.fontSize);
    }

    // Apply timezone
    if (interfaceSettings.timezone) {
      // Store timezone for date formatting
      localStorage.setItem('user_timezone', interfaceSettings.timezone);
      console.log('🕐 Applied timezone:', interfaceSettings.timezone);
    }
    
    console.log('✅ Interface settings applied successfully');
  } catch (error) {
    console.error('Failed to apply interface settings:', error);
  }
}