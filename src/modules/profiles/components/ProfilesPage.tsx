import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../../core/types';
import { ProfileCard } from './ProfileCard';
import { ProfileSetupModal } from './ProfileSetupModal';
import { ProfileCompletionBanner } from './ProfileCompletionBanner';
import { profileService } from '../services/profileService';
import { useAuth } from '../../../hooks/useAuth';
import { useUserSettings } from '../../../hooks/useUserSettings';
import { useTranslation } from '../../../hooks/useTranslation';
import { FeatureGate } from '../../../components/FeatureGate';
import { useProfileCompletion } from '../hooks/useProfileCompletion';
import { SecuritySettings } from '../../settings/components/SecuritySettings';
import { NotificationSettings } from '../../settings/components/NotificationSettings';
import { InterfaceSettings } from '../../settings/components/InterfaceSettings';
import { SupportSettings } from '../../settings/components/SupportSettings';
import { 
  Search, 
  Filter, 
  Users, 
  TrendingUp, 
  Star, 
  Plus,
  User,
  Briefcase,
  Shield,
  Bell,
  Palette,
  HelpCircle,
  LogOut,
  Save,
  AlertCircle
} from 'lucide-react';
import { analytics } from '../../../core/analytics';
import toast from 'react-hot-toast';

type ProfileTab = 'basic' | 'influencer' | 'advertiser' | 'security' | 'notifications' | 'interface' | 'support';

export function ProfilesPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'influencer' | 'advertiser'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('basic');

  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile, updateProfile, refresh: refreshProfile } = useProfileCompletion(currentUserId);
  
  // User settings hook
  const { 
    settings, 
    updateSettings, 
    changePassword, 
    enableTwoFactor, 
    disableTwoFactor, 
    signOutAllDevices, 
    deactivateAccount, 
    deleteAccount,
    isLoading: settingsLoading 
  } = useUserSettings(currentUserId);

  useEffect(() => {
    if (currentUserId && !loading) {
      loadProfiles();
    }
  }, [currentUserId, loading]);

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      // Mock profiles for now - replace with actual API call
      const mockProfiles: UserProfile[] = [];
      setProfiles(mockProfiles);
    } catch (error) {
      console.error('Failed to load profiles:', error);
      toast.error(t('profile.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    analytics.trackSearch(query, { 
      filter: selectedFilter,
      section: 'profiles'
    });
  };

  const handleCreateProfile = () => {
    setEditingProfile(null);
    setShowProfileModal(true);
  };

  const handleEditProfile = (profile: UserProfile) => {
    setEditingProfile(profile);
    setShowProfileModal(true);
  };

  const handleProfileUpdated = (updatedProfile: UserProfile) => {
    if (editingProfile) {
      setProfiles(prev => prev.map(p => 
        p.userId === updatedProfile.userId ? updatedProfile : p
      ));
    } else {
      setProfiles(prev => [updatedProfile, ...prev]);
    }
    refreshProfile();
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = profile.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         profile.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || 
                         (selectedFilter === 'influencer' && profile.influencerData) ||
                         (selectedFilter === 'advertiser' && profile.advertiserData);
    
    return matchesSearch && matchesFilter;
  });

  const navigation = [
    { id: 'basic', label: 'Основная информация', icon: User },
    { id: 'influencer', label: 'Инфлюенсер', icon: Users },
    { id: 'advertiser', label: 'Рекламодатель', icon: Briefcase },
    { id: 'security', label: 'Безопасность', icon: Shield },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'interface', label: 'Интерфейс', icon: Palette },
    { id: 'support', label: 'Поддержка', icon: HelpCircle }
  ];

  const renderTabContent = () => {
    if (settingsLoading && ['security', 'notifications', 'interface', 'support'].includes(activeTab)) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка настроек...</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'basic':
      case 'influencer':
      case 'advertiser':
        return (
          <div className="space-y-6">
            {/* Profile Completion Banner */}
            {currentUserProfile && !currentUserProfile.profileCompletion.overallComplete && (
              <ProfileCompletionBanner
                profile={currentUserProfile}
                onCompleteProfile={() => setShowProfileModal(true)}
              />
            )}

            {/* Profile Editor */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {activeTab === 'basic' ? 'Основная информация' :
                     activeTab === 'influencer' ? 'Настройки инфлюенсера' :
                     'Настройки рекламодателя'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {activeTab === 'basic' ? 'Управление основной информацией профиля' :
                     activeTab === 'influencer' ? 'Настройка профиля инфлюенсера' :
                     'Настройка профиля рекламодателя'}
                  </p>
                </div>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Редактировать</span>
                </button>
              </div>

              {/* Profile Information Display */}
              {currentUserProfile ? (
                <div className="space-y-6">
                  {activeTab === 'basic' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Полное имя</label>
                        <p className="text-sm text-gray-900">{currentUserProfile.fullName || 'Не указано'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <p className="text-sm text-gray-900">{currentUserProfile.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                        <p className="text-sm text-gray-900">{currentUserProfile.phone || 'Не указан'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Местоположение</label>
                        <p className="text-sm text-gray-900">{currentUserProfile.location || 'Не указано'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">О себе</label>
                        <p className="text-sm text-gray-900">{currentUserProfile.bio || 'Не указано'}</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'influencer' && (
                    <div className="space-y-6">
                      {currentUserProfile.influencerData ? (
                        <>
                          <div>
                            <h3 className="text-md font-medium text-gray-900 mb-3">Социальные сети</h3>
                            {currentUserProfile.influencerData.socialMediaLinks?.length > 0 ? (
                              <div className="space-y-2">
                                {currentUserProfile.influencerData.socialMediaLinks.map((link, index) => (
                                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                                    <span className="text-sm font-medium text-gray-900 capitalize">{link.platform}</span>
                                    <span className="text-sm text-gray-600">{link.username || link.url}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600">Социальные сети не добавлены</p>
                            )}
                          </div>
                          
                          <div>
                            <h3 className="text-md font-medium text-gray-900 mb-3">Метрики</h3>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center p-3 bg-gray-50 rounded-md">
                                <p className="text-lg font-semibold text-gray-900">
                                  {currentUserProfile.influencerData.metrics?.totalFollowers?.toLocaleString() || '0'}
                                </p>
                                <p className="text-xs text-gray-600">Подписчики</p>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-md">
                                <p className="text-lg font-semibold text-gray-900">
                                  {currentUserProfile.influencerData.metrics?.engagementRate?.toFixed(1) || '0'}%
                                </p>
                                <p className="text-xs text-gray-600">Вовлеченность</p>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-md">
                                <p className="text-lg font-semibold text-gray-900">
                                  {currentUserProfile.influencerData.metrics?.averageViews?.toLocaleString() || '0'}
                                </p>
                                <p className="text-xs text-gray-600">Просмотры</p>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Профиль инфлюенсера не настроен</h3>
                          <p className="text-gray-600 mb-4">Настройте профиль инфлюенсера для доступа к функциям платформы</p>
                          <button
                            onClick={() => setShowProfileModal(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                          >
                            Настроить профиль
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'advertiser' && (
                    <div className="space-y-6">
                      {currentUserProfile.advertiserData ? (
                        <>
                          <div>
                            <h3 className="text-md font-medium text-gray-900 mb-3">Информация о компании</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Название компании</label>
                                <p className="text-sm text-gray-900">{currentUserProfile.advertiserData.companyName || 'Не указано'}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Отрасль</label>
                                <p className="text-sm text-gray-900">{currentUserProfile.advertiserData.industry || 'Не указана'}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-md font-medium text-gray-900 mb-3">Статистика</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-3 bg-gray-50 rounded-md">
                                <p className="text-lg font-semibold text-gray-900">
                                  {currentUserProfile.advertiserData.previousCampaigns || 0}
                                </p>
                                <p className="text-xs text-gray-600">Кампании</p>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-md">
                                <p className="text-lg font-semibold text-gray-900">
                                  ${currentUserProfile.advertiserData.averageBudget?.toLocaleString() || '0'}
                                </p>
                                <p className="text-xs text-gray-600">Средний бюджет</p>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Профиль рекламодателя не настроен</h3>
                          <p className="text-gray-600 mb-4">Настройте профиль рекламодателя для создания кампаний</p>
                          <button
                            onClick={() => setShowProfileModal(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                          >
                            Настроить профиль
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Профиль не создан</h3>
                  <p className="text-gray-600 mb-4">Создайте профиль для начала работы на платформе</p>
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                  >
                    Создать профиль
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'security':
        return settings ? (
          <SecuritySettings
            settings={settings}
            onUpdateSettings={updateSettings}
            changePassword={changePassword}
            enableTwoFactor={enableTwoFactor}
            disableTwoFactor={disableTwoFactor}
            signOutAllDevices={signOutAllDevices}
            deactivateAccount={deactivateAccount}
            deleteAccount={deleteAccount}
            userId={currentUserId}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-gray-600">Настройки безопасности недоступны</p>
          </div>
        );

      case 'notifications':
        return settings ? (
          <NotificationSettings
            settings={settings}
            onUpdateSettings={updateSettings}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-gray-600">Настройки уведомлений недоступны</p>
          </div>
        );

      case 'interface':
        return settings ? (
          <InterfaceSettings
            settings={settings}
            onUpdateSettings={updateSettings}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-gray-600">Настройки интерфейса недоступны</p>
          </div>
        );

      case 'support':
        return <SupportSettings />;

      default:
        return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)]">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-6">Профиль и настройки</h1>
          
          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as ProfileTab)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Profile Setup Modal */}
      <ProfileSetupModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setEditingProfile(null);
        }}
        currentProfile={editingProfile || currentUserProfile}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
}