import React, { useEffect, useState } from 'react';
import {
  X,
  Zap,
  Target,
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  Award,
  CheckCircle,
  FileText,
  Info,
  AlertCircle,
  CreditCard,
  PlayCircle,
  Package,
  Clock,
  Building,
  Globe,
  Mail,
  XCircle,
  Ban,
  Flag,
  Check
} from 'lucide-react';
import { automaticOfferService } from '../../campaigns/services/automaticOfferService';
import { offerService } from '../services/offerService';
import { paymentRequestService } from '../services/paymentRequestService';
import { PaymentRequestModal } from './PaymentRequestModal';
import { ReportModal } from '../../../components/ReportModal';
import { PaymentRequest, PaymentRequestStatus } from '../../../core/types';
import { MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { blacklistService } from '../../../services/blacklistService';

interface AutomaticCampaignDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  currentUserId: string;
  onOfferUpdated?: () => void;
}

export function AutomaticCampaignDetailsModal({
  isOpen,
  onClose,
  offerId,
  currentUserId,
  onOfferUpdated
}: AutomaticCampaignDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [editingPayment, setEditingPayment] = useState<PaymentRequest | null>(null);
  const [isBlacklisted, setIsBlacklisted] = useState(false);

  const isInfluencer = details?.influencer_id === currentUserId;
  const isAdvertiser = details?.advertiser_id === currentUserId;

  useEffect(() => {
    if (isOpen && offerId) {
      loadDetails();
    }
  }, [isOpen, offerId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await automaticOfferService.getAutomaticOfferDetails(offerId);
      setDetails(data);

      // Load payment requests
      const payments = await paymentRequestService.getPaymentRequestsForOffer(offerId);
      setPaymentRequests(payments);

      // Check blacklist status
      const targetUserId = isInfluencer ? data.advertiser_id : data.influencer_id;
      if (targetUserId) {
        const blacklisted = await blacklistService.isInMyBlacklist(targetUserId);
        setIsBlacklisted(blacklisted);
      }
    } catch (error) {
      console.error('Failed to load automatic campaign details:', error);
      setError('Не удалось загрузить детали кампании');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlacklist = async () => {
    try {
      const targetUserId = isInfluencer ? details.advertiser_id : details.influencer_id;
      if (!targetUserId) return;

      setActionLoading(true);

      if (isBlacklisted) {
        await blacklistService.removeFromBlacklist(targetUserId);
        toast.success('Пользователь удалён из чёрного списка');
        setIsBlacklisted(false);
      } else {
        const reason = prompt('Укажите причину (необязательно):');
        await blacklistService.addToBlacklist(targetUserId, reason || undefined);
        toast.success('Пользователь добавлен в чёрный список');
        setIsBlacklisted(true);
      }
    } catch (error: any) {
      console.error('Failed to toggle blacklist:', error);
      toast.error(error.message || 'Не удалось обновить чёрный список');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOffer = async () => {
    if (!confirm('Вы уверены, что хотите расторгнуть сотрудничество?')) return;

    try {
      setActionLoading(true);
      await offerService.updateOfferStatus(offerId, 'cancelled', currentUserId);
      toast.success('Сотрудничество расторгнуто');
      onOfferUpdated?.();
      onClose();
    } catch (error) {
      console.error('Failed to cancel offer:', error);
      toast.error('Не удалось расторгнуть сотрудничество');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectOffer = async () => {
    if (!confirm('Вы уверены, что хотите отказаться от предложения?')) return;

    try {
      setActionLoading(true);
      await offerService.updateOfferStatus(offerId, 'rejected', currentUserId);
      toast.success('Предложение отклонено');
      onOfferUpdated?.();
      onClose();
    } catch (error) {
      console.error('Failed to reject offer:', error);
      toast.error('Не удалось отклонить предложение');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteOffer = async () => {
    if (!confirm('Вы уверены, что хотите завершить сотрудничество? Все условия должны быть выполнены.')) return;

    try {
      setActionLoading(true);
      await offerService.updateOfferStatus(offerId, 'completed', currentUserId);
      toast.success('Сотрудничество завершено');
      onOfferUpdated?.();
      onClose();
    } catch (error) {
      console.error('Failed to complete offer:', error);
      toast.error('Не удалось завершить сотрудничество');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmTerms = async () => {
    if (!confirm('Подтвердите, что все условия сотрудничества выполнены.')) return;

    try {
      setActionLoading(true);
      await offerService.confirmOfferTerms(offerId);
      toast.success('Условия подтверждены');
      loadDetails();
    } catch (error) {
      console.error('Failed to confirm terms:', error);
      toast.error('Не удалось подтвердить условия');
    } finally {
      setActionLoading(false);
    }
  };

  // Payment Request Handlers
  const handlePaymentRequestCreated = (request: PaymentRequest) => {
    setShowPaymentModal(false);
    setEditingPayment(null);
    loadDetails(); // Reload to get fresh data
    toast.success(editingPayment ? 'Окно оплаты обновлено успешно!' : 'Окно оплаты создано успешно!');
  };

  const handleEditPayment = (payment: PaymentRequest) => {
    setEditingPayment(payment);
    setShowPaymentModal(true);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Вы уверены, что хотите удалить окно оплаты?')) return;

    try {
      await paymentRequestService.deletePaymentRequest(paymentId, currentUserId);
      setPaymentRequests(prev => prev.filter(p => p.id !== paymentId));
      toast.success('Окно оплаты удалено');
    } catch (error: any) {
      console.error('Failed to delete payment request:', error);
      toast.error(error.message || 'Не удалось удалить окно оплаты');
    }
  };

  const handlePaymentStatusChange = async (paymentId: string, newStatus: PaymentRequestStatus) => {
    try {
      await paymentRequestService.updatePaymentStatus(paymentId, newStatus, currentUserId);
      const updatedPayments = await paymentRequestService.getPaymentRequestsForOffer(offerId);
      setPaymentRequests(updatedPayments);
      toast.success('Статус оплаты обновлен');
    } catch (error: any) {
      console.error('Failed to update payment status:', error);
      toast.error(error.message || 'Не удалось обновить статус оплаты');
    }
  };

  const getActivePaymentRequest = () => {
    return paymentRequests.find(pr => ['draft', 'pending', 'paying', 'paid'].includes(pr.status));
  };

  const canCreatePaymentRequest = () => {
    return currentUserId &&
           currentUserId !== '' &&
           isInfluencer &&
           ['accepted', 'in_progress'].includes(details?.status) &&
           !getActivePaymentRequest();
  };

  const canEditPaymentRequest = (payment: PaymentRequest) => {
    return isInfluencer &&
           payment.createdBy === currentUserId &&
           !payment.isFrozen &&
           ['draft', 'pending'].includes(payment.status);
  };

  const formatCurrency = (amount: number, currency: string) => {
    const currencySymbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      RUB: '₽',
      GBP: '£'
    };
    return `${currencySymbols[currency] || currency} ${amount.toLocaleString()}`;
  };

  const getPaymentStatusColor = (status: PaymentRequestStatus) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'paying': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'paid': return 'bg-green-100 text-green-800 border-green-300';
      case 'confirmed': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'disputed': return 'bg-red-100 text-red-800 border-red-300';
      case 'failed': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleContactAdvertiser = () => {
    // Navigate to chat with advertiser
    window.location.href = `/app/chat?userId=${details?.advertiser_id}`;
  };

  const handleContactInfluencer = () => {
    // Navigate to chat with influencer
    window.location.href = `/app/chat?userId=${details?.influencer_id}`;
  };

  if (!isOpen) return null;

  const advertiserData = details?.advertiserProfile?.advertiser_data || {};
  const companyName = advertiserData.companyName || details?.advertiserProfile?.full_name || 'Не указано';
  const website = advertiserData.organizationWebsite || details?.advertiserProfile?.website;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Автоматическая кампания</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Детали предложения и условия</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">{error}</p>
              <button
                onClick={loadDetails}
                className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                Попробовать снова
              </button>
            </div>
          ) : details ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/30 dark:to-yellow-900/30 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-5">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-orange-900 dark:text-orange-300 text-lg">Что такое автоматическая кампания?</h3>
                    <p className="text-sm text-orange-800 dark:text-orange-400 mt-2 leading-relaxed">
                      Это предложение создано автоматически системой на основе анализа вашего профиля,
                      аудитории и опыта. Рекламодатель не участвует в личной переписке -
                      вся работа происходит через систему окон оплаты и проверку результатов.
                    </p>
                  </div>
                </div>
              </div>

              {details.advertiserProfile && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Building className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                    О рекламодателе
                  </h3>
                  <div className="bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl p-5">
                    <div className="flex items-start space-x-4">
                      {details.advertiserProfile.avatar ? (
                        <img
                          src={details.advertiserProfile.avatar}
                          alt={companyName}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                          <Building className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-lg">{companyName}</h4>
                        {details.advertiserProfile.bio && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{details.advertiserProfile.bio}</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-3">
                          {website && (
                            <a
                              href={website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <Globe className="w-4 h-4" />
                              <span>Веб-сайт</span>
                            </a>
                          )}
                          {advertiserData.industry && (
                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                              {advertiserData.industry}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                  О кампании
                </h3>
                <div className="bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl p-5 space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">{details.campaignDetails?.title || details.details?.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{details.campaignDetails?.description || details.details?.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Бренд</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{details.campaignDetails?.brand || 'Не указан'}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Бюджет кампании</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {details.campaignDetails?.budget?.min} - {details.campaignDetails?.budget?.max} {details.campaignDetails?.budget?.currency}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                  Ваше предложение
                </h3>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-purple-700 dark:text-purple-300 uppercase tracking-wide font-medium">Предлагаемое вознаграждение</p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-200 mt-1">
                        {details.proposed_rate || details.details?.price || details.details?.proposed_rate || 0} ₽
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        {details.details?.integrationType ? `${details.details.integrationType} на ${details.details.platform}` : 'Рассчитано на основе ваших тарифов'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">Сроки выполнения</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                        {details.timeline?.startDate && details.timeline?.endDate
                          ? `${new Date(details.timeline.startDate).toLocaleDateString('ru-RU')} - ${new Date(details.timeline.endDate).toLocaleDateString('ru-RU')}`
                          : details.details?.timeline || 'Не указаны'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {details.details?.deliverables && details.details.deliverables.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                    Что нужно создать
                  </h3>
                  <div className="bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl p-5">
                    <div className="space-y-3">
                      {details.details.deliverables.map((deliverable: any, index: number) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{deliverable.type}</p>
                            {deliverable.quantity && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">Количество: {deliverable.quantity}</p>
                            )}
                            {deliverable.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{deliverable.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {details.details?.contentTypes && details.details.contentTypes.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <PlayCircle className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                    Требуемый контент
                  </h3>
                  <div className="bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl p-5">
                    <div className="flex flex-wrap gap-2">
                      {details.details.contentTypes.map((type: string) => (
                        <span
                          key={type}
                          className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-lg border border-indigo-200 dark:border-indigo-800"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {details.metadata?.score && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Award className="w-5 h-5 mr-2 text-yellow-600 dark:text-yellow-400" />
                    Почему выбрали вас?
                  </h3>
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 border-2 border-yellow-300 dark:border-yellow-800 rounded-xl p-5">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">{Math.round(details.metadata.score)}</div>
                          <div className="text-xs text-white opacity-90">из 100</div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Ваш профиль получил высокую оценку соответствия требованиям кампании!
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                          Система проанализировала множество факторов: размер и активность вашей аудитории,
                          уровень вовлеченности, общий рейтинг, опыт завершенных кампаний.
                          Вы были выбраны среди лучших кандидатов для этого проекта.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Info className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Как это работает?
                </h3>
                <div className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-5">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-300">Примите предложение</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          Если условия вас устраивают, примите предложение. Система автоматически создаст окна оплаты.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-300">Создайте контент</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          Выполните работу согласно требованиям. Загрузите результаты через окно оплаты.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-300">Получите оплату</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          Рекламодатель проверит результаты и одобрит оплату. Средства поступят на ваши реквизиты.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-amber-600 dark:text-amber-400" />
                  Важно знать
                </h3>
                <div className="bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-5">
                  <ul className="space-y-2 text-sm text-amber-900 dark:text-amber-300">
                    {!details?.campaignDetails?.enable_chat && (
                      <li className="flex items-start space-x-2">
                        <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                        <span>В автоматических кампаниях нет прямого общения с рекламодателем</span>
                      </li>
                    )}
                    {details?.campaignDetails?.enable_chat && (
                      <li className="flex items-start space-x-2">
                        <span className="text-purple-600 dark:text-purple-400 font-bold mt-0.5">•</span>
                        <span>В этой кампании включен чат - вы можете напрямую общаться с {isInfluencer ? 'рекламодателем' : 'инфлюенсером'}</span>
                      </li>
                    )}
                    <li className="flex items-start space-x-2">
                      <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                      <span>Все условия и требования указаны в этом предложении</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                      <span>Рекламодатель проверяет результаты работы через окна оплаты</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                      <span>Оплата происходит после одобрения результатов</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                      <span>При возникновении проблем вы можете обратиться в поддержку</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Payment Windows Section */}
              {['accepted', 'in_progress', 'completed'].includes(details.status) && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                      <CreditCard className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                      Окна оплаты
                    </h3>
                    {canCreatePaymentRequest() && (
                      <button
                        onClick={() => {
                          if (!currentUserId) {
                            alert('Пожалуйста, войдите в систему');
                            return;
                          }
                          setShowPaymentModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Создать окно оплаты</span>
                      </button>
                    )}
                  </div>

                  {paymentRequests.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
                      <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400 mb-2">Окна оплаты не созданы</p>
                      {canCreatePaymentRequest() && (
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          Создайте окно оплаты для получения средств от рекламодателя
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {paymentRequests.map((payment) => (
                        <div key={payment.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center space-x-3 mb-2">
                                <p className="text-lg font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(payment.amount, payment.currency)}
                                </p>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPaymentStatusColor(payment.status)}`}>
                                  {payment.status === 'confirmed' ? 'Подтверждено' :
                                   payment.status === 'paid' ? 'Оплачено' :
                                   payment.status === 'paying' ? 'В процессе оплаты' :
                                   payment.status === 'pending' ? 'Ожидает' :
                                   payment.status === 'disputed' ? 'Спорный' :
                                   payment.status === 'failed' ? 'Не удалось' :
                                   'Черновик'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Тип: {payment.paymentType === 'prepay' ? 'Предоплата' :
                                       payment.paymentType === 'postpay' ? 'Постоплата' : 'Полная оплата'}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Способ: {payment.paymentMethod === 'bank_transfer' ? 'Банковский перевод' :
                                         payment.paymentMethod === 'card' ? 'Карта' :
                                         payment.paymentMethod === 'paypal' ? 'PayPal' : 'Криптовалюта'}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              {canEditPaymentRequest(payment) && (
                                <>
                                  <button
                                    onClick={() => handleEditPayment(payment)}
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                  >
                                    Редактировать
                                  </button>
                                  <button
                                    onClick={() => handleDeletePayment(payment.id)}
                                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                                  >
                                    Удалить
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {payment.instructions && (
                            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-400">
                              <p className="font-medium">Инструкции:</p>
                              <p>{payment.instructions}</p>
                            </div>
                          )}

                          {/* Payment Actions for Advertiser */}
                          {isAdvertiser && payment.status === 'pending' && (
                            <div className="mt-3 flex space-x-2">
                              <button
                                onClick={() => handlePaymentStatusChange(payment.id, 'paying')}
                                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-md"
                              >
                                Начать оплату
                              </button>
                              <button
                                onClick={() => handlePaymentStatusChange(payment.id, 'failed')}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md"
                              >
                                Отклонить
                              </button>
                            </div>
                          )}

                          {isAdvertiser && payment.status === 'paying' && (
                            <div className="mt-3 flex space-x-2">
                              <button
                                onClick={() => handlePaymentStatusChange(payment.id, 'paid')}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md"
                              >
                                Подтвердить оплату
                              </button>
                            </div>
                          )}

                          {isInfluencer && payment.status === 'paid' && (
                            <div className="mt-3">
                              <button
                                onClick={() => handlePaymentStatusChange(payment.id, 'confirmed')}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-md"
                              >
                                Подтвердить получение
                              </button>
                            </div>
                          )}

                          {payment.status === 'draft' && isInfluencer && (
                            <div className="mt-3">
                              <button
                                onClick={() => handlePaymentStatusChange(payment.id, 'pending')}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md"
                              >
                                Отправить рекламодателю
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Не удалось загрузить детали кампании</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Попробуйте обновить страницу</p>
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          {details && (
            <div className="flex flex-wrap gap-2">
              {details.status === 'accepted' && isInfluencer && (
                <>
                  <button
                    onClick={handleConfirmTerms}
                    disabled={actionLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>Подтвердить выполнение</span>
                  </button>

                  <button
                    onClick={handleCancelOffer}
                    disabled={actionLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Расторгнуть</span>
                  </button>
                </>
              )}

              {details.status === 'pending' && isInfluencer && (
                <button
                  onClick={handleRejectOffer}
                  disabled={actionLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Отказаться</span>
                </button>
              )}

              {isInfluencer && details?.campaignDetails?.enable_chat && (
                <button
                  onClick={handleContactAdvertiser}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Связаться с рекламодателем</span>
                </button>
              )}

              {details.status === 'accepted' && isAdvertiser && (
                <button
                  onClick={handleCompleteOffer}
                  disabled={actionLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Завершить сотрудничество</span>
                </button>
              )}

              {isAdvertiser && details?.campaignDetails?.enable_chat && (
                <button
                  onClick={handleContactInfluencer}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Связаться с инфлюенсером</span>
                </button>
              )}

              <button
                onClick={() => setShowReportModal(true)}
                disabled={actionLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Flag className="w-4 h-4" />
                <span>Пожаловаться</span>
              </button>

              <button
                onClick={handleToggleBlacklist}
                disabled={actionLoading}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                  isBlacklisted
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                <Ban className="w-4 h-4" />
                <span>{isBlacklisted ? 'Убрать из чёрного списка' : 'В чёрный список'}</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-semibold transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentRequestModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setEditingPayment(null);
          }}
          offerId={offerId}
          createdBy={currentUserId}
          existingRequest={editingPayment}
          onPaymentRequestCreated={handlePaymentRequestCreated}
        />
      )}

      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          entityType="offer"
          entityId={offerId}
          reportedUserId={isInfluencer ? details.advertiser_id : details.influencer_id}
        />
      )}
    </div>
  );
}
