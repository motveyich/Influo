import React, { useState, useEffect } from 'react';
import { CollaborationOffer, PaymentRequest, CollaborationReview, OfferStatus } from '../../../core/types';
import { offerService } from '../services/offerService';
import { paymentRequestService } from '../services/paymentRequestService';
import { reviewService } from '../services/reviewService';
import { PaymentRequestModal } from './PaymentRequestModal';
import { ReviewModal } from './ReviewModal';
import { X, Clock, DollarSign, Calendar, CheckCircle, XCircle, CreditCard, Star, MessageCircle, CreditCard as Edit, Trash2, Play, Square, Trophy, Ban, AlertTriangle, Plus, User, FileText, History } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

interface OfferDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: CollaborationOffer;
  currentUserId: string;
  onOfferUpdated: (offer: CollaborationOffer) => void;
}

export function OfferDetailsModal({ 
  isOpen, 
  onClose, 
  offer, 
  currentUserId, 
  onOfferUpdated 
}: OfferDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [reviews, setReviews] = useState<CollaborationReview[]>([]);
  const [offerHistory, setOfferHistory] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRequest | null>(null);

  const isInfluencer = currentUserId === offer.influencerId;
  const isAdvertiser = currentUserId === offer.advertiserId;
  const isInitiator = currentUserId === offer.initiatedBy;
  const isReceiver = !isInitiator;
  const userRole = isInfluencer ? 'influencer' : 'advertiser';
  const roleInOffer = isInitiator ? 'Отправитель' : 'Получатель';

  useEffect(() => {
    if (isOpen && offer.id) {
      loadOfferDetails();
    }
  }, [isOpen, offer.id]);

  const loadOfferDetails = async () => {
    try {
      setIsLoading(true);
      
      const [paymentData, reviewData, historyData, reviewPermission] = await Promise.all([
        paymentRequestService.getOfferPaymentRequests(offer.id),
        reviewService.getOfferReviews(offer.id),
        offerService.getOfferHistory(offer.id),
        reviewService.canUserReview(offer.id, currentUserId)
      ]);

      setPaymentRequests(paymentData);
      setReviews(reviewData);
      setOfferHistory(historyData);
      setCanReview(reviewPermission);
    } catch (error) {
      console.error('Failed to load offer details:', error);
      toast.error('Не удалось загрузить детали предложения');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: OfferStatus, additionalData?: any) => {
    try {
      const updatedOffer = await offerService.updateOfferStatus(offer.id, newStatus, currentUserId, additionalData);
      onOfferUpdated(updatedOffer);
      await loadOfferDetails(); // Reload to get updated history
      
      const statusMessages = {
        'accepted': 'Предложение принято',
        'declined': 'Предложение отклонено',
        'cancelled': 'Предложение отменено',
        'completed': 'Сотрудничество завершено',
        'terminated': 'Сотрудничество расторгнуто'
      };
      
      toast.success(statusMessages[newStatus] || 'Статус обновлен');
    } catch (error: any) {
      console.error('Failed to update offer status:', error);
      toast.error(error.message || 'Не удалось обновить статус');
    }
  };

  const handlePaymentStatusUpdate = async (paymentId: string, newStatus: string) => {
    try {
      await paymentRequestService.updatePaymentStatus(paymentId, newStatus as any, currentUserId);
      await loadOfferDetails(); // Reload payment requests
      
      const statusMessages = {
        'paying': 'Начат процесс оплаты',
        'paid': 'Оплата подтверждена',
        'failed': 'Оплата не удалась',
        'confirmed': 'Получение оплаты подтверждено'
      };
      
      toast.success(statusMessages[newStatus] || 'Статус оплаты обновлен');
    } catch (error: any) {
      console.error('Failed to update payment status:', error);
      toast.error(error.message || 'Не удалось обновить статус оплаты');
    }
  };

  const handlePaymentRequestCreated = (paymentRequest: PaymentRequest) => {
    setPaymentRequests(prev => [paymentRequest, ...prev]);
    setShowPaymentModal(false);
    setEditingPayment(null);
  };

  const handlePaymentRequestDeleted = async (paymentId: string) => {
    try {
      await paymentRequestService.deletePaymentRequest(paymentId, currentUserId);
      setPaymentRequests(prev => prev.filter(p => p.id !== paymentId));
      toast.success('Окно оплаты отменено');
    } catch (error: any) {
      console.error('Failed to delete payment request:', error);
      toast.error(error.message || 'Не удалось отменить окно оплаты');
    }
  };

  const handleReviewCreated = (review: CollaborationReview) => {
    setReviews(prev => [review, ...prev]);
    setShowReviewModal(false);
    setCanReview(false);
  };

  const getAvailableActions = () => {
    const actions = [];

    // Pending status actions
    if (offer.status === 'pending') {
      if (isReceiver) {
        // Получатель может принять или отклонить
        actions.push(
          { label: 'Принять предложение', action: 'accepted', style: 'success', icon: CheckCircle },
          { label: 'Отклонить', action: 'declined', style: 'danger', icon: XCircle }
        );
      } else if (isInitiator) {
        // Инициатор может только отменить
        actions.push(
          { label: 'Отменить предложение', action: 'cancelled', style: 'neutral', icon: XCircle }
        );
      }
    }

    // In progress actions (both roles)
    if (offer.status === 'in_progress') {
      actions.push(
        { label: 'Завершить сотрудничество', action: 'completed', style: 'success', icon: Trophy },
        { label: 'Расторгнуть сотрудничество', action: 'terminated', style: 'danger', icon: Ban }
      );
    }

    return actions;
  };

  const getActivePaymentRequest = () => {
    return paymentRequests.find(pr => ['draft', 'pending', 'paying', 'paid'].includes(pr.status));
  };

  const canCreatePaymentRequest = () => {
    return isInfluencer && 
           ['accepted', 'in_progress'].includes(offer.status) && 
           !getActivePaymentRequest();
  };

  const canEditPaymentRequest = (payment: PaymentRequest) => {
    return isInfluencer && 
           payment.createdBy === currentUserId && 
           !payment.isFrozen && 
           ['draft', 'pending'].includes(payment.status);
  };

  const getPaymentActions = (payment: PaymentRequest) => {
    const actions = [];

    if (isAdvertiser) {
      // Advertiser actions
      if (payment.status === 'pending') {
        actions.push(
          { label: 'Оплачиваю', action: 'paying', style: 'warning' },
          { label: 'Не могу оплатить', action: 'failed', style: 'danger' }
        );
      } else if (payment.status === 'paying') {
        actions.push(
          { label: 'Оплатил', action: 'paid', style: 'success' },
          { label: 'Не получилось', action: 'failed', style: 'danger' }
        );
      }
    } else if (isInfluencer) {
      // Influencer actions
      if (payment.status === 'paid') {
        actions.push(
          { label: 'Подтвердить получение', action: 'confirmed', style: 'success' }
        );
      }
    }

    return actions;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: OfferStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'terminated':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'declined':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'paid':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'paying':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'pending':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const availableActions = getAvailableActions();
  const activePaymentRequest = getActivePaymentRequest();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{offer.title}</h2>
            <div className="flex items-center space-x-4 mt-2">
              <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(offer.status)}`}>
                {offer.status === 'pending' ? 'Ожидает ответа' :
                 offer.status === 'accepted' ? 'Принято' :
                 offer.status === 'in_progress' ? 'В работе' :
                 offer.status === 'completed' ? 'Завершено' :
                 offer.status === 'terminated' ? 'Расторгнуто' :
                 offer.status === 'declined' ? 'Отклонено' : 'Отменено'}
              </span>
              <span className="text-sm text-gray-600">
                Ваша роль: {isInfluencer ? 'Инфлюенсер' : 'Рекламодатель'} ({roleInOffer})
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row h-[calc(90vh-120px)]">
          {/* Left Column - Main Details */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Offer Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Детали предложения</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(offer.acceptedRate || offer.proposedRate, offer.currency)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {offer.acceptedRate && offer.acceptedRate !== offer.proposedRate ? 'Принятая ставка' : 'Предложенная ставка'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{offer.timeline}</p>
                        <p className="text-xs text-gray-600">Сроки</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDistanceToNow(parseISO(offer.createdAt), { addSuffix: true })}
                        </p>
                        <p className="text-xs text-gray-600">Создано</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">{offer.description}</p>
                  </div>
                </div>
              </div>

              {/* Deliverables */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Результаты</h3>
                <div className="space-y-2">
                  {offer.deliverables.map((deliverable, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-blue-50 rounded-md">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-900">{deliverable}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Windows Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Окна оплаты</h3>
                  {canCreatePaymentRequest() && (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Создать окно оплаты</span>
                    </button>
                  )}
                </div>
                
                {paymentRequests.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">Окна оплаты не созданы</p>
                    {canCreatePaymentRequest() && (
                      <p className="text-sm text-gray-500">
                        Создайте окно оплаты для получения средств от рекламодателя
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentRequests.map((payment) => (
                      <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <p className="text-lg font-medium text-gray-900">
                                {formatCurrency(payment.amount, payment.currency)}
                              </p>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPaymentStatusColor(payment.status)}`}>
                                {payment.status === 'confirmed' ? 'Подтверждено' :
                                 payment.status === 'paid' ? 'Оплачено' :
                                 payment.status === 'paying' ? 'Оплачивается' :
                                 payment.status === 'failed' ? 'Ошибка оплаты' :
                                 payment.status === 'pending' ? 'Ожидает оплаты' : payment.status}
                              </span>
                              {payment.isFrozen && (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                                  Заморожено
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>
                                {payment.paymentType === 'prepay' ? 'Предоплата' : 
                                 payment.paymentType === 'postpay' ? 'Постоплата' : 'Полная оплата'}
                              </span>
                              <span>•</span>
                              <span>{payment.paymentMethod}</span>
                              <span>•</span>
                              <span>{formatDistanceToNow(parseISO(payment.createdAt), { addSuffix: true })}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {/* Influencer actions */}
                            {canEditPaymentRequest(payment) && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingPayment(payment);
                                    setShowPaymentModal(true);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Редактировать окно оплаты"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handlePaymentRequestDeleted(payment.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                  title="Отменить окно оплаты"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Payment details */}
                        {payment.paymentDetails && Object.keys(payment.paymentDetails).length > 0 && (
                          <div className="mb-3 p-3 bg-blue-50 rounded-md">
                            <p className="text-sm font-medium text-blue-900 mb-2">Реквизиты для оплаты:</p>
                            <div className="space-y-1 text-sm text-blue-800">
                              {payment.paymentDetails.bankAccount && (
                                <p><strong>Банковский счет:</strong> {payment.paymentDetails.bankAccount}</p>
                              )}
                              {payment.paymentDetails.cardNumber && (
                                <p><strong>Номер карты:</strong> {payment.paymentDetails.cardNumber}</p>
                              )}
                              {payment.paymentDetails.paypalEmail && (
                                <p><strong>PayPal:</strong> {payment.paymentDetails.paypalEmail}</p>
                              )}
                              {payment.paymentDetails.cryptoAddress && (
                                <p><strong>Криптокошелек:</strong> {payment.paymentDetails.cryptoAddress}</p>
                              )}
                              {payment.paymentDetails.accountHolder && (
                                <p><strong>Владелец:</strong> {payment.paymentDetails.accountHolder}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {payment.instructions && (
                          <div className="mb-3 p-3 bg-white rounded border">
                            <p className="text-sm font-medium text-gray-700 mb-1">Инструкции:</p>
                            <p className="text-sm text-gray-600 whitespace-pre-line">{payment.instructions}</p>
                          </div>
                        )}

                        {/* Payment Actions */}
                        {getPaymentActions(payment).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {getPaymentActions(payment).map((action) => (
                              <button
                                key={action.action}
                                onClick={() => handlePaymentStatusUpdate(payment.id, action.action)}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                  action.style === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                                  action.style === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
                                  action.style === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' :
                                  'bg-gray-600 hover:bg-gray-700 text-white'
                                }`}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reviews */}
              {reviews.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Отзывы</h3>
                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="font-medium text-gray-900">{review.title}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(parseISO(review.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Offer History */}
              {offerHistory.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">История изменений</h3>
                  <div className="space-y-2">
                    {offerHistory.map((historyItem) => (
                      <div key={historyItem.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">
                            Статус изменен с "{historyItem.previous_status || 'создано'}" на "{historyItem.new_status}"
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(parseISO(historyItem.created_at), { addSuffix: true })}
                            {historyItem.changed_by_profile && ` • ${historyItem.changed_by_profile.full_name}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Actions */}
          <div className="lg:w-80 bg-gray-50 p-6 overflow-y-auto border-l border-gray-200">
            <div className="space-y-6">
              {/* Quick Actions */}
              {availableActions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Действия</h3>
                  <div className="space-y-2">
                    {availableActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.action}
                          onClick={() => handleStatusUpdate(action.action as OfferStatus)}
                          className={`w-full px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                            action.style === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                            action.style === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' :
                            'bg-gray-600 hover:bg-gray-700 text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{action.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment Request Actions */}
              {canCreatePaymentRequest() && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Оплата</h3>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Создать окно оплаты</span>
                  </button>
                </div>
              )}

              {/* Review Action */}
              {canReview && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Отзыв</h3>
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
                  >
                    <Star className="w-4 h-4" />
                    <span>Оценить партнера</span>
                  </button>
                </div>
              )}

              {/* Quick Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Информация</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Роль:</span>
                    <span className="font-medium text-gray-900">
                      {isInfluencer ? 'Инфлюенсер' : 'Рекламодатель'} ({roleInOffer})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Статус:</span>
                    <span className="font-medium text-gray-900">
                      {offer.status === 'pending' ? 'Ожидает ответа' :
                       offer.status === 'accepted' ? 'Принято' :
                       offer.status === 'in_progress' ? 'В работе' :
                       offer.status === 'completed' ? 'Завершено' :
                       offer.status === 'terminated' ? 'Расторгнуто' :
                       offer.status === 'declined' ? 'Отклонено' : 'Отменено'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Текущий этап:</span>
                    <span className="font-medium text-gray-900">
                      {offer.currentStage === 'negotiation' ? 'Переговоры' :
                       offer.currentStage === 'payment' ? 'Оплата' :
                       offer.currentStage === 'work' ? 'Работа в процессе' :
                       offer.currentStage === 'completion' ? 'Завершение' : 'Отзывы'}
                    </span>
                  </div>
                  {offer.acceptedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Принято:</span>
                      <span className="font-medium text-gray-900">
                        {formatDistanceToNow(parseISO(offer.acceptedAt), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Окон оплаты:</span>
                    <span className="font-medium text-gray-900">{paymentRequests.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Request Modal */}
        <PaymentRequestModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setEditingPayment(null);
          }}
          offerId={offer.id}
          createdBy={currentUserId}
          existingRequest={editingPayment}
          onPaymentRequestCreated={handlePaymentRequestCreated}
        />

        {/* Review Modal */}
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          offerId={offer.id}
          reviewerId={currentUserId}
          revieweeId={isInfluencer ? offer.advertiserId : offer.influencerId}
          onReviewCreated={handleReviewCreated}
        />
      </div>
    </div>
  );
}