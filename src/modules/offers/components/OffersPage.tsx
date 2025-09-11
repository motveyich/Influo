import React, { useState, useEffect } from 'react';
import { Offer } from '../../../core/types';
import { OfferCard } from './OfferCard';
import { OfferResponseModal } from './OfferResponseModal';
import { CreateOfferModal } from './CreateOfferModal';
import { DetailedOfferModal } from './DetailedOfferModal';
import { PaymentWindowModal } from './PaymentWindowModal';
import { DealManagementModal } from '../../deals/components/DealManagementModal';
import { PaymentModal } from '../../deals/components/PaymentModal';
import { ReviewModal } from '../../deals/components/ReviewModal';
import { offerService } from '../services/offerService';
import { Handshake, Filter, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { realtimeService } from '../../../core/realtime';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuth } from '../../../hooks/useAuth';
import { isSupabaseConfigured } from '../../../core/supabase';
import { useProfileCompletion } from '../../profiles/hooks/useProfileCompletion';
import toast from 'react-hot-toast';
import { supabase, TABLES } from '../../../core/supabase';

export function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'accepted' | 'declined' | 'completed'>('all');
  const [activeTab, setActiveTab] = useState<'offers' | 'payments'>('offers');
  const [isLoading, setIsLoading] = useState(true);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [showMyOffers, setShowMyOffers] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTargetOffer, setReviewTargetOffer] = useState<Offer | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedDealOffer, setSelectedDealOffer] = useState<Offer | null>(null);
  const [paymentModalExistingInfo, setPaymentModalExistingInfo] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailOffer, setDetailOffer] = useState<Offer | null>(null);
  const [PaymentTabComponent, setPaymentTabComponent] = useState<React.ComponentType | null>(null);
  
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);

  useEffect(() => {
    const loadPaymentTab = async () => {
      const { PaymentTab } = await import('./PaymentTab');
      setPaymentTabComponent(() => PaymentTab);
    };
    loadPaymentTab();
  }, []);

  useEffect(() => {
    if (currentUserId && !loading) {
      loadOffers();
      loadApplications();
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

  const loadApplications = async () => {
    try {
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, returning empty applications');
        return [];
      }
      
      const { applicationService } = await import('../../applications/services/applicationService');
      
      // Load applications based on current view
      const userApplications = await applicationService.getUserApplications(
        currentUserId, 
        showMyOffers ? 'sent' : 'received'
      );
      
      // Filter out cancelled and withdrawn applications
      const activeApplications = userApplications.filter(app => 
        app.status !== 'cancelled' && app.status !== 'withdrawn'
      );
      
      // Transform applications to offer-like format for display
      const transformedApplications = activeApplications.map(app => ({
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
      
      return transformedApplications;
    } catch (error) {
      console.error('Failed to load applications:', error);
      
      // Handle specific Supabase connection errors gracefully
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.warn('Supabase connection failed for applications, returning empty list');
        return [];
      }
      
      return [];
    }
  };

  const loadOffers = async () => {
    try {
      setIsLoading(true);
      
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, using empty offers list');
        setOffers([]);
        return;
      }
      
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
        // Filter out withdrawn and cancelled offers/applications
        return offer.status !== 'withdrawn' && 
               offer.status !== 'cancelled' && 
               offer.status !== 'canceled'; // Handle both spellings
      });
      
      const allOffers = [...activeOffers, ...transformedApplications];
      
      setOffers(allOffers);
    } catch (error) {
      console.error('Failed to load offers:', error);
      
      // Handle specific Supabase connection errors
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.warn('Supabase connection failed, using empty offers list');
        setOffers([]);
        return;
      }
      
      
      // Handle specific Supabase connection errors
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.warn('Supabase connection failed, using empty campaigns list');
        setCampaigns([]);
        return;
      }
      
      toast.error(t('offers.errors.loadFailed'));
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Update loading when showMyOffers changes
  useEffect(() => {
    if (currentUserId) {
      loadOffers();
    }
  }, [showMyOffers]);

  const handleOfferUpdate = (update: any) => {
    console.log('Offer update received:', update);
    // Update offers list based on real-time changes
    if (update.eventType === 'UPDATE') {
      const transformedOffer = offerService.transformOfferFromDatabase(update.new);
      setOffers(prev => prev.map(offer => 
        offer.offerId === transformedOffer.offerId ? transformedOffer : offer
      ));
    } else if (update.eventType === 'INSERT') {
      const transformedOffer = offerService.transformOfferFromDatabase(update.new);
      setOffers(prev => [...prev, transformedOffer]);
    } else if (update.eventType === 'DELETE') {
      const transformedOffer = offerService.transformOfferFromDatabase(update.old);
      setOffers(prev => prev.filter(offer => offer.offerId !== transformedOffer.offerId));
    }
  };

  const handleOfferAction = async (offerId: string, action: 'accept' | 'decline' | 'counter') => {
    // Check if user has influencer profile setup
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
    // Refresh offers list
    loadOffers();
    setSelectedOffer(null);
  };

  const handleOfferSent = (offer: Offer) => {
    // Add new offer to list
    setOffers(prev => [offer, ...prev]);
  };

  const handleLeaveReview = async (offerId: string) => {
    // Find the offer to get partner information
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
    // Find the offer to manage deal
    const offer = offers.find(o => o.offerId === offerId);
    if (!offer) {
      toast.error('Предложение не найдено');
      return;
    }
    
    try {
      // Get or create deal for this offer
      const { dealService } = await import('../../../services/dealService');
      
      // Try to find existing deal
      let deal = null;
      if (offer.type === 'application') {
        // For applications, check by application_id
        const userDeals = await dealService.getUserDeals(currentUserId);
        deal = userDeals.find(d => d.applicationId === offerId);
      } else {
        // For offers, check by offer_id
        const userDeals = await dealService.getUserDeals(currentUserId);
        deal = userDeals.find(d => d.offerId === offerId);
      }
      
      if (!deal) {
        // No deal exists yet, create one
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

  const handleCreatePayment = async (offerId: string) => {
    // Find the offer to create payment
    const offer = offers.find(o => o.offerId === offerId);
    if (!offer) {
      toast.error('Предложение не найдено');
      return;
    }
    
    // Проверяем, что текущий пользователь - это инфлюенсер в данной конкретной сделке
    if (currentUserId !== offer.influencerId) {
      toast.error('Только инфлюенсер в данной сделке может создать окно оплаты');
      return;
    }
    
    // Дополнительная проверка что у пользователя есть настройки инфлюенсера
    if (!currentUserProfile?.profileCompletion.influencerSetup) {
      toast.error('Заполните раздел "Инфлюенсер" для создания окон оплаты');
      return;
    }
    
    // Calculate payment info based on current status
    const paymentStatus = (offer as any).metadata?.paymentStatus;
    const totalAmount = (offer as any).metadata?.totalAmount || offer.details.rate;
    const paidAmount = (offer as any).metadata?.paidAmount || 0;
    const remainingAmount = (offer as any).metadata?.remainingAmount || totalAmount;
    const isAfterPrepayment = paymentStatus === 'prepaid';
    
    const existingPaymentInfoData = isAfterPrepayment ? {
      totalAmount,
      paidAmount,
      remainingAmount,
      paymentStatus,
      paymentStage: 'postpay',
      paymentType: 'postpay',
      isPrepaymentCompleted: true
    } : null;
    
    setPaymentModalExistingInfo(existingPaymentInfoData);
    setSelectedDealOffer(offer);
    setShowPaymentModal(true);
  };

  const handleDealStatusUpdated = () => {
    // Refresh offers to see updated statuses
    loadOffers();
    setShowDealModal(false);
    setSelectedDealOffer(null);
  };

  const handleWithdrawOffer = async (offerId: string) => {
    if (!confirm('Вы уверены, что хотите отозвать это предложение?')) return;

    try {
      // Find the offer to determine if it's a real offer or application
      const offer = offers.find(o => o.offerId === offerId);
      if (!offer) {
        toast.error('Предложение не найдено');
        return;
      }
      
      if (offer.type === 'application') {
        // This is an application, use application service
        const { applicationService } = await import('../../applications/services/applicationService');
        await applicationService.withdrawApplication(offerId);
        
        // Send notification message
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
        // This is a real offer
        await offerService.withdrawOffer(offerId);
        toast.success('Предложение отозвано успешно!');
      }
      
      // Remove from UI only after successful withdrawal
      setOffers(prev => prev.filter(o => o.offerId !== offerId));
    } catch (error: any) {
      console.error('Failed to withdraw offer:', error);
      toast.error(error.message || 'Не удалось отозвать заявку');
    }
  };

  const handleCancelOffer = async (offerId: string) => {
    if (!confirm('Вы уверены, что хотите отменить это предложение?')) return;

    try {
      // Find the offer to determine if it's a real offer or application
      const offer = offers.find(o => o.offerId === offerId);
      if (!offer) {
        toast.error('Предложение не найдено');
        return;
      }
      
      if (offer.type === 'application') {
        // This is an application, use application service
        const { applicationService } = await import('../../applications/services/applicationService');
        await applicationService.cancelApplication(offerId);
        
        // Send notification message
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
        // This is a real offer
        await offerService.withdrawOffer(offerId);
        toast.success('Предложение отменено успешно!');
      }
      
      // Remove from UI only after successful cancellation
      setOffers(prev => prev.filter(o => o.offerId !== offerId));
    } catch (error: any) {
      console.error('Failed to cancel offer:', error);
      toast.error(error.message || 'Не удалось отменить заявку');
    }
  };

  const handleModifyOffer = (offerId: string) => {
    // For now, just show a message - in a real app this would open an edit modal
    toast('Функция изменения условий будет доступна в следующем обновлении');
  };

  const handleViewDetails = (offer: Offer) => {
    setDetailOffer(offer);
    setShowDetailModal(true);
  };

  const filteredOffers = offers.filter(offer => {
    if (selectedFilter === 'all') return true;
    return offer.status === selectedFilter;
  });

  const stats = {
    total: offers.length,
    pending: offers.filter(o => o.status === 'pending').length,
    accepted: offers.filter(o => o.status === 'accepted').length,
    declined: offers.filter(o => o.status === 'declined').length,
    completed: offers.filter(o => o.status === 'completed').length
  };

  const getFilterIcon = (filter: string) => {
    switch (filter) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'declined':
        return <XCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Handshake className="w-4 h-4" />;
    }
  };

  const getFilterColor = (filter: string) => {
    switch (filter) {
      case 'pending':
        return 'text-yellow-600';
      case 'accepted':
        return 'text-green-600';
      case 'declined':
        return 'text-red-600';
      case 'completed':
        return 'text-blue-600';
      default:
        return 'text-purple-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('offers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'offers'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Предложения
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'payments'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Оплаты
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'offers' ? (
        <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {showMyOffers ? t('offers.sentOffers') : t('offers.receivedOffers')}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {showMyOffers 
              ? 'Отслеживайте предложения, отправленные инфлюенсерам'
              : t('offers.subtitle')
            }
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowMyOffers(!showMyOffers)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              showMyOffers
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            {showMyOffers ? t('offers.viewReceived') : t('offers.viewSent')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Handshake className="w-5 h-5 text-purple-600" />
            <span className="ml-2 text-sm font-medium text-gray-600">{t('offers.stats.total')}</span>
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="ml-2 text-sm font-medium text-gray-600">{t('offers.stats.pending')}</span>
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.pending}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="ml-2 text-sm font-medium text-gray-600">{t('offers.stats.accepted')}</span>
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.accepted}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="ml-2 text-sm font-medium text-gray-600">{t('offers.stats.declined')}</span>
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.declined}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <span className="ml-2 text-sm font-medium text-gray-600">{t('offers.stats.completed')}</span>
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'accepted', 'declined', 'completed'].map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedFilter === filter
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className={getFilterColor(filter)}>
              {getFilterIcon(filter)}
            </span>
            <span className="capitalize">
              {filter === 'all' ? t('common.all') :
               filter === 'pending' ? t('offers.status.pending') :
               filter === 'accepted' ? t('offers.status.accepted') :
               filter === 'declined' ? t('offers.status.declined') :
               filter === 'completed' ? t('offers.status.completed') : filter}
            </span>
          </button>
        ))}
      </div>

      {/* Offers List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="h-6 bg-gray-300 rounded mb-2 w-1/3"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2 w-1/2"></div>
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                </div>
                <div className="h-6 bg-gray-300 rounded w-16"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-300 rounded"></div>
                <div className="h-3 bg-gray-300 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOffers.map((offer) => (
            <OfferCard
              key={offer.offerId}
              offer={offer}
              onAction={!showMyOffers ? handleOfferAction : undefined}
             onWithdraw={showMyOffers ? handleCancelOffer : undefined}
              onModify={showMyOffers ? handleModifyOffer : undefined}
              onLeaveReview={handleLeaveReview}
              onManageDeal={handleManageDeal}
              onCreatePayment={handleCreatePayment}
              showSenderActions={showMyOffers}
              currentUserId={currentUserId}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {!isLoading && filteredOffers.length === 0 && (
        <div className="text-center py-12">
          <Handshake className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Предложения не найдены</h3>
          <p className="text-gray-600">
            {selectedFilter !== 'all' 
              ? `Нет ${selectedFilter === 'pending' ? 'ожидающих' : selectedFilter === 'accepted' ? 'принятых' : selectedFilter === 'declined' ? 'отклоненных' : 'завершенных'} предложений в данный момент`
              : showMyOffers
                ? 'Вы еще не отправляли предложений'
                : 'Начните просматривать кампании, чтобы получать предложения о сотрудничестве!'
            }
          </p>
        </div>
      )}

      {/* Response Modal */}
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

      {/* Detailed Offer Modal */}
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

      {/* Create Offer Modal */}
      <CreateOfferModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        influencerId="" // This would be set when creating from a profile
        advertiserId={currentUserId}
        onOfferSent={handleOfferSent}
      />

      {/* Review Modal */}
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

      {/* Deal Management Modal */}
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
          onStatusUpdated={handleDealStatusUpdated}
          onCreatePayment={() => {
            setShowDealModal(false);
            setSelectedDeal(null);
            setShowPaymentModal(true);
          }}
        />
      )}

      {/* Payment Modal */}
      {selectedDealOffer && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedDealOffer(null);
          }}
          offerId={selectedDealOffer.type === 'application' ? undefined : selectedDealOffer.offerId}
          applicationId={selectedDealOffer.type === 'application' ? selectedDealOffer.offerId : undefined}
          payerId={selectedDealOffer.advertiserId}
          payeeId={selectedDealOffer.influencerId}
          totalAmount={selectedDealOffer.details.rate}
          currency={selectedDealOffer.details.currency || 'USD'}
          currentUserId={currentUserId}
          onDealCreated={(deal) => {
            toast.success('Сделка создана! Теперь можно управлять оплатой.');
            setShowPaymentModal(false);
            setSelectedDealOffer(null);
            loadOffers();
          }}
        />
      )}
      
      {/* Payment Window Modal - только через кнопки "Окно оплаты" в принятых предложениях */}
      {selectedDealOffer && (
        <PaymentWindowModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedDealOffer(null);
            setPaymentModalExistingInfo(null);
          }}
          payerId={selectedDealOffer.advertiserId}
          payeeId={selectedDealOffer.influencerId}
          offerId={selectedDealOffer.type === 'application' ? undefined : selectedDealOffer.offerId}
          applicationId={selectedDealOffer.type === 'application' ? selectedDealOffer.offerId : undefined}
          initialAmount={selectedDealOffer.details.rate}
          existingPaymentInfo={paymentModalExistingInfo}
          onWindowCreated={(window) => {
            toast.success('Окно оплаты создано и отправлено в чат!');
            setShowPaymentModal(false);
            setSelectedDealOffer(null);
            setPaymentModalExistingInfo(null);
            loadOffers();
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
          {PaymentTabComponent && <PaymentTabComponent />}
        </React.Suspense>
      )}
    </div>
  );
}