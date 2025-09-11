import React, { useState, useEffect } from 'react';
import { Offer } from '../../../core/types';
import { OfferCard } from './OfferCard';
import { OfferResponseModal } from './OfferResponseModal';
import { CreateOfferModal } from './CreateOfferModal';
import { DetailedOfferModal } from './DetailedOfferModal';
import { DealManagementModal } from '../../deals/components/DealManagementModal';
import { ReviewModal } from '../../deals/components/ReviewModal';
import { CreatePaymentRequestModal } from '../../payments/components/CreatePaymentRequestModal';
import { offerService } from '../services/offerService';
import { Handshake, Filter, Clock, CheckCircle, XCircle, AlertTriangle, Search, SortAsc, Grid, List, Star, MessageCircle, CreditCard, Eye, Calendar, User, Target, DollarSign, TrendingUp } from 'lucide-react';
import { realtimeService } from '../../../core/realtime';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuth } from '../../../hooks/useAuth';
import { isSupabaseConfigured } from '../../../core/supabase';
import { useProfileCompletion } from '../../profiles/hooks/useProfileCompletion';
import toast from 'react-hot-toast';
import { supabase, TABLES } from '../../../core/supabase';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface EnhancedOffer extends Offer {
  partnerName?: string;
  partnerAvatar?: string;
  dealId?: string;
  paymentStatus?: string;
  unreadMessages?: number;
  lastActivity?: string;
  hasPaymentWindows?: boolean;
  totalPaid?: number;
  pendingAmount?: number;
}

type SortField = 'date' | 'amount' | 'status' | 'partner' | 'activity';
type ViewMode = 'grid' | 'list';

export function OffersPage() {
  const [offers, setOffers] = useState<EnhancedOffer[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'accepted' | 'completed' | 'requires_action'>('all');
  const [activeTab, setActiveTab] = useState<'offers' | 'payments'>('offers');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'as_influencer' | 'as_advertiser'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<EnhancedOffer | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [showMyOffers, setShowMyOffers] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTargetOffer, setReviewTargetOffer] = useState<EnhancedOffer | null>(null);
  const [selectedDealOffer, setSelectedDealOffer] = useState<EnhancedOffer | null>(null);
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
  const [paymentRequestExistingInfo, setPaymentRequestExistingInfo] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailOffer, setDetailOffer] = useState<EnhancedOffer | null>(null);
  const [PaymentRequestsTabComponent, setPaymentRequestsTabComponent] = useState<React.ComponentType | null>(null);
  
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);

  useEffect(() => {
    const loadPaymentRequestsTab = async () => {
      const { PaymentRequestsTab } = await import('../../payments/components/PaymentRequestsTab');
      setPaymentRequestsTabComponent(() => PaymentRequestsTab);
    };
    loadPaymentRequestsTab();
  }, []);

  useEffect(() => {
    if (currentUserId && !loading) {
      loadEnhancedOffers();
    }
    
    // Subscribe to real-time offer updates
    if (currentUserId) {
      const subscription = realtimeService.subscribeToOfferUpdates(
        currentUserId,
        handleOfferUpdate
      );

      return () => {
        realtimeService.unsubscribe(`offers_${currentUserId}`);
      };
    }
  }, [currentUserId, loading, showMyOffers]);

  const loadEnhancedOffers = async () => {
    try {
      setIsLoading(true);
      
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, using empty offers list');
        setOffers([]);
        return;
      }
      
      // Load real offers from offers table
      const loadedOffers = await offerService.getUserOffers(
        currentUserId, 
        showMyOffers ? 'sent' : 'received'
      );
      
      // Load applications and transform them
      const transformedApplications = await loadApplications();
      
      // Combine real offers with transformed applications
      const activeOffers = loadedOffers.filter(offer => {
        return offer.status !== 'withdrawn' && 
               offer.status !== 'cancelled' && 
               offer.status !== 'canceled';
      });
      
      const allOffers = [...activeOffers, ...transformedApplications];
      
      // Enhance offers with additional data
      const enhancedOffers = await Promise.all(
        allOffers.map(offer => enhanceOfferWithExtraData(offer))
      );
      
      setOffers(enhancedOffers);
    } catch (error) {
      console.error('Failed to load offers:', error);
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.warn('Supabase connection failed, using empty offers list');
        setOffers([]);
        return;
      }
      
      toast.error('Не удалось загрузить предложения');
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, returning empty applications');
        return [];
      }
      
      const { applicationService } = await import('../../applications/services/applicationService');
      
      const userApplications = await applicationService.getUserApplications(
        currentUserId, 
        showMyOffers ? 'sent' : 'received'
      );
      
      const activeApplications = userApplications.filter(app => 
        app.status !== 'cancelled' && app.status !== 'withdrawn'
      );
      
      return activeApplications.map(app => ({
        offerId: app.id,
        influencerId: app.targetType === 'influencer_card' ? app.targetId : app.applicantId,
        campaignId: app.targetReferenceId,
        advertiserId: app.targetType === 'influencer_card' ? app.applicantId : app.targetId,
        details: {
          rate: app.applicationData.proposedRate || 0,
          currency: 'USD',
          deliverables: app.applicationData.deliverables || [],
          timeline: app.applicationData.timeline || '',
          terms: app.applicationData.message || ''
        },
        status: app.status === 'sent' ? 'pending' : app.status,
        timeline: {
          createdAt: app.createdAt,
          respondedAt: app.timeline?.respondedAt,
          completedAt: app.timeline?.completedAt
        },
        messages: [],
        metadata: app.metadata || { viewCount: 0 },
        type: 'application',
        applicationTargetType: app.targetType
      }));
    } catch (error) {
      console.error('Failed to load applications:', error);
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.warn('Supabase connection failed for applications, returning empty list');
        return [];
      }
      
      return [];
    }
  };

  const enhanceOfferWithExtraData = async (offer: Offer): Promise<EnhancedOffer> => {
    try {
      // Get partner information
      const partnerId = showMyOffers 
        ? (offer.type === 'application' ? offer.advertiserId : offer.influencerId)
        : (offer.type === 'application' ? offer.influencerId : offer.advertiserId);
      
      const { data: partnerProfile } = await supabase
        .from('user_profiles')
        .select('full_name, avatar')
        .eq('user_id', partnerId)
        .single();

      // Get deal information
      let dealInfo = null;
      try {
        const { dealService } = await import('../../../services/dealService');
        const userDeals = await dealService.getUserDeals(currentUserId);
        dealInfo = userDeals.find(d => 
          d.offerId === offer.offerId || d.applicationId === offer.offerId
        );
      } catch (dealError) {
        // Deal table might not exist yet
        console.log('Deal table not available:', dealError);
      }

      // Get payment information
      let paymentInfo = null;
      try {
        const { paymentRequestService } = await import('../../../services/paymentRequestService');
        const userPayments = await paymentRequestService.getUserPaymentRequests(currentUserId);
        const relatedPayments = userPayments.filter(p => 
          p.relatedOfferId === offer.offerId || p.relatedApplicationId === offer.offerId
        );
        
        if (relatedPayments.length > 0) {
          const totalPaid = relatedPayments
            .filter(p => p.status === 'confirmed')
            .reduce((sum, p) => sum + p.amount, 0);
          
          const pendingAmount = relatedPayments
            .filter(p => ['pending', 'paying', 'paid'].includes(p.status))
            .reduce((sum, p) => sum + p.amount, 0);
          
          paymentInfo = {
            hasPaymentWindows: true,
            totalPaid,
            pendingAmount,
            status: relatedPayments[0].status
          };
        }
      } catch (paymentError) {
        console.log('Payment table not available:', paymentError);
      }

      // Get unread messages count
      let unreadMessages = 0;
      try {
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('id')
          .eq('sender_id', partnerId)
          .eq('receiver_id', currentUserId)
          .eq('is_read', false);
        
        unreadMessages = messages?.length || 0;
      } catch (messageError) {
        console.log('Failed to get unread messages:', messageError);
      }

      return {
        ...offer,
        partnerName: partnerProfile?.full_name || 'Пользователь',
        partnerAvatar: partnerProfile?.avatar,
        dealId: dealInfo?.id,
        paymentStatus: paymentInfo?.status,
        unreadMessages,
        lastActivity: offer.timeline.respondedAt || offer.timeline.createdAt,
        hasPaymentWindows: paymentInfo?.hasPaymentWindows || false,
        totalPaid: paymentInfo?.totalPaid || 0,
        pendingAmount: paymentInfo?.pendingAmount || 0
      };
    } catch (error) {
      console.error('Failed to enhance offer:', error);
      return offer as EnhancedOffer;
    }
  };

  const handleOfferUpdate = (update: any) => {
    console.log('Offer update received:', update);
    if (update.eventType === 'UPDATE') {
      const transformedOffer = offerService.transformOfferFromDatabase(update.new);
      setOffers(prev => prev.map(offer => 
        offer.offerId === transformedOffer.offerId ? { ...offer, ...transformedOffer } : offer
      ));
    } else if (update.eventType === 'INSERT') {
      const transformedOffer = offerService.transformOfferFromDatabase(update.new);
      enhanceOfferWithExtraData(transformedOffer).then(enhanced => {
        setOffers(prev => [enhanced, ...prev]);
      });
    } else if (update.eventType === 'DELETE') {
      const transformedOffer = offerService.transformOfferFromDatabase(update.old);
      setOffers(prev => prev.filter(offer => offer.offerId !== transformedOffer.offerId));
    }
  };

  const handleOfferAction = async (offerId: string, action: 'accept' | 'decline' | 'counter') => {
    if (!currentUserProfile?.profileCompletion.influencerSetup) {
      toast.error('Заполните раздел "Инфлюенсер" для работы с предложениями');
      return;
    }

    const offer = offers.find(o => o.offerId === offerId);
    if (offer) {
      setSelectedOffer(offer);
      setShowResponseModal(true);
    }
  };

  const handleResponseSent = (response: 'accepted' | 'declined' | 'counter') => {
    loadEnhancedOffers();
    setSelectedOffer(null);
  };

  const handleQuickAction = async (offer: EnhancedOffer, action: string) => {
    switch (action) {
      case 'chat':
        window.location.href = `/chat?userId=${showMyOffers ? offer.influencerId : offer.advertiserId}`;
        break;
      case 'payment':
        if (offer.hasPaymentWindows) {
          setActiveTab('payments');
        } else {
          handleCreatePayment(offer.offerId);
        }
        break;
      case 'complete':
        await handleCompleteOffer(offer);
        break;
      case 'review':
        handleLeaveReview(offer.offerId);
        break;
      case 'details':
        setDetailOffer(offer);
        setShowDetailModal(true);
        break;
    }
  };

  const handleCompleteOffer = async (offer: EnhancedOffer) => {
    if (!confirm('Отметить сотрудничество как завершенное?')) return;

    try {
      if (offer.dealId) {
        const { dealService } = await import('../../../services/dealService');
        await dealService.markWorkCompleted(offer.dealId, currentUserId, {
          completed_by: currentUserId,
          completed_at: new Date().toISOString()
        });
      }

      // Update offer status
      if (offer.type === 'application') {
        const { applicationService } = await import('../../applications/services/applicationService');
        await applicationService.respondToApplication(offer.offerId, 'completed');
      } else {
        await offerService.respondToOffer(offer.offerId, 'completed', undefined, currentUserId);
      }

      toast.success('Сотрудничество отмечено как завершенное!');
      loadEnhancedOffers();
    } catch (error: any) {
      console.error('Failed to complete offer:', error);
      toast.error(error.message || 'Не удалось завершить сотрудничество');
    }
  };

  const handleCreatePayment = async (offerId: string) => {
    const offer = offers.find(o => o.offerId === offerId);
    if (!offer) {
      toast.error('Предложение не найдено');
      return;
    }
    
    if (currentUserId !== offer.influencerId) {
      toast.error('Только инфлюенсер в данной сделке может создать окно оплаты');
      return;
    }
    
    if (!currentUserProfile?.profileCompletion.influencerSetup) {
      toast.error('Заполните раздел "Инфлюенсер" для создания окон оплаты');
      return;
    }
    
    const paymentStatus = offer.paymentStatus;
    const totalAmount = offer.details.rate;
    const paidAmount = offer.totalPaid || 0;
    const remainingAmount = totalAmount - paidAmount;
    const isAfterPrepayment = paymentStatus === 'confirmed' && paidAmount > 0;
    
    const existingInfo = isAfterPrepayment ? {
      totalAmount,
      paidAmount,
      remainingAmount,
      paymentStatus,
    } : null;
    
    setPaymentRequestExistingInfo(existingInfo);
    setSelectedDealOffer(offer);
    setShowPaymentRequestModal(true);
  };

  const handleLeaveReview = (offerId: string) => {
    const offer = offers.find(o => o.offerId === offerId);
    if (offer) {
      setReviewTargetOffer(offer);
      setShowReviewModal(true);
    }
  };

  const handleReviewSubmitted = () => {
    setShowReviewModal(false);
    setReviewTargetOffer(null);
    toast.success('Отзыв отправлен! Спасибо за обратную связь.');
  };

  const handleManageDeal = async (offerId: string) => {
    const offer = offers.find(o => o.offerId === offerId);
    if (!offer) {
      toast.error('Предложение не найдено');
      return;
    }
    
    try {
      const { dealService } = await import('../../../services/dealService');
      
      let deal = null;
      if (offer.type === 'application') {
        const userDeals = await dealService.getUserDeals(currentUserId);
        deal = userDeals.find(d => d.applicationId === offerId);
      } else {
        const userDeals = await dealService.getUserDeals(currentUserId);
        deal = userDeals.find(d => d.offerId === offerId);
      }
      
      if (!deal) {
        deal = await dealService.createDeal({
          offerId: offer.type === 'application' ? undefined : offerId,
          applicationId: offer.type === 'application' ? offerId : undefined,
          payerId: offer.advertiserId,
          payeeId: offer.influencerId,
          totalAmount: offer.details.rate,
          currency: offer.details.currency || 'USD',
          paymentType: 'full_prepay',
          workDetails: {
            deliverables: offer.details.deliverables,
            timeline: offer.details.timeline
          }
        });
        
        toast.success('Сделка создана для управления сотрудничеством');
      }
      
      setSelectedDeal(deal);
      setSelectedDealOffer(offer);
      setShowDealModal(true);
    } catch (error: any) {
      console.error('Failed to get or create deal:', error);
      toast.error(error.message || 'Не удалось получить информацию о сделке');
    }
  };

  const handleWithdrawOffer = async (offerId: string) => {
    if (!confirm('Вы уверены, что хотите отозвать это предложение?')) return;

    try {
      const offer = offers.find(o => o.offerId === offerId);
      if (!offer) {
        toast.error('Предложение не найдено');
        return;
      }
      
      if (offer.type === 'application') {
        const { applicationService } = await import('../../applications/services/applicationService');
        await applicationService.cancelApplication(offerId);
        
        const { chatService } = await import('../../chat/services/chatService');
        await chatService.sendMessage({
          senderId: currentUserId,
          receiverId: offer.advertiserId,
          messageContent: 'Заявка на сотрудничество была отменена отправителем.',
          messageType: 'text',
          metadata: {
            applicationId: offerId,
            actionType: 'application_cancelled'
          }
        });
        
        toast.success('Заявка отменена успешно!');
      } else {
        await offerService.withdrawOffer(offerId);
        toast.success('Предложение отозвано успешно!');
      }
      
      setOffers(prev => prev.filter(o => o.offerId !== offerId));
    } catch (error: any) {
      console.error('Failed to withdraw offer:', error);
      toast.error(error.message || 'Не удалось отозвать заявку');
    }
  };

  const handleViewDetails = (offer: EnhancedOffer) => {
    setDetailOffer(offer);
    setShowDetailModal(true);
  };

  const sortOffers = (offers: EnhancedOffer[]): EnhancedOffer[] => {
    return [...offers].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.lastActivity || a.timeline.createdAt);
          bValue = new Date(b.lastActivity || b.timeline.createdAt);
          break;
        case 'amount':
          aValue = a.details.rate;
          bValue = b.details.rate;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'partner':
          aValue = a.partnerName || '';
          bValue = b.partnerName || '';
          break;
        case 'activity':
          aValue = a.unreadMessages || 0;
          bValue = b.unreadMessages || 0;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  const filterOffers = (offers: EnhancedOffer[]): EnhancedOffer[] => {
    return offers.filter(offer => {
      // Text search filter
      const matchesSearch = !searchQuery || 
        offer.partnerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.details.terms.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.details.deliverables.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus = selectedFilter === 'all' || 
        (selectedFilter === 'requires_action' && 
         (offer.status === 'pending' || offer.paymentStatus === 'paid')) ||
        offer.status === selectedFilter;

      // Role filter
      const matchesRole = roleFilter === 'all' ||
        (roleFilter === 'as_influencer' && currentUserId === offer.influencerId) ||
        (roleFilter === 'as_advertiser' && currentUserId === offer.advertiserId);

      return matchesSearch && matchesStatus && matchesRole;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'accepted': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'declined': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-300';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'declined': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getActionButtons = (offer: EnhancedOffer) => {
    const buttons = [];
    
    // Chat button (always available)
    buttons.push({
      label: 'Чат',
      icon: <MessageCircle className="w-4 h-4" />,
      action: () => handleQuickAction(offer, 'chat'),
      variant: 'secondary' as const,
      badge: offer.unreadMessages
    });

    // Payment button
    if (offer.status === 'accepted' && currentUserId === offer.influencerId) {
      buttons.push({
        label: offer.hasPaymentWindows ? 'Оплаты' : 'Создать оплату',
        icon: <CreditCard className="w-4 h-4" />,
        action: () => handleQuickAction(offer, 'payment'),
        variant: 'primary' as const
      });
    }

    // Complete button
    if (offer.status === 'accepted' && !['completed', 'cancelled'].includes(offer.status)) {
      buttons.push({
        label: 'Завершить',
        icon: <CheckCircle className="w-4 h-4" />,
        action: () => handleQuickAction(offer, 'complete'),
        variant: 'success' as const
      });
    }

    // Review button
    if (offer.status === 'completed') {
      buttons.push({
        label: 'Отзыв',
        icon: <Star className="w-4 h-4" />,
        action: () => handleQuickAction(offer, 'review'),
        variant: 'warning' as const
      });
    }

    // Details button (always available)
    buttons.push({
      label: 'Подробнее',
      icon: <Eye className="w-4 h-4" />,
      action: () => handleQuickAction(offer, 'details'),
      variant: 'secondary' as const
    });

    return buttons;
  };

  const getOfferPriority = (offer: EnhancedOffer): 'high' | 'medium' | 'low' => {
    if (offer.status === 'pending' && !showMyOffers) return 'high';
    if (offer.paymentStatus === 'paid') return 'high';
    if (offer.unreadMessages && offer.unreadMessages > 0) return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'border-red-300 bg-red-50';
      case 'medium': return 'border-yellow-300 bg-yellow-50';
      default: return '';
    }
  };

  const filteredAndSortedOffers = sortOffers(filterOffers(offers));

  const stats = {
    total: offers.length,
    pending: offers.filter(o => o.status === 'pending').length,
    accepted: offers.filter(o => o.status === 'accepted').length,
    completed: offers.filter(o => o.status === 'completed').length,
    requiresAction: offers.filter(o => 
      o.status === 'pending' || 
      o.paymentStatus === 'paid' || 
      (o.unreadMessages && o.unreadMessages > 0)
    ).length,
    withPayments: offers.filter(o => o.hasPaymentWindows).length
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {showMyOffers ? 'Отправленные заявки' : 'Полученные заявки'}
            </h1>
            <p className="text-gray-600 mb-4 lg:mb-0">
              {showMyOffers 
                ? 'Отслеживайте статус отправленных предложений и заявок'
                : 'Управляйте входящими предложениями и заявками на сотрудничество'
              }
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Готовы к работе: {stats.accepted}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-700">Требуют внимания: {stats.requiresAction}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">С оплатами: {stats.withPayments}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowMyOffers(!showMyOffers)}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                showMyOffers
                  ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'
              }`}
            >
              {showMyOffers ? 'Смотреть полученные' : 'Смотреть отправленные'}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('offers')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'offers'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Handshake className="w-4 h-4" />
              <span>Предложения</span>
              {stats.total > 0 && (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  activeTab === 'offers' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {stats.total}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'payments'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4" />
              <span>Оплаты</span>
              {stats.withPayments > 0 && (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  activeTab === 'payments' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {stats.withPayments}
                </span>
              )}
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'offers' ? (
        <div className="space-y-6">
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Handshake className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Всего</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">В ожидании</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Принято</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.accepted}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Завершено</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Требуют действий</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.requiresAction}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Filters and Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Поиск по партнеру, условиям, услугам..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">Все статусы</option>
                  <option value="pending">В ожидании</option>
                  <option value="accepted">Принятые</option>
                  <option value="completed">Завершенные</option>
                  <option value="requires_action">Требуют действий</option>
                </select>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">Все роли</option>
                  <option value="as_influencer">Как инфлюенсер</option>
                  <option value="as_advertiser">Как рекламодатель</option>
                </select>
              </div>

              {/* View and Sort Controls */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600'
                    }`}
                    title="Сетка"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'
                    }`}
                    title="Список"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <select
                  value={`${sortField}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortField(field as SortField);
                    setSortOrder(order as 'asc' | 'desc');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="date-desc">Новые сначала</option>
                  <option value="date-asc">Старые сначала</option>
                  <option value="amount-desc">Дорогие сначала</option>
                  <option value="amount-asc">Дешевые сначала</option>
                  <option value="activity-desc">Активные сначала</option>
                  <option value="status-asc">По статусу</option>
                </select>
              </div>
            </div>
          </div>

          {/* Enhanced Offers List */}
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="h-6 bg-gray-300 rounded mb-2 w-2/3"></div>
                      <div className="h-4 bg-gray-300 rounded mb-2 w-1/2"></div>
                    </div>
                    <div className="h-6 bg-gray-300 rounded w-20"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-300 rounded"></div>
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="flex space-x-2">
                      <div className="h-8 bg-gray-300 rounded flex-1"></div>
                      <div className="h-8 bg-gray-300 rounded flex-1"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedOffers.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Handshake className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {searchQuery || selectedFilter !== 'all' 
                  ? 'Заявки не найдены' 
                  : showMyOffers 
                  ? 'Вы еще не отправляли заявок' 
                  : 'У вас пока нет заявок'
                }
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {searchQuery || selectedFilter !== 'all' 
                  ? 'Попробуйте изменить фильтры поиска или создайте новые заявки'
                  : showMyOffers
                  ? 'Просматривайте карточки инфлюенсеров и кампании, чтобы отправлять заявки на сотрудничество'
                  : 'Когда вам придут заявки от партнеров, они появятся здесь'
                }
              </p>
              {!showMyOffers && (
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => window.location.href = '/influencer-cards'}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Просмотреть карточки
                  </button>
                  <button
                    onClick={() => window.location.href = '/campaigns'}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Просмотреть кампании
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}>
              {filteredAndSortedOffers.map((offer) => (
                <EnhancedOfferCard
                  key={offer.offerId}
                  offer={offer}
                  onAction={!showMyOffers ? handleOfferAction : undefined}
                  onWithdraw={showMyOffers ? handleWithdrawOffer : undefined}
                  onLeaveReview={handleLeaveReview}
                  onManageDeal={handleManageDeal}
                  onCreatePayment={handleCreatePayment}
                  showSenderActions={showMyOffers}
                  currentUserId={currentUserId}
                  onViewDetails={handleViewDetails}
                  onQuickAction={handleQuickAction}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}

          {/* Modals */}
          {selectedOffer && (
            <OfferResponseModal
              isOpen={showResponseModal}
              onClose={() => {
                setShowResponseModal(false);
                setSelectedOffer(null);
              }}
              offer={selectedOffer}
              onResponseSent={handleResponseSent}
            />
          )}

          {detailOffer && (
            <DetailedOfferModal
              isOpen={showDetailModal}
              onClose={() => {
                setShowDetailModal(false);
                setDetailOffer(null);
              }}
              offer={detailOffer}
              currentUserId={currentUserId}
              showSenderActions={showMyOffers}
            />
          )}

          <CreateOfferModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            influencerId=""
            advertiserId={currentUserId}
            onOfferSent={(offer) => {
              setShowCreateModal(false);
              loadEnhancedOffers();
            }}
          />

          {reviewTargetOffer && (
            <ReviewModal
              isOpen={showReviewModal}
              onClose={() => {
                setShowReviewModal(false);
                setReviewTargetOffer(null);
              }}
              dealId={(reviewTargetOffer as any).dealId || reviewTargetOffer.offerId}
              reviewerId={currentUserId}
              revieweeId={showMyOffers ? reviewTargetOffer.influencerId : reviewTargetOffer.advertiserId}
              collaborationType={currentUserProfile?.userType === 'influencer' ? 'as_influencer' : 'as_advertiser'}
              revieweeName="Партнер по сотрудничеству"
              onReviewSubmitted={handleReviewSubmitted}
            />
          )}

          {selectedDeal && selectedDealOffer && (
            <DealManagementModal
              isOpen={showDealModal}
              onClose={() => {
                setShowDealModal(false);
                setSelectedDeal(null);
                setSelectedDealOffer(null);
              }}
              deal={selectedDeal}
              currentUserId={currentUserId}
              onStatusUpdated={() => {
                loadEnhancedOffers();
                setShowDealModal(false);
                setSelectedDealOffer(null);
              }}
              onCreatePayment={() => {
                setShowDealModal(false);
                setSelectedDeal(null);
                handleCreatePayment(selectedDealOffer!.offerId);
              }}
            />
          )}

          {selectedDealOffer && (
            <CreatePaymentRequestModal
              isOpen={showPaymentRequestModal}
              onClose={() => {
                setShowPaymentRequestModal(false);
                setSelectedDealOffer(null);
                setPaymentRequestExistingInfo(null);
              }}
              payerId={selectedDealOffer.advertiserId}
              payeeId={selectedDealOffer.influencerId}
              relatedOfferId={selectedDealOffer.type === 'application' ? undefined : selectedDealOffer.offerId}
              relatedApplicationId={selectedDealOffer.type === 'application' ? selectedDealOffer.offerId : undefined}
              initialAmount={selectedDealOffer.details.rate}
              currency={selectedDealOffer.details.currency || 'USD'}
              existingPaymentInfo={paymentRequestExistingInfo}
              onRequestCreated={(request) => {
                setShowPaymentRequestModal(false);
                setSelectedDealOffer(null);
                setPaymentRequestExistingInfo(null);
                loadEnhancedOffers();
              }}
            />
          )}
        </div>
      ) : (
        <React.Suspense fallback={
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка вкладки оплаты...</p>
          </div>
        }>
          {PaymentRequestsTabComponent && <PaymentRequestsTabComponent />}
        </React.Suspense>
      )}
    </div>
  );
}

// Enhanced Offer Card Component
interface EnhancedOfferCardProps {
  offer: EnhancedOffer;
  onAction?: (offerId: string, action: 'accept' | 'decline' | 'counter') => void;
  onWithdraw?: (offerId: string) => void;
  onLeaveReview?: (offerId: string) => void;
  onManageDeal?: (offerId: string) => void;
  onCreatePayment?: (offerId: string) => void;
  showSenderActions?: boolean;
  currentUserId?: string;
  onViewDetails?: (offer: EnhancedOffer) => void;
  onQuickAction?: (offer: EnhancedOffer, action: string) => void;
  viewMode: ViewMode;
}

function EnhancedOfferCard({ 
  offer, 
  onAction, 
  onWithdraw, 
  onLeaveReview, 
  onManageDeal, 
  onCreatePayment, 
  showSenderActions, 
  currentUserId, 
  onViewDetails, 
  onQuickAction,
  viewMode 
}: EnhancedOfferCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'accepted': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'declined': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-300';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'declined': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'В ожидании';
      case 'accepted': return 'Принято';
      case 'completed': return 'Завершено';
      case 'declined': return 'Отклонено';
      default: return status;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentStatusInfo = () => {
    if (offer.paymentStatus === 'confirmed' && offer.totalPaid) {
      return {
        icon: '💰',
        text: `Оплачено ${formatCurrency(offer.totalPaid)}`,
        color: 'text-green-600'
      };
    }
    if (offer.paymentStatus === 'paid') {
      return {
        icon: '⏳',
        text: 'Ожидает подтверждения',
        color: 'text-orange-600'
      };
    }
    if (offer.pendingAmount && offer.pendingAmount > 0) {
      return {
        icon: '💳',
        text: `Ожидает ${formatCurrency(offer.pendingAmount)}`,
        color: 'text-blue-600'
      };
    }
    return null;
  };

  const priority = getOfferPriority(offer);
  const priorityColor = getPriorityColor(priority);
  const paymentInfo = getPaymentStatusInfo();

  const getOfferPriority = (offer: EnhancedOffer): 'high' | 'medium' | 'low' => {
    if (offer.status === 'pending' && !showSenderActions) return 'high';
    if (offer.paymentStatus === 'paid') return 'high';
    if (offer.unreadMessages && offer.unreadMessages > 0) return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'border-red-300 bg-red-50';
      case 'medium': return 'border-yellow-300 bg-yellow-50';
      default: return '';
    }
  };

  if (viewMode === 'list') {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all ${priorityColor}`}>
        <div className="flex items-center justify-between">
          {/* Left - Main Info */}
          <div className="flex items-center space-x-4 flex-1">
            {/* Avatar */}
            <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
              {offer.partnerAvatar ? (
                <img 
                  src={offer.partnerAvatar} 
                  alt={offer.partnerName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold">
                  {offer.partnerName?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {offer.partnerName}
                </h3>
                <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(offer.status)}`}>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(offer.status)}
                    <span>{getStatusLabel(offer.status)}</span>
                  </div>
                </span>
                {paymentInfo && (
                  <span className={`text-sm font-medium ${paymentInfo.color}`}>
                    {paymentInfo.icon} {paymentInfo.text}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center space-x-1">
                  <DollarSign className="w-4 h-4" />
                  <span>{formatCurrency(offer.details.rate, offer.details.currency)}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{offer.details.timeline}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDistanceToNow(parseISO(offer.lastActivity || offer.timeline.createdAt), { addSuffix: true })}</span>
                </span>
                {offer.unreadMessages && offer.unreadMessages > 0 && (
                  <span className="flex items-center space-x-1 text-purple-600 font-medium">
                    <MessageCircle className="w-4 h-4" />
                    <span>{offer.unreadMessages} новых</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right - Quick Actions */}
          <div className="flex items-center space-x-2">
            {getActionButtons(offer).slice(0, 4).map((button, index) => (
              <button
                key={index}
                onClick={button.action}
                className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                  button.variant === 'primary' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
                  button.variant === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                  button.variant === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
                  'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={button.label}
              >
                {button.icon}
                {button.badge && button.badge > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                    {button.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Grid view (card format)
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all ${priorityColor}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
            {offer.partnerAvatar ? (
              <img 
                src={offer.partnerAvatar} 
                alt={offer.partnerName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-semibold">
                {offer.partnerName?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{offer.partnerName}</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {offer.type === 'application' ? 'Заявка' : 'Предложение'}
              </span>
              {offer.unreadMessages && offer.unreadMessages > 0 && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                  {offer.unreadMessages} новых
                </span>
              )}
            </div>
          </div>
        </div>
        
        <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(offer.status)}`}>
          <div className="flex items-center space-x-1">
            {getStatusIcon(offer.status)}
            <span>{getStatusLabel(offer.status)}</span>
          </div>
        </span>
      </div>

      {/* Payment Status Banner */}
      {paymentInfo && (
        <div className={`mb-4 p-3 rounded-lg border ${
          paymentInfo.color.includes('green') ? 'bg-green-50 border-green-200' :
          paymentInfo.color.includes('orange') ? 'bg-orange-50 border-orange-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{paymentInfo.icon}</span>
            <span className={`text-sm font-medium ${paymentInfo.color}`}>
              {paymentInfo.text}
            </span>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Сумма:</span>
          <span className="text-lg font-semibold text-green-600">
            {formatCurrency(offer.details.rate, offer.details.currency)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Сроки:</span>
          <span className="text-sm text-gray-900">{offer.details.timeline}</span>
        </div>
        
        <div>
          <span className="text-sm text-gray-600">Услуги:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {offer.details.deliverables.slice(0, 3).map((deliverable, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                {deliverable}
              </span>
            ))}
            {offer.details.deliverables.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                +{offer.details.deliverables.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        {getActionButtons(offer).slice(0, 4).map((button, index) => (
          <button
            key={index}
            onClick={button.action}
            className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1 ${
              button.variant === 'primary' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
              button.variant === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
              button.variant === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
              'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {button.icon}
            <span>{button.label}</span>
            {button.badge && button.badge > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                {button.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Response Actions for Pending Offers */}
      {offer.status === 'pending' && !showSenderActions && onAction && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onAction(offer.offerId, 'accept')}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Принять</span>
            </button>
            <button
              onClick={() => onAction(offer.offerId, 'counter')}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Встречное</span>
            </button>
            <button
              onClick={() => onAction(offer.offerId, 'decline')}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
            >
              <XCircle className="w-4 h-4" />
              <span>Отклонить</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  function getActionButtons(offer: EnhancedOffer) {
    const buttons = [];
    
    // Chat button (always available)
    buttons.push({
      label: 'Чат',
      icon: <MessageCircle className="w-4 h-4" />,
      action: () => onQuickAction?.(offer, 'chat'),
      variant: 'secondary' as const,
      badge: offer.unreadMessages
    });

    // Payment button
    if (offer.status === 'accepted' && currentUserId === offer.influencerId) {
      buttons.push({
        label: offer.hasPaymentWindows ? 'Оплаты' : 'Создать оплату',
        icon: <CreditCard className="w-4 h-4" />,
        action: () => onQuickAction?.(offer, 'payment'),
        variant: 'primary' as const
      });
    }

    // Complete button
    if (offer.status === 'accepted') {
      buttons.push({
        label: 'Завершить',
        icon: <CheckCircle className="w-4 h-4" />,
        action: () => onQuickAction?.(offer, 'complete'),
        variant: 'success' as const
      });
    }

    // Review button
    if (offer.status === 'completed') {
      buttons.push({
        label: 'Отзыв',
        icon: <Star className="w-4 h-4" />,
        action: () => onQuickAction?.(offer, 'review'),
        variant: 'warning' as const
      });
    }

    // Details button (always available)
    buttons.push({
      label: 'Подробнее',
      icon: <Eye className="w-4 h-4" />,
      action: () => onQuickAction?.(offer, 'details'),
      variant: 'secondary' as const
    });

    return buttons;
  }
}