import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../../core/types';
import { ProfileCompletionBanner } from './ProfileCompletionBanner';
import { useProfileCompletion } from '../hooks/useProfileCompletion';
import { useAuth } from '../../../hooks/useAuth';
import { profileService } from '../services/profileService';
import { 
  User, 
  Instagram, 
  Briefcase, 
  Shield, 
  Bell, 
  LogOut, 
  Save,
  Camera,
  Star,
  CheckCircle,
  Clock,
  MessageCircle,
  Trash2,
  AlertCircle,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export function ProfilesPage() {
  const [activeTab, setActiveTab] = useState<'basic' | 'influencer' | 'advertiser' | 'security' | 'notifications'>('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearSection, setClearSection] = useState<'basic' | 'influencer' | 'advertiser' | null>(null);
  
  const { user, loading, signOut } = useAuth();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile, updateProfile, refresh } = useProfileCompletion(currentUserId);

  // Basic info state
  const [basicInfo, setBasicInfo] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    website: ''
  });

  // Influencer data state
  const [influencerData, setInfluencerData] = useState({
    mainSocialLink: '',
    category: '',
    platformName: '',
    platformLink: '',
    audienceDescription: '',
    portfolioLink: ''
  });

  // Advertiser data state
  const [advertiserData, setAdvertiserData] = useState({
    companyName: '',
    companyWebsite: '',
    companyDescription: '',
    portfolioLink: ''
  });

  // Load profile data into form
  useEffect(() => {
    // Initialize email from auth user if profile doesn't exist yet
    if (user?.email && !currentUserProfile) {
      setBasicInfo(prev => ({
        ...prev,
        email: user.email || ''
      }));
    }
    
    if (currentUserProfile) {
      setBasicInfo({
        fullName: currentUserProfile.fullName || '',
        username: currentUserProfile.fullName?.toLowerCase().replace(/\s+/g, '') || '',
        email: currentUserProfile.email || user?.email || '',
        phone: currentUserProfile.phone || '',
        location: currentUserProfile.location || '',
        bio: currentUserProfile.bio || '',
        website: currentUserProfile.website || ''
      });

      // Load influencer data
      if (currentUserProfile.influencerData) {
        const socialLinks = currentUserProfile.influencerData.socialMediaLinks || [];
        const mainLink = socialLinks.length > 0 ? socialLinks[0].url : '';
        const categories = currentUserProfile.influencerData.contentCategories || [];
        
        setInfluencerData({
          mainSocialLink: mainLink,
          category: categories.length > 0 ? categories[0] : '',
          platformName: influencerData.platformName || '',
          platformLink: mainLink,
          audienceDescription: influencerData.audienceDescription || '',
          portfolioLink: influencerData.portfolioLink || ''
        });
      } else {
        setInfluencerData({
          mainSocialLink: '',
          category: '',
          platformName: '',
          platformLink: '',
          audienceDescription: '',
          portfolioLink: ''
        });
      }

      // Load advertiser data
      if (currentUserProfile.advertiserData) {
        setAdvertiserData({
          companyName: currentUserProfile.advertiserData.companyName || '',
          companyWebsite: currentUserProfile.website || '',
          companyDescription: advertiserData.companyDescription || '',
          portfolioLink: advertiserData.portfolioLink || ''
        });
      } else {
        setAdvertiserData({
          companyName: '',
          companyWebsite: '',
          companyDescription: '',
          portfolioLink: ''
        });
      }
    }
  }, [currentUserProfile, user?.email]);

  const handleSaveBasicInfo = async () => {
    setIsLoading(true);
    try {
      // Validate required fields
      if (!basicInfo.fullName.trim()) {
        toast.error('Полное имя обязательно для заполнения');
        setIsLoading(false);
        return;
      }
      if (!basicInfo.username.trim()) {
        toast.error('Имя пользователя обязательно для заполнения');
        setIsLoading(false);
        return;
      }
      if (!basicInfo.phone.trim()) {
        toast.error('Телефон обязателен для заполнения');
        setIsLoading(false);
        return;
      }
      if (!basicInfo.location.trim()) {
        toast.error('Город/страна обязательны для заполнения');
        setIsLoading(false);
        return;
      }
      if (!basicInfo.bio.trim() || basicInfo.bio.trim().length < 50) {
        toast.error('Описание "О себе" должно содержать минимум 50 символов');
        setIsLoading(false);
        return;
      }

      // If no profile exists, create one
      if (!currentUserProfile) {
        await profileService.createProfile({
          userId: currentUserId,
          email: basicInfo.email || user?.email || '',
          fullName: basicInfo.fullName,
          phone: basicInfo.phone,
          location: basicInfo.location,
          bio: basicInfo.bio,
          website: basicInfo.website,
          userType: 'influencer'
        });
      } else {
        await updateProfile({
          fullName: basicInfo.fullName,
          email: basicInfo.email,
          phone: basicInfo.phone,
          location: basicInfo.location,
          bio: basicInfo.bio,
          website: basicInfo.website
        });
      }
      await refresh(); // Refresh profile data after save
      toast.success('Основная информация сохранена');
    } catch (error: any) {
      console.error('Failed to save basic info:', error);
      toast.error('Не удалось сохранить изменения');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveInfluencer = async () => {
    setIsLoading(true);
    try {
      const influencerProfileData = {
        influencerData: {
          mainSocialLink: influencerData.mainSocialLink,
          category: influencerData.category,
          platformName: influencerData.platformName,
          platformLink: influencerData.platformLink,
          audienceDescription: influencerData.audienceDescription,
          portfolioLink: influencerData.portfolioLink,
          socialMediaLinks: influencerData.mainSocialLink ? [{
            platform: 'instagram' as const,
            url: influencerData.mainSocialLink,
            username: '',
            verified: false
          }] : [],
          metrics: {
            totalFollowers: 0,
            engagementRate: 0,
            averageViews: 0,
            monthlyGrowth: 0
          },
          contentCategories: influencerData.category ? [influencerData.category] : [],
          availableForCollabs: true,
          responseTime: '24 hours',
          pricing: {
            post: 0,
            story: 0,
            reel: 0,
            video: 0
          }
        },
        // Also save any additional fields from the form
        website: influencerData.portfolioLink || basicInfo.website
      };

      // If no profile exists, create one first
      if (!currentUserProfile) {
        await profileService.createProfile({
          userId: currentUserId,
          email: basicInfo.email || user?.email || '',
          fullName: basicInfo.fullName || 'Пользователь',
          userType: 'influencer',
          ...influencerProfileData
        });
      } else {
        await updateProfile(influencerProfileData);
      }
      await refresh(); // Refresh profile data after save
      toast.success('Настройки инфлюенсера сохранены');
    } catch (error: any) {
      console.error('Failed to save influencer data:', error);
      toast.error('Не удалось сохранить настройки инфлюенсера');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAdvertiser = async () => {
    setIsLoading(true);
    try {
      const advertiserProfileData = {
        advertiserData: {
          companyName: advertiserData.companyName,
          companyWebsite: advertiserData.companyWebsite,
          companyDescription: advertiserData.companyDescription,
          portfolioLink: advertiserData.portfolioLink,
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
        },
        website: advertiserData.companyWebsite
      };

      // If no profile exists, create one first
      if (!currentUserProfile) {
        await profileService.createProfile({
          userId: currentUserId,
          email: basicInfo.email || user?.email || '',
          fullName: basicInfo.fullName || 'Пользователь',
          userType: 'advertiser',
          ...advertiserProfileData
        });
      } else {
        await updateProfile(advertiserProfileData);
      }
      await refresh(); // Refresh profile data after save
      toast.success('Настройки рекламодателя сохранены');
    } catch (error: any) {
      console.error('Failed to save advertiser data:', error);
      toast.error('Не удалось сохранить настройки рекламодателя');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Не удалось выйти из системы');
    } else {
      toast.success('Вы успешно вышли из системы');
    }
  };

  const handleClearSection = (section: 'basic' | 'influencer' | 'advertiser') => {
    setClearSection(section);
    setShowClearModal(true);
  };

  const confirmClear = () => {
    if (clearSection === 'basic') {
      setBasicInfo({
        fullName: '',
        username: '',
        email: basicInfo.email, // Keep email for security
        phone: '',
        location: '',
        bio: '',
        website: ''
      });
    } else if (clearSection === 'influencer') {
      setInfluencerData({
        mainSocialLink: '',
        category: '',
        platformName: '',
        platformLink: '',
        audienceDescription: '',
        portfolioLink: ''
      });
    } else if (clearSection === 'advertiser') {
      setAdvertiserData({
        companyName: '',
        companyWebsite: '',
        companyDescription: '',
        portfolioLink: ''
      });
    }
    
    setShowClearModal(false);
    setClearSection(null);
    toast.success(`Раздел "${clearSection === 'basic' ? 'Основная информация' : clearSection === 'influencer' ? 'Инфлюенсер' : 'Рекламодатель'}" очищен`);
  };

  const getAccountStats = () => {
    if (!currentUserProfile) return { rating: 0, deals: 0, applications: 0, responseTime: 0 };
    
    return {
      rating: 4.8,
      deals: 12,
      applications: 24,
      responseTime: 2.5
    };
  };

  const stats = getAccountStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Profile Completion Banner */}
      {currentUserProfile && !currentUserProfile.profileCompletion.overallComplete && (
        <ProfileCompletionBanner
          profile={currentUserProfile}
          onCompleteProfile={() => {/* Banner will handle navigation */}}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Настройки профиля</h1>
          <p className="mt-1 text-sm text-gray-600">Управляйте своим профилем и настройками аккаунта</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Avatar and Basic Info */}
            <div className="text-center mb-6">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  {currentUserProfile?.avatar ? (
                    <img 
                      src={currentUserProfile.avatar} 
                      alt={currentUserProfile.fullName}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-2xl">
                      {currentUserProfile?.fullName?.charAt(0).toUpperCase() || 'M'}
                    </span>
                  )}
                </div>
                <button className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md border border-gray-200 hover:bg-gray-50 transition-colors">
                  <Camera className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                {currentUserProfile?.fullName || 'Мото'}
              </h2>
              <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full mb-2">
                Инфлюенсер
              </span>
              <p className="text-sm text-gray-600">{currentUserProfile?.email}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-lg font-semibold text-gray-900">{stats.rating}</span>
                </div>
                <p className="text-xs text-gray-600">Рейтинг аккаунта</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-lg font-semibold text-gray-900">{stats.deals}</span>
                </div>
                <p className="text-xs text-gray-600">Успешные сделки</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-lg font-semibold text-gray-900">{stats.applications}</span>
                </div>
                <p className="text-xs text-gray-600">Всего заявок</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-lg font-semibold text-gray-900">{stats.responseTime} ч</span>
                </div>
                <p className="text-xs text-gray-600">Среднее время ответа</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('basic')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'basic'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Основная информация</span>
              </button>
              
              <button
                onClick={() => setActiveTab('influencer')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'influencer'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Instagram className="w-4 h-4" />
                <span>Инфлюенсер</span>
              </button>
              
              <button
                onClick={() => setActiveTab('advertiser')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'advertiser'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Рекламодатель</span>
              </button>
              
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'security'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Безопасность</span>
              </button>
              
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'notifications'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>Уведомления</span>
              </button>
              
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Выйти</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Основная информация</h3>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleClearSection('basic')}
                      className="text-red-600 hover:text-red-800 px-3 py-1 text-sm font-medium transition-colors"
                    >
                      Очистить раздел
                    </button>
                    <button
                      onClick={handleSaveBasicInfo}
                      disabled={isLoading}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isLoading ? 'Сохранение...' : 'Сохранить'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Profile Photo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Фото профиля
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-xl">
                          {currentUserProfile?.fullName?.charAt(0).toUpperCase() || 'M'}
                        </span>
                      </div>
                      <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2">
                        <Camera className="w-4 h-4" />
                        <span>Изменить фото</span>
                      </button>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Полное имя *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          value={basicInfo.fullName}
                          onChange={(e) => setBasicInfo(prev => ({ ...prev, fullName: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Введите ваше полное имя"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Имя пользователя (ник) *
                      </label>
                      <input
                        type="text"
                        value={basicInfo.username}
                        onChange={(e) => setBasicInfo(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="мото_блогер"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={basicInfo.email}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                        placeholder="email@example.com"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email нельзя изменить</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Телефон *
                      </label>
                      <input
                        type="tel"
                        value={basicInfo.phone}
                        onChange={(e) => setBasicInfo(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Город/страна *
                      </label>
                      <input
                        type="text"
                        value={basicInfo.location}
                        onChange={(e) => setBasicInfo(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Москва, Россия"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Веб-сайт
                      </label>
                      <input
                        type="url"
                        value={basicInfo.website}
                        onChange={(e) => setBasicInfo(prev => ({ ...prev, website: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      О себе *
                    </label>
                    <textarea
                      value={basicInfo.bio}
                      onChange={(e) => setBasicInfo(prev => ({ ...prev, bio: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Расскажите о себе..."
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {basicInfo.bio.length}/500 символов (минимум 50)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Influencer Tab */}
            {activeTab === 'influencer' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Настройки инфлюенсера</h3>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleClearSection('influencer')}
                      className="text-red-600 hover:text-red-800 px-3 py-1 text-sm font-medium transition-colors"
                    >
                      Очистить раздел
                    </button>
                    <button
                      onClick={handleSaveInfluencer}
                      disabled={isLoading}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isLoading ? 'Сохранение...' : 'Сохранить'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ссылка на основную соцсеть/блог
                      </label>
                      <input
                        type="url"
                        value={influencerData.mainSocialLink}
                        onChange={(e) => setInfluencerData(prev => ({ ...prev, mainSocialLink: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="https://instagram.com/username"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Основная категория/тематика
                      </label>
                      <select
                        value={influencerData.category}
                        onChange={(e) => setInfluencerData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Выберите категорию</option>
                        <option value="fashion">Мода и стиль</option>
                        <option value="beauty">Красота и косметика</option>
                        <option value="lifestyle">Образ жизни</option>
                        <option value="travel">Путешествия</option>
                        <option value="food">Еда и кулинария</option>
                        <option value="fitness">Фитнес и здоровье</option>
                        <option value="tech">Технологии</option>
                        <option value="gaming">Игры</option>
                        <option value="music">Музыка</option>
                        <option value="art">Искусство</option>
                        <option value="business">Бизнес</option>
                        <option value="education">Образование</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Название площадки
                      </label>
                      <input
                        type="text"
                        value={influencerData.platformName}
                        onChange={(e) => setInfluencerData(prev => ({ ...prev, platformName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Название канала/блога"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ссылка на площадку
                      </label>
                      <input
                        type="url"
                        value={influencerData.platformLink}
                        onChange={(e) => setInfluencerData(prev => ({ ...prev, platformLink: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Краткое описание аудитории (по желанию)
                    </label>
                    <textarea
                      value={influencerData.audienceDescription}
                      onChange={(e) => setInfluencerData(prev => ({ ...prev, audienceDescription: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Опишите вашу аудиторию: возраст, интересы, география..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ссылка на портфолио/кейсы (опционально)
                    </label>
                    <input
                      type="url"
                      value={influencerData.portfolioLink}
                      onChange={(e) => setInfluencerData(prev => ({ ...prev, portfolioLink: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="https://portfolio.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Advertiser Tab */}
            {activeTab === 'advertiser' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Настройки рекламодателя</h3>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleClearSection('advertiser')}
                      className="text-red-600 hover:text-red-800 px-3 py-1 text-sm font-medium transition-colors"
                    >
                      Очистить раздел
                    </button>
                    <button
                      onClick={handleSaveAdvertiser}
                      disabled={isLoading}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isLoading ? 'Сохранение...' : 'Сохранить'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Название компании/бренда
                      </label>
                      <input
                        type="text"
                        value={advertiserData.companyName}
                        onChange={(e) => setAdvertiserData(prev => ({ ...prev, companyName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Название вашей компании"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Сайт/ссылка
                      </label>
                      <input
                        type="url"
                        value={advertiserData.companyWebsite}
                        onChange={(e) => setAdvertiserData(prev => ({ ...prev, companyWebsite: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="https://company.com"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Это поле будет использоваться в карточках рекламодателя
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Краткое описание компании или специализации
                    </label>
                    <textarea
                      value={advertiserData.companyDescription}
                      onChange={(e) => setAdvertiserData(prev => ({ ...prev, companyDescription: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Опишите вашу компанию, специализацию, ценности..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ссылка на портфолио/примеры кампаний (опционально)
                    </label>
                    <input
                      type="url"
                      value={advertiserData.portfolioLink}
                      onChange={(e) => setAdvertiserData(prev => ({ ...prev, portfolioLink: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="https://portfolio.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Безопасность</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Изменить пароль</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Текущий пароль
                        </label>
                        <input
                          type="password"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Введите текущий пароль"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Новый пароль
                        </label>
                        <input
                          type="password"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Введите новый пароль"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Подтвердите новый пароль
                        </label>
                        <input
                          type="password"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Подтвердите новый пароль"
                        />
                      </div>
                      <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                        Обновить пароль
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Двухфакторная аутентификация</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Добавьте дополнительный уровень безопасности к вашему аккаунту
                    </p>
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                      Включить 2FA
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Уведомления</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">Email уведомления</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                        <span className="text-sm text-gray-700">Новые предложения о сотрудничестве</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                        <span className="text-sm text-gray-700">Сообщения в чате</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                        <span className="text-sm text-gray-700">Маркетинговые рассылки</span>
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Push уведомления</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                        <span className="text-sm text-gray-700">Новые сообщения</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                        <span className="text-sm text-gray-700">Обновления предложений</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                      Сохранить настройки
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Подтвердите действие</h3>
              <button
                onClick={() => setShowClearModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">
                    Очистить раздел "{clearSection === 'basic' ? 'Основная информация' : clearSection === 'influencer' ? 'Инфлюенсер' : 'Рекламодатель'}"?
                  </h4>
                  <p className="text-sm text-gray-600">
                    Все данные в этом разделе будут удалены. Это действие нельзя отменить.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={confirmClear}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Очистить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}