import React from 'react';
import { AdvertiserCard } from '../../../core/types';
import { Star, MapPin, Clock, Users, DollarSign, Calendar, Building, Target, Heart, MessageCircle, Send, Edit, Trash2, ToggleLeft, ToggleRight, BarChart3, UserCircle } from 'lucide-react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { applicationService } from '../../applications/services/applicationService';
import { favoriteService } from '../../favorites/services/favoriteService';
import { cardAnalyticsService } from '../../card-analytics/services/cardAnalyticsService';
import toast from 'react-hot-toast';
import { UserPublicProfileModal } from '../../profiles/components/UserPublicProfileModal';
import { database } from '../../../core/database';
import { useTranslation } from '../../../hooks/useTranslation';

interface AdvertiserCardDisplayProps {
  card: AdvertiserCard;
  showActions?: boolean;
  onEdit?: (card: AdvertiserCard) => void;
  onDelete?: (cardId: string) => void;
  onToggleStatus?: (cardId: string, isActive: boolean) => void;
  onViewAnalytics?: (cardId: string) => void;
  currentUserId?: string;
}

export function AdvertiserCardDisplay({
  card,
  showActions = false,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewAnalytics,
  currentUserId
}: AdvertiserCardDisplayProps) {
  const { t } = useTranslation();
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showProfileModal, setShowProfileModal] = React.useState(false);

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
      const favorite = await favoriteService.isFavorite(currentUserId!, 'advertiser_card', card.id);
      setIsFavorite(favorite);
    } catch (error) {
      console.error('Failed to check favorite status:', error);
    }
  };

  const trackCardView = async () => {
    try {
      await cardAnalyticsService.trackCardView('advertiser', card.id, currentUserId!);
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

      await applicationService.createApplication({
        applicantId: currentUserId,
        targetId: card.userId,
        targetType: 'advertiser_card',
        targetReferenceId: card.id,
        applicationData: {
          message: `Заинтересован в участии в кампании "${card.campaignTitle}"`,
          proposedRate: card.budget.type === 'fixed' ? (card.budget.amount || 1000) : (card.budget.min || 1000),
          timeline: '2 недели',
          deliverables: ['Участие в кампании']
        }
      });

      await cardAnalyticsService.trackCardInteraction('advertiser', card.id, currentUserId!, 'application');
      toast.success('Заявка отправлена успешно!');
    } catch (error: any) {
      console.error('Failed to apply:', error);
      toast.error(error.message || 'Не удалось отправить заявку');
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
        await favoriteService.removeFromFavorites(currentUserId!, 'advertiser_card', card.id);
        setIsFavorite(false);
        toast.success('Удалено из избранного');
      } else {
        await favoriteService.addToFavorites({
          userId: currentUserId,
          targetType: 'advertiser_card',
          targetId: card.id
        });
        setIsFavorite(true);
        toast.success('Добавлено в избранное');
      }

      await cardAnalyticsService.trackCardInteraction('advertiser', card.id, currentUserId!, 'favorite');
      
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

      await cardAnalyticsService.trackCardInteraction('advertiser', card.id, currentUserId!, 'message');
      
      // Navigate to chat with the specific user
      window.location.href = `/chat?userId=${card.userId}`;
    } catch (error) {
      console.error('Failed to initiate message:', error);
      toast.error('Не удалось перейти к чату');
    }
  };

  const formatCurrency = (budget: AdvertiserCard['budget']) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: budget.currency || 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    return formatter.format(budget.amount || 0);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
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
        return 'bg-blue-100 text-blue-700 border-blue-200';
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
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const isDeadlinePassed = () => {
    if (!card.applicationDeadline) return false;
    return new Date() > parseISO(card.applicationDeadline);
  };

  const isDeadlineApproaching = () => {
    if (!card.applicationDeadline) return false;
    const deadline = parseISO(card.applicationDeadline);
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);
    return daysDiff <= 3 && daysDiff > 0;
  };

  return (
    <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 border ${
      !card.isActive ? 'opacity-60 border-gray-300' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
              {card.campaignTitle}
            </h3>
            <span className={`px-3 py-1 text-sm font-medium rounded-full border capitalize ${getPlatformColor(card.platform)}`}>
              {card.platform}
            </span>
          </div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="flex items-center space-x-1">
              <Building className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900">{card.companyName}</span>
            </div>
          </div>
        </div>
        
        {showActions && (
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => onToggleStatus?.(card.id, !card.isActive)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
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
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Редактировать карточку"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete?.(card.id)}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Удалить карточку"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Budget and Timeline */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-green-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {formatCurrency(card.budget)}
            </p>
            <p className="text-xs text-gray-600">{t('influencerCards.budget')}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {formatDistanceToNow(parseISO(card.campaignDuration.endDate))}
            </p>
            <p className="text-xs text-gray-600">{t('campaigns.deadline')}</p>
          </div>
        </div>
      </div>

      {/* Campaign Description */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {card.campaignDescription}
      </p>

      {/* Campaign Formats */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1">
          {card.serviceFormat.slice(0, 4).map((format, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
            >
              {format}
            </span>
          ))}
          {card.serviceFormat.length > 4 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
              +{card.serviceFormat.length - 4} еще
            </span>
          )}
        </div>
      </div>

      {/* Requirements */}
      <div className="space-y-2 mb-4">
        {/* Follower Requirements */}
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-green-600" />
          <span className="text-sm text-gray-600">
            {t('influencerCards.subscribers')}: {t('influencerCards.from')} {formatNumber(card.influencerRequirements.minFollowers)}
            {card.influencerRequirements.maxFollowers && ` до ${formatNumber(card.influencerRequirements.maxFollowers)}`}
          </span>
        </div>

        {/* Countries */}
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-red-600" />
          <span className="text-sm text-gray-600">
            {card.targetAudience.interests && card.targetAudience.interests.length > 0 ? (
              <>
                {card.targetAudience.interests.slice(0, 3).join(', ')}
                {card.targetAudience.interests.length > 3 && 
                  ` +${card.targetAudience.interests.length - 3} еще`
                }
              </>
            ) : (
              'Интересы не указаны'
            )}
          </span>
        </div>
      </div>

      {/* Application Deadline */}
      {card.applicationDeadline && (
        <div className={`mb-4 p-2 rounded-md ${
          isDeadlinePassed() ? 'bg-red-50 border border-red-200' :
          isDeadlineApproaching() ? 'bg-yellow-50 border border-yellow-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center space-x-2">
            <Clock className={`w-4 h-4 ${
              isDeadlinePassed() ? 'text-red-600' :
              isDeadlineApproaching() ? 'text-yellow-600' : 'text-blue-600'
            }`} />
            <span className={`text-sm font-medium ${
              isDeadlinePassed() ? 'text-red-800' :
              isDeadlineApproaching() ? 'text-yellow-800' : 'text-blue-800'
            }`}>
              {isDeadlinePassed() ? 'Срок подачи заявок истек' :
               isDeadlineApproaching() ? 'Срок подачи заявок скоро истекает' :
               `Подача заявок до ${format(parseISO(card.applicationDeadline), 'dd MMM yyyy')}`
              }
            </span>
          </div>
        </div>
      )}

      {/* Stats */}
      {card.campaignStats && (
        <div className="grid grid-cols-3 gap-4 mb-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span className="text-sm font-semibold text-gray-900">
                {card.campaignStats.averageRating.toFixed(1)}
              </span>
            </div>
            <p className="text-xs text-gray-600">Рейтинг</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900">{card.campaignStats.completedCampaigns}</p>
            <p className="text-xs text-gray-600">Кампании</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900">{card.campaignStats.successRate}%</p>
            <p className="text-xs text-gray-600">Успешность</p>
          </div>
        </div>
      )}

      {/* Created Date */}
      <div className="flex items-center space-x-2 text-xs text-gray-500 mb-4">
        <Clock className="w-3 h-3" />
        <span>Создано {formatDistanceToNow(parseISO(card.createdAt), { addSuffix: true })}</span>
      </div>

      {/* Actions for own cards when showActions is true */}
      {showActions && isOwnCard && (
        <div className="space-y-2">
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit?.(card)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-1"
            >
              <Edit className="w-4 h-4" />
              <span>{t('influencerCards.edit')}</span>
            </button>
            
            <button
              onClick={() => onToggleStatus?.(card.id, !card.isActive)}
              className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                card.isActive
                  ? 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                  : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
              }`}
              title={card.isActive ? t('influencerCards.deactivate') : t('influencerCards.activate')}
            >
              {card.isActive ? (
                <ToggleRight className="w-4 h-4" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
            </button>
          </div>
          
          <button
            onClick={() => onViewAnalytics?.(card.id)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-1"
          >
            <BarChart3 className="w-4 h-4" />
            <span>{t('influencerCards.moreDetails')}</span>
          </button>
        </div>
      )}

      {/* Actions */}
      {!showActions && !isOwnCard && (
        <div className="space-y-2">
          {/* Primary Actions */}
          <div className="flex space-x-2">
            <button
              onClick={handleApply}
              disabled={!card.isActive || isLoading}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-1 ${
                card.isActive && !isLoading
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>{isLoading ? t('influencerCards.sending') : t('influencerCards.respond')}</span>
            </button>
            
            <button
              onClick={handleToggleFavorite}
              className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                isFavorite
                  ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title={isFavorite ? t('influencerCards.removeFromFavorites') : t('influencerCards.addToFavorites')}
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
              <span>{t('influencerCards.sendMessage')}</span>
            </button>

            <button
              onClick={() => onViewAnalytics?.(card.id)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-1"
            >
              <BarChart3 className="w-4 h-4" />
              <span>{t('influencerCards.viewAnalytics')}</span>
            </button>

            <button
              onClick={() => setShowProfileModal(true)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center"
              title="Профиль"
            >
              <UserCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Own Card Message */}
      {!showActions && isOwnCard && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center space-x-2">
            <Building className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              {t('influencerCards.thisIsYourCard')}
            </span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            {t('influencerCards.goToMyCards')}
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 leading-relaxed">
          Все данные указываются создателями карточек. В случае несоответствия информации убедительно просим оставить обращение в службу поддержки для проверки и возможных санкций в отношении пользователя, нарушившего правила платформы.
        </p>
      </div>

      {/* Public Profile Modal */}
      {showProfileModal && (
        <UserPublicProfileModal
          userId={card.userId}
          currentUserId={currentUserId}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
}