import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../../core/types';
import { ProfileSetupModal } from './ProfileSetupModal';
import { ProfileCompletionBanner } from './ProfileCompletionBanner';
import { useAuth } from '../../../hooks/useAuth';
import { useUserSettings } from '../../../hooks/useUserSettings';
import { useTranslation } from '../../../hooks/useTranslation';
import { useProfileCompletion } from '../hooks/useProfileCompletion';
import { SecuritySettings } from '../../settings/components/SecuritySettings';
import { NotificationSettings } from '../../settings/components/NotificationSettings';
import { InterfaceSettings } from '../../settings/components/InterfaceSettings';
import { SupportSettings } from '../../settings/components/SupportSettings';
import { ReviewsTab } from './ReviewsTab';
import {
  User,
  Users,
  Briefcase,
  Shield,
  Bell,
  Palette,
  HelpCircle,
  Save,
  Instagram,
  Youtube,
  Twitter,
  Globe,
  DollarSign,
  Loader2,
  Star
} from 'lucide-react';
import toast from 'react-hot-toast';

type ProfileTab = 'basic' | 'influencer' | 'advertiser' | 'security' | 'notifications' | 'interface' | 'support' | 'reviews';

export function ProfilesPage() {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('basic');
  const [activeModalTab, setActiveModalTab] = useState<'basic' | 'influencer' | 'advertiser'>('basic');
  const [isUpdating, setIsUpdating] = useState(false);

  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile, updateProfile, refresh: refreshProfile } = useProfileCompletion(currentUserId);
  
  // User settings hook
  const {
    settings,
    updateSettings,
    changePassword,
    deactivateAccount,
    deleteAccount,
    isLoading: settingsLoading
  } = useUserSettings(currentUserId);

  const handleProfileUpdated = (updatedProfile: UserProfile) => {
    refreshProfile();
    toast.success(t('profile.success.updated'));
  };

  const handleSettingsUpdate = async (updates: any) => {
    if (isUpdating) return; // Prevent spam clicks
    
    setIsUpdating(true);
    try {
      const result = await updateSettings(updates);
      return result;
    } finally {
      setIsUpdating(false);
    }
  };

  const navigation = [
    { id: 'basic', label: t('profile.basicInfo'), icon: User },
    { id: 'influencer', label: t('profile.influencerSettings'), icon: Users },
    { id: 'advertiser', label: t('profile.advertiserSettings'), icon: Briefcase },
    { id: 'reviews', label: 'Отзывы', icon: Star },
    { id: 'security', label: t('profile.security'), icon: Shield },
    { id: 'notifications', label: t('profile.notifications'), icon: Bell },
    { id: 'interface', label: t('profile.interface'), icon: Palette },
    { id: 'support', label: t('profile.support'), icon: HelpCircle }
  ];

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="w-4 h-4" />;
      case 'youtube':
        return <Youtube className="w-4 h-4" />;
      case 'twitter':
        return <Twitter className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderTabContent = () => {
    // Show loading for settings tabs
    if (settingsLoading && ['security', 'notifications', 'interface', 'support'].includes(activeTab)) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {activeTab === 'security' ? t('profile.loadingSecuritySettings') :
               activeTab === 'notifications' ? t('profile.loadingNotificationSettings') :
               activeTab === 'interface' ? t('profile.loadingInterfaceSettings') :
               t('profile.loadingSettings')}
            </p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'basic':
        return (
          <div className="space-y-6">
            {/* Profile Completion Banner */}
            {currentUserProfile && !currentUserProfile.profileCompletion.overallComplete && (
              <ProfileCompletionBanner
                profile={currentUserProfile}
                onCompleteProfile={() => setShowProfileModal(true)}
              />
            )}

            {/* Basic Information */}
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t('profile.basicInfo')}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('profile.manageBasicInfo')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveModalTab('basic');
                    setShowProfileModal(true);
                  }}
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isUpdating ? t('common.loading') : t('common.edit')}</span>
                </button>
              </div>

              {currentUserProfile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('profile.fields.fullName')}
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {currentUserProfile.fullName || t('profile.notSpecified')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('profile.fields.email')}
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{currentUserProfile.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('profile.fields.phone')}
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {currentUserProfile.phone || t('profile.notSpecified')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('profile.fields.location')}
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {currentUserProfile.location || t('profile.notSpecified')}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('profile.fields.bio')}
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {currentUserProfile.bio || t('profile.notSpecified')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('profile.fields.website')}
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {currentUserProfile.website || t('profile.notSpecified')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {t('profile.profileNotCreated')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {t('profile.createProfileDescription')}
                  </p>
                  <button
                    onClick={() => {
                      setActiveModalTab('basic');
                      setShowProfileModal(true);
                    }}
                    disabled={isUpdating}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('profile.createProfile')}
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'influencer':
        return (
          <div className="space-y-6">
            {/* Profile Completion Banner */}
            {currentUserProfile && !currentUserProfile.profileCompletion.overallComplete && (
              <ProfileCompletionBanner
                profile={currentUserProfile}
                onCompleteProfile={() => setShowProfileModal(true)}
              />
            )}

            {/* Influencer Settings */}
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t('profile.influencerSettings')}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('profile.setupInfluencerProfile')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveModalTab('influencer');
                    setShowProfileModal(true);
                  }}
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isUpdating ? t('common.loading') : t('common.edit')}</span>
                </button>
              </div>

              {currentUserProfile?.influencerData ? (
                <div className="space-y-6">
                  {/* Social Networks */}
                  <div>
                    <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                      {t('profile.socialNetworks')}
                    </h3>
                    {currentUserProfile.influencerData.socialMediaLinks?.length > 0 ? (
                      <div className="space-y-2">
                        {currentUserProfile.influencerData.socialMediaLinks.map((link, index) => (
                          <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-dark-700 rounded-md">
                            {getSocialIcon(link.platform)}
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                              {link.platform}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {link.username || link.url}
                            </span>
                            {link.verified && (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full">
                                {t('common.verified')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('profile.socialNetworks')} {t('profile.notAdded')}
                      </p>
                    )}
                  </div>
                  
                  {/* Content Categories */}
                  <div>
                    <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                      {t('profile.categories')}
                    </h3>
                    {currentUserProfile.influencerData.contentCategories?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {currentUserProfile.influencerData.contentCategories.map((category, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('profile.noCategoriesAdded')}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {t('profile.influencerNotConfigured')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {t('profile.setupInfluencerDescription')}
                  </p>
                  <button
                    onClick={() => {
                      setActiveModalTab('influencer');
                      setShowProfileModal(true);
                    }}
                    disabled={isUpdating}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('profile.setupProfile')}
                  </button>
                </div>
              )}
            </div>
          </div>
        );

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

            {/* Advertiser Settings */}
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t('profile.advertiserSettings')}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('profile.setupAdvertiserProfile')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveModalTab('advertiser');
                    setShowProfileModal(true);
                  }}
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isUpdating ? t('common.loading') : t('common.edit')}</span>
                </button>
              </div>

              {currentUserProfile?.advertiserData ? (
                <div className="space-y-6">
                  {/* Company Information */}
                  <div>
                    <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                      {t('profile.companyInformation')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('profile.fields.organizationName')}
                        </label>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {currentUserProfile.advertiserData.companyName || t('profile.notSpecified')}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('profile.industry')}
                        </label>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {currentUserProfile.advertiserData.industry || t('profile.notSet')}
                        </p>
                      </div>
                      {(currentUserProfile.advertiserData as any).organizationWebsite && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('profile.fields.organizationWebsite')}
                          </label>
                          <a 
                            href={(currentUserProfile.advertiserData as any).organizationWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            {(currentUserProfile.advertiserData as any).organizationWebsite}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Budget Range */}
                  {currentUserProfile.advertiserData.campaignPreferences?.budgetRange && (
                    <div>
                      <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                        {t('profile.budgetRange')}
                      </h3>
                      <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {formatCurrency(currentUserProfile.advertiserData.campaignPreferences.budgetRange.min)} - 
                            {formatCurrency(currentUserProfile.advertiserData.campaignPreferences.budgetRange.max)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preferred Platforms */}
                  {currentUserProfile.advertiserData.campaignPreferences?.preferredPlatforms?.length > 0 && (
                    <div>
                      <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                        {t('campaigns.platforms')}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {currentUserProfile.advertiserData.campaignPreferences.preferredPlatforms.map((platform, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm capitalize"
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Target Audience */}
                  {currentUserProfile.advertiserData.campaignPreferences?.targetAudience && (
                    <div>
                      <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                        {t('campaigns.demographics')}
                      </h3>
                      <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{t('campaigns.fields.ageRange')}:</span>
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {currentUserProfile.advertiserData.campaignPreferences.targetAudience.ageRange[0]} - 
                            {currentUserProfile.advertiserData.campaignPreferences.targetAudience.ageRange[1]} {t('time.yearsAgo').replace(' назад', '').replace(' ago', '')}
                          </span>
                        </div>
                        {currentUserProfile.advertiserData.campaignPreferences.targetAudience.countries?.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{t('campaigns.fields.targetCountries')}:</span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {currentUserProfile.advertiserData.campaignPreferences.targetAudience.countries.slice(0, 3).join(', ')}
                              {currentUserProfile.advertiserData.campaignPreferences.targetAudience.countries.length > 3 && 
                                ` +${currentUserProfile.advertiserData.campaignPreferences.targetAudience.countries.length - 3}`
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {t('profile.advertiserNotConfigured')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {t('profile.setupAdvertiserDescription')}
                  </p>
                  <button
                    onClick={() => {
                      setActiveModalTab('advertiser');
                      setShowProfileModal(true);
                    }}
                    disabled={isUpdating}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('profile.setupProfile')}
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
            onUpdateSettings={handleSettingsUpdate}
            changePassword={changePassword}
            deactivateAccount={deactivateAccount}
            deleteAccount={deleteAccount}
            userId={currentUserId}
          />
        ) : (
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin h-8 w-8 text-blue-600 mr-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('profile.loadingSecuritySettings')}</p>
            </div>
          </div>
        );

      case 'notifications':
        return settings ? (
          <NotificationSettings
            settings={settings}
            onUpdateSettings={handleSettingsUpdate}
          />
        ) : (
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin h-8 w-8 text-blue-600 mr-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('profile.loadingNotificationSettings')}</p>
            </div>
          </div>
        );

      case 'interface':
        return settings ? (
          <InterfaceSettings
            settings={settings}
            onUpdateSettings={handleSettingsUpdate}
          />
        ) : (
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin h-8 w-8 text-blue-600 mr-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('profile.loadingInterfaceSettings')}</p>
            </div>
          </div>
        );

      case 'support':
        return <SupportSettings />;

      case 'reviews':
        return <ReviewsTab userId={currentUserId} />;

      default:
        return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)]">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-600 overflow-y-auto">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            {t('profile.profileAndSettings')}
          </h1>
          
          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as ProfileTab)}
                  disabled={isUpdating}
                  className={`w-full flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left ${
                    activeTab === item.id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0 mr-3" />
                  <span className="flex-1">{item.label}</span>
                  {isUpdating && activeTab === item.id && (
                    <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-900">
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Profile Setup Modal */}
      <ProfileSetupModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setActiveModalTab('basic');
        }}
        currentProfile={currentUserProfile}
        initialTab={activeModalTab}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
}