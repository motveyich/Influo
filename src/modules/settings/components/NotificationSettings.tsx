import React, { useState } from 'react';
import { UserSettings } from '../../../core/types';
import { Mail, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '../../../hooks/useTranslation';

interface NotificationSettingsProps {
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => Promise<UserSettings>;
}

export function NotificationSettings({ settings, onUpdateSettings }: NotificationSettingsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { t } = useTranslation();

  const handleEmailNotificationUpdate = async (category: keyof UserSettings['notifications']['email'], value: boolean) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onUpdateSettings({
        notifications: {
          ...settings.notifications,
          email: {
            ...settings.notifications.email,
            [category]: value
          }
        }
      });
      toast.success('Настройки уведомлений обновлены');
    } catch (error) {
      toast.error('Не удалось обновить настройки');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Уведомления</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Управляйте уведомлениями, которые вы получаете на email
        </p>
      </div>

      {/* Email Notifications */}
      <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Mail className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">Email уведомления</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Выберите типы уведомлений, которые хотите получать на почту
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Platform Updates */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Обновления платформы</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Новые функции, улучшения и важные новости
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.email.marketing}
                onChange={(e) => handleEmailNotificationUpdate('marketing', e.target.checked)}
                disabled={isUpdating}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>

          {/* New Collaboration Requests */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Новые заявки на сотрудничество</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Уведомления о новых предложениях и заявках
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.email.applications}
                onChange={(e) => handleEmailNotificationUpdate('applications', e.target.checked)}
                disabled={isUpdating}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>

          {/* Reviews */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Отзывы</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Новые отзывы и оценки вашей работы
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.email.reviews}
                onChange={(e) => handleEmailNotificationUpdate('reviews', e.target.checked)}
                disabled={isUpdating}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>

          {/* Chat Messages */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Сообщения в чатах</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Новые сообщения в ваших чатах
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.email.messages}
                onChange={(e) => handleEmailNotificationUpdate('messages', e.target.checked)}
                disabled={isUpdating}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">О email уведомлениях</h4>
              <p className="text-sm text-blue-700 mt-1">
                Уведомления отправляются на ваш email в режиме реального времени.
                Вы можете в любой момент включить или отключить любой тип уведомлений.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
