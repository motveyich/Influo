import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InfluencerCard, UserProfile } from '../../../core/types';
import { influencerCardService } from '../services/influencerCardService';
import { profileService } from '../../profiles/services/profileService';
import { cardAnalyticsService } from '../../card-analytics/services/cardAnalyticsService';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation } from '../../../hooks/useTranslation';
import { 
  ArrowLeft, 
  MessageCircle, 
  Edit, 
  Star, 
  Users, 
  TrendingUp, 
  Eye, 
  MapPin, 
  Clock, 
  CheckCircle, 
  DollarSign,
  Globe,
  Calendar,
  Award,
  BarChart3,
  Target,
  Heart,
  Share2,
  Instagram,
  Youtube,
  Twitter,
  Zap
} from 'lucide-react';
import { ApplicationModal } from '../../applications/components/ApplicationModal';
import { favoriteService } from '../../favorites/services/favoriteService';
import toast from 'react-hot-toast';

export function InfluencerCardDetailPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [card, setCard] = useState<InfluencerCard | null>(null);
  const [cardOwner, setCardOwner] = useState<UserProfile | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  
  const currentUserId = user?.id || '';
  const isOwnCard = currentUserId === card?.userId;

  useEffect(() => {
    if (cardId) {
      loadCardDetails();
    }
  }, [cardId]);

  const loadCardDetails = async () => {
    try {
      setIsLoading(true);
      
      // Load card
      const cardData = await influencerCardService.getCard(cardId!);
      if (!cardData) {
        toast.error('Карточка не найдена');
        navigate('/influencer-cards');
        return;
      }
      setCard(cardData);

      // Load card owner profile
      const ownerProfile = await profileService.getProfile(cardData.userId);
      setCardOwner(ownerProfile);

      // Load analytics
      const analyticsData = await cardAnalyticsService.getCardAnalytics('influencer', cardId!);
      setAnalytics(analyticsData);

      // Check favorite status
      if (currentUserId && !isOwnCard) {
        const favorite = await favoriteService.isFavorite(currentUserId, 'influencer_card', cardId!);
        setIsFavorite(favorite);
        
        // Track card view
        await cardAnalyticsService.trackCardView('influencer', cardId!, currentUserId);
      }
    } catch (error) {
      console.error('Failed to load card details:', error);
      toast.error('Не удалось загрузить информацию о карточке');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContact = async () => {
    if (!card) return;
    
    try {
      await cardAnalyticsService.trackCardInteraction('influencer', card.id, currentUserId, 'message');
      navigate(`/chat?userId=${card.userId}`);
    } catch (error) {
      console.error('Failed to initiate contact:', error);
      toast.error('Не удалось перейти к чату');
    }
  };

  const handleEdit = () => {
    if (!card) return;
    navigate(`/influencer-cards?edit=${card.id}`);
  };

  const handleToggleFavorite = async () => {
    if (!card || !currentUserId) return;

    try {
      if (isFavorite) {
        await favoriteService.removeFromFavorites(currentUserId, 'influencer_card', card.id);
        setIsFavorite(false);
        toast.success('Удалено из избранного');
      } else {
        await favoriteService.addToFavorites({
          userId: currentUserId,
          targetType: 'influencer_card',
          targetId: card.id
        });
        setIsFavorite(true);
        toast.success('Добавлено в избранное');
      }

      await cardAnalyticsService.trackCardInteraction('influencer', card.id, currentUserId, 'favorite');
    } catch (error: any) {
      console.error('Failed to toggle favorite:', error);
      toast.error('Не удалось обновить избранное');
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="w-5 h-5 text-pink-600" />;
      case 'youtube':
        return <Youtube className="w-5 h-5 text-red-600" />;
      case 'twitter':
        return <Twitter className="w-5 h-5 text-blue-600" />;
      case 'tiktok':
        return <Zap className="w-5 h-5 text-gray-800" />;
      default:
        return <Globe className="w-5 h-5 text-purple-600" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return 'from-pink-500 to-purple-600';
      case 'youtube':
        return 'from-red-500 to-red-600';
      case 'twitter':
        return 'from-blue-400 to-blue-600';
      case 'tiktok':
        return 'from-gray-800 to-black';
      default:
        return 'from-purple-500 to-blue-600';
    }
  };

  const getLowestPrice = () => {
    if (!card) return 0;
    const prices = Object.values(card.serviceDetails.pricing).filter(price => price > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка информации о карточке...</p>
        </div>
      </div>
    );
  }

  if (!card || !cardOwner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Карточка не найдена</h3>
          <p className="text-gray-600 mb-4">Возможно, карточка была удалена или недоступна</p>
          <button
            onClick={() => navigate('/influencer-cards')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Вернуться к карточкам
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Banner */}
      <div className={`relative bg-gradient-to-r ${getPlatformColor(card.platform)} text-white overflow-hidden`}>
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Back Button */}
          <button
            onClick={() => navigate('/influencer-cards')}
            className="mb-6 flex items-center space-x-2 text-white hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Назад к карточкам</span>
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            {/* Profile Info */}
            <div className="flex items-center space-x-6 mb-6 lg:mb-0">
              <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                {cardOwner.avatar ? (
                  <img 
                    src={cardOwner.avatar} 
                    alt={cardOwner.fullName}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold text-3xl">
                    {cardOwner.fullName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold">{cardOwner.fullName}</h1>
                  {cardOwner.unifiedAccountInfo.isVerified && (
                    <CheckCircle className="w-6 h-6 text-blue-300" />
                  )}
                </div>
                
                <div className="flex items-center space-x-3 mb-3">
                  {getPlatformIcon(card.platform)}
                  <span className="text-xl font-medium capitalize">{card.platform} Creator</span>
                </div>
                
                <div className="flex items-center space-x-4 text-white text-opacity-90">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{formatNumber(card.reach.followers)} подписчиков</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>{card.reach.engagementRate.toFixed(1)}% вовлеченность</span>
                  </div>
                  {cardOwner.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{cardOwner.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-3 lg:flex-row lg:space-y-0 lg:space-x-3">
              {!isOwnCard && (
                <>
                  <button
                    onClick={handleContact}
                    className="bg-white text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Связаться</span>
                  </button>
                  
                  <button
                    onClick={() => setShowApplicationModal(true)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <Target className="w-5 h-5" />
                    <span>Откликнуться</span>
                  </button>
                  
                  <button
                    onClick={handleToggleFavorite}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                      isFavorite
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30 text-white'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </>
              )}
              
              {isOwnCard && (
                <button
                  onClick={handleEdit}
                  className="bg-white text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2"
                >
                  <Edit className="w-5 h-5" />
                  <span>Редактировать</span>
                </button>
              )}
              
              <button
                className="bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">О создателе</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                {card.serviceDetails.description}
              </p>
              
              {cardOwner.bio && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Биография</h3>
                  <p className="text-gray-600 leading-relaxed">{cardOwner.bio}</p>
                </div>
              )}
            </div>

            {/* Services & Pricing */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Услуги и цены</h2>
              
              {/* Content Types */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Типы контента</h3>
                <div className="flex flex-wrap gap-2">
                  {card.serviceDetails.contentTypes.map((type, index) => (
                    <span
                      key={index}
                      className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(card.serviceDetails.pricing).map(([type, price]) => (
                  price > 0 && (
                    <div key={type} className="bg-gray-50 rounded-lg p-4 text-center">
                      <h4 className="text-sm font-medium text-gray-600 mb-1 capitalize">{type}</h4>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(price)}</p>
                    </div>
                  )
                ))}
              </div>

              {/* Service Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Время ответа</h4>
                  <p className="text-sm text-gray-600">{card.serviceDetails.responseTime}</p>
                </div>
                
                <div className="text-center">
                  <Calendar className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Время доставки</h4>
                  <p className="text-sm text-gray-600">{card.serviceDetails.deliveryTime}</p>
                </div>
                
                <div className="text-center">
                  <Award className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Правки включены</h4>
                  <p className="text-sm text-gray-600">{card.serviceDetails.revisions}</p>
                </div>
              </div>
            </div>

            {/* Audience Analytics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Аналитика аудитории</h2>
              
              {/* Demographics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Age Distribution */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Возрастное распределение</h3>
                  <div className="space-y-3">
                    {Object.entries(card.audienceDemographics.ageGroups).map(([age, percentage]) => (
                      <div key={age} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{age} лет</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-8">{percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gender Split */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Гендерное распределение</h3>
                  <div className="space-y-3">
                    {Object.entries(card.audienceDemographics.genderSplit).map(([gender, percentage]) => (
                      <div key={gender} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">
                          {gender === 'male' ? 'Мужской' : gender === 'female' ? 'Женский' : 'Другой'}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                gender === 'male' ? 'bg-blue-600' : 
                                gender === 'female' ? 'bg-pink-600' : 'bg-purple-600'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-8">{percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Countries */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">География аудитории</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {card.audienceDemographics.topCountries.map((country, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-sm font-medium text-gray-900">{country}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interests */}
              {card.audienceDemographics.interests.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Интересы аудитории</h3>
                  <div className="flex flex-wrap gap-2">
                    {card.audienceDemographics.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Stats & Quick Info */}
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ключевые метрики</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Подписчики</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatNumber(card.reach.followers)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Вовлеченность</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {card.reach.engagementRate.toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Средние просмотры</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatNumber(card.reach.averageViews)}
                  </span>
                </div>
                
                {card.rating > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-600">Рейтинг</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {card.rating.toFixed(1)} ({card.completedCampaigns})
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Начиная от</span>
                  </div>
                  <span className="text-lg font-semibold text-green-600">
                    {formatCurrency(getLowestPrice())}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Stats */}
            {analytics && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Статистика карточки</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-600">Просмотры</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {analytics.metrics.totalViews || 0}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-gray-600">Заявки</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {analytics.metrics.applications || 0}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-600">Процент принятия</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {analytics.metrics.acceptanceRate || 0}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium text-gray-600">Среднее время ответа</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {analytics.metrics.averageResponseTime || 0}ч
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Контактная информация</h2>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Время ответа</p>
                    <p className="text-sm text-gray-600">{card.serviceDetails.responseTime}</p>
                  </div>
                </div>
                
                {cardOwner.website && (
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Globe className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Веб-сайт</p>
                      <a 
                        href={cardOwner.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-purple-600 hover:text-purple-700"
                      >
                        {cardOwner.website}
                      </a>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Местоположение</p>
                    <p className="text-sm text-gray-600">{cardOwner.location || 'Не указано'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {analytics && analytics.dailyStats && Object.keys(analytics.dailyStats).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Недавняя активность</h2>
                
                <div className="space-y-3">
                  {Object.entries(analytics.dailyStats)
                    .slice(-7)
                    .map(([date, stats]: [string, any]) => (
                    <div key={date} className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">
                        {new Date(date).toLocaleDateString('ru-RU')}
                      </span>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-gray-900">{stats.views || 0} просмотров</span>
                        <span className="text-purple-600">{stats.applications || 0} заявок</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Quick Stats */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Быстрая статистика</h2>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Общий охват</span>
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(card.reach.followers)}
                  </p>
                  <p className="text-sm text-gray-600">подписчиков</p>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Вовлеченность</span>
                    <BarChart3 className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {card.reach.engagementRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600">средняя вовлеченность</p>
                </div>
                
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Проекты</span>
                    <Award className="w-4 h-4 text-orange-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {card.completedCampaigns}
                  </p>
                  <p className="text-sm text-gray-600">завершенных проектов</p>
                </div>
              </div>
            </div>

            {/* Platform Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Информация о платформе</h2>
              
              <div className="text-center mb-4">
                <div className={`w-16 h-16 bg-gradient-to-r ${getPlatformColor(card.platform)} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                  {getPlatformIcon(card.platform)}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 capitalize">{card.platform}</h3>
                <p className="text-sm text-gray-600">Основная платформа</p>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Статус</span>
                  <span className={`text-sm font-medium ${
                    card.isActive ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {card.isActive ? 'Активна' : 'Неактивна'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Доступность</span>
                  <span className={`text-sm font-medium ${
                    card.serviceDetails.availability ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {card.serviceDetails.availability ? 'Доступен' : 'Недоступен'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Последнее обновление</span>
                  <span className="text-sm text-gray-900">
                    {new Date(card.lastUpdated).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </div>
            </div>

            {/* Social Links */}
            {cardOwner.influencerData?.socialMediaLinks && cardOwner.influencerData.socialMediaLinks.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Социальные сети</h2>
                
                <div className="space-y-3">
                  {cardOwner.influencerData.socialMediaLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {getPlatformIcon(link.platform)}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 capitalize">{link.platform}</p>
                        <p className="text-sm text-gray-600">{link.username || 'Профиль'}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Языки</h2>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Русский</span>
                  <span className="text-sm font-medium text-gray-900">Родной</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Английский</span>
                  <span className="text-sm font-medium text-gray-900">Продвинутый</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {card && (
        <ApplicationModal
          isOpen={showApplicationModal}
          onClose={() => setShowApplicationModal(false)}
          targetId={card.userId}
          targetType="influencer_card"
          targetReferenceId={card.id}
          applicantId={currentUserId}
          onApplicationSent={() => {
            setShowApplicationModal(false);
            toast.success('Заявка отправлена успешно!');
          }}
        />
      )}
    </div>
  );
}