import React from 'react';
import { CollaborationOffer, OfferStatus, PaymentRequest } from '../../../core/types';
import { offerService } from '../services/offerService';
import { paymentRequestService } from '../services/paymentRequestService';
import {
  Clock,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Eye,
  Settings,
  Play,
  Trophy,
  Ban,
  CreditCard,
  FileText,
  Target,
  User,
  ChevronDown,
  ChevronUp,
  Zap,
  Globe,
  UserCircle
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

interface OfferCardProps {
  offer: CollaborationOffer;
  currentUserId: string;
  userRole: 'influencer' | 'advertiser';
  onOfferUpdated: (offer: CollaborationOffer) => void;
  onViewDetails: (offer: CollaborationOffer) => void;
  onViewProfile?: (userId: string) => void;
}

export function OfferCard({
  offer,
  currentUserId,
  userRole,
  onOfferUpdated,
  onViewDetails,
  onViewProfile
}: OfferCardProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPaymentWindows, setShowPaymentWindows] = React.useState(false);
  const [paymentRequests, setPaymentRequests] = React.useState<PaymentRequest[]>([]);
  const [paymentWindowsLoading, setPaymentWindowsLoading] = React.useState(false);
  const [paymentWindowsLoaded, setPaymentWindowsLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!paymentWindowsLoaded) {
      loadPaymentWindows();
    }
  }, []);

  const loadPaymentWindows = async () => {
    try {
      setPaymentWindowsLoading(true);
      const payments = await paymentRequestService.getOfferPaymentRequests(offer.id);
      setPaymentRequests(payments);
      setPaymentWindowsLoaded(true);
    } catch (error) {
      console.error('Failed to load payment windows:', error);
      toast.error('Не удалось загрузить окна оплаты');
    } finally {
      setPaymentWindowsLoading(false);
    }
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

  const getStatusIcon = (status: OfferStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Play className="w-4 h-4" />;
      case 'completed':
        return <Trophy className="w-4 h-4" />;
      case 'terminated':
        return <Ban className="w-4 h-4" />;
      case 'declined':
        return <XCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: OfferStatus) => {
    switch (status) {
      case 'pending':
        return 'Ожидает ответа';
      case 'accepted':
        return 'Принято';
      case 'in_progress':
        return 'В работе';
      case 'completed':
        return 'Завершено';
      case 'terminated':
        return 'Расторгнуто';
      case 'declined':
        return 'Отклонено';
      case 'cancelled':
        return 'Отменено';
      default:
        return status;
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

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Подтверждено';
      case 'paid':
        return 'Оплачено';
      case 'paying':
        return 'Оплачивается';
      case 'failed':
        return 'Ошибка оплаты';
      case 'pending':
        return 'Ожидает оплаты';
      case 'cancelled':
        return 'Отменено';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleStatusUpdate = async (newStatus: OfferStatus, additionalData?: any) => {
    setIsLoading(true);
    try {
      const updatedOffer = await offerService.updateOfferStatus(offer.id, newStatus, currentUserId, additionalData);
      onOfferUpdated(updatedOffer);
      
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
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableActions = () => {
    const actions = [];
    
    // Определяем роль пользователя в предложении
    const isInitiator = currentUserId === offer.initiatedBy;
    const isReceiver = !isInitiator && (currentUserId === offer.influencerId || currentUserId === offer.advertiserId);

    // Pending status actions
    if (offer.status === 'pending') {
      if (isReceiver) {
        // Получатель может принять или отклонить
        actions.push(
          { label: 'Принять', action: 'accepted', style: 'success' },
          { label: 'Отклонить', action: 'declined', style: 'danger' }
        );
      } else if (isInitiator) {
        // Инициатор может только отменить
        actions.push(
          { label: 'Отменить', action: 'cancelled', style: 'neutral' }
        );
      }
    }

    // In progress actions (both roles)
    if (offer.status === 'in_progress') {
      actions.push(
        { label: 'Завершить', action: 'completed', style: 'success' },
        { label: 'Расторгнуть', action: 'terminated', style: 'danger' }
      );
    }

    return actions;
  };

  const getUserRoleInOffer = () => {
    const isInitiator = currentUserId === offer.initiatedBy;
    const role = userRole === 'influencer' ? 'Инфлюенсер' : 'Рекламодатель';
    const roleType = isInitiator ? 'Отправитель' : 'Получатель';
    return `${role} (${roleType})`;
  };

  const getPartnerInfo = () => {
    const isInitiator = currentUserId === offer.initiatedBy;
    const partnerId = currentUserId === offer.influencerId ? offer.advertiserId : offer.influencerId;
    const partnerRole = currentUserId === offer.influencerId ? 'Рекламодатель' : 'Инфлюенсер';
    const partnerType = isInitiator ? 'Получатель' : 'Отправитель';
    
    return {
      label: `${partnerRole} (${partnerType})`,
      id: partnerId
    };
  };

  const availableActions = getAvailableActions();
  const partnerInfo = getPartnerInfo();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
              {offer.title}
            </h3>
            {(offer as any).metadata?.isAutoCampaign && (
              <span className="px-3 py-1 text-sm font-medium rounded-full border bg-blue-100 text-blue-800 border-blue-200">
                <div className="flex items-center space-x-1">
                  <Target className="w-3 h-3" />
                  <span>Автокомпания</span>
                </div>
              </span>
            )}
            <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(offer.status)}`}>
              <div className="flex items-center space-x-1">
                {getStatusIcon(offer.status)}
                <span>{getStatusLabel(offer.status)}</span>
              </div>
            </span>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
            <div className="flex items-center space-x-1">
              <User className="w-4 h-4" />
              <span>Ваша роль: {getUserRoleInOffer()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{partnerInfo.label}: {partnerInfo.id.substring(0, 8)}...</span>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 line-clamp-2">
            {offer.description}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-green-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {formatCurrency(
                offer.acceptedRate || offer.suggestedBudget || offer.proposedRate,
                offer.currency
              )}
            </p>
            <p className="text-xs text-gray-600">
              {offer.acceptedRate && offer.acceptedRate !== offer.proposedRate
                ? 'Принятая ставка'
                : 'Предложенная ставка'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {offer.timeline}
            </p>
            <p className="text-xs text-gray-600">Сроки</p>
          </div>
        </div>

        {offer.platform && (
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {offer.platform}
              </p>
              <p className="text-xs text-gray-600">Платформа</p>
            </div>
          </div>
        )}

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

      {/* Content Type */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Тип контента:</p>
        <div className="flex flex-wrap gap-1">
          {(() => {
            const isAutomatic = (offer as any).metadata?.isAutomatic;

            if (offer.contentType) {
              return (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">
                  {offer.contentType}
                </span>
              );
            }

            if (isAutomatic && offer.integrationType) {
              return (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">
                  {offer.integrationType}
                </span>
              );
            }

            return (
              <>
                {offer.deliverables.slice(0, 3).map((deliverable, index) => {
                  const displayText = typeof deliverable === 'string'
                    ? deliverable
                    : (deliverable as any).type || (deliverable as any).description || 'Результат';

                  return (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
                    >
                      {displayText}
                    </span>
                  );
                })}
                {offer.deliverables.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                    +{offer.deliverables.length - 3} еще
                  </span>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Payment Windows Section */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <button
          onClick={() => setShowPaymentWindows(!showPaymentWindows)}
          className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">
              Окна оплаты ({paymentRequests.length})
            </span>
          </div>
          {showPaymentWindows ? (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </button>

        {showPaymentWindows && (
          <div className="mt-3 space-y-2">
            {paymentWindowsLoading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Загрузка окон оплаты...</span>
              </div>
            ) : paymentRequests.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <CreditCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Окна оплаты не созданы</p>
                {userRole === 'influencer' && ['accepted', 'in_progress'].includes(offer.status) && (
                  <p className="text-xs text-gray-500 mt-1">
                    Вы можете создать окно оплаты в детальном просмотре
                  </p>
                )}
              </div>
            ) : (
              paymentRequests.map((payment) => (
                <div key={payment.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPaymentStatusColor(payment.status)}`}>
                          {getPaymentStatusLabel(payment.status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {payment.paymentType === 'prepay' ? 'Предоплата' : 
                         payment.paymentType === 'postpay' ? 'Постоплата' : 'Полная оплата'} • 
                        {payment.paymentMethod}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(parseISO(payment.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {payment.instructions && (
                    <p className="text-xs text-gray-600 mt-2 p-2 bg-white rounded border">
                      {payment.instructions}
                    </p>
                  )}

                  {/* Payment Details */}
                  {payment.paymentDetails && Object.keys(payment.paymentDetails).length > 0 && (
                    <div className="mt-2 p-2 bg-white rounded border">
                      <div className="grid grid-cols-1 gap-1 text-xs text-gray-700">
                        {payment.paymentDetails.bankAccount && (
                          <p><span className="font-medium">Счет:</span> {payment.paymentDetails.bankAccount}</p>
                        )}
                        {payment.paymentDetails.cardNumber && (
                          <p><span className="font-medium">Карта:</span> {payment.paymentDetails.cardNumber}</p>
                        )}
                        {payment.paymentDetails.paypalEmail && (
                          <p><span className="font-medium">PayPal:</span> {payment.paymentDetails.paypalEmail}</p>
                        )}
                        {payment.paymentDetails.accountHolder && (
                          <p><span className="font-medium">Владелец:</span> {payment.paymentDetails.accountHolder}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onViewDetails(offer)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors flex items-center space-x-1"
          >
            <Eye className="w-4 h-4" />
            <span>Подробнее</span>
          </button>

          {onViewProfile && (
            <button
              onClick={() => {
                const otherUserId = userRole === 'influencer' ? offer.advertiserId : offer.influencerId;
                onViewProfile(otherUserId);
              }}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors flex items-center space-x-1"
              title="Просмотр профиля"
            >
              <UserCircle className="w-4 h-4" />
              <span>Профиль</span>
            </button>
          )}
        </div>

        {availableActions.length > 0 && (
          <div className="flex space-x-2">
            {availableActions.map((action) => (
              <button
                key={action.action}
                onClick={() => handleStatusUpdate(action.action as OfferStatus)}
                disabled={isLoading}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                  action.style === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
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
    </div>
  );
}