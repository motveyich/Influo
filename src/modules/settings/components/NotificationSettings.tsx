import React, { useState } from 'react';
import { UserSettings } from '../../../core/types';
import { Bell, Mail, Smartphone, Volume2, VolumeX, Clock } from 'lucide-react';
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
      toast.success(t('profile.emailNotificationsUpdated'));
    } catch (error) {
      toast.error(t('profile.failedToUpdateEmail'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePushNotificationUpdate = async (category: keyof UserSettings['notifications']['push'], value: boolean) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onUpdateSettings({
        notifications: {
          ...settings.notifications,
          push: {
            ...settings.notifications.push,
            [category]: value
          }
        }
      });
      toast.success(t('profile.pushNotificationsUpdated'));
    } catch (error) {
      toast.error(t('profile.failedToUpdatePush'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFrequencyUpdate = async (frequency: UserSettings['notifications']['frequency']) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onUpdateSettings({
        notifications: {
          ...settings.notifications,
          frequency
        }
      });
      toast.success(t('profile.frequencyUpdated'));
    } catch (error) {
      toast.error(t('profile.failedToUpdateFrequency'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSoundToggle = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onUpdateSettings({
        notifications: {
          ...settings.notifications,
          soundEnabled: !settings.notifications.soundEnabled
        }
      });
      toast.success(settings.notifications.soundEnabled ? t('profile.soundDisabled') : t('profile.soundEnabled'));
    } catch (error) {
      toast.error(t('profile.failedToUpdateSound'));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.notifications')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.notificationsDescription')}</p>
      </div>

      {/* Email Notifications */}
      <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Mail className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">{t('settings.emailNotifications')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.emailNotificationsDescription')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('settings.newApplications')}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('settings.newApplicationsDescription')}</p>
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

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('settings.newMessages')}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('settings.newMessagesDescription')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.email.messages}
                onChange={(e) => handleEmailNotificationUpdate('messages', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('settings.paymentsAndBilling')}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('settings.paymentsDescription')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.email.payments}
                onChange={(e) => handleEmailNotificationUpdate('payments', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('settings.reviewsAndRatings')}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('settings.reviewsDescription')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.email.reviews}
                onChange={(e) => handleEmailNotificationUpdate('reviews', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('settings.marketingEmails')}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('settings.marketingDescription')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.email.marketing}
                onChange={(e) => handleEmailNotificationUpdate('marketing', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Smartphone className="w-5 h-5 text-green-600" />
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">{t('settings.pushNotifications')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.pushNotificationsDescription')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('settings.enablePushNotifications')}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('settings.pushNotificationsToggle')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.push.enabled}
                onChange={(e) => handlePushNotificationUpdate('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.notifications.push.enabled && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('settings.applications')}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('settings.pushApplicationsDescription')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.push.applications}
                    onChange={(e) => handlePushNotificationUpdate('applications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('settings.messages')}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('settings.pushMessagesDescription')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.push.messages}
                    onChange={(e) => handlePushNotificationUpdate('messages', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('settings.payments')}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('settings.pushPaymentsDescription')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.push.payments}
                    onChange={(e) => handlePushNotificationUpdate('payments', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('settings.reviews')}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('settings.pushReviewsDescription')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.push.reviews}
                    onChange={(e) => handlePushNotificationUpdate('reviews', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notification Frequency */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Clock className="w-5 h-5 text-orange-600" />
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">{t('settings.notificationFrequency')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.frequencyDescription')}</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="frequency"
              value="immediate"
              checked={settings.notifications.frequency === 'immediate'}
              onChange={() => handleFrequencyUpdate('immediate')}
              className="text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('settings.immediately')}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('settings.immediatelyDescription')}</p>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="frequency"
              value="daily"
              checked={settings.notifications.frequency === 'daily'}
              onChange={() => handleFrequencyUpdate('daily')}
              className="text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('settings.daily')}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('settings.dailyDescription')}</p>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="frequency"
              value="weekly"
              checked={settings.notifications.frequency === 'weekly'}
              onChange={() => handleFrequencyUpdate('weekly')}
              className="text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('settings.weekly')}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('settings.weeklyDescription')}</p>
            </div>
          </label>
        </div>
      </div>

      {/* Sound Settings */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {settings.notifications.soundEnabled ? (
              <Volume2 className="w-5 h-5 text-blue-600" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">{t('settings.soundNotifications')}</h3>
              <p className="text-sm text-gray-600">
                {settings.notifications.soundEnabled 
                  ? t('settings.soundEnabled')
                  : t('settings.soundDisabled')
                }
              </p>
            </div>
          </div>
          <button
            onClick={handleSoundToggle}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              settings.notifications.soundEnabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {settings.notifications.soundEnabled ? t('settings.disableSound') : t('settings.enableSound')}
          </button>
        </div>
      </div>
    </div>
  );
}