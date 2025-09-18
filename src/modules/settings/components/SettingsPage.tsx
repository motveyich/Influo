import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useUserSettings } from '../../../hooks/useUserSettings';
import { SecuritySettings } from './SecuritySettings';
import { NotificationSettings } from './NotificationSettings';
import { InterfaceSettings } from './InterfaceSettings';
import { SupportSettings } from './SupportSettings';
import { 
  Shield, 
  Bell, 
  Palette, 
  HelpCircle,
  Settings as SettingsIcon,
  User,
  Lock,
  Globe,
  MessageSquare
} from 'lucide-react';

type SettingsTab = 'security' | 'notifications' | 'interface' | 'support';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('security');
  const { user } = useAuth();
  const { settings, isLoading, updateSettings } = useUserSettings(user?.id || '');

  const tabs = [
    { id: 'security', label: 'Безопасность', icon: Shield },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'interface', label: 'Интерфейс', icon: Palette },
    { id: 'support', label: 'Поддержка', icon: HelpCircle }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <SettingsIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Настройки недоступны</h3>
          <p className="text-gray-600">Не удалось загрузить настройки пользователя</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Настройки</h1>
                <p className="text-sm text-gray-600">Управление аккаунтом и предпочтениями</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'security' && (
              <SecuritySettings 
                settings={settings} 
                onUpdateSettings={updateSettings}
                userId={user?.id || ''}
              />
            )}
            {activeTab === 'notifications' && (
              <NotificationSettings 
                settings={settings} 
                onUpdateSettings={updateSettings}
              />
            )}
            {activeTab === 'interface' && (
              <InterfaceSettings 
                settings={settings} 
                onUpdateSettings={updateSettings}
              />
            )}
            {activeTab === 'support' && (
              <SupportSettings />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}