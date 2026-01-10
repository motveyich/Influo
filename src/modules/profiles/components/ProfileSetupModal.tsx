import React, { useState, useEffect } from 'react';
import { UserProfile, SocialMediaLink, InfluencerMetrics, AdvertiserPreferences } from '../../../core/types';
import { profileService } from '../services/profileService';
import { useTranslation } from '../../../hooks/useTranslation';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import {
  X,
  User,
  Briefcase,
  Instagram,
  Youtube,
  Twitter,
  Plus,
  Trash2,
  Save,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AvatarUpload } from '../../../components/AvatarUpload';
import { useAuth } from '../../../hooks/useAuth';

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

  // Basic info state
  const [basicInfo, setBasicInfo] = useState({
    fullName: '',
    email: '',
    bio: '',
    location: '',
    website: '',
    avatar: ''
  });

  // Influencer data state
  const [influencerData, setInfluencerData] = useState({
    socialMediaLinks: [] as SocialMediaLink[],
    metrics: {
      totalFollowers: 0,
      engagementRate: 0,
      averageViews: 0,
      monthlyGrowth: 0
    } as InfluencerMetrics,
    contentCategories: [] as string[],
    availableForCollabs: true,
    pricing: {
      post: 0,
      story: 0,
      reel: 0,
      video: 0
    }
  });

  // Advertiser data state
  const [advertiserData, setAdvertiserData] = useState({
    companyName: '',
    industry: '',
    campaignPreferences: {
      preferredPlatforms: [],
      budgetRange: {
        min: 0,
        max: 0,
        currency: 'USD'
      },
      targetAudience: {
        ageRange: [18, 65] as [number, number],
        genders: [],
        countries: [],
        interests: []
      },
      campaignTypes: []
    } as AdvertiserPreferences,
    previousCampaigns: 0,
    averageBudget: 0
  });

  const [newSocialLink, setNewSocialLink] = useState({
    platform: 'instagram' as const,
    url: '',
    username: ''
  });

  const [newCategory, setNewCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const getPredefinedCategories = () => [
    t('contentCategories.fashionStyle'),
    t('contentCategories.beautyCosmetics'),
    t('contentCategories.lifestyle'),
    t('contentCategories.travelTourism'),
    t('contentCategories.foodCooking'),
    t('contentCategories.fitnessHealth'),
    t('contentCategories.sports'),
    t('contentCategories.techGadgets'),
    t('contentCategories.gamingEsports'),
    t('contentCategories.musicEntertainment'),
    t('contentCategories.artCreativity'),
    t('contentCategories.businessEntrepreneurship'),
    t('contentCategories.educationLearning'),
    t('contentCategories.scienceResearch'),
    t('contentCategories.automotiveTransport'),
    t('contentCategories.realEstateInteriorDesign'),
    t('contentCategories.financeInvestment'),
    t('contentCategories.parentingFamily'),
    t('contentCategories.pets'),
    t('contentCategories.booksLiterature'),
    t('contentCategories.moviesShows'),
    t('contentCategories.photography'),
    t('contentCategories.designArchitecture'),
    t('contentCategories.politicsSociety'),
    t('contentCategories.ecologySustainability'),
    t('contentCategories.psychologyPersonalDevelopment'),
    t('contentCategories.medicineHealthcare'),
    t('contentCategories.humorComedy'),
    t('contentCategories.newsJournalism'),
    t('contentCategories.religionSpirituality'),
  ];

  // Set active tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Initialize form data when modal opens or currentProfile changes
  useEffect(() => {
    // Don't initialize if modal is not open
    if (!isOpen) return;

    console.log('[ProfileSetupModal] 🔄 Initializing form data:', {
      hasCurrentProfile: !!currentProfile,
      currentProfileData: {
        userId: currentProfile?.userId,
        fullName: currentProfile?.fullName,
        email: currentProfile?.email,
        bio: currentProfile?.bio,
        location: currentProfile?.location,
        website: currentProfile?.website,
      },
      userData: {
        userId: user?.id,
        fullName: user?.fullName,
        email: user?.email
      }
    });

    // Initialize basic info
    // Priority: currentProfile > user context > empty
    // Use ?? instead of || to properly handle empty strings
    const newBasicInfo = {
      fullName: currentProfile?.fullName ?? user?.fullName ?? '',
      email: currentProfile?.email ?? user?.email ?? '',
      bio: currentProfile?.bio ?? '',
      location: currentProfile?.location ?? '',
      website: currentProfile?.website ?? '',
      avatar: currentProfile?.avatar ?? ''
    };

    console.log('[ProfileSetupModal] ✅ Setting basicInfo:', {
      fullName: newBasicInfo.fullName,
      bio: newBasicInfo.bio,
      location: newBasicInfo.location,
      website: newBasicInfo.website,
      hasBio: !!newBasicInfo.bio,
      hasLocation: !!newBasicInfo.location,
      hasWebsite: !!newBasicInfo.website,
    });

    setBasicInfo(newBasicInfo);

    // Initialize influencer and advertiser data
    if (currentProfile) {
      if (currentProfile.influencerData) {
        setInfluencerData({
          socialMediaLinks: currentProfile.influencerData.socialMediaLinks || [],
          metrics: currentProfile.influencerData.metrics || {
            totalFollowers: 0,
            engagementRate: 0,
            averageViews: 0,
            monthlyGrowth: 0
          },
          contentCategories: currentProfile.influencerData.contentCategories || [],
          availableForCollabs: currentProfile.influencerData.availableForCollabs ?? true,
          pricing: currentProfile.influencerData.pricing || {
            post: 0,
            story: 0,
            reel: 0,
            video: 0
          }
        });
      }

      if (currentProfile.advertiserData) {
        setAdvertiserData({
          companyName: currentProfile.advertiserData.companyName || '',
          industry: currentProfile.advertiserData.industry || '',
          campaignPreferences: currentProfile.advertiserData.campaignPreferences || {
            preferredPlatforms: [],
            budgetRange: {
              min: 0,
              max: 0,
              currency: 'USD'
            },
            targetAudience: {
              ageRange: [18, 65] as [number, number],
              genders: [],
              countries: [],
              interests: []
            },
            campaignTypes: []
          },
          previousCampaigns: currentProfile.advertiserData.previousCampaigns || 0,
          averageBudget: currentProfile.advertiserData.averageBudget || 0
        });
      }
    } else {
      // Reset influencer and advertiser data when no current profile
      setInfluencerData({
        socialMediaLinks: [],
        metrics: {
          totalFollowers: 0,
          engagementRate: 0,
          averageViews: 0,
          monthlyGrowth: 0
        },
        contentCategories: [],
        availableForCollabs: true,
        pricing: {
          post: 0,
          story: 0,
          reel: 0,
          video: 0
        }
      });
      setAdvertiserData({
        companyName: '',
        industry: '',
        campaignPreferences: {
          preferredPlatforms: [],
          budgetRange: {
            min: 0,
            max: 0,
            currency: 'USD'
          },
          targetAudience: {
            ageRange: [18, 65] as [number, number],
            genders: [],
            countries: [],
            interests: []
          },
          campaignTypes: []
        },
        previousCampaigns: 0,
        averageBudget: 0
      });
    }
  }, [currentProfile, isOpen, user?.id, user?.fullName, user?.email]);

  const validateBasicInfo = () => {
    const newErrors: Record<string, string> = {};

    if (!basicInfo.fullName.trim()) {
      newErrors.fullName = t('profile.validation.fullNameRequired');
    }

    // Email validation removed - field is read-only and comes from auth

    // Bio is optional, but if provided, should have at least 20 characters and max 1500
    if (basicInfo.bio.trim() && basicInfo.bio.length < 20) {
      newErrors.bio = 'Минимум 20 символов для био';
    }
    if (basicInfo.bio.length > 1500) {
      newErrors.bio = 'Максимум 1500 символов для био';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    console.log('[ProfileSetupModal] handleSaveProfile called');
    console.log('[ProfileSetupModal] Current state:', {
      hasCurrentProfile: !!currentProfile,
      currentProfileUserId: currentProfile?.userId,
      userIdFromAuth: user?.id,
      basicInfo,
      activeTab
    });

    // Validate only if editing basic info tab
    // Profile already exists (created during registration), so other tabs can be saved independently
    if (activeTab === 'basic' && !validateBasicInfo()) {
      return;
    }

    if (!user?.id) {
      toast.error(t('profile.errors.noUser'));
      return;
    }

    setIsLoading(true);
    try {
      // Формируем payload ТОЛЬКО для текущей активной вкладки
      let profileData: Partial<UserProfile> = {};

      if (activeTab === 'basic') {
        // Вкладка "Основная информация" - отправляем только основные поля
        const { email, ...basicInfoWithoutEmail } = basicInfo;
        profileData = basicInfoWithoutEmail;

        // DIAGNOSTIC: Log what we're about to send
        console.log('[ProfileSetupModal] 📤 Sending basic info:', {
          fullName: profileData.fullName,
          username: profileData.username,
          phone: profileData.phone,
          bio: profileData.bio,
          location: profileData.location,
          website: profileData.website,
          hasBio: !!profileData.bio,
          hasLocation: !!profileData.location,
          hasWebsite: !!profileData.website,
        });

      } else if (activeTab === 'influencer') {
        // Вкладка "Инфлюенсер" - отправляем ТОЛЬКО influencerData
        profileData = {
          influencerData: influencerData
        };

      } else if (activeTab === 'advertiser') {
        // Вкладка "Рекламодатель" - отправляем ТОЛЬКО advertiserData
        profileData = {
          advertiserData: advertiserData
        };
      }

      console.log('[ProfileSetupModal] Profile data to save (activeTab: ' + activeTab + '):', {
        activeTab,
        dataKeys: Object.keys(profileData),
        hasInfluencerData: !!profileData.influencerData,
        hasAdvertiserData: !!profileData.advertiserData,
        hasBasicFields: !!(profileData.fullName || profileData.bio)
      });

      let savedProfile: UserProfile;

      // For authenticated users, ALWAYS try to update first, then create if not found
      // This ensures we never try to create a duplicate profile
      if (user?.id) {
        try {
          // Try to update the profile first
          console.log('[ProfileSetupModal] Attempting to update profile for user:', user.id);
          savedProfile = await profileService.updateProfile(user.id, profileData);

          // Show tab-specific success message
          const successMessages = {
            basic: 'Основная информация обновлена',
            influencer: 'Настройки инфлюенсера сохранены',
            advertiser: 'Настройки рекламодателя сохранены'
          };
          toast.success(successMessages[activeTab] || t('profile.success.updated'));
        } catch (updateError: any) {
          // If profile not found (404), try to create it
          if (updateError.status === 404 || updateError.statusCode === 404 || updateError.message?.includes('not found')) {
            console.log('[ProfileSetupModal] Profile not found, creating new profile for user:', user.id);
            savedProfile = await profileService.createProfile(profileData);
            toast.success(t('profile.success.created') || 'Профиль успешно создан');
          } else {
            // Re-throw other errors
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

      // Handle specific error cases
      if (error.message?.includes('email is already registered')) {
        setErrors({ email: 'This email is already in use by another account' });
        setActiveTab('basic');
        toast.error('This email is already registered with another account');
      } else if (error.message?.includes('Username already taken')) {
        setErrors({ username: 'This username is already taken' });
        setActiveTab('basic');
        toast.error('This username is already taken. Please choose another one');
      } else if (error.message?.includes('Conflict')) {
        // Conflict error - try to reload profile
        toast.error('Profile update conflict. Refreshing...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else if (error.message?.includes('Profile not found')) {
        // Profile not found during update - try creating instead
        toast.error('Профиль не найден. Попытка создания...');
        try {
          const { email, ...basicInfoWithoutEmail } = basicInfo;
          const profileData: Partial<UserProfile> = {
            userId: user.id,
            ...basicInfoWithoutEmail,
            influencerData: influencerData,
            advertiserData: advertiserData
          };
          const newProfile = await profileService.createProfile(profileData);
          toast.success('Профиль успешно создан');
          onProfileUpdated(newProfile);
          onClose();
          return;
        } catch (createError: any) {
          toast.error('Не удалось создать профиль: ' + (createError.message || 'Неизвестная ошибка'));
        }
      } else {
        toast.error(error.message || t('profile.errors.updateFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const addSocialMediaLink = () => {
    if (!newSocialLink.url.trim()) return;

    const link: SocialMediaLink = {
      platform: newSocialLink.platform,
      url: newSocialLink.url,
      username: newSocialLink.username || undefined,
      verified: false
    };

    setInfluencerData(prev => ({
      ...prev,
      socialMediaLinks: [...prev.socialMediaLinks, link]
    }));

    setNewSocialLink({ platform: 'instagram', url: '', username: '' });
  };

  const removeSocialMediaLink = (index: number) => {
    setInfluencerData(prev => ({
      ...prev,
      socialMediaLinks: prev.socialMediaLinks.filter((_, i) => i !== index)
    }));
  };

  const addContentCategory = () => {
    if (!newCategory.trim()) return;

    // Check if category already exists
    if (influencerData.contentCategories.includes(newCategory.trim())) {
      return;
    }

    setInfluencerData(prev => ({
      ...prev,
      contentCategories: [...prev.contentCategories, newCategory.trim()]
    }));

    setNewCategory('');
    setShowCategoryDropdown(false);
  };

  const addPredefinedCategory = (category: string) => {
    if (influencerData.contentCategories.includes(category)) {
      return;
    }

    setInfluencerData(prev => ({
      ...prev,
      contentCategories: [...prev.contentCategories, category]
    }));

    setShowCategoryDropdown(false);
  };

  const clearBasicInfo = () => {
    setBasicInfo({
      fullName: '',
      email: '',
      bio: '',
      location: '',
      website: '',
      avatar: ''
    });
    setErrors({});
  };

  const clearInfluencerData = () => {
    setInfluencerData({
      socialMediaLinks: [],
      metrics: {
        totalFollowers: 0,
        engagementRate: 0,
        averageViews: 0,
        monthlyGrowth: 0
      },
      contentCategories: [],
      availableForCollabs: true,
      pricing: {
        post: 0,
        story: 0,
        reel: 0,
        video: 0
      }
    });
    // Clear form-specific state
    setNewSocialLink({ platform: 'instagram', url: '', username: '' });
    setNewCategory('');
    setShowCategoryDropdown(false);
    setErrors({});
  };

  const clearAdvertiserData = () => {
    setAdvertiserData({
      companyName: '',
      industry: '',
      campaignPreferences: {
        preferredPlatforms: [],
        budgetRange: {
          min: 0,
          max: 0,
          currency: 'USD'
        },
        targetAudience: {
          ageRange: [18, 65] as [number, number],
          genders: [],
          countries: [],
          interests: []
        },
        campaignTypes: []
      },
      previousCampaigns: 0,
      averageBudget: 0
    });
  };

  const removeContentCategory = (index: number) => {
    setInfluencerData(prev => ({
      ...prev,
      contentCategories: prev.contentCategories.filter((_, i) => i !== index)
    }));
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="w-4 h-4" />;
      case 'youtube':
        return <Youtube className="w-4 h-4" />;
      case 'twitter':
        return <Twitter className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
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

        {/* Tabs */}
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
              <span>{t('profile.basicInfo')}</span>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Section Header with Clear Button */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{t('profile.basicInfo')}</h3>
                <button
                  type="button"
                  onClick={clearBasicInfo}
                  className="text-sm text-red-600 hover:text-red-800 transition-colors"
                >
                  Очистить раздел
                </button>
              </div>

              <div className="mb-8">
                <AvatarUpload
                  userId={currentProfile?.userId || ''}
                  currentAvatarUrl={basicInfo.avatar}
                  fullName={basicInfo.fullName}
                  onAvatarUpdate={(newAvatarUrl) => {
                    setBasicInfo(prev => ({ ...prev, avatar: newAvatarUrl || '' }));
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profile.fields.fullName')} *
                  </label>
                  <input
                    type="text"
                    value={basicInfo.fullName}
                    onChange={(e) => setBasicInfo(prev => ({ ...prev, fullName: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.fullName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder={t('profile.placeholders.fullName')}
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
                    {t('profile.fields.email')} *
                  </label>
                  <input
                    type="email"
                    value={basicInfo.email}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                    placeholder={t('profile.placeholders.email')}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t('profile.emailChangeNote') || 'Email можно изменить только в настройках безопасности'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profile.fields.location')}
                  </label>
                  <input
                    type="text"
                    value={basicInfo.location}
                    onChange={(e) => setBasicInfo(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('profile.placeholders.location')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profile.fields.website')}
                  </label>
                  <input
                    type="url"
                    value={basicInfo.website}
                    onChange={(e) => setBasicInfo(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('profile.placeholders.website')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('profile.fields.bio')} *
                </label>
                <textarea
                  value={basicInfo.bio}
                  onChange={(e) => setBasicInfo(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.bio ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={t('profile.placeholders.bio')}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.bio && (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.bio}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 ml-auto">
                    {basicInfo.bio.length}/1500 символов
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'influencer' && (
            <div className="space-y-6">
              {/* Section Header with Clear Button */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{t('profile.influencerSettings')}</h3>
                <button
                  type="button"
                  onClick={clearInfluencerData}
                  className="text-sm text-red-600 hover:text-red-800 transition-colors"
                >
                  {t('profile.clearSection')}
                </button>
              </div>
              
              {/* Social Media Links */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">{t('profile.socialMediaAccounts')}</h4>
                
                {/* Add new social link */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <select
                      value={newSocialLink.platform}
                      onChange={(e) => setNewSocialLink(prev => ({ ...prev, platform: e.target.value as any }))}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="instagram">Instagram</option>
                      <option value="youtube">YouTube</option>
                      <option value="twitter">Twitter</option>
                      <option value="tiktok">TikTok</option>
                    </select>
                    <input
                      type="text"
                      value={newSocialLink.username}
                      onChange={(e) => setNewSocialLink(prev => ({ ...prev, username: e.target.value }))}
                      placeholder={t('profile.placeholders.socialUsername')}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="url"
                      value={newSocialLink.url}
                      onChange={(e) => setNewSocialLink(prev => ({ ...prev, url: e.target.value }))}
                      placeholder={t('profile.placeholders.socialUrl')}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={addSocialMediaLink}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Existing social links */}
                <div className="space-y-2">
                  {influencerData.socialMediaLinks.map((link, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getSocialIcon(link.platform)}
                        <div>
                          <p className="font-medium text-gray-900 capitalize">{link.platform}</p>
                          <p className="text-sm text-gray-600">{link.username || link.url}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeSocialMediaLink(index)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metrics */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">{t('profile.audienceMetrics')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.fields.totalFollowers')}
                    </label>
                    <input
                      type="number"
                      value={influencerData.metrics.totalFollowers}
                      onChange={(e) => setInfluencerData(prev => ({
                        ...prev,
                        metrics: { ...prev.metrics, totalFollowers: parseInt(e.target.value) || 0 }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="10000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.fields.engagementRate')}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={influencerData.metrics.engagementRate}
                      onChange={(e) => setInfluencerData(prev => ({
                        ...prev,
                        metrics: { ...prev.metrics, engagementRate: parseFloat(e.target.value) || 0 }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="3.5"
                    />
                  </div>
                </div>
              </div>

              {/* Content Categories */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">{t('profile.contentCategories')}</h4>
                
                <div className="mb-4">
                  {/* Predefined categories as buttons */}
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {t('profile.selectCategoriesFromList')}:
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                    {getPredefinedCategories().map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => addPredefinedCategory(category)}
                        disabled={influencerData.contentCategories.includes(category)}
                        className={`px-3 py-2 text-sm rounded-md border transition-colors text-left ${
                          influencerData.contentCategories.includes(category)
                            ? 'bg-blue-100 border-blue-300 text-blue-700 cursor-not-allowed'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  
                  {/* Custom category input */}
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profile.orAddCustomCategory')}:
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder={t('profile.placeholders.category')}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && addContentCategory()}
                    />
                    <button
                      type="button"
                      onClick={addContentCategory}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {influencerData.contentCategories.map((category, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {category}
                      <button
                        type="button"
                        onClick={() => removeContentCategory(index)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advertiser' && (
            <div className="space-y-6">
              {/* Section Header with Clear Button */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{t('profile.advertiserSettings')}</h3>
                <button
                  type="button"
                  onClick={clearAdvertiserData}
                  className="text-sm text-red-600 hover:text-red-800 transition-colors"
                >
                  {t('profile.clearSection')}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profile.fields.organizationName')}
                  </label>
                  <input
                    type="text"
                    value={advertiserData.companyName}
                    onChange={(e) => setAdvertiserData(prev => ({ ...prev, companyName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('profile.placeholders.organizationName')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profile.fields.industry')}
                  </label>
                  <select
                    value={advertiserData.industry}
                    onChange={(e) => setAdvertiserData(prev => ({ ...prev, industry: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Выберите отрасль</option>
                    <option value="fashion">{t('industries.fashion')}</option>
                    <option value="tech">{t('industries.tech')}</option>
                    <option value="food">{t('industries.food')}</option>
                    <option value="travel">{t('industries.travel')}</option>
                    <option value="fitness">{t('industries.fitness')}</option>
                    <option value="lifestyle">{t('industries.lifestyle')}</option>
                    <option value="other">{t('industries.other')}</option>
                  </select>
                </div>
              </div>

              {/* Budget Range */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">{t('profile.budgetRange')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.fields.minBudget')}
                    </label>
                    <input
                      type="number"
                      value={advertiserData.campaignPreferences.budgetRange.min}
                      onChange={(e) => setAdvertiserData(prev => ({
                        ...prev,
                        campaignPreferences: {
                          ...prev.campaignPreferences,
                          budgetRange: {
                            ...prev.campaignPreferences.budgetRange,
                            min: parseInt(e.target.value) || 0
                          }
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.fields.maxBudget')}
                    </label>
                    <input
                      type="number"
                      value={advertiserData.campaignPreferences.budgetRange.max}
                      onChange={(e) => setAdvertiserData(prev => ({
                        ...prev,
                        campaignPreferences: {
                          ...prev.campaignPreferences,
                          budgetRange: {
                            ...prev.campaignPreferences.budgetRange,
                            max: parseInt(e.target.value) || 0
                          }
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="10000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.fields.currency')}
                    </label>
                    <select
                      value={advertiserData.campaignPreferences.budgetRange.currency}
                      onChange={(e) => setAdvertiserData(prev => ({
                        ...prev,
                        campaignPreferences: {
                          ...prev.campaignPreferences,
                          budgetRange: {
                            ...prev.campaignPreferences.budgetRange,
                            currency: e.target.value
                          }
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            {t('common.cancel')}
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