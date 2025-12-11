import React, { useState, useEffect } from 'react';
import { ContentReport, ReportType } from '../../../core/types';
import { moderationService } from '../../../services/moderationService';
import { useAuth } from '../../../hooks/useAuth';
import { CompactChatModal } from './CompactChatModal';
import { OfferViewModal } from './OfferViewModal';
import {
  Flag,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Target,
  MessageCircle,
  Grid,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Calendar,
  Ban,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ReportsManagementProps {
  onStatsUpdate: () => void;
}

export function ReportsManagement({ onStatsUpdate }: ReportsManagementProps) {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [offerDetails, setOfferDetails] = useState<any>(null);
  const [loadingOfferDetails, setLoadingOfferDetails] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    offer: true,
    payments: true,
    chat: false
  });

  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadReports();
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    if (selectedReport && selectedReport.targetType === 'offer') {
      loadOfferDetails(selectedReport.targetId);
    } else {
      setOfferDetails(null);
    }
  }, [selectedReport]);

  const loadOfferDetails = async (offerId: string) => {
    try {
      setLoadingOfferDetails(true);
      const { offerService } = await import('../../offers/services/offerService');
      const { paymentRequestService } = await import('../../offers/services/paymentRequestService');
      const { chatService } = await import('../../chat/services/chatService');
      const { supabase } = await import('../../../core/supabase');

      const offer = await offerService.getOfferById(offerId);

      if (!offer) {
        throw new Error('Предложение не найдено');
      }

      const payments = await paymentRequestService.getPaymentRequestsForOffer(offerId).catch(() => []);

      // Получить информацию об участниках с email
      const { data: influencerProfile } = await supabase
        .from('user_profiles')
        .select('full_name, avatar, role, bio, website, user_id, email')
        .eq('user_id', offer.influencerId)
        .maybeSingle();

      const { data: advertiserProfile } = await supabase
        .from('user_profiles')
        .select('full_name, avatar, role, bio, website, user_id, email')
        .eq('user_id', offer.advertiserId)
        .maybeSingle();

      // Получить сообщения между пользователями
      let chatId = (offer as any).chatId;
      let messages = [];

      try {
        // Используем прямой метод получения сообщений между пользователями
        messages = await chatService.getMessagesBetweenUsers(
          offer.influencerId,
          offer.advertiserId
        );
        console.log('Loaded messages:', messages.length);
      } catch (chatError) {
        console.error('Failed to load chat messages:', chatError);
        // Продолжаем даже если не удалось загрузить сообщения
      }

      setOfferDetails({
        offer,
        payments,
        messages,
        chatId,
        influencer: { id: offer.influencerId, profile: influencerProfile },
        advertiser: { id: offer.advertiserId, profile: advertiserProfile }
      });
    } catch (error) {
      console.error('Failed to load offer details:', error);
      setOfferDetails(null);
    } finally {
      setLoadingOfferDetails(false);
    }
  };

  const handleBlockUser = async (userId: string, userName: string) => {
    if (!confirm(`Вы уверены, что хотите заблокировать пользователя ${userName}?`)) {
      return;
    }

    try {
      const { adminService } = await import('../../../services/adminService');
      await adminService.blockUser(userId, 'Заблокирован администратором через рассмотрение жалобы');
      toast.success(`Пользователь ${userName} заблокирован`);
      await loadOfferDetails(selectedReport!.targetId);
    } catch (error: any) {
      console.error('Failed to block user:', error);
      toast.error(error.message || 'Не удалось заблокировать пользователя');
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const loadedReports = await moderationService.getReports({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        reportType: typeFilter !== 'all' ? typeFilter : undefined
      });
      setReports(loadedReports);
    } catch (error) {
      console.error('Failed to load reports:', error);
      toast.error('Не удалось загрузить жалобы');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveReport = async (reportId: string, resolution: 'resolved' | 'dismissed') => {
    try {
      await moderationService.resolveReport(reportId, resolution, resolutionNotes, currentUser!.id);
      await loadReports();
      onStatsUpdate();
      setSelectedReport(null);
      setResolutionNotes('');
      toast.success(`Жалоба ${resolution === 'resolved' ? 'решена' : 'отклонена'}`);
    } catch (error: any) {
      console.error('Failed to resolve report:', error);
      toast.error(error.message || 'Не удалось обработать жалобу');
    }
  };

  const getReportTypeIcon = (reportType: ReportType) => {
    switch (reportType) {
      case 'spam':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'inappropriate':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'fake':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'harassment':
        return <Flag className="w-4 h-4 text-red-600" />;
      case 'copyright':
        return <Eye className="w-4 h-4 text-blue-600" />;
      default:
        return <Flag className="w-4 h-4 text-gray-600" />;
    }
  };

  const getReportTypeLabel = (reportType: ReportType) => {
    switch (reportType) {
      case 'spam':
        return 'Скам';
      case 'fake':
        return 'Введение в заблуждение, неверная информация';
      case 'harassment':
        return 'Домогательства';
      case 'inappropriate':
        return 'Неподходящий контент';
      case 'copyright':
        return 'Авторские права';
      default:
        return 'Другое';
    }
  };

  const getTargetTypeIcon = (targetType: string) => {
    switch (targetType) {
      case 'user_profile':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'influencer_card':
        return <Grid className="w-4 h-4 text-blue-600" />;
      case 'campaign':
        return <Target className="w-4 h-4 text-green-600" />;
      case 'chat_message':
        return <MessageCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <Eye className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'text-red-600 bg-red-100';
    if (priority >= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Управление жалобами</h2>
          <p className="text-sm text-gray-600">Рассмотрение жалоб пользователей на контент</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Все статусы</option>
          <option value="pending">Ожидают</option>
          <option value="investigating">Расследуются</option>
          <option value="resolved">Решены</option>
          <option value="dismissed">Отклонены</option>
        </select>
        
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ReportType | 'all')}
          className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Все типы</option>
          <option value="spam">Спам</option>
          <option value="inappropriate">Неподходящий контент</option>
          <option value="fake">Поддельная информация</option>
          <option value="harassment">Домогательства</option>
          <option value="copyright">Авторские права</option>
          <option value="other">Другое</option>
        </select>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка жалоб...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Жалобы не найдены</h3>
            <p className="text-gray-600">Нет жалоб, соответствующих выбранным фильтрам</p>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getReportTypeIcon(report.reportType)}
                    <span className="text-sm font-medium text-gray-900">
                      {getReportTypeLabel(report.reportType)}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(report.priority)}`}>
                      Приоритет {report.priority}
                    </span>
                    <div className="flex items-center space-x-1">
                      {getTargetTypeIcon(report.targetType)}
                      <span className="text-xs text-gray-600">
                        {report.targetType === 'user_profile' ? 'Профиль' :
                         report.targetType === 'influencer_card' ? 'Карточка' :
                         report.targetType === 'campaign' ? 'Кампания' :
                         report.targetType === 'chat_message' ? 'Сообщение' : report.targetType}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {report.description}
                  </p>
                  
                  <div className="text-xs text-gray-500">
                    Отправлено: {new Date(report.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
                
                {report.status === 'pending' && (
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                    >
                      Рассмотреть
                    </button>
                  </div>
                )}
                
                {report.status !== 'pending' && (
                  <div className="ml-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      report.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      report.status === 'dismissed' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {report.status === 'resolved' ? 'Решено' :
                       report.status === 'dismissed' ? 'Отклонено' :
                       report.status === 'investigating' ? 'Расследуется' : report.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Report Resolution Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Рассмотрение жалобы</h3>
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setResolutionNotes('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-gray-800 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                    <Flag className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span>Детали жалобы</span>
                  </h4>
                  <div className="space-y-3 text-sm">
                    {offerDetails && (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded border border-red-100 dark:border-red-900">
                        <p className="text-gray-900 dark:text-white leading-relaxed">
                          Пользователь{' '}
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {selectedReport.reporterId === offerDetails.influencer.id
                              ? offerDetails.influencer.profile?.full_name || 'Инфлюенсер'
                              : offerDetails.advertiser.profile?.full_name || 'Рекламодатель'}
                          </span>
                          {' '}(
                          <span className="text-gray-600 dark:text-gray-400">
                            {selectedReport.reporterId === offerDetails.influencer.id
                              ? offerDetails.influencer.profile?.email || 'email не указан'
                              : offerDetails.advertiser.profile?.email || 'email не указан'}
                          </span>
                          ) жалуется на пользователя{' '}
                          <span className="font-semibold text-orange-600 dark:text-orange-400">
                            {selectedReport.reporterId === offerDetails.influencer.id
                              ? offerDetails.advertiser.profile?.full_name || 'Рекламодатель'
                              : offerDetails.influencer.profile?.full_name || 'Инфлюенсер'}
                          </span>
                          {' '}(
                          <span className="text-gray-600 dark:text-gray-400">
                            {selectedReport.reporterId === offerDetails.influencer.id
                              ? offerDetails.advertiser.profile?.email || 'email не указан'
                              : offerDetails.influencer.profile?.email || 'email не указан'}
                          </span>
                          )
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white dark:bg-gray-800 p-2 rounded border border-red-100 dark:border-red-900">
                        <span className="text-gray-600 dark:text-gray-400">Тип:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {getReportTypeLabel(selectedReport.reportType)}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-2 rounded border border-red-100 dark:border-red-900">
                        <span className="text-gray-600 dark:text-gray-400">Приоритет:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {selectedReport.priority}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border border-red-100 dark:border-red-900">
                      <div className="text-gray-600 dark:text-gray-400 mb-1">Причина жалобы:</div>
                      <p className="text-gray-900 dark:text-white">{selectedReport.description}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded border border-red-100 dark:border-red-900 text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Дата и время:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {new Date(selectedReport.createdAt).toLocaleString('ru-RU')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Детали сотрудничества */}
                {selectedReport.targetType === 'offer' && (
                  <div className="space-y-3">
                    {loadingOfferDetails ? (
                      <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-600">Загрузка деталей сотрудничества...</div>
                    ) : offerDetails ? (
                      <>
                        {/* Navigation Buttons */}
                        <div className="flex flex-wrap gap-2 pb-3 border-b border-gray-200">
                          <button
                            onClick={() => setShowOfferModal(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                          >
                            <User className="w-4 h-4" />
                            <span>Показать предложение</span>
                          </button>

                          <button
                            onClick={() => setShowChatModal(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Показать чат {offerDetails.messages && offerDetails.messages.length > 0 ? `(${offerDetails.messages.length})` : ''}</span>
                          </button>

                          {offerDetails.payments && offerDetails.payments.length > 0 && (
                            <button
                              onClick={() => setShowPaymentsModal(true)}
                              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
                            >
                              <DollarSign className="w-4 h-4" />
                              <span>Показать оплаты ({offerDetails.payments.length})</span>
                            </button>
                          )}
                        </div>

                        {/* Участники */}
                        <div className="bg-white border border-gray-200 rounded-lg">
                          <button
                            onClick={() => toggleSection('offer')}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              <User className="w-5 h-5 text-blue-600" />
                              <h5 className="font-medium text-gray-900">Участники и детали предложения</h5>
                            </div>
                            {expandedSections.offer ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>

                          {expandedSections.offer && (
                            <div className="px-4 pb-4 space-y-3">
                              {/* Инфлюенсер */}
                              <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                                <div className="flex items-center space-x-3">
                                  {offerDetails.influencer.profile?.avatar ? (
                                    <img src={offerDetails.influencer.profile.avatar} alt="" className="w-10 h-10 rounded-full" />
                                  ) : (
                                    <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                                      <User className="w-5 h-5 text-blue-600" />
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-medium text-gray-900">{offerDetails.influencer.profile?.full_name || 'Инфлюенсер'}</div>
                                    <div className="text-xs text-gray-500">Инфлюенсер</div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleBlockUser(offerDetails.influencer.id, offerDetails.influencer.profile?.full_name || 'Инфлюенсер')}
                                  className="flex items-center space-x-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                                >
                                  <Ban className="w-4 h-4" />
                                  <span>Заблокировать</span>
                                </button>
                              </div>

                              {/* Рекламодатель */}
                              <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                                <div className="flex items-center space-x-3">
                                  {offerDetails.advertiser.profile?.avatar ? (
                                    <img src={offerDetails.advertiser.profile.avatar} alt="" className="w-10 h-10 rounded-full" />
                                  ) : (
                                    <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                                      <Target className="w-5 h-5 text-green-600" />
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-medium text-gray-900">{offerDetails.advertiser.profile?.full_name || 'Рекламодатель'}</div>
                                    <div className="text-xs text-gray-500">Рекламодатель</div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleBlockUser(offerDetails.advertiser.id, offerDetails.advertiser.profile?.full_name || 'Рекламодатель')}
                                  className="flex items-center space-x-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                                >
                                  <Ban className="w-4 h-4" />
                                  <span>Заблокировать</span>
                                </button>
                              </div>

                              {/* Детали предложения */}
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <div className="p-3 bg-gray-50 rounded">
                                  <div className="text-xs text-gray-500 mb-1">Предложенная ставка</div>
                                  <div className="text-lg font-semibold text-gray-900">${offerDetails.offer.proposedRate}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded">
                                  <div className="text-xs text-gray-500 mb-1">Статус</div>
                                  <div className="text-sm font-medium text-gray-900">{offerDetails.offer.status}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded">
                                  <div className="text-xs text-gray-500 mb-1">Текущий этап</div>
                                  <div className="text-sm font-medium text-gray-900">{offerDetails.offer.currentStage}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded">
                                  <div className="text-xs text-gray-500 mb-1">Создано</div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {new Date(offerDetails.offer.createdAt).toLocaleDateString('ru-RU')}
                                  </div>
                                </div>
                              </div>

                              {offerDetails.offer.title && (
                                <div className="mt-3">
                                  <div className="text-xs text-gray-500 mb-1">Название</div>
                                  <div className="text-sm text-gray-900">{offerDetails.offer.title}</div>
                                </div>
                              )}

                              {offerDetails.offer.description && (
                                <div className="mt-2">
                                  <div className="text-xs text-gray-500 mb-1">Описание</div>
                                  <div className="text-sm text-gray-700">{offerDetails.offer.description}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Окна оплаты */}
                        {offerDetails.payments && offerDetails.payments.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-lg">
                            <button
                              onClick={() => toggleSection('payments')}
                              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center space-x-2">
                                <DollarSign className="w-5 h-5 text-green-600" />
                                <h5 className="font-medium text-gray-900">Окна оплаты ({offerDetails.payments.length})</h5>
                              </div>
                              {expandedSections.payments ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>

                            {expandedSections.payments && (
                              <div className="px-4 pb-4 space-y-2">
                                {offerDetails.payments.map((payment: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-gray-50 rounded border-l-4 border-green-400">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div>
                                        <span className="text-gray-500">Сумма:</span>
                                        <span className="ml-2 font-semibold text-gray-900">${payment.amount}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Статус:</span>
                                        <span className={`ml-2 font-medium ${
                                          payment.status === 'paid' ? 'text-green-600' :
                                          payment.status === 'pending' ? 'text-yellow-600' :
                                          'text-gray-600'
                                        }`}>{payment.status}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Метод:</span>
                                        <span className="ml-2 text-gray-900">{payment.paymentMethod}</span>
                                      </div>
                                      {payment.dueDate && (
                                        <div>
                                          <span className="text-gray-500">Срок:</span>
                                          <span className="ml-2 text-gray-900">
                                            {new Date(payment.dueDate).toLocaleDateString('ru-RU')}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    {payment.description && (
                                      <div className="mt-2 text-xs text-gray-600">{payment.description}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Диалог */}
                        {offerDetails.messages && offerDetails.messages.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-lg">
                            <button
                              onClick={() => toggleSection('chat')}
                              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center space-x-2">
                                <MessageCircle className="w-5 h-5 text-purple-600" />
                                <h5 className="font-medium text-gray-900">Диалог ({offerDetails.messages.length} сообщений)</h5>
                              </div>
                              {expandedSections.chat ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>

                            {expandedSections.chat && (
                              <div className="px-4 pb-4">
                                <div className="max-h-96 overflow-y-auto space-y-2 bg-gray-50 p-3 rounded">
                                  {offerDetails.messages.map((msg: any, idx: number) => (
                                    <div key={idx} className={`p-2 rounded text-sm ${
                                      msg.senderId === offerDetails.influencer.id ? 'bg-blue-100' : 'bg-green-100'
                                    }`}>
                                      <div className="font-medium text-xs text-gray-600 mb-1">
                                        {msg.senderName || (msg.senderId === offerDetails.influencer.id ? 'Инфлюенсер' : 'Рекламодатель')}
                                        <span className="ml-2 text-gray-400">
                                          {new Date(msg.createdAt).toLocaleString('ru-RU')}
                                        </span>
                                      </div>
                                      <div className="text-gray-900">{msg.content}</div>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-2 text-xs text-gray-500 italic">
                                  Режим только для чтения - вы не можете отправлять сообщения
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-6 rounded-lg">
                        <div className="flex items-start space-x-3 mb-4">
                          <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                              Детали сотрудничества недоступны
                            </h4>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              Используйте кнопки ниже для просмотра доступной информации
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const { offerService } = await import('../../offers/services/offerService');
                                const offer = await offerService.getOfferById(selectedReport.targetId);
                                if (offer) {
                                  setOfferDetails({
                                    offer,
                                    influencer: { id: offer.influencerId, profile: {} },
                                    advertiser: { id: offer.advertiserId, profile: {} },
                                    messages: [],
                                    payments: []
                                  });
                                  setShowOfferModal(true);
                                }
                              } catch (error) {
                                console.error('Failed to load offer:', error);
                              }
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                          >
                            <User className="w-4 h-4" />
                            <span>Посмотреть предложение</span>
                          </button>

                          <button
                            onClick={async () => {
                              try {
                                const { chatService } = await import('../../chat/services/chatService');
                                const { offerService } = await import('../../offers/services/offerService');
                                const offer = await offerService.getOfferById(selectedReport.targetId);
                                if (offer) {
                                  const messages = await chatService.getMessagesBetweenUsers(
                                    offer.influencerId,
                                    offer.advertiserId
                                  );
                                  setOfferDetails({
                                    offer,
                                    influencer: { id: offer.influencerId, profile: {} },
                                    advertiser: { id: offer.advertiserId, profile: {} },
                                    messages: messages || [],
                                    payments: []
                                  });
                                  setShowChatModal(true);
                                }
                              } catch (error) {
                                console.error('Failed to load chat:', error);
                              }
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Посмотреть чат</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Заметки о решении
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Опишите принятое решение..."
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setResolutionNotes('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Отмена
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => handleResolveReport(selectedReport.id, 'dismissed')}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Отклонить</span>
                </button>
                
                <button
                  onClick={() => handleResolveReport(selectedReport.id, 'resolved')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Решить</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compact Chat Modal */}
      {offerDetails && (
        <>
          <CompactChatModal
            isOpen={showChatModal}
            onClose={() => setShowChatModal(false)}
            messages={offerDetails.messages || []}
            influencer={offerDetails.influencer}
            advertiser={offerDetails.advertiser}
          />

          <OfferViewModal
            isOpen={showOfferModal}
            onClose={() => setShowOfferModal(false)}
            offer={offerDetails.offer}
          />
        </>
      )}
    </div>
  );
}