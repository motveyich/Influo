import React from 'react';
import { CollaborationOffer, OfferStatus, PaymentRequest } from '../../../core/types';
import { offerService } from '../services/offerService';
import { applicationService } from '../../applications/services/applicationService';
import { paymentRequestService } from '../services/paymentRequestService';
import { UserAvatar } from '../../../components/UserAvatar';
import { supabase } from '../../../core/supabase';
import { ViewCompletionModal } from './ViewCompletionModal';
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
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface OfferCardProps {
  offer: CollaborationOffer;
  currentUserId: string;
  userRole: 'influencer' | 'advertiser';
  onOfferUpdated: (offer: CollaborationOffer) => void;
  onViewDetails: (offer: CollaborationOffer, collaborationType?: 'application' | 'offer') => void;
  onViewProfile?: (userId: string) => void;
  collaborationType?: 'application' | 'offer';
  onRequestComplete?: (offer: CollaborationOffer, collaborationType: 'application' | 'offer') => void;
}

export function OfferCard({
  offer,
  currentUserId,
  userRole,
  onOfferUpdated,
  onViewDetails,
  onViewProfile,
  collaborationType = 'application',
  onRequestComplete
}: OfferCardProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPaymentWindows, setShowPaymentWindows] = React.useState(false);
  const [paymentRequests, setPaymentRequests] = React.useState<PaymentRequest[]>([]);
  const [paymentWindowsLoading, setPaymentWindowsLoading] = React.useState(false);
  const [paymentWindowsLoaded, setPaymentWindowsLoaded] = React.useState(false);
  const [partnerProfile, setPartnerProfile] = React.useState<any>(null);
  const [showViewCompletionModal, setShowViewCompletionModal] = React.useState(false);

  React.useEffect(() => {
    if (!paymentWindowsLoaded && collaborationType === 'offer') {
      loadPaymentWindows();
    }
    loadPartnerProfile();
  }, [collaborationType]);

  const loadPartnerProfile = async () => {
    try {
      const partnerId = userRole === 'influencer' ? offer.advertiserId : offer.influencerId;
      if (!partnerId) {
        console.warn('Partner ID is undefined');
        return;
      }

      const { data } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar')
        .eq('user_id', partnerId)
        .maybeSingle();
      if (data) setPartnerProfile(data);
    } catch (error) {
      console.error('Failed to load partner profile:', error);
    }
  };

  const loadPaymentWindows = async () => {
    try {
      setPaymentWindowsLoading(true);
      const payments = await paymentRequestService.getOfferPaymentRequests(offer.id);
      setPaymentRequests(payments);
      setPaymentWindowsLoaded(true);
    } catch (error) {
      console.error('Failed to load payment windows:', error);
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
      case 'pending_completion':
        return 'bg-purple-100 text-purple-800 border-purple-200';
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
      case 'pending_completion':
        return <Clock className="w-4 h-4" />;
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
      case 'pending_completion':
        return 'Ожидает подтверждения';
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

  const getTimelineDisplay = () => {
    if (!offer.timeline) return 'Не указано';

    if (typeof offer.timeline === 'string') return offer.timeline;

    if (typeof offer.timeline === 'object') {
      const timeline = offer.timeline as any;
      const startDate = timeline.start_date || timeline.startDate;
      const endDate = timeline.end_date || timeline.endDate;
      const deadline = timeline.deadline;

      try {
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          return `${start.toLocaleDateString('ru-RU')} - ${end.toLocaleDateString('ru-RU')}`;
        } else if (endDate) {
          const end = new Date(endDate);
          return `До ${end.toLocaleDateString('ru-RU')}`;
        } else if (startDate) {
          const start = new Date(startDate);
          return `С ${start.toLocaleDateString('ru-RU')}`;
        } else if (deadline) {
          const deadlineDate = new Date(deadline);
          return `До ${deadlineDate.toLocaleDateString('ru-RU')}`;
        }
      } catch (e) {
        console.error('Error formatting timeline:', e);
      }

      return deadline || startDate || 'Не указано';
    }

    return 'Не указано';
  };

  const handleStatusUpdate = async (newStatus: OfferStatus, additionalData?: any) => {
    // If requesting completion, open modal instead of calling API directly
    if (newStatus === 'completed' && onRequestComplete) {
      onRequestComplete(offer, collaborationType);
      return;
    }

    setIsLoading(true);
    try {
      console.log('[OfferCard] Updating collaboration:', {
        id: offer.id,
        newStatus,
        currentUserId,
        collaborationType
      });

      let updatedData: any;

      if (collaborationType === 'application') {
        switch (newStatus) {
          case 'accepted':
            updatedData = await applicationService.acceptApplication(offer.id);
            console.log('[OfferCard] Application accepted:', updatedData);
            break;
          case 'declined':
            updatedData = await applicationService.rejectApplication(offer.id);
            console.log('[OfferCard] Application rejected:', updatedData);
            break;
          case 'in_progress':
            updatedData = await applicationService.markInProgress(offer.id);
            console.log('[OfferCard] Application marked in progress:', updatedData);
            break;
          case 'completed':
            // This should not be reached if onRequestComplete is provided
            toast.error('Требуется загрузить скриншот для завершения');
            return;
          case 'terminated':
            updatedData = await applicationService.terminateApplication(offer.id);
            console.log('[OfferCard] Application terminated:', updatedData);
            break;
          case 'cancelled':
            updatedData = await applicationService.cancelApplication(offer.id);
            console.log('[OfferCard] Application cancelled:', updatedData);
            break;
          default:
            toast.error('Это действие недоступно для заявок');
            return;
        }
      } else {
        updatedData = await offerService.updateOfferStatus(offer.id, newStatus, currentUserId, additionalData);
        console.log('[OfferCard] Offer updated:', updatedData);
      }

      onOfferUpdated(updatedData);

      const statusMessages = {
        'accepted': collaborationType === 'application' ? 'Заявка принята' : 'Предложение принято',
        'declined': collaborationType === 'application' ? 'Заявка отклонена' : 'Предложение отклонено',
        'in_progress': 'Работа начата',
        'cancelled': collaborationType === 'application' ? 'Заявка отменена' : 'Предложение отменено',
        'completed': 'Сотрудничество завершено',
        'terminated': 'Сотрудничество расторгнуто'
      };

      toast.success(statusMessages[newStatus] || 'Статус обновлен');
    } catch (error: any) {
      console.error('[OfferCard] Failed to update collaboration status:', error);

      if (error.message?.includes('404') || error.message?.includes('not found')) {
        toast.error('Предложение не найдено. Пожалуйста, обновите страницу.');
      } else {
        toast.error(error.message || 'Не удалось обновить статус');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCompletion = async () => {
    setIsLoading(true);
    try {
      let updatedData: any;

      if (collaborationType === 'application') {
        updatedData = await applicationService.confirmCompletion(offer.id);
      } else {
        updatedData = await offerService.confirmCompletion(offer.id, currentUserId);
      }

      onOfferUpdated(updatedData);
      toast.success('Выполнение подтверждено');
      setShowViewCompletionModal(false);
    } catch (error: any) {
      console.error('Failed to confirm completion:', error);
      toast.error(error.message || 'Не удалось подтвердить выполнение');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectCompletion = async () => {
    setIsLoading(true);
    try {
      let updatedData: any;

      if (collaborationType === 'application') {
        updatedData = await applicationService.rejectCompletion(offer.id);
      } else {
        updatedData = await offerService.rejectCompletion(offer.id, currentUserId);
      }

      onOfferUpdated(updatedData);
      toast.success('Выполнение отклонено, сотрудничество возвращено в работу');
      setShowViewCompletionModal(false);
    } catch (error: any) {
      console.error('Failed to reject completion:', error);
      toast.error(error.message || 'Не удалось отклонить выполнение');
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableActions = () => {
    const actions = [];

    // Определяем роль пользователя в предложении с безопасными проверками
    const isInitiator = offer.initiatedBy ? currentUserId === offer.initiatedBy : false;
    const isReceiver = offer.initiatedBy
      ? !isInitiator && (currentUserId === offer.influencerId || currentUserId === offer.advertiserId)
      : (currentUserId === offer.influencerId || currentUserId === offer.advertiserId);

    // Проверяем, является ли текущий пользователь участником предложения
    const isParticipant = currentUserId === offer.influencerId || currentUserId === offer.advertiserId;

    if (!isParticipant) {
      console.warn('Current user is not a participant in this offer');
      return actions;
    }

    // Для applications доступны только базовые действия
    if (collaborationType === 'application') {
      if (offer.status === 'pending' || offer.status === 'sent') {
        if (isReceiver || !offer.initiatedBy) {
          actions.push(
            { label: 'Принять', action: 'accepted', style: 'success' },
            { label: 'Отклонить', action: 'declined', style: 'danger' }
          );
        }
      }
      return actions;
    }

    // Pending/Sent status actions (treat 'sent' same as 'pending')
    if (offer.status === 'pending' || offer.status === 'sent') {
      if (isReceiver || !offer.initiatedBy) {
        // Получатель может принять или отклонить
        // Если initiatedBy отсутствует, показываем обе кнопки обеим сторонам
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

    // Accepted status actions - только получатель может начать работу
    if (offer.status === 'accepted') {
      if (isReceiver) {
        // Только получатель может начать работу
        actions.push(
          { label: 'Начать работу', action: 'in_progress', style: 'success' }
        );
      }
      // Обе стороны могут расторгнуть
      actions.push(
        { label: 'Расторгнуть', action: 'terminated', style: 'danger' }
      );
    }

    // In progress actions
    if (offer.status === 'in_progress') {
      if (isReceiver) {
        // Получатель может завершить
        actions.push(
          { label: 'Завершить', action: 'completed', style: 'success' }
        );
      }
      // Обе стороны могут расторгнуть
      actions.push(
        { label: 'Расторгнуть', action: 'terminated', style: 'danger' }
      );
    }

    // Pending completion actions
    if (offer.status === 'pending_completion') {
      const completionInitiator = (offer as any).completionInitiatedBy;
      const isCompletionInitiator = completionInitiator === currentUserId;

      if (!isCompletionInitiator) {
        // Другая сторона может посмотреть и подтвердить/отклонить
        actions.push(
          { label: 'Посмотреть выполнение', action: 'view_completion', style: 'primary' }
        );
      } else {
        // Инициатор ждет подтверждения
        actions.push(
          { label: 'Ожидание подтверждения', action: 'waiting', style: 'neutral', disabled: true }
        );
      }
    }

    return actions;
  };

  const getUserRoleInOffer = () => {
    const role = userRole === 'influencer' ? 'Инфлюенсер' : 'Рекламодатель';

    if (!offer.initiatedBy) {
      return role;
    }

    const isInitiator = currentUserId === offer.initiatedBy;
    const roleType = isInitiator ? 'Отправитель' : 'Получатель';
    return `${role} (${roleType})`;
  };

  const getPartnerInfo = () => {
    const partnerId = currentUserId === offer.influencerId ? offer.advertiserId : offer.influencerId;
    const partnerRole = currentUserId === offer.influencerId ? 'Рекламодатель' : 'Инфлюенсер';

    if (!offer.initiatedBy) {
      return {
        label: partnerRole,
        id: partnerId || 'unknown'
      };
    }

    const isInitiator = currentUserId === offer.initiatedBy;
    const partnerType = isInitiator ? 'Получатель' : 'Отправитель';

    return {
      label: `${partnerRole} (${partnerType})`,
      id: partnerId || 'unknown'
    };
  };

  const availableActions = getAvailableActions();
  const partnerInfo = getPartnerInfo();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start space-x-4 mb-4">
        <button
          onClick={() => {
            const partnerId = userRole === 'influencer' ? offer.advertiserId : offer.influencerId;
            if (partnerId && onViewProfile) {
              onViewProfile(partnerId);
            }
          }}
          className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <UserAvatar
            avatarUrl={partnerProfile?.avatar}
            fullName={partnerProfile?.full_name}
            size="md"
          />
        </button>
        <div className="flex-1">
          <button
            onClick={() => {
              const partnerId = userRole === 'influencer' ? offer.advertiserId : offer.influencerId;
              if (partnerId && onViewProfile) {
                onViewProfile(partnerId);
              }
            }}
            className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors mb-1 block"
          >
            {partnerProfile?.full_name || (userRole === 'influencer' ? 'Рекламодатель' : 'Инфлюенсер')}
          </button>
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
              {offer.title || 'Без названия'}
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
            {offer.description || 'Нет описания'}
          </p>
        </div>
      </div>

      {/* Pending Completion Notice */}
      {offer.status === 'pending_completion' && (offer as any).metadata?.completion_screenshot_url && (
        <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-900 mb-1">
                {(offer as any).completionInitiatedBy === currentUserId
                  ? 'Ожидается подтверждение от партнера'
                  : 'Требуется ваше подтверждение выполнения'}
              </p>
              <p className="text-xs text-purple-700">
                {(offer as any).completionInitiatedBy === currentUserId
                  ? 'Вы загрузили скриншот выполнения. Ожидайте подтверждения от партнера.'
                  : 'Партнер загрузил скриншот выполнения. Пожалуйста, проверьте и подтвердите.'}
              </p>
              {(offer as any).metadata?.completion_screenshot_uploaded_at && (
                <p className="text-xs text-purple-600 mt-1">
                  Загружено {formatDistanceToNow(parseISO((offer as any).metadata.completion_screenshot_uploaded_at), { addSuffix: true, locale: ru })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-green-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {formatCurrency(
                offer.acceptedRate || offer.suggestedBudget || offer.proposedRate || 0,
                offer.currency
              )}
            </p>
            <p className="text-xs text-gray-600">
              {offer.acceptedRate && offer.acceptedRate !== (offer.proposedRate || 0)
                ? 'Принятая ставка'
                : 'Предложенная ставка'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {getTimelineDisplay()}
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

      {/* Payment Windows Section - only for offers */}
      {collaborationType === 'offer' && (
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
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onViewDetails(offer, collaborationType)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors flex items-center space-x-1"
          >
            <Eye className="w-4 h-4" />
            <span>Подробнее</span>
          </button>

          {onViewProfile && (
            <button
              onClick={() => {
                const otherUserId = userRole === 'influencer' ? offer.advertiserId : offer.influencerId;
                if (otherUserId) {
                  onViewProfile(otherUserId);
                } else {
                  toast.error('Не удалось определить профиль пользователя');
                }
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
                onClick={() => {
                  if (action.action === 'view_completion') {
                    setShowViewCompletionModal(true);
                  } else if (!action.disabled) {
                    handleStatusUpdate(action.action as OfferStatus);
                  }
                }}
                disabled={isLoading || action.disabled}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                  action.style === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                  action.style === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' :
                  action.style === 'primary' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                  action.style === 'neutral' ? 'bg-gray-400 text-white cursor-not-allowed' :
                  'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* View Completion Modal */}
      {showViewCompletionModal && offer.status === 'pending_completion' && (offer as any).metadata?.completion_screenshot_url && (
        <ViewCompletionModal
          isOpen={showViewCompletionModal}
          onClose={() => setShowViewCompletionModal(false)}
          offer={offer}
          screenshotUrl={(offer as any).metadata.completion_screenshot_url}
          onConfirm={handleConfirmCompletion}
          onReject={handleRejectCompletion}
        />
      )}
    </div>
  );
}