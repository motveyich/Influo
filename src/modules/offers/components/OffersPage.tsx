import React, { useState, useEffect } from 'react';
import { Offer, Application } from '../../../core/types';
import { OfferCard } from './OfferCard';
import { CreateOfferModal } from './CreateOfferModal';
import { OfferResponseModal } from './OfferResponseModal';
import { DetailedOfferModal } from './DetailedOfferModal';
import { PaymentModal } from '../../deals/components/PaymentModal';
import { DealManagementModal } from '../../deals/components/DealManagementModal';
import { ReviewModal } from '../../deals/components/ReviewModal';
import { CreatePaymentRequestModal } from '../../payments/components/CreatePaymentRequestModal';
import { offerService } from '../services/offerService';
import { applicationService } from '../../applications/services/applicationService';
import { dealService } from '../../../services/dealService';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation } from '../../../hooks/useTranslation';
import { useProfileCompletion } from '../../profiles/hooks/useProfileCompletion';
import { FeatureGate } from '../../../components/FeatureGate';
import { Handshake, Eye, Send, CheckCircle, Clock, XCircle, TrendingUp, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailOffer, setDetailOffer] = useState<Offer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOfferForPayment, setSelectedOfferForPayment] = useState<Offer | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewOffer, setReviewOffer] = useState<Offer | null>(null);
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
  const [paymentRequestOffer, setPaymentRequestOffer] = useState<Offer | null>(null);

  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);

  useEffect(() => {
    if (currentUserId && !loading) {
      loadEnhancedOffers();
    }
  }, [currentUserId, loading, activeTab]);

  const loadEnhancedOffers = async () => {
    try {
      setIsLoading(true);
      
      if (activeTab === 'received') {
        // Load both received offers and applications
        const [receivedOffers, receivedApplications] = await Promise.all([
          offerService.getUserOffers(currentUserId, 'received'),
          applicationService.getUserApplications(currentUserId, 'received')
        ]);
        
        // Transform applications to match Offer interface
        const transformedApplications = receivedApplications.map(app => ({
          offerId: app.id,
          influencerId: app.applicantId, // The one who applied
          campaignId: app.targetReferenceId, // Reference to the target (card/campaign)
          advertiserId: app.targetId, // The one who received the application
          details: {
            rate: app.applicationData?.proposedRate || 0,
            currency: 'USD',
            deliverables: app.applicationData?.deliverables || [],
            timeline: app.applicationData?.timeline || '',
            terms: app.applicationData?.message || ''
          },
          status: app.status as any,
          timeline: {
            createdAt: app.createdAt,
            respondedAt: app.timeline?.respondedAt,
            completedAt: app.timeline?.completedAt
          },
          messages: [],
          metadata: app.metadata,
          // Mark as application for UI distinction
          type: 'application',
          applicationTargetType: app.targetType
        }));
        
        setOffers(receivedOffers);
        setApplications(transformedApplications as any);
      } else {
        // Load sent offers and applications
        const [sentOffers, sentApplications] = await Promise.all([
          offerService.getUserOffers(currentUserId, 'sent'),
          applicationService.getUserApplications(currentUserId, 'sent')
        ]);
        
        // Transform sent applications to match Offer interface
        const transformedSentApplications = sentApplications.map(app => ({
          offerId: app.id,
          influencerId: app.applicantId, // The one who applied (current user)
          campaignId: app.targetReferenceId,
          advertiserId: app.targetId, // The one who received
          details: {
            rate: app.applicationData?.proposedRate || 0,
            currency: 'USD',
            deliverables: app.applicationData?.deliverables || [],
            timeline: app.applicationData?.timeline || '',
            terms: app.applicationData?.message || ''
          },
          status: app.status as any,
          timeline: {
            createdAt: app.createdAt,
            respondedAt: app.timeline?.respondedAt,
            completedAt: app.timeline?.completedAt
          },
          messages: [],
          metadata: app.metadata,
          // Mark as application for UI distinction
          type: 'application',
          applicationTargetType: app.targetType
        }));
        
        setOffers(sentOffers);
        setApplications(transformedSentApplications as any);
      }
    } catch (error: any) {
      console.error('Failed to load offers:', error);
      toast.error((error as any)?.message || 'Не удалось загрузить предложения');
      setOffers([]);
      setApplications([]);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfferAction = async (offerId: string, action: 'accept' | 'decline' | 'counter') => {
    try {
      await offerService.respondToOffer(offerId, action, undefined, currentUserId);
      await loadEnhancedOffers();
      
      const actionText = action === 'accept' ? 'принято' : action === 'decline' ? 'отклонено' : 'отправлено встречное предложение';
      toast.success(`Предложение ${actionText}!`);
    } catch (error: any) {
      console.error('Failed to respond to offer:', error);
      toast.error(error.message || 'Не удалось ответить на предложение');
    }
  };

  const handleApplicationAction = async (applicationId: string, action: 'accept' | 'decline' | 'counter') => {
    try {
      const mappedAction = action === 'counter' ? 'in_progress' : action === 'accept' ? 'accepted' : 'declined';
      await applicationService.respondToApplication(applicationId, mappedAction as any);
      await loadEnhancedOffers();
      
      const actionText = action === 'accept' ? 'принята' : action === 'decline' ? 'отклонена' : 'взята в работу';
      toast.success(`Заявка ${actionText}!`);
    } catch (error: any) {
      console.error('Failed to respond to application:', error);
      toast.error(error.message || 'Не удалось ответить на заявку');
    }
  };

  const handleCompleteOffer = async (offerId: string) => {
    try {
      await offerService.completeOffer(offerId, currentUserId);
      await loadEnhancedOffers();
      toast.success('Сотрудничество завершено!');
    } catch (error: any) {
      console.error('Failed to complete offer:', error);
      toast.error(error.message || 'Не удалось завершить предложение');
    }
  };

  const handleCompleteApplication = async (applicationId: string) => {
    try {
      await applicationService.completeApplication(applicationId, currentUserId);
      await loadEnhancedOffers();
      toast.success('Сотрудничество завершено!');
    } catch (error: any) {
      console.error('Failed to complete application:', error);
      toast.error(error.message || 'Не удалось завершить заявку');
    }
  };

  const handleWithdraw = async (offerId: string) => {
    try {
      await offerService.withdrawOffer(offerId);
      await loadEnhancedOffers();
      toast.success(t('offers.success.withdrawn'));
    } catch (error: any) {
      console.error('Failed to withdraw offer:', error);
      toast.error(error.message || t('offers.errors.withdrawFailed'));
    }
  };

  const handleCreatePayment = (offer: Offer) => {
    setPaymentRequestOffer(offer);
    setShowPaymentRequestModal(true);
  };

  const handleManageDeal = async (offerId: string) => {
    try {
      // Get deal for this offer
      const deal = await dealService.getDeal(offerId);
      if (deal) {
        setSelectedDeal(deal);
        setShowDealModal(true);
      } else {
        toast.error('Сделка не найдена');
      }
    } catch (error: any) {
      console.error('Failed to load deal:', error);
      toast.error('Не удалось загрузить сделку');
    }
  };

  const handleLeaveReview = (offer: Offer) => {
    setReviewOffer(offer);
    setShowReviewModal(true);
  };

  const handleViewDetails = (offer: Offer) => {
    setDetailOffer(offer);
    setShowDetailModal(true);
  };

  const allOffers = [...offers, ...applications].sort((a, b) => 
    new Date(b.timeline.createdAt).getTime() - new Date(a.timeline.createdAt).getTime()
  );

  const stats = {
    total: allOffers.length,
    pending: allOffers.filter(o => o.status === 'pending').length,
    accepted: allOffers.filter(o => o.status === 'accepted').length,
    declined: allOffers.filter(o => o.status === 'declined').length,
    completed: allOffers.filter(o => o.status === 'completed').length
  };

  return (
    <FeatureGate
      profile={currentUserProfile}
      requiredSection="any"
      featureName="Предложения"
      onCompleteProfile={() => window.location.href = '/profiles'}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('offers.title')}</h1>
            <p className="mt-1 text-sm text-gray-600">{t('offers.subtitle')}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="ml-2 text-sm font-medium text-gray-600">{t('offers.stats.completed')}</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.completed}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('received')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'received'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('offers.receivedOffers')} ({stats.total - (offers.length - applications.length)})
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'sent'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('offers.sentOffers')} ({offers.length})
            </button>
          </nav>
        </div>

        {/* Offers Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="h-6 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-full"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-300 rounded"></div>
                  <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : allOffers.length === 0 ? (
          <div className="text-center py-12">
            <Handshake className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === 'received' ? 'Нет полученных предложений' : 'Нет отправленных предложений'}
            </h3>
            <p className="text-gray-600">
              {activeTab === 'received' 
                ? 'Предложения о сотрудничестве появятся здесь'
                : 'Отправьте предложения инфлюенсерам для начала сотрудничества'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {allOffers.map((offer) => (
              <OfferCard
                key={offer.offerId}
                offer={offer}
                onAction={
                  activeTab === 'received' 
                    ? ((offer as any).type === 'application' ? handleApplicationAction : handleOfferAction)
                    : undefined
                }
                onManageDeal={handleManageDeal}
                onCreatePayment={handleCreatePayment}
                onWithdraw={activeTab === 'sent' ? handleWithdraw : undefined}
                onLeaveReview={handleLeaveReview}
                showSenderActions={activeTab === 'sent'}
                currentUserId={currentUserId}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        <CreateOfferModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          influencerId={currentUserId}
          advertiserId=""
          onOfferSent={() => {
            setShowCreateModal(false);
            loadEnhancedOffers();
          }}
        />

        <OfferResponseModal
          isOpen={showResponseModal}
          onClose={() => setShowResponseModal(false)}
          offer={selectedOffer!}
          onResponseSent={() => {
            setShowResponseModal(false);
            loadEnhancedOffers();
          }}
        />

        <DetailedOfferModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          offer={detailOffer!}
          currentUserId={currentUserId}
          showSenderActions={activeTab === 'sent'}
        />

        {paymentRequestOffer && (
          <CreatePaymentRequestModal
            isOpen={showPaymentRequestModal}
            onClose={() => setShowPaymentRequestModal(false)}
            payerId={paymentRequestOffer.advertiserId}
            payeeId={paymentRequestOffer.influencerId}
            relatedOfferId={paymentRequestOffer.offerId}
            initialAmount={paymentRequestOffer.details.rate}
            currency={paymentRequestOffer.details.currency}
            onRequestCreated={() => {
              setShowPaymentRequestModal(false);
              setPaymentRequestOffer(null);
              loadEnhancedOffers();
            }}
          />
        )}

        <DealManagementModal
          isOpen={showDealModal}
          onClose={() => setShowDealModal(false)}
          deal={selectedDeal}
          currentUserId={currentUserId}
          onStatusUpdated={() => {
            setShowDealModal(false);
            loadEnhancedOffers();
          }}
          onCreatePayment={() => {
            setShowDealModal(false);
            // Handle payment creation
          }}
        />

        {reviewOffer && (
          <ReviewModal
            isOpen={showReviewModal}
            onClose={() => setShowReviewModal(false)}
            dealId={(reviewOffer as any).dealId || reviewOffer.offerId}
            reviewerId={currentUserId}
            revieweeId={activeTab === 'received' ? reviewOffer.influencerId : reviewOffer.advertiserId}
            collaborationType={activeTab === 'received' ? 'as_advertiser' : 'as_influencer'}
            revieweeName="Партнер"
            onReviewSubmitted={() => {
              setShowReviewModal(false);
              setReviewOffer(null);
            }}
          />
        )}
      </div>
    </FeatureGate>
  );
}
                
          )
          )
          }
  )
}
            )
            )
            }
  )
}