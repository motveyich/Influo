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
  const { profile: currentUserProfile, updateProfile, refresh: refreshProfile, isLoading: profileLoading, error: profileError } = useProfileCompletion(currentUserId);

  // Create a combined profile object that falls back to auth data if profile is not loaded
  const combinedProfile = React.useMemo(() => {
    if (currentUserProfile) {
      // DIAGNOSTIC: Log the profile data we're using
      console.log('[ProfilesPage] ✅ Using loaded profile:', {
        userId: currentUserProfile.userId,
        fullName: currentUserProfile.fullName,
        bio: currentUserProfile.bio,
        location: currentUserProfile.location,
        website: currentUserProfile.website,
        hasBio: !!currentUserProfile.bio,
        hasLocation: !!currentUserProfile.location,
        hasWebsite: !!currentUserProfile.website,
      });
      return currentUserProfile;
    }

    // If profile loading failed but we have user data, create a minimal profile object
    if (user && !profileLoading) {
      console.log('[ProfilesPage] Profile not found, using auth data as fallback:', {
        userId: user.id,
        fullName: user.fullName,
        email: user.email
      });

      return {
        userId: user.id,
        email: user.email || '',
        fullName: user.fullName || '',
        username: user.username || null,
        userType: user.userType || null,
        avatar: user.avatar || null,
        bio: null,
        location: null,
        website: null,
        phone: null,
        influencerData: null,
        advertiserData: null,
        profileCompletion: {
          completionPercentage: 20,
          basicInfo: false,
          influencerSetup: false,
          advertiserSetup: false,
          missingFields: ['bio', 'location']
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as UserProfile;
    }

    return null;
  }, [currentUserProfile, user, profileLoading]);

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
            {combinedProfile && combinedProfile.profileCompletion && !combinedProfile.profileCompletion.overallComplete && (
              <ProfileCompletionBanner
                profile={combinedProfile}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.fields.fullName')}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {combinedProfile?.fullName || t('profile.notSpecified')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.fields.email')}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{combinedProfile?.email || t('profile.notSpecified')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.fields.phone')}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {combinedProfile?.phone || t('profile.notSpecified')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.fields.location')}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {combinedProfile?.location || t('profile.notSpecified')}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.fields.bio')}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {combinedProfile?.bio || t('profile.notSpecified')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.fields.website')}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {combinedProfile?.website || t('profile.notSpecified')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'influencer':
        return (
          <div className="space-y-6">
            {/* Profile Completion Banner */}
            {combinedProfile && combinedProfile.profileCompletion && !combinedProfile.profileCompletion.overallComplete && (
              <ProfileCompletionBanner
                profile={combinedProfile}
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

              <div className="space-y-6">
                {/* Influencer Profile Fields */}
                {combinedProfile?.influencerProfile && (
                  <>
                    {/* Nickname, Country, City */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {combinedProfile.influencerProfile.nickname && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Никнейм
                          </label>
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {combinedProfile.influencerProfile.nickname}
                          </p>
                        </div>
                      )}
                      {combinedProfile.influencerProfile.country && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Страна
                          </label>
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {combinedProfile.influencerProfile.country}
                          </p>
                        </div>
                      )}
                      {combinedProfile.influencerProfile.city && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Город
                          </label>
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {combinedProfile.influencerProfile.city}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bio */}
                    {combinedProfile.influencerProfile.bio && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          О себе
                        </label>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {combinedProfile.influencerProfile.bio}
                        </p>
                      </div>
                    )}

                    {/* Primary Niches */}
                    {combinedProfile.influencerProfile.primaryNiches?.length > 0 && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                          Основные ниши
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {combinedProfile.influencerProfile.primaryNiches.map((niche, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                            >
                              {niche}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content Languages */}
                    {combinedProfile.influencerProfile.contentLanguages?.length > 0 && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                          Языки контента
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {combinedProfile.influencerProfile.contentLanguages.map((lang, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audience Overview */}
                    {combinedProfile.influencerProfile.audienceOverview && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                          Обзор аудитории
                        </h3>
                        <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 space-y-2">
                          {combinedProfile.influencerProfile.audienceOverview.primaryCountries?.length > 0 && (
                            <div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Основные страны: </span>
                              <span className="text-sm text-gray-900 dark:text-gray-100">
                                {combinedProfile.influencerProfile.audienceOverview.primaryCountries.join(', ')}
                              </span>
                            </div>
                          )}
                          {combinedProfile.influencerProfile.audienceOverview.ageRange && (
                            <div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Возрастной диапазон: </span>
                              <span className="text-sm text-gray-900 dark:text-gray-100">
                                {combinedProfile.influencerProfile.audienceOverview.ageRange.min} - {combinedProfile.influencerProfile.audienceOverview.ageRange.max} лет
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Preferred Brand Categories */}
                    {combinedProfile.influencerProfile.preferredBrandCategories?.length > 0 && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                          Предпочитаемые категории брендов
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {combinedProfile.influencerProfile.preferredBrandCategories.map((cat, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Open to Long-Term Collabs */}
                    {combinedProfile.influencerProfile.openToLongTermCollabs !== undefined && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Открыт к долгосрочным коллаборациям
                        </label>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {combinedProfile.influencerProfile.openToLongTermCollabs ? 'Да' : 'Нет'}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Fallback to old structure if new profile doesn't exist */}
                {!combinedProfile?.influencerProfile && combinedProfile?.influencerData && (
                  <>
                    {/* Social Networks (old structure) */}
                    {combinedProfile.influencerData.socialMediaLinks?.length > 0 && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                          {t('profile.socialNetworks')}
                        </h3>
                        <div className="space-y-2">
                          {combinedProfile.influencerData.socialMediaLinks.map((link, index) => (
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
                      </div>
                    )}

                    {/* Content Categories (old structure) */}
                    {combinedProfile.influencerData.contentCategories?.length > 0 && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                          {t('profile.categories')}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {combinedProfile.influencerData.contentCategories.map((category, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Show message if no data exists */}
                {!combinedProfile?.influencerProfile && !combinedProfile?.influencerData && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('profile.notSpecified')}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 'advertiser':
        return (
          <div className="space-y-6">
            {/* Profile Completion Banner */}
            {combinedProfile && combinedProfile.profileCompletion && !combinedProfile.profileCompletion.overallComplete && (
              <ProfileCompletionBanner
                profile={combinedProfile}
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

              <div className="space-y-6">
                {/* Advertiser Profile Fields */}
                {combinedProfile?.advertiserProfile ? (
                  <>
                    {/* Company Name and Logo */}
                    <div>
                      <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                        {t('profile.companyInformation')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {combinedProfile.advertiserProfile.companyName && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('profile.fields.organizationName')}
                            </label>
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              {combinedProfile.advertiserProfile.companyName}
                            </p>
                          </div>
                        )}
                        {combinedProfile.advertiserProfile.organizationWebsite && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('profile.fields.organizationWebsite')}
                            </label>
                            <a
                              href={combinedProfile.advertiserProfile.organizationWebsite}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            >
                              {combinedProfile.advertiserProfile.organizationWebsite}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Company Description */}
                    {combinedProfile.advertiserProfile.companyDescription && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Описание компании
                        </label>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {combinedProfile.advertiserProfile.companyDescription}
                        </p>
                      </div>
                    )}

                    {/* Business Categories */}
                    {combinedProfile.advertiserProfile.businessCategories?.length > 0 && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                          Категории бизнеса
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {combinedProfile.advertiserProfile.businessCategories.map((cat, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Brand Values */}
                    {combinedProfile.advertiserProfile.brandValues?.length > 0 && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                          Ценности бренда
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {combinedProfile.advertiserProfile.brandValues.map((value, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Typical Budget Range */}
                    {combinedProfile.advertiserProfile.typicalBudgetRange && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                          {t('profile.budgetRange')}
                        </h3>
                        <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              ${combinedProfile.advertiserProfile.typicalBudgetRange.min} - ${combinedProfile.advertiserProfile.typicalBudgetRange.max} {combinedProfile.advertiserProfile.typicalBudgetRange.currency}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Typical Integration Types */}
                    {combinedProfile.advertiserProfile.typicalIntegrationTypes?.length > 0 && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                          Типичные типы интеграций
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {combinedProfile.advertiserProfile.typicalIntegrationTypes.map((type, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payment Policies */}
                    {combinedProfile.advertiserProfile.paymentPolicies?.length > 0 && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                          Политики оплаты
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {combinedProfile.advertiserProfile.paymentPolicies.map((policy, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-full text-sm"
                            >
                              {policy}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Target Demographics */}
                    {combinedProfile.advertiserProfile.targetDemographics?.ageRange && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                          Целевая демография
                        </h3>
                        <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Возрастной диапазон: </span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {combinedProfile.advertiserProfile.targetDemographics.ageRange.min} - {combinedProfile.advertiserProfile.targetDemographics.ageRange.max} лет
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Boolean Flags */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {combinedProfile.advertiserProfile.workWithMicroInfluencers !== undefined && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Работаем с микро-инфлюенсерами
                          </label>
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {combinedProfile.advertiserProfile.workWithMicroInfluencers ? 'Да' : 'Нет'}
                          </p>
                        </div>
                      )}
                      {combinedProfile.advertiserProfile.giveCreativeFreedom !== undefined && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Даём творческую свободу
                          </label>
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {combinedProfile.advertiserProfile.giveCreativeFreedom ? 'Да' : 'Нет'}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : combinedProfile?.advertiserData ? (
                  <>
                    {/* Company Information (old structure) */}
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
                            {combinedProfile.advertiserData.companyName || t('profile.notSpecified')}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('profile.industry')}
                          </label>
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {combinedProfile.advertiserData.industry || t('profile.notSpecified')}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('profile.fields.organizationWebsite')}
                          </label>
                          {(combinedProfile.advertiserData as any)?.organizationWebsite ? (
                            <a
                              href={(combinedProfile.advertiserData as any).organizationWebsite}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            >
                              {(combinedProfile.advertiserData as any).organizationWebsite}
                            </a>
                          ) : (
                            <p className="text-sm text-gray-900 dark:text-gray-100">{t('profile.notSpecified')}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Budget Range (old structure) */}
                    {combinedProfile.advertiserData.campaignPreferences?.budgetRange && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                          {t('profile.budgetRange')}
                        </h3>
                        <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {formatCurrency(combinedProfile.advertiserData.campaignPreferences.budgetRange.min)} -
                              {formatCurrency(combinedProfile.advertiserData.campaignPreferences.budgetRange.max)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Preferred Platforms (old structure) */}
                    {combinedProfile.advertiserData.campaignPreferences?.preferredPlatforms?.length > 0 && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                          {t('campaigns.platforms')}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {combinedProfile.advertiserData.campaignPreferences.preferredPlatforms.map((platform, index) => (
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

                    {/* Target Audience (old structure) */}
                    {combinedProfile.advertiserData.campaignPreferences?.targetAudience && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                          {t('campaigns.demographics')}
                        </h3>
                        <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{t('campaigns.fields.ageRange')}:</span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {combinedProfile.advertiserData.campaignPreferences.targetAudience.ageRange[0]} -
                              {combinedProfile.advertiserData.campaignPreferences.targetAudience.ageRange[1]} {t('time.yearsAgo').replace(' назад', '').replace(' ago', '')}
                            </span>
                          </div>
                          {combinedProfile.advertiserData.campaignPreferences.targetAudience.countries?.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">{t('campaigns.fields.targetCountries')}:</span>
                              <span className="text-sm text-gray-900 dark:text-gray-100">
                                {combinedProfile.advertiserData.campaignPreferences.targetAudience.countries.slice(0, 3).join(', ')}
                                {combinedProfile.advertiserData.campaignPreferences.targetAudience.countries.length > 3 &&
                                  ` +${combinedProfile.advertiserData.campaignPreferences.targetAudience.countries.length - 3}`
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('profile.notSpecified')}
                  </p>
                )}
              </div>
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
        currentProfile={combinedProfile}
        initialTab={activeModalTab}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
}