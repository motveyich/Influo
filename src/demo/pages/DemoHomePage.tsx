import React from 'react';
import { TrendingUp, Users, Target, MessageCircle } from 'lucide-react';
import { useDemoToast } from '../DemoToast';
import { demoToastMessages } from '../mockData';

export function DemoHomePage() {
  const { showToast, ToastContainer } = useDemoToast();

  const stats = [
    { label: 'Активных кампаний', value: '12', icon: Target, color: 'blue' },
    { label: 'Предложений', value: '8', icon: MessageCircle, color: 'green' },
    { label: 'Инфлюенсеров', value: '1,234', icon: Users, color: 'purple' },
    { label: 'Средний ER', value: '4.8%', icon: TrendingUp, color: 'orange' },
  ];

  const recentActivity = [
    {
      type: 'campaign',
      title: 'Новая кампания "Запуск косметики"',
      time: '2 часа назад',
      status: 'active',
    },
    {
      type: 'offer',
      title: 'Получено предложение от Beauty Pro',
      time: '5 часов назад',
      status: 'pending',
    },
    {
      type: 'message',
      title: 'Новое сообщение от Fashion House',
      time: '1 день назад',
      status: 'unread',
    },
  ];

  return (
    <div className="space-y-8">
      <ToastContainer />

      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Добро пожаловать в Influo!</h1>
        <p className="text-lg text-white mb-2">
          Платформа для инфлюенсер-маркетинга нового поколения
        </p>
        <p className="text-purple-100">
          Это демонстрационная версия. Зарегистрируйтесь, чтобы получить полный доступ ко всем возможностям.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'from-blue-600 to-blue-700',
            green: 'from-green-600 to-green-700',
            purple: 'from-purple-600 to-purple-700',
            orange: 'from-orange-600 to-orange-700',
          }[stat.color];

          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => showToast(demoToastMessages.viewAnalytics)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-r ${colorClasses} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {stat.value}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Последняя активность
        </h2>
        <div className="space-y-4">
          {recentActivity.map((activity, index) => (
            <div
              key={index}
              className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              onClick={() => showToast('В реальной версии здесь отображается полная история ваших действий и уведомлений.')}
            >
              <div className={`w-2 h-2 rounded-full mt-2 ${
                activity.status === 'active' ? 'bg-green-500' :
                activity.status === 'pending' ? 'bg-yellow-500' :
                'bg-blue-500'
              }`}></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {activity.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => showToast(demoToastMessages.createCampaign)}
        >
          <Target className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Создать кампанию
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Запустите новую автоматическую кампанию для поиска инфлюенсеров
          </p>
        </div>

        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => showToast('В полной версии вы можете просматривать всех инфлюенсеров и отправлять им предложения.')}
        >
          <Users className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Найти инфлюенсеров
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Просмотрите базу блогеров и найдите подходящих партнёров
          </p>
        </div>
      </div>
    </div>
  );
}
