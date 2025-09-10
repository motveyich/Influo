import React from 'react';
import { Offer } from '../../../core/types';
import { useTranslation } from '../../../hooks/useTranslation';
import { Clock, DollarSign, CheckCircle, XCircle, MessageCircle, Eye, Star, Settings, Handshake, User, Target, FileText } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface OfferCardProps {
  offer: Offer;
  onAction?: (offerId: string, action: 'accept' | 'decline' | 'counter') => void;
  onManageDeal?: (offerId: string) => void;
  onCreatePayment?: (offerId: string) => void;
  onWithdraw?: (offerId: string) => void;
  onModify?: (offerId: string) => void;
  onLeaveReview?: (offerId: string) => void;
  showSenderActions?: boolean;
  currentUserId?: string;
  onViewDetails?: (offer: Offer) => void;
}

export function OfferCard({ offer, onAction, onManageDeal, onCreatePayment, onWithdraw, onModify, onLeaveReview, showSenderActions = false, currentUserId, onViewDetails }: OfferCardProps) {
  const { t } = useTranslation();

  // Check if this is an application (not a traditional offer)
  const isApplication = (offer as any).type === 'application';
  
  // Determine sender and receiver roles
  const getSenderRole = () => {
    if (isApplication) {
      // For applications: determine roles by target_type
      const targetType = (offer as any).applicationTargetType;
      
      if (targetType === 'influencer_card') {
        // Advertiser applied to influencer
        return showSenderActions 
          ? (currentUserId === offer.advertiserId ? 'Рекламодатель → Инфлюенсеру' : 'Неизвестная роль')
          : 'От рекламодателя';
      } else {
        // Influencer applied to advertiser or campaign
        return showSenderActions
          ? (currentUserId === offer.influencerId ? 'Инфлюенсер → Рекламодателю' : 'Неизвестная роль') 
          : 'От инфлюенсера';
      }
    } else {
      // For offers: advertiser sends to influencer
      return showSenderActions ? 'Рекламодатель → Инфлюенсеру' : 'От рекламодателя';
    }
  };
  
  // Get what is required/offered
  const getRequirements = () => {
    const deliverables = offer.details.deliverables || [];
    const rate = offer.details.rate;
    const timeline = offer.details.timeline;
    
    return {
      deliverables,
      rate,
      timeline,
      summary: deliverables.length > 0 ? deliverables.slice(0, 2).join(', ') + (deliverables.length > 2 ? '...' : '') : 'Не указано'
    };
  };
  
  const senderRole = getSenderRole();
  const requirements = getRequirements();

  const getStatusColor = (status: Offer['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'counter':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'info_requested':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: Offer['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'declined':
        return <XCircle className="w-4 h-4" />;
      case 'counter':
        return <MessageCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'withdrawn':
        return <XCircle className="w-4 h-4" />;
      case 'info_requested':
        return <MessageCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {isApplication ? 'Заявка на сотрудничество' : 'Предложение о сотрудничестве'}
              </h3>
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md flex items-center space-x-1">
                <User className="w-3 h-3" />
                <span>{senderRole}</span>
              </span>
              <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(offer.status)}`}>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(offer.status)}
                  <span className="capitalize">
                    {offer.status === 'pending' ? t('offers.status.pending') :
                     offer.status === 'accepted' ? t('offers.status.accepted') :
                     offer.status === 'declined' ? t('offers.status.declined') :
                     offer.status === 'counter' ? t('offers.status.counter') :
                     offer.status === 'completed' ? t('offers.status.completed') :
                     offer.status === 'withdrawn' ? t('offers.status.withdrawn') :
                     offer.status === 'info_requested' ? t('offers.status.infoRequested') : offer.status}
                  </span>
                </div>
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {isApplication ? 'ID заявки:' : 'ID кампании:'} {offer.campaignId} • {isApplication ? 'ID заявки:' : 'ID предложения:'} {offer.offerId}
            </p>
            
            {/* Requirements summary */}
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <div className="flex items-center space-x-2 mb-1">
                <Target className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-900">
                  {isApplication ? 'Предлагаемые услуги:' : 'Требования:'}
                </span>
              </div>
              <p className="text-sm text-gray-600">{requirements.summary}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center space-x-2 text-lg font-bold text-green-600">
              <DollarSign className="w-5 h-5" />
              <span>{formatCurrency(offer.details.rate, offer.details.currency)}</span>
            </div>
            <p className="text-sm text-gray-600">{offer.details.timeline}</p>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Eye className="w-4 h-4" />
              <span>{offer.metadata.viewCount} {t('offers.stats.views')}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-4 h-4" />
              <span>{offer.messages.length} {t('offers.stats.messages')}</span>
            </div>
            <span>
              Создано {formatDistanceToNow(parseISO(offer.timeline.createdAt), { addSuffix: true })}
            </span>
          </div>
          
          <button
            onClick={() => onViewDetails?.(offer)}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Подробнее</span>
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="p-6">
        {/* Requirements Details */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            {isApplication ? 'Что предлагается:' : t('offers.deliverables')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {offer.details.deliverables.map((deliverable, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-md"
              >
                {deliverable}
              </span>
            ))}
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Ставка:</span>
              <span className="ml-2 text-gray-900">{formatCurrency(offer.details.rate, offer.details.currency)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Сроки:</span>
              <span className="ml-2 text-gray-900">{offer.details.timeline}</span>
            </div>
          </div>
        </div>

        {/* Original terms/message */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            {isApplication ? 'Сообщение:' : t('offers.terms')}
          </h4>
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
            {offer.details.terms}
          </p>
        </div>

        {/* Timeline moved to after details */}
        {(offer.timeline.respondedAt || offer.timeline.completedAt) && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('offers.timeline')}</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>
                  Создано {formatDistanceToNow(parseISO(offer.timeline.createdAt), { addSuffix: true })}
                </span>
              </div>
              {offer.timeline.respondedAt && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className={`w-2 h-2 rounded-full ${
                    offer.status === 'accepted' ? 'bg-green-400' : 
                    offer.status === 'declined' ? 'bg-red-400' : 'bg-yellow-400'
                  }`}></div>
                  <span>
                    Отвечено {formatDistanceToNow(parseISO(offer.timeline.respondedAt), { addSuffix: true })}
                  </span>
                </div>
              )}
              {offer.timeline.completedAt && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>
                    Завершено {formatDistanceToNow(parseISO(offer.timeline.completedAt), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {offer.status === 'pending' && !showSenderActions && onAction && 
         offer.status !== 'withdrawn' && offer.status !== 'cancelled' && (
          <div className="flex space-x-3">
            <button
              onClick={() => onAction(offer.offerId, 'accept')}
              disabled={false}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{t('offers.actions.accept')} предложение</span>
            </button>
            <button
              onClick={() => onAction(offer.offerId, 'counter')}
              disabled={false}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{t('offers.actions.counter')}</span>
            </button>
            <button
              onClick={() => onAction(offer.offerId, 'decline')}
              disabled={false}
              className="px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <XCircle className="w-4 h-4" />
              <span>{t('offers.actions.decline')}</span>
            </button>
          </div>
        )}

        {/* Sender Actions (for sent offers) */}
        {offer.status === 'pending' && showSenderActions && (
          <div className="flex space-x-3">
            <button
              onClick={() => onModify?.(offer.offerId)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Изменить условия</span>
            </button>
            <button
              onClick={() => onWithdraw?.(offer.offerId)}
              className="px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <XCircle className="w-4 h-4" />
              <span>Отозвать</span>
            </button>
          </div>
        )}

        {offer.status === 'accepted' && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <span className="text-sm font-medium text-green-800">
                    {(offer as any).metadata?.paymentStatus === 'prepaid' ? 
                      'Предоплата получена!' : 
                      'Предложение принято! Управляйте сделкой.'}
                  </span>
                  {(offer as any).metadata?.paymentStatus === 'prepaid' && (offer as any).metadata?.remainingAmount > 0 && (
                    <p className="text-xs text-green-700 mt-1">
                      Предоплачено: {formatCurrency((offer as any).metadata.paidAmount, offer.details.currency)}. 
                      Осталось: {formatCurrency((offer as any).metadata.remainingAmount, offer.details.currency)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                {currentUserId === offer.influencerId && (
                  <button
                    onClick={() => onCreatePayment?.(offer.offerId)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                      (offer as any).metadata?.paymentStatus === 'prepaid' ?
                      'bg-orange-600 hover:bg-orange-700 text-white' :
                      'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <DollarSign className="w-3 h-3" />
                    <span>
                      {(offer as any).metadata?.paymentStatus === 'prepaid' ? 
                        'Окно постоплаты' : 
                        'Окно оплаты'}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => onManageDeal?.(offer.offerId)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                >
                  <Settings className="w-3 h-3" />
                  <span>Управление</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* In Progress Status with Management Options */}
        {(offer.status === 'in_progress' || offer.status === 'accepted') && (offer as any).dealId && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Handshake className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Сотрудничество в процессе
                </span>
              </div>
              <div className="flex space-x-2">
                {/* Кнопка оплаты только для инфлюенсера в сделке */}
                {currentUserId === offer.influencerId && (
                  <button
                    onClick={() => onCreatePayment?.(offer.offerId)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                  >
                    <DollarSign className="w-3 h-3" />
                    <span>Окно оплаты</span>
                  </button>
                )}
                <button
                  onClick={() => onManageDeal?.(offer.offerId)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                >
                  <Settings className="w-3 h-3" />
                  <span>Управление</span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Review Section for Completed Offers */}
        {offer.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Сотрудничество завершено!
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => onLeaveReview?.(offer.offerId)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  <Star className="w-4 h-4" />
                  <span>Оставить отзыв</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {offer.status === 'declined' && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                Это предложение было отклонено.
              </span>
            </div>
          </div>
        )}

        {offer.status === 'counter' && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Встречное предложение отправлено. Ожидание ответа.
              </span>
            </div>
          </div>
        )}

        {offer.status === 'withdrawn' && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-800">
                Это предложение было отозвано.
              </span>
            </div>
          </div>
        )}

        {offer.status === 'info_requested' && (
          <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                Запрошена дополнительная информация. Проверьте сообщения.
              </span>
            </div>
          </div>
        )}

        {(offer.status === 'withdrawn' || offer.status === 'cancelled') && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-800">
                {offer.status === 'withdrawn' ? 'Это предложение было отозвано.' : 'Эта заявка была отменена.'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}