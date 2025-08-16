import React, { useState, useEffect } from 'react';
import { Offer } from '../../../core/types';
import { OfferCard } from './OfferCard';
import { OfferResponseModal } from './OfferResponseModal';
import { CreateOfferModal } from './CreateOfferModal';
import { offerService } from '../services/offerService';
import { Handshake, Filter, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { realtimeService } from '../../../core/realtime';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuth } from '../../../hooks/useAuth';
import { useProfileCompletion } from '../../profiles/hooks/useProfileCompletion';
import toast from 'react-hot-toast';

export function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'accepted' | 'declined' | 'completed'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showMyOffers, setShowMyOffers] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);

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
      const { applicationService } = await import('../../applications/services/applicationService');
      
      // Load applications as offers
      const sentApplications = await applicationService.getUserApplications(currentUserId, 'sent');
      const receivedApplications = await applicationService.getUserApplications(currentUserId, 'received');
      
      // Transform applications to offer-like format for display
      const transformedSent = sentApplications.map(app => ({
        offerId: app.id,
        influencerId: app.targetType === 'influencer_card' ? app.targetId : app.applicantId,
        campaignId: app.targetReferenceId,
        advertiserId: app.targetType === 'advertiser_card' ? app.targetId : app.applicantId,
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
        type: 'application'
      }));
      
      const transformedReceived = receivedApplications.map(app => ({
        offerId: app.id,
        influencerId: app.targetType === 'influencer_card' ? app.targetId : app.applicantId,
        campaignId: app.targetReferenceId,
        advertiserId: app.targetType === 'advertiser_card' ? app.targetId : app.applicantId,
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
        type: 'application'
      }));
      
      setApplications(showMyOffers ? transformedSent : transformedReceived);
    } catch (error) {
      console.error('Failed to load applications:', error);
      setApplications([]);
    }
  };

  const loadOffers = async () => {
    try {
      setIsLoading(true);
      
      let loadedOffers: Offer[];
      if (showMyOffers) {
        // Load offers sent by current user (advertiser)
        loadedOffers = await offerService.getUserOffers(currentUserId, 'sent');
      } else {
        // Load offers received by current user (influencer)
        loadedOffers = await offerService.getUserOffers(currentUserId, 'received');
      }
      
      // Combine offers and applications
      const combinedOffers = [...loadedOffers, ...applications];
      setOffers(combinedOffers);
    } catch (error) {
      console.error('Failed to load offers:', error);
      toast.error(t('offers.errors.loadFailed'));
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Update applications loading when showMyCampaigns changes
  useEffect(() => {
    if (currentUserId) {
      loadApplications();
    }
  }, [showMyOffers]);

  const handleOfferUpdate = (update: any) => {
    console.log('Offer update received:', update);
    // Update offers list based on real-time changes
    if (update.eventType === 'UPDATE') {
      setOffers(prev => prev.map(offer => 
        offer.offerId === update.new.offerId ? update.new : offer
      ));
    } else if (update.eventType === 'INSERT') {
      setOffers(prev => [...prev, update.new]);
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
              onAction={showMyOffers ? undefined : handleOfferAction}
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

      {/* Create Offer Modal */}
      <CreateOfferModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        influencerId="" // This would be set when creating from a profile
        advertiserId={currentUserId}
        onOfferSent={handleOfferSent}
      />
    </div>
  );
}