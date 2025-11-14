import React from 'react';
import { UserSettings } from '../../../core/types';
import { useTranslation } from '../../../hooks/useTranslation';
import { 
  Palette, 
  Globe, 
  Type, 
  Calendar, 
  Clock, 
  Monitor,
  Sun,
  Moon,
  Languages
} from 'lucide-react';
import toast from 'react-hot-toast';

interface InterfaceSettingsProps {
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => Promise<UserSettings>;
}

const TIMEZONES = [
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Kiev', label: 'Киев (UTC+2)' },
  { value: 'Europe/Minsk', label: 'Минск (UTC+3)' },
  { value: 'Asia/Almaty', label: 'Алматы (UTC+6)' },
  { value: 'Asia/Tashkent', label: 'Ташкент (UTC+5)' },
  { value: 'Europe/London', label: 'Лондон (UTC+0)' },
  { value: 'Europe/Berlin', label: 'Берлин (UTC+1)' },
  { value: 'America/New_York', label: 'Нью-Йорк (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес (UTC-8)' },
  { value: 'Asia/Tokyo', label: 'Токио (UTC+9)' }
];

export function InterfaceSettings({ settings, onUpdateSettings }: InterfaceSettingsProps) {
  const { t, setLanguage, availableLanguages, getLanguageInfo } = useTranslation();

  const handleThemeUpdate = async (theme: UserSettings['interface']['theme']) => {
    try {
      console.log('🎨 Updating theme to:', theme);
      await onUpdateSettings({
        interface: {
          ...settings.interface,
          theme
        }
      });
      toast.success('Тема интерфейса обновлена');
    } catch (error) {
      console.error('Failed to update theme:', error);
      toast.error('Не удалось обновить тему');
    }
  };

  const handleLanguageUpdate = async (language: UserSettings['interface']['language']) => {
    try {
      console.log('🌐 Updating language to:', language);
      await onUpdateSettings({
        interface: {
          ...settings.interface,
          language
        }
      });
      // Update the i18n service immediately
      setLanguage(language);
      toast.success('Язык интерфейса изменен');
    } catch (error) {
      console.error('Failed to update language:', error);
      toast.error('Не удалось изменить язык');
    }
  };

  const handleFontSizeUpdate = async (fontSize: UserSettings['interface']['fontSize']) => {
    try {
      await onUpdateSettings({
        interface: {
          ...settings.interface,
          fontSize
        }
      });
      toast.success('Размер шрифта обновлен');
    } catch (error) {
      toast.error('Не удалось обновить размер шрифта');
    }
  };

  const handleDateFormatUpdate = async (dateFormat: UserSettings['interface']['dateFormat']) => {
    try {
      await onUpdateSettings({
        interface: {
          ...settings.interface,
          dateFormat
        }
      });
      toast.success('Формат даты обновлен');
    } catch (error) {
      toast.error('Не удалось обновить формат даты');
    }
  };

  const handleTimeFormatUpdate = async (timeFormat: UserSettings['interface']['timeFormat']) => {
    try {
      await onUpdateSettings({
        interface: {
          ...settings.interface,
          timeFormat
        }
      });
      toast.success('Формат времени обновлен');
    } catch (error) {
      toast.error('Не удалось обновить формат времени');
    }
  };

  const handleTimezoneUpdate = async (timezone: string) => {
    try {
      await onUpdateSettings({
        interface: {
          ...settings.interface,
          timezone
        }
      });
      toast.success('Часовой пояс обновлен');
    } catch (error) {
      toast.error('Не удалось обновить часовой пояс');
    }
  };

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.interface')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.interfaceDescription')}</p>
      </div>

      {/* Theme Settings */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Palette className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">{t('settings.themeDesign')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.chooseTheme')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {(['light', 'dark'] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => handleThemeUpdate(theme)}
              className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                settings.interface.theme === theme
                  ? 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-100'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 dark:text-gray-100'
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                {getThemeIcon(theme)}
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {theme === 'light' ? t('settings.light') : t('settings.dark')}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Language Settings */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Languages className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">{t('settings.interfaceLanguage')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.chooseLanguage')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {availableLanguages.map((lang) => {
            const langInfo = getLanguageInfo(lang);
            return (
              <button
                key={lang}
                onClick={() => handleLanguageUpdate(lang)}
                className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                  settings.interface.language === lang
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{langInfo.nativeName}</p>
                    <p className="text-xs text-gray-600">{langInfo.name}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Size Settings */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Type className="w-5 h-5 text-green-600" />
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">{t('settings.fontSize')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.fontSizeDescription')}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => handleFontSizeUpdate(size)}
              className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                settings.interface.fontSize === size
                  ? 'border-green-500 bg-green-50 text-green-900 dark:bg-green-900 dark:text-green-100'
                  : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500 dark:text-gray-100'
              }`}
            >
              <div className="text-center">
                <Type className={`mx-auto mb-2 ${
                  size === 'small' ? 'w-4 h-4' : 
                  size === 'medium' ? 'w-5 h-5' : 'w-6 h-6'
                }`} />
                <span className={`font-medium text-gray-900 dark:text-gray-100 ${
                  size === 'small' ? 'text-sm' : 
                  size === 'medium' ? 'text-base' : 'text-lg'
                }`}>
                  {size === 'small' ? t('settings.small') : 
                   size === 'medium' ? t('settings.medium') : t('settings.large')}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Date and Time Settings */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">{t('settings.dateAndTime')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.dateTimeDescription')}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Date Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('settings.dateFormat')}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => handleDateFormatUpdate(format)}
                  className={`p-3 border rounded-lg text-sm transition-colors ${
                    settings.interface.dateFormat === format
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-100'
                      : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500 dark:text-gray-100'
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          {/* Time Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('settings.timeFormat')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleTimeFormatUpdate('12h')}
                className={`p-3 border rounded-lg text-sm transition-colors ${
                  settings.interface.timeFormat === '12h'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-100'
                    : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500 dark:text-gray-100'
                }`}
              >
                {t('settings.hour12')}
              </button>
              <button
                onClick={() => handleTimeFormatUpdate('24h')}
                className={`p-3 border rounded-lg text-sm transition-colors ${
                  settings.interface.timeFormat === '24h'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-100'
                    : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500 dark:text-gray-100'
                }`}
              >
                {t('settings.hour24')}
              </button>
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('settings.timezone')}
            </label>
            <select
              value={settings.interface.timezone}
              onChange={(e) => handleTimezoneUpdate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}