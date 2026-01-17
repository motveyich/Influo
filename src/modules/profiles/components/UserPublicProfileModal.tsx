import React, { useState, useEffect } from 'react';
import { X, MapPin, Globe, Briefcase, Users, Instagram, Youtube, Twitter, Mail, Phone, DollarSign, Star, Loader2 } from 'lucide-react';
import { UserProfile, UserSettings } from '../../../core/types';
import { profileService } from '../services/profileService';
import { userSettingsService } from '../../../services/userSettingsService';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import toast from 'react-hot-toast';

interface UserPublicProfileModalProps {
  userId: string;
  currentUserId?: string;
  onClose: () => void;
}

export function UserPublicProfileModal({ userId, currentUserId, onClose }: UserPublicProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isOwnProfile = currentUserId === userId;

  useBodyScrollLock(true);

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);

      // Load profile data
      const profileData = await profileService.getProfile(userId);

      // Load settings only for own profile (to avoid 500 error from backend)
      let settingsData = null;
      if (isOwnProfile) {
        try {
          settingsData = await userSettingsService.getUserSettings(userId);
        } catch (error) {
          console.error('Failed to load user settings:', error);
          // Use default settings if loading fails
          settingsData = null;
        }
      }

      if (profileData) {
        // Метрики теперь хранятся непосредственно в user_profiles
        // и обновляются автоматически через триггеры БД
        const { supabase } = await import('../../../core/supabase');

        const { data: profileMetrics } = await supabase
          .from('user_profiles')
          .select('completed_deals_count, total_reviews_count, average_rating')
          .eq('user_id', userId)
          .single();

        // Обновляем данные профиля с метриками из БД
        profileData.unifiedAccountInfo = {
          ...profileData.unifiedAccountInfo,
          completedDeals: profileMetrics?.completed_deals_count || 0,
          totalReviews: profileMetrics?.total_reviews_count || 0,
          averageRating: profileMetrics?.average_rating || 0
        };
      }

      setProfile(profileData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Не удалось загрузить профиль');
    } finally {
      setIsLoading(false);
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const shouldShowEmail = () => {
    if (isOwnProfile) return true;
    return !settings?.privacy?.hideEmail;
  };

  const shouldShowPhone = () => {
    if (isOwnProfile) return true;
    return !settings?.privacy?.hidePhone;
  };

  const shouldShowSocialMedia = () => {
    if (isOwnProfile) return true;
    return !settings?.privacy?.hideSocialMedia;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-md">
          <p className="text-gray-900 dark:text-gray-100 text-center">Профиль не найден</p>
          <button
            onClick={onClose}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  const getAccountTypeLabel = () => {
    if (profile.influencerData && profile.advertiserData) {
      return 'Инфлюенсер и рекламодатель';
    } else if (profile.influencerData) {
      return 'Инфлюенсер';
    } else if (profile.advertiserData) {
      return 'Рекламодатель';
    }
    return 'Пользователь';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Профиль пользователя</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile Header */}
          <div className="flex items-start space-x-4">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.fullName}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-2xl">
                  {profile.fullName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {profile.fullName}
                </h3>
                {profile.unifiedAccountInfo.isVerified && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{getAccountTypeLabel()}</p>
              {profile.unifiedAccountInfo.averageRating > 0 && (
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {profile.unifiedAccountInfo.averageRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({profile.unifiedAccountInfo.totalReviews} отзывов)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Основная информация</span>
            </h4>

            {profile.location && (
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{profile.location}</span>
              </div>
            )}

            {shouldShowEmail() && profile.email && (
              <div className="flex items-start space-x-2">
                <Mail className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{profile.email}</span>
              </div>
            )}

            {shouldShowPhone() && profile.phone && (
              <div className="flex items-start space-x-2">
                <Phone className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{profile.phone}</span>
              </div>
            )}

            {profile.website && (
              <div className="flex items-start space-x-2">
                <Globe className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {profile.website}
                </a>
              </div>
            )}

            {profile.bio && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{profile.bio}</p>
              </div>
            )}
          </div>

          {/* Influencer Information */}
          {profile.influencerData && (
            <div className="bg-gradient-to-r from-pink-50 to-blue-50 dark:from-pink-900/20 dark:to-blue-900/20 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                <Users className="w-5 h-5 text-pink-600" />
                <span>Инфлюенсер</span>
              </h4>

              {profile.influencerData.categories && profile.influencerData.categories.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Категории</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.influencerData.categories.map((category, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {shouldShowSocialMedia() && profile.influencerData.socialMediaLinks && profile.influencerData.socialMediaLinks.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Социальные сети</p>
                  <div className="space-y-2">
                    {profile.influencerData.socialMediaLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {getSocialIcon(link.platform)}
                        <span className="capitalize">{link.platform}</span>
                        {link.followers && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({formatNumber(link.followers)} подписчиков)
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {profile.influencerData.collaborationTypes && profile.influencerData.collaborationTypes.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Типы сотрудничества</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.influencerData.collaborationTypes.map((type, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.influencerData.priceRanges && Object.keys(profile.influencerData.priceRanges).length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Стоимость</p>
                  <div className="space-y-1">
                    {Object.entries(profile.influencerData.priceRanges).map(([type, range]: [string, any]) => (
                      <div key={type} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300 capitalize">{type}:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(range.min, range.currency)} - {formatCurrency(range.max, range.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Advertiser Information */}
          {profile.advertiserData && (
            <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-green-600" />
                <span>Рекламодатель</span>
              </h4>

              {profile.advertiserData.companyName && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Компания</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {profile.advertiserData.companyName}
                  </p>
                </div>
              )}

              {profile.advertiserData.industry && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Индустрия</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{profile.advertiserData.industry}</p>
                </div>
              )}

              {profile.advertiserData.companyDescription && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">О компании</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {profile.advertiserData.companyDescription}
                  </p>
                </div>
              )}

              {profile.advertiserData.budgetRange && (
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Бюджет на кампанию</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(profile.advertiserData.budgetRange.min, profile.advertiserData.budgetRange.currency)} -{' '}
                      {formatCurrency(profile.advertiserData.budgetRange.max, profile.advertiserData.budgetRange.currency)}
                    </p>
                  </div>
                </div>
              )}

              {profile.advertiserData.preferredCategories && profile.advertiserData.preferredCategories.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Предпочитаемые категории</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.advertiserData.preferredCategories.map((category, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {profile.unifiedAccountInfo.completedDeals}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Завершённых сделок</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {profile.unifiedAccountInfo.totalReviews}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Отзывов</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {profile.unifiedAccountInfo.averageRating > 0
                  ? profile.unifiedAccountInfo.averageRating.toFixed(1)
                  : '—'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Рейтинг</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
