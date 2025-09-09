import React from 'react';
import { Offer } from '../../../core/types';
import { useTranslation } from '../../../hooks/useTranslation';
import { X, User, Target, DollarSign, Calendar, Clock, CheckCircle, MessageCircle, Star, Package } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface DetailedOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer;
  currentUserId: string;
  showSenderActions?: boolean;
}

export function DetailedOfferModal({ isOpen, onClose, offer, currentUserId, showSenderActions = false }: DetailedOfferModalProps) {
  const { t } = useTranslation();

  // Check if this is an application (not a traditional offer)
  const isApplication = (offer as any).type === 'application';

  const getSenderInfo = () => {
    if (isApplication) {
      // Determine roles by application target type
      const targetType = (offer as any).applicationTargetType;
      
      if (targetType === 'influencer_card') {
        // Advertiser applied to influencer card
        return {
          role: 'Рекламодатель',
          direction: 'Инфлюенсеру',
          description: showSenderActions 
            ? 'Вы отправили заявку как рекламодатель инфлюенсеру'
            : 'Заявка от рекламодателя на ваши услуги'
        };
      } else {
        // Influencer applied to advertiser card or campaign  
        return {
          role: 'Инфлюенсер',
          direction: 'Рекламодателю',
          description: showSenderActions
            ? 'Вы отправили заявку как инфлюенсер рекламодателю'
            : 'Заявка от инфлюенсера на сотрудничество'
        };
      }
    } else {
      // For offers: advertiser sends to influencer
      return {
        role: 'Рекламодатель',
        direction: 'Инфлюенсеру',
        description: showSenderActions ? 'Вы отправили предложение инфлюенсеру' : 'Предложение от рекламодателя'
      };
    }
  };

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
        return <CheckCircle className="w-4 h-4" />;
      case 'counter':
        return <MessageCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'withdrawn':
        return <CheckCircle className="w-4 h-4" />;
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const senderInfo = getSenderInfo();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isApplication ? 'Детали заявки' : 'Детали предложения'}
            </h2>
            <p className="text-sm text-gray-600">
              ID: {offer.offerId} • {isApplication ? 'Заявка на сотрудничество' : 'Предложение о сотрудничестве'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {/* Sender Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-blue-900">{senderInfo.role}</h3>
                <p className="text-sm text-blue-700">{senderInfo.description}</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Статус</h3>
            <div className="flex items-center space-x-3">
              <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(offer.status)}`}>
                <div className="flex items-center space-x-2">
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
          </div>

          {/* Financial Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Финансовые условия</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(offer.details.rate, offer.details.currency)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {isApplication ? 'Предлагаемая ставка' : 'Предложенная ставка'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Временные рамки</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">{offer.details.timeline}</p>
                  <p className="text-sm text-gray-600">Планируемые сроки выполнения</p>
                </div>
              </div>
            </div>
          </div>

          {/* Deliverables */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              {isApplication ? 'Предлагаемые услуги' : 'Требуемые результаты'}
            </h3>
            <div className="space-y-3">
              {offer.details.deliverables.map((deliverable, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <Package className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-gray-900">{deliverable}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Terms and Conditions */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              {isApplication ? 'Дополнительная информация' : 'Условия и положения'}
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {offer.details.terms}
              </p>
            </div>
          </div>

          {/* Timeline History */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">История</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {isApplication ? 'Заявка отправлена' : 'Предложение создано'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {formatDistanceToNow(parseISO(offer.timeline.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {offer.timeline.respondedAt && (
                <div className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    offer.status === 'accepted' ? 'bg-green-400' : 
                    offer.status === 'declined' ? 'bg-red-400' : 'bg-yellow-400'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Получен ответ: {offer.status === 'accepted' ? 'Принято' : 
                                      offer.status === 'declined' ? 'Отклонено' : 'Встречное предложение'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatDistanceToNow(parseISO(offer.timeline.respondedAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )}

              {offer.timeline.completedAt && (
                <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Сотрудничество завершено</p>
                    <p className="text-xs text-gray-600">
                      {formatDistanceToNow(parseISO(offer.timeline.completedAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Статистика</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Target className="w-4 h-4 text-purple-600" />
                  <span className="text-lg font-semibold text-gray-900">
                    {offer.metadata.viewCount || 0}
                  </span>
                </div>
                <p className="text-xs text-gray-600">Просмотров</p>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-lg font-semibold text-gray-900">
                    {offer.messages.length}
                  </span>
                </div>
                <p className="text-xs text-gray-600">Сообщений</p>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-lg font-semibold text-gray-900">
                    {offer.timeline.respondedAt 
                      ? Math.round((new Date(offer.timeline.respondedAt).getTime() - new Date(offer.timeline.createdAt).getTime()) / (1000 * 60 * 60))
                      : 0
                    }ч
                  </span>
                </div>
                <p className="text-xs text-gray-600">Время ответа</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Участники</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {isApplication ? 'Отправитель заявки' : 'Отправитель предложения'}
                  </p>
                  <p className="text-xs text-gray-600">ID: {showSenderActions ? currentUserId : (isApplication ? offer.influencerId : offer.advertiserId)}</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-md">
                  {senderInfo.role}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {isApplication ? 'Получатель заявки' : 'Получатель предложения'}
                  </p>
                  <p className="text-xs text-gray-600">ID: {showSenderActions ? (isApplication ? offer.advertiserId : offer.influencerId) : currentUserId}</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-md">
                  {senderInfo.role === 'Инфлюенсер' ? 'Рекламодатель' : 'Инфлюенсер'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Summary */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                <Star className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Следующие шаги</h4>
                <p className="text-sm text-gray-600">
                  {offer.status === 'pending' ? 
                    (showSenderActions ? 'Ожидание ответа от получателя' : 'Требуется ваш ответ на заявку') :
                   offer.status === 'accepted' ? 'Можете приступать к сотрудничеству и настройке оплаты' :
                   offer.status === 'declined' ? 'Заявка была отклонена' :
                   offer.status === 'completed' ? 'Сотрудничество завершено, можете оставить отзыв' :
                   'Проверьте чат для дальнейших действий'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}