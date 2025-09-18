import React from 'react';
import { UserSettings } from '../../../core/types';
import { Bell, Mail, Smartphone, Volume2, VolumeX, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('profile.notifications')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.notificationDescription')}</p>
      </div>

      {/* Email Notifications */}
      <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Mail className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">{t('profile.emailNotifications')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.emailNotificationsDescription')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('profile.newApplications')}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('profile.newApplicationsDescription')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.email.applications}
                onChange={(e) => handleEmailNotificationUpdate('applications', e.target.checked)}
                disabled={isUpdating}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Новые сообщения</p>
              <p className="text-xs text-gray-600">Уведомления о новых сообщениях в чате</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.email.messages}
                onChange={(e) => handleEmailNotificationUpdate('messages', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Платежи и оплаты</p>
              <p className="text-xs text-gray-600">Уведомления о статусе платежей</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.email.payments}
                onChange={(e) => handleEmailNotificationUpdate('payments', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Отзывы и рейтинги</p>
              <p className="text-xs text-gray-600">Уведомления о новых отзывах</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.email.reviews}
                onChange={(e) => handleEmailNotificationUpdate('reviews', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Маркетинговые рассылки</p>
              <p className="text-xs text-gray-600">Новости платформы и специальные предложения</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.email.marketing}
                onChange={(e) => handleEmailNotificationUpdate('marketing', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Smartphone className="w-5 h-5 text-green-600" />
          <div>
            <h3 className="text-md font-medium text-gray-900">Push-уведомления</h3>
            <p className="text-sm text-gray-600">Мгновенные уведомления в браузере</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Включить push-уведомления</p>
              <p className="text-xs text-gray-600">Основной переключатель для всех push-уведомлений</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.push.enabled}
                onChange={(e) => handlePushNotificationUpdate('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {settings.notifications.push.enabled && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Заявки</p>
                  <p className="text-xs text-gray-600">Push-уведомления о новых заявках</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.push.applications}
                    onChange={(e) => handlePushNotificationUpdate('applications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Сообщения</p>
                  <p className="text-xs text-gray-600">Push-уведомления о новых сообщениях</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.push.messages}
                    onChange={(e) => handlePushNotificationUpdate('messages', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Платежи</p>
                  <p className="text-xs text-gray-600">Push-уведомления о платежах</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.push.payments}
                    onChange={(e) => handlePushNotificationUpdate('payments', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Отзывы</p>
                  <p className="text-xs text-gray-600">Push-уведомления о новых отзывах</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.push.reviews}
                    onChange={(e) => handlePushNotificationUpdate('reviews', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
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
            <h3 className="text-md font-medium text-gray-900">Частота уведомлений</h3>
            <p className="text-sm text-gray-600">Как часто получать уведомления</p>
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
              className="text-purple-600 border-gray-300 focus:ring-purple-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Немедленно</p>
              <p className="text-xs text-gray-600">Получать уведомления сразу при возникновении событий</p>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="frequency"
              value="daily"
              checked={settings.notifications.frequency === 'daily'}
              onChange={() => handleFrequencyUpdate('daily')}
              className="text-purple-600 border-gray-300 focus:ring-purple-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Раз в день</p>
              <p className="text-xs text-gray-600">Ежедневная сводка всех уведомлений</p>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="frequency"
              value="weekly"
              checked={settings.notifications.frequency === 'weekly'}
              onChange={() => handleFrequencyUpdate('weekly')}
              className="text-purple-600 border-gray-300 focus:ring-purple-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Раз в неделю</p>
              <p className="text-xs text-gray-600">Еженедельная сводка активности</p>
            </div>
          </label>
        </div>
      </div>

      {/* Sound Settings */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {settings.notifications.soundEnabled ? (
              <Volume2 className="w-5 h-5 text-purple-600" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <h3 className="text-md font-medium text-gray-900">Звуковые уведомления</h3>
              <p className="text-sm text-gray-600">
                {settings.notifications.soundEnabled 
                  ? 'Звуковые сигналы включены'
                  : 'Звуковые сигналы отключены'
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
            {settings.notifications.soundEnabled ? 'Отключить звук' : 'Включить звук'}
          </button>
        </div>
      </div>
    </div>
  );
}