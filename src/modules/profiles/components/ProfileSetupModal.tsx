import React, { useState, useEffect } from 'react';
import { UserProfile, InfluencerProfileData, AdvertiserProfileData, AudienceOverview } from '../../../core/types';
import { profileService } from '../services/profileService';
import { useTranslation } from '../../../hooks/useTranslation';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import {
  X,
  User,
  Briefcase,
  Instagram,
  Save,
  AlertCircle,
  Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AvatarUpload } from '../../../components/AvatarUpload';
import { useAuth } from '../../../hooks/useAuth';
import {
  INFLUENCER_NICHES,
  CONTENT_LANGUAGES,
  BUSINESS_CATEGORIES,
  BRAND_VALUES,
  INTEGRATION_TYPES,
  PAYMENT_POLICIES,
  AUDIENCE_SIZE_RANGES,
  DETAILED_AGE_RANGES,
  COUNTRIES,
  PRODUCT_CATEGORIES
} from '../../../core/constants';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile?: UserProfile | null;
  initialTab?: 'basic' | 'influencer' | 'advertiser';
  onProfileUpdated: (profile: UserProfile) => void;
}

export function ProfileSetupModal({ isOpen, onClose, currentProfile, initialTab = 'basic', onProfileUpdated }: ProfileSetupModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'influencer' | 'advertiser'>(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { t } = useTranslation();
  const { user } = useAuth();

  useBodyScrollLock(isOpen);

  const [basicInfo, setBasicInfo] = useState({
    fullName: '',
    email: '',
    username: '',
    phone: ''
  });

  const [influencerProfile, setInfluencerProfile] = useState<Partial<InfluencerProfileData>>({
    avatar: '',
    nickname: '',
    country: '',
    city: '',
    contentLanguages: [],
    bio: '',
    primaryNiches: [],
    secondaryNiches: [],
    audienceOverview: {
      primaryCountries: [],
      ageRange: {
        min: undefined,
        max: undefined
      },
      genderDistribution: {
        male: undefined,
        female: undefined,
        other: undefined
      }
    },
    preferredBrandCategories: [],
    excludedBrandCategories: [],
    openToLongTermCollabs: true,
    chatEnabled: true
  });

  const [advertiserProfile, setAdvertiserProfile] = useState<Partial<AdvertiserProfileData>>({
    logo: '',
    companyName: '',
    country: '',
    city: '',
    organizationWebsite: '',
    companyDescription: '',
    businessCategories: [],
    brandValues: [],
    typicalIntegrationTypes: [],
    typicalBudgetRange: {
      min: 0,
      max: 0,
      currency: 'USD'
    },
    workWithMicroInfluencers: true,
    paymentPolicies: [],
    giveCreativeFreedom: true
  });

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;

    const newBasicInfo = {
      fullName: currentProfile?.fullName ?? user?.fullName ?? '',
      email: currentProfile?.email ?? user?.email ?? '',
      username: currentProfile?.username ?? '',
      phone: currentProfile?.phone ?? ''
    };

    setBasicInfo(newBasicInfo);

    if (currentProfile?.influencerProfile) {
      setInfluencerProfile({
        avatar: currentProfile.influencerProfile.avatar ?? '',
        nickname: currentProfile.influencerProfile.nickname ?? '',
        country: currentProfile.influencerProfile.country ?? '',
        city: currentProfile.influencerProfile.city ?? '',
        contentLanguages: currentProfile.influencerProfile.contentLanguages ?? [],
        bio: currentProfile.influencerProfile.bio ?? '',
        primaryNiches: currentProfile.influencerProfile.primaryNiches ?? [],
        secondaryNiches: currentProfile.influencerProfile.secondaryNiches ?? [],
        audienceOverview: currentProfile.influencerProfile.audienceOverview ?? {
          primaryCountries: [],
          ageRange: {
            min: undefined,
            max: undefined
          },
          genderDistribution: {
            male: undefined,
            female: undefined,
            other: undefined
          }
        },
        preferredBrandCategories: currentProfile.influencerProfile.preferredBrandCategories ?? [],
        excludedBrandCategories: currentProfile.influencerProfile.excludedBrandCategories ?? [],
        openToLongTermCollabs: currentProfile.influencerProfile.openToLongTermCollabs ?? true,
        chatEnabled: currentProfile.influencerProfile.chatEnabled ?? true
      });
    } else {
      setInfluencerProfile({
        avatar: '',
        nickname: '',
        country: '',
        city: '',
        contentLanguages: [],
        bio: '',
        primaryNiches: [],
        secondaryNiches: [],
        audienceOverview: {
          primaryCountries: [],
          ageRange: {
            min: undefined,
            max: undefined
          },
          genderDistribution: {
            male: undefined,
            female: undefined,
            other: undefined
          }
        },
        preferredBrandCategories: [],
        excludedBrandCategories: [],
        openToLongTermCollabs: true,
        chatEnabled: true
      });
    }

    if (currentProfile?.advertiserProfile) {
      setAdvertiserProfile({
        logo: currentProfile.advertiserProfile.logo ?? '',
        companyName: currentProfile.advertiserProfile.companyName ?? '',
        country: currentProfile.advertiserProfile.country ?? '',
        city: currentProfile.advertiserProfile.city ?? '',
        organizationWebsite: currentProfile.advertiserProfile.organizationWebsite ?? '',
        companyDescription: currentProfile.advertiserProfile.companyDescription ?? '',
        businessCategories: currentProfile.advertiserProfile.businessCategories ?? [],
        brandValues: currentProfile.advertiserProfile.brandValues ?? [],
        typicalIntegrationTypes: currentProfile.advertiserProfile.typicalIntegrationTypes ?? [],
        typicalBudgetRange: currentProfile.advertiserProfile.typicalBudgetRange ?? {
          min: 0,
          max: 0,
          currency: 'USD'
        },
        workWithMicroInfluencers: currentProfile.advertiserProfile.workWithMicroInfluencers ?? true,
        paymentPolicies: currentProfile.advertiserProfile.paymentPolicies ?? [],
        giveCreativeFreedom: currentProfile.advertiserProfile.giveCreativeFreedom ?? true
      });
    } else {
      setAdvertiserProfile({
        logo: '',
        companyName: '',
        country: '',
        city: '',
        organizationWebsite: '',
        companyDescription: '',
        businessCategories: [],
        brandValues: [],
        typicalIntegrationTypes: [],
        typicalBudgetRange: {
          min: 0,
          max: 0,
          currency: 'USD'
        },
        workWithMicroInfluencers: true,
        paymentPolicies: [],
        giveCreativeFreedom: true
      });
    }
  }, [currentProfile, isOpen, user?.id, user?.fullName, user?.email]);

  const validateBasicInfo = () => {
    const newErrors: Record<string, string> = {};

    if (!basicInfo.fullName.trim()) {
      newErrors.fullName = t('profile.validation.fullNameRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateInfluencerProfile = () => {
    const newErrors: Record<string, string> = {};

    if (influencerProfile.bio && (influencerProfile.bio.length < 100 || influencerProfile.bio.length > 500)) {
      newErrors.bio = 'Био должно содержать от 100 до 500 символов';
    }

    if (influencerProfile.primaryNiches && influencerProfile.primaryNiches.length === 0) {
      newErrors.primaryNiches = 'Выберите хотя бы одну основную нишу';
    }

    if (influencerProfile.contentLanguages && influencerProfile.contentLanguages.length === 0) {
      newErrors.contentLanguages = 'Выберите хотя бы один язык контента';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAdvertiserProfile = () => {
    const newErrors: Record<string, string> = {};

    if (!advertiserProfile.companyName?.trim()) {
      newErrors.companyName = 'Укажите название организации';
    }

    if (advertiserProfile.companyDescription && advertiserProfile.companyDescription.length < 100) {
      newErrors.companyDescription = 'Описание должно содержать минимум 100 символов';
    }

    if (advertiserProfile.businessCategories && advertiserProfile.businessCategories.length === 0) {
      newErrors.businessCategories = 'Выберите хотя бы одну категорию бизнеса';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    let isValid = true;

    if (activeTab === 'basic') {
      isValid = validateBasicInfo();
    } else if (activeTab === 'influencer') {
      isValid = validateInfluencerProfile();
    } else if (activeTab === 'advertiser') {
      isValid = validateAdvertiserProfile();
    }

    if (!isValid) return;

    if (!user?.id) {
      toast.error(t('profile.errors.noUser'));
      return;
    }

    setIsLoading(true);
    try {
      let profileData: Partial<UserProfile> = {};

      if (activeTab === 'basic') {
        const { email, ...basicInfoWithoutEmail } = basicInfo;
        profileData = basicInfoWithoutEmail;
      } else if (activeTab === 'influencer') {
        profileData = {
          influencerProfile: influencerProfile as InfluencerProfileData
        };
      } else if (activeTab === 'advertiser') {
        profileData = {
          advertiserProfile: advertiserProfile as AdvertiserProfileData
        };
      }

      let savedProfile: UserProfile;

      if (user?.id) {
        try {
          savedProfile = await profileService.updateProfile(user.id, profileData);

          const successMessages = {
            basic: 'Основная информация обновлена',
            influencer: 'Настройки инфлюенсера сохранены',
            advertiser: 'Настройки рекламодателя сохранены'
          };
          toast.success(successMessages[activeTab] || t('profile.success.updated'));
        } catch (updateError: any) {
          if (updateError.status === 404 || updateError.statusCode === 404 || updateError.message?.includes('not found')) {
            savedProfile = await profileService.createProfile(profileData);
            toast.success(t('profile.success.created') || 'Профиль успешно создан');
          } else {
            throw updateError;
          }
        }
      } else {
        throw new Error('User ID is required');
      }

      onProfileUpdated(savedProfile);
      onClose();
    } catch (error: any) {
      console.error('Failed to save profile:', error);

      if (error.message?.includes('email is already registered')) {
        setErrors({ email: 'This email is already in use by another account' });
        setActiveTab('basic');
        toast.error('This email is already registered with another account');
      } else if (error.message?.includes('Username already taken')) {
        setErrors({ username: 'This username is already taken' });
        setActiveTab('basic');
        toast.error('This username is already taken. Please choose another one');
      } else {
        toast.error(error.message || t('profile.errors.updateFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string, maxItems?: number) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    } else {
      if (maxItems && array.length >= maxItems) {
        toast.error(`Максимум ${maxItems} элементов`);
        return array;
      }
      return [...array, item];
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentProfile ? t('profile.editProfile') : t('profile.completeProfile')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('basic')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Основная информация</span>
            </button>

            <button
              onClick={() => setActiveTab('influencer')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'influencer'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Instagram className="w-4 h-4" />
              <span>Инфлюенсер</span>
            </button>

            <button
              onClick={() => setActiveTab('advertiser')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'advertiser'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Рекламодатель</span>
            </button>
          </nav>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Основная информация</h3>

              <div className="mb-8">
                <AvatarUpload
                  userId={currentProfile?.userId || ''}
                  currentAvatarUrl={basicInfo.fullName}
                  fullName={basicInfo.fullName}
                  onAvatarUpdate={(newAvatarUrl) => {
                    setBasicInfo(prev => ({ ...prev, avatar: newAvatarUrl || '' }));
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Полное имя *
                  </label>
                  <input
                    type="text"
                    value={basicInfo.fullName}
                    onChange={(e) => setBasicInfo(prev => ({ ...prev, fullName: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.fullName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Иван Иванов"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={basicInfo.email}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Email можно изменить только в настройках безопасности
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Никнейм
                  </label>
                  <input
                    type="text"
                    value={basicInfo.username}
                    onChange={(e) => setBasicInfo(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="@username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    value={basicInfo.phone}
                    onChange={(e) => setBasicInfo(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'influencer' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Настройки инфлюенсера</h3>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Аватар профиля
                </label>
                <AvatarUpload
                  userId={currentProfile?.userId || ''}
                  currentAvatarUrl={influencerProfile.avatar}
                  fullName={basicInfo.fullName}
                  onAvatarUpdate={(newAvatarUrl) => {
                    setInfluencerProfile(prev => ({ ...prev, avatar: newAvatarUrl || '' }));
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Никнейм
                  </label>
                  <input
                    type="text"
                    value={influencerProfile.nickname}
                    onChange={(e) => setInfluencerProfile(prev => ({ ...prev, nickname: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ваш никнейм"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Страна
                  </label>
                  <select
                    value={influencerProfile.country}
                    onChange={(e) => setInfluencerProfile(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Выберите страну</option>
                    {COUNTRIES.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Город
                  </label>
                  <input
                    type="text"
                    value={influencerProfile.city}
                    onChange={(e) => setInfluencerProfile(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Москва"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Био (100-500 символов) *
                </label>
                <textarea
                  value={influencerProfile.bio}
                  onChange={(e) => setInfluencerProfile(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.bio ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Расскажите о себе как о контент-мейкере..."
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.bio && (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.bio}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 ml-auto">
                    {(influencerProfile.bio?.length || 0)}/500 символов
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Языки контента *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {CONTENT_LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        const current = influencerProfile.contentLanguages || [];
                        setInfluencerProfile(prev => ({
                          ...prev,
                          contentLanguages: toggleArrayItem(current, lang)
                        }));
                      }}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        influencerProfile.contentLanguages?.includes(lang)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                {errors.contentLanguages && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.contentLanguages}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Основные ниши (максимум 5) *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {INFLUENCER_NICHES.map((niche) => (
                    <button
                      key={niche}
                      type="button"
                      onClick={() => {
                        const current = influencerProfile.primaryNiches || [];
                        setInfluencerProfile(prev => ({
                          ...prev,
                          primaryNiches: toggleArrayItem(current, niche, 5)
                        }));
                      }}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        influencerProfile.primaryNiches?.includes(niche)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
                      }`}
                    >
                      {niche}
                    </button>
                  ))}
                </div>
                {errors.primaryNiches && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.primaryNiches}
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Обзор аудитории</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Основная страна
                    </label>
                    <select
                      value={influencerProfile.audienceOverview?.primaryCountry}
                      onChange={(e) => setInfluencerProfile(prev => ({
                        ...prev,
                        audienceOverview: {
                          ...prev.audienceOverview,
                          primaryCountry: e.target.value,
                          primaryAgeRange: prev.audienceOverview?.primaryAgeRange || '',
                          primaryGender: prev.audienceOverview?.primaryGender || '',
                          sizeRange: prev.audienceOverview?.sizeRange || '',
                          description: prev.audienceOverview?.description || ''
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Выберите страну</option>
                      {COUNTRIES.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Основная возрастная группа
                    </label>
                    <select
                      value={influencerProfile.audienceOverview?.primaryAgeRange}
                      onChange={(e) => setInfluencerProfile(prev => ({
                        ...prev,
                        audienceOverview: {
                          ...prev.audienceOverview,
                          primaryCountry: prev.audienceOverview?.primaryCountry || '',
                          primaryAgeRange: e.target.value,
                          primaryGender: prev.audienceOverview?.primaryGender || '',
                          sizeRange: prev.audienceOverview?.sizeRange || '',
                          description: prev.audienceOverview?.description || ''
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Выберите возраст</option>
                      {DETAILED_AGE_RANGES.map(range => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Основной пол
                    </label>
                    <select
                      value={influencerProfile.audienceOverview?.primaryGender}
                      onChange={(e) => setInfluencerProfile(prev => ({
                        ...prev,
                        audienceOverview: {
                          ...prev.audienceOverview,
                          primaryCountry: prev.audienceOverview?.primaryCountry || '',
                          primaryAgeRange: prev.audienceOverview?.primaryAgeRange || '',
                          primaryGender: e.target.value,
                          sizeRange: prev.audienceOverview?.sizeRange || '',
                          description: prev.audienceOverview?.description || ''
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Выберите пол</option>
                      <option value="Мужской">Мужской</option>
                      <option value="Женский">Женский</option>
                      <option value="Смешанный">Смешанный</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Размер аудитории
                    </label>
                    <select
                      value={influencerProfile.audienceOverview?.sizeRange}
                      onChange={(e) => setInfluencerProfile(prev => ({
                        ...prev,
                        audienceOverview: {
                          ...prev.audienceOverview,
                          primaryCountry: prev.audienceOverview?.primaryCountry || '',
                          primaryAgeRange: prev.audienceOverview?.primaryAgeRange || '',
                          primaryGender: prev.audienceOverview?.primaryGender || '',
                          sizeRange: e.target.value,
                          description: prev.audienceOverview?.description || ''
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Выберите размер</option>
                      {AUDIENCE_SIZE_RANGES.map(range => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Описание аудитории
                    </label>
                    <textarea
                      value={influencerProfile.audienceOverview?.description}
                      onChange={(e) => setInfluencerProfile(prev => ({
                        ...prev,
                        audienceOverview: {
                          ...prev.audienceOverview,
                          primaryCountry: prev.audienceOverview?.primaryCountry || '',
                          primaryAgeRange: prev.audienceOverview?.primaryAgeRange || '',
                          primaryGender: prev.audienceOverview?.primaryGender || '',
                          sizeRange: prev.audienceOverview?.sizeRange || '',
                          description: e.target.value
                        }
                      }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Общая характеристика вашей аудитории"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Предпочитаемые категории брендов
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {PRODUCT_CATEGORIES.slice(0, 30).map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        const current = influencerProfile.preferredBrandCategories || [];
                        setInfluencerProfile(prev => ({
                          ...prev,
                          preferredBrandCategories: toggleArrayItem(current, category)
                        }));
                      }}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors text-left ${
                        influencerProfile.preferredBrandCategories?.includes(category)
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-green-50 hover:border-green-300'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={influencerProfile.openToLongTermCollabs}
                    onChange={(e) => setInfluencerProfile(prev => ({
                      ...prev,
                      openToLongTermCollabs: e.target.checked
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Открыт к долгосрочным коллаборациям</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'advertiser' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Настройки рекламодателя</h3>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Логотип компании
                </label>
                <AvatarUpload
                  userId={currentProfile?.userId || ''}
                  currentAvatarUrl={advertiserProfile.logo}
                  fullName={advertiserProfile.companyName || 'Company'}
                  onAvatarUpdate={(newLogoUrl) => {
                    setAdvertiserProfile(prev => ({ ...prev, logo: newLogoUrl || '' }));
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название организации *
                  </label>
                  <input
                    type="text"
                    value={advertiserProfile.companyName}
                    onChange={(e) => setAdvertiserProfile(prev => ({ ...prev, companyName: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.companyName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="ООО Инфлюо"
                  />
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.companyName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Страна
                  </label>
                  <select
                    value={advertiserProfile.country}
                    onChange={(e) => setAdvertiserProfile(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Выберите страну</option>
                    {COUNTRIES.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Город
                  </label>
                  <input
                    type="text"
                    value={advertiserProfile.city}
                    onChange={(e) => setAdvertiserProfile(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Москва"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Веб-сайт
                  </label>
                  <input
                    type="url"
                    value={advertiserProfile.organizationWebsite}
                    onChange={(e) => setAdvertiserProfile(prev => ({ ...prev, organizationWebsite: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание компании (минимум 100 символов) *
                </label>
                <textarea
                  value={advertiserProfile.companyDescription}
                  onChange={(e) => setAdvertiserProfile(prev => ({ ...prev, companyDescription: e.target.value }))}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.companyDescription ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Расскажите о вашей компании и продуктах..."
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.companyDescription && (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.companyDescription}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 ml-auto">
                    {(advertiserProfile.companyDescription?.length || 0)}/1000 символов
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Категории бизнеса (1-3) *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {BUSINESS_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        const current = advertiserProfile.businessCategories || [];
                        setAdvertiserProfile(prev => ({
                          ...prev,
                          businessCategories: toggleArrayItem(current, category, 3)
                        }));
                      }}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors text-left ${
                        advertiserProfile.businessCategories?.includes(category)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                {errors.businessCategories && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.businessCategories}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Ценности бренда
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {BRAND_VALUES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        const current = advertiserProfile.brandValues || [];
                        setAdvertiserProfile(prev => ({
                          ...prev,
                          brandValues: toggleArrayItem(current, value)
                        }));
                      }}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        advertiserProfile.brandValues?.includes(value)
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-purple-50 hover:border-purple-300'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Типичные типы интеграций
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {INTEGRATION_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        const current = advertiserProfile.typicalIntegrationTypes || [];
                        setAdvertiserProfile(prev => ({
                          ...prev,
                          typicalIntegrationTypes: toggleArrayItem(current, type)
                        }));
                      }}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors text-left ${
                        advertiserProfile.typicalIntegrationTypes?.includes(type)
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-green-50 hover:border-green-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Политики оплаты
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {PAYMENT_POLICIES.map((policy) => (
                    <button
                      key={policy}
                      type="button"
                      onClick={() => {
                        const current = advertiserProfile.paymentPolicies || [];
                        setAdvertiserProfile(prev => ({
                          ...prev,
                          paymentPolicies: toggleArrayItem(current, policy)
                        }));
                      }}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors text-left ${
                        advertiserProfile.paymentPolicies?.includes(policy)
                          ? 'bg-orange-600 border-orange-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-orange-50 hover:border-orange-300'
                      }`}
                    >
                      {policy}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Типичный диапазон бюджета (необязательно)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Минимальный бюджет
                    </label>
                    <input
                      type="number"
                      value={advertiserProfile.typicalBudgetRange?.min}
                      onChange={(e) => setAdvertiserProfile(prev => ({
                        ...prev,
                        typicalBudgetRange: {
                          ...prev.typicalBudgetRange,
                          min: parseInt(e.target.value) || 0,
                          max: prev.typicalBudgetRange?.max || 0,
                          currency: prev.typicalBudgetRange?.currency || 'USD'
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Максимальный бюджет
                    </label>
                    <input
                      type="number"
                      value={advertiserProfile.typicalBudgetRange?.max}
                      onChange={(e) => setAdvertiserProfile(prev => ({
                        ...prev,
                        typicalBudgetRange: {
                          ...prev.typicalBudgetRange,
                          min: prev.typicalBudgetRange?.min || 0,
                          max: parseInt(e.target.value) || 0,
                          currency: prev.typicalBudgetRange?.currency || 'USD'
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Валюта
                    </label>
                    <select
                      value={advertiserProfile.typicalBudgetRange?.currency}
                      onChange={(e) => setAdvertiserProfile(prev => ({
                        ...prev,
                        typicalBudgetRange: {
                          ...prev.typicalBudgetRange,
                          min: prev.typicalBudgetRange?.min || 0,
                          max: prev.typicalBudgetRange?.max || 0,
                          currency: e.target.value
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="RUB">RUB</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={advertiserProfile.workWithMicroInfluencers}
                    onChange={(e) => setAdvertiserProfile(prev => ({
                      ...prev,
                      workWithMicroInfluencers: e.target.checked
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Работаем с микро-инфлюенсерами</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={advertiserProfile.giveCreativeFreedom}
                    onChange={(e) => setAdvertiserProfile(prev => ({
                      ...prev,
                      giveCreativeFreedom: e.target.checked
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Даём творческую свободу</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSaveProfile}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Сохранение...' : 'Сохранить профиль'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
