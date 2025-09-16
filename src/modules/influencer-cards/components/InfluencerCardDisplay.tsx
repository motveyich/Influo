import React from 'react';
import { InfluencerCard } from '../../../core/types';
import { useTranslation } from '../../../hooks/useTranslation';
import { Star, MapPin, Clock, Users, TrendingUp, Eye, Edit, Trash2, ToggleLeft, ToggleRight, Heart, MessageCircle, Send, BarChart3, Flag } from 'lucide-react';
import { applicationService } from '../../applications/services/applicationService';
import { favoriteService } from '../../favorites/services/favoriteService';
import { cardAnalyticsService } from '../../card-analytics/services/cardAnalyticsService';
import { supabase } from '../../../core/supabase';
import { ReportModal } from '../../../components/ReportModal';
import toast from 'react-hot-toast';

interface InfluencerCardDisplayProps {
  card: InfluencerCard;
  showActions?: boolean;
  currentUserId?: string;
  onEdit?: (card: InfluencerCard) => void;
  onDelete?: (cardId: string) => void;
  onToggleStatus?: (cardId: string, isActive: boolean) => void;
  onViewAnalytics?: (cardId: string) => void;
}

export function InfluencerCardDisplay({ 
  card, 
  showActions = false, 
  currentUserId,
  onEdit, 
  onDelete, 
  onToggleStatus,
  onViewAnalytics
}: InfluencerCardDisplayProps) {
  const { t } = useTranslation();
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showReportModal, setShowReportModal] = React.useState(false);
  
  // Check if this is user's own card
  const isOwnCard = currentUserId === card.userId;

  React.useEffect(() => {
    if (currentUserId && !showActions && !isOwnCard) {
      checkFavoriteStatus();
      trackCardView();
    }
  }, [currentUserId, card.id, isOwnCard]);

  const checkFavoriteStatus = async () => {
    try {
      const favorite = await favoriteService.isFavorite(currentUserId!, 'influencer_card', card.id);
      setIsFavorite(favorite);
    } catch (error) {
      console.error('Failed to check favorite status:', error);
    }
  };

  const trackCardView = async () => {
    try {
      await cardAnalyticsService.trackCardView('influencer', card.id, currentUserId!);
    } catch (error) {
      console.error('Failed to track card view:', error);
    }
  };

  const handleApply = async () => {
    setIsLoading(true);
    try {
      if (!currentUserId) {
        toast.error('Необходимо войти в систему');
        setIsLoading(false);
        return;
      }

      // Check for existing application to this user
      const { data: existingApplication } = await supabase
        .from('applications')
        .select('id')
        .eq('applicant_id', currentUserId)
        .eq('target_reference_id', card.id)
        .eq('target_type', 'influencer_card')
        .not('status', 'in', '(cancelled,withdrawn)')
        .maybeSingle();

      if (existingApplication) {
        toast.error('Вы уже отправили заявку на эту карточку');
        setIsLoading(false);
        return;
      }

      await applicationService.createApplication({
        applicantId: currentUserId,
        targetId: card.userId,
        targetType: 'influencer_card',
        targetReferenceId: card.id,
        applicationData: {
          message: `Заинтересован в сотрудничестве с вашей карточкой на платформе ${card.platform}`,
          proposedRate: card.serviceDetails.pricing.post || 1000,
          timeline: '2 недели',
          deliverables: ['Пост в Instagram']
        }
      });

      await cardAnalyticsService.trackCardInteraction('influencer', card.id, currentUserId!, 'application');
      toast.success('Заявка отправлена успешно!');
    } catch (error: any) {
      console.error('Failed to apply:', error);
      if (error.message.includes('уже отправили заявку')) {
        toast.error('Вы уже отправили заявку этому инфлюенсеру');
      } else {
        toast.error(error.message || 'Не удалось отправить заявку');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      if (!currentUserId) {
        toast.error('Необходимо войти в систему');
        return;
      }

      if (isFavorite) {
        await favoriteService.removeFromFavorites(currentUserId!, 'influencer_card', card.id);
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

      await cardAnalyticsService.trackCardInteraction('influencer', card.id, currentUserId!, 'favorite');
      
      // Notify parent component to refresh favorites
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('favoritesChanged'));
      }
    } catch (error: any) {
      console.error('Failed to toggle favorite:', error);
      if (error.message.includes('Already in favorites')) {
        toast.error('Уже в избранном');
      } else {
        toast.error('Не удалось обновить избранное');
      }
    }
  };

  const handleSendMessage = async () => {
    try {
      if (!currentUserId) {
        toast.error('Необходимо войти в систему');
        return;
      }

      await cardAnalyticsService.trackCardInteraction('influencer', card.id, currentUserId!, 'message');
      
      // Navigate to chat with the specific user
      window.location.href = `/chat?userId=${card.userId}`;
    } catch (error) {
      console.error('Failed to initiate message:', error);
      toast.error('Не удалось перейти к чату');
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

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'vk':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'telegram':
        return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'ok':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'facebook':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'twitch':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'rutube':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'yandex_zen':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'likee':
        return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'instagram':
        return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'youtube':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'twitter':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'tiktok':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'multi':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getLowestPrice = () => {
    const prices = Object.values(card.serviceDetails.pricing).filter(price => price > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  return (
    <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 border ${
      !card.isActive ? 'opacity-60 border-gray-300' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 text-sm font-medium rounded-full border capitalize ${getPlatformColor(card.platform)}`}>
            {card.platform}
          </span>
          {!card.isActive && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
              {t('common.inactive')}
            </span>
          )}
        </div>
        
        {showActions && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onToggleStatus?.(card.id, !card.isActive)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title={card.isActive ? 'Деактивировать карточку' : 'Активировать карточку'}
            >
              {card.isActive ? (
                <ToggleRight className="w-5 h-5 text-green-600" />
              ) : (
                <ToggleLeft className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => onEdit?.(card)}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="Редактировать карточку"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete?.(card.id)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Удалить карточку"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <Users className="w-4 h-4 text-purple-600" />
            <span className="text-lg font-semibold text-gray-900">
              {formatNumber(card.reach.followers)}
            </span>
          </div>
          <p className="text-xs text-gray-600">Подписчики</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-lg font-semibold text-gray-900">
              {card.reach.engagementRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-gray-600">Вовлеченность</p>
        </div>
      </div>

      {/* Service Description */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 line-clamp-2">
          {card.serviceDetails.description}
        </p>
      </div>

      {/* Content Types */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1">
          {card.serviceDetails.contentTypes.slice(0, 4).map((type, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
            >
              {type}
            </span>
          ))}
          {card.serviceDetails.contentTypes.length > 4 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
              +{card.serviceDetails.contentTypes.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Audience Info */}
      <div className="mb-4 space-y-2">
        {/* Countries */}
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {card.audienceDemographics.topCountries.slice(0, 3).join(', ')}
            {card.audienceDemographics.topCountries.length > 3 && 
              ` +${card.audienceDemographics.topCountries.length - 3} more`
            }
          </span>
        </div>

        {/* Interests */}
        {card.audienceDemographics.interests.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.audienceDemographics.interests.slice(0, 3).map((interest, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md"
              >
                {interest}
              </span>
            ))}
            {card.audienceDemographics.interests.length > 3 && (
              <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-md">
                +{card.audienceDemographics.interests.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Pricing and Service Info */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{t('influencerCards.startingFrom')}</span>
            <span className="text-lg font-semibold text-green-600">
              {formatCurrency(getLowestPrice())}
            </span>
          </div>
          
          {card.rating > 0 && (
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium text-gray-900">
                {card.rating.toFixed(1)}
              </span>
              <span className="text-sm text-gray-600">
                ({card.completedCampaigns})
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{card.serviceDetails.responseTime}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <span>Доставка: {card.serviceDetails.deliveryTime}</span>
          </div>
        </div>

        {/* Action Button */}
        {!showActions && currentUserId && !isOwnCard && (
          <div className="mt-4 space-y-2">
            {/* Primary Actions */}
            <div className="flex space-x-2">
              <button
                onClick={handleApply}
                disabled={isLoading || !card.isActive}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-1 ${
                  card.isActive && !isLoading
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>{isLoading ? 'Отправка...' : 'Откликнуться'}</span>
              </button>
              
              <button
                onClick={handleToggleFavorite}
                className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                  isFavorite
                    ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Secondary Actions */}
            <div className="flex space-x-2">
              <button
                onClick={handleSendMessage}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-1"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Написать</span>
              </button>
              
              <button
                onClick={() => onViewAnalytics?.(card.id)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-1"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Подробнее</span>
              </button>
              
              <button
                onClick={() => setShowReportModal(true)}
                className="px-3 py-2 border border-red-300 text-red-700 hover:bg-red-50 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                title="Пожаловаться"
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        {/* Own Card Message */}
        {!showActions && isOwnCard && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Это ваша карточка
              </span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Перейдите в "Мои карточки" для редактирования
            </p>
          </div>
        )}
        
        {/* Actions for own cards when showActions is true */}
        {showActions && isOwnCard && (
          <div className="mt-4 space-y-2">
            <div className="flex space-x-2">
              <button
                onClick={() => onEdit?.(card)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-1"
              >
                <Edit className="w-4 h-4" />
                <span>Редактировать</span>
              </button>
              
              <button
                onClick={() => onToggleStatus?.(card.id, !card.isActive)}
                className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                  card.isActive
                    ? 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                    : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                }`}
                title={card.isActive ? 'Деактивировать карточку' : 'Активировать карточку'}
              >
                {card.isActive ? (
                  <ToggleRight className="w-4 h-4" />
                ) : (
                  <ToggleLeft className="w-4 h-4" />
                )}
                <span>{card.isActive ? 'Активна' : 'Неактивна'}</span>
              </button>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => onViewAnalytics?.(card.id)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-1"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Подробнее</span>
              </button>
              
              <button
                onClick={() => onDelete?.(card.id)}
                className="px-3 py-2 border border-red-300 text-red-700 hover:bg-red-50 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                title="Удалить карточку"
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="influencer_card"
        targetId={card.id}
        targetTitle={`Карточка инфлюенсера на ${card.platform}`}
      />
    </div>
  );
}