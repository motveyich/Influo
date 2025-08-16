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
      
      // Load applications based on current view
      const userApplications = await applicationService.getUserApplications(
        currentUserId, 
        showMyOffers ? 'sent' : 'received'
      );
      
      // Transform applications to offer-like format for display
      const transformedApplications = userApplications.map(app => ({
        offerId: app.id,
        influencerId: showMyOffers ? app.applicantId : app.targetId,
        campaignId: app.targetReferenceId,
        advertiserId: showMyOffers ? app.targetId : app.applicantId,
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
      
      return transformedApplications;
    } catch (error) {
      console.error('Failed to load applications:', error);
      return [];
    }
  };

  const loadOffers = async () => {
    try {
      console.log('=== LOAD OFFERS START ===');
      console.log('Show my offers:', showMyOffers);
      console.log('Current user ID:', currentUserId);
      
      setIsLoading(true);
      
      // Load real offers from offers table
      console.log('Loading real offers...');
      const loadedOffers = await offerService.getUserOffers(
        currentUserId, 
        showMyOffers ? 'sent' : 'received'
      );
      console.log('Real offers loaded:', loadedOffers.length);
      
      // Load applications and transform them
      console.log('Loading applications...');
      const transformedApplications = await loadApplications();
      console.log('Applications loaded:', transformedApplications.length);
      
      // Combine real offers with transformed applications
      const allOffers = [...loadedOffers, ...transformedApplications];
      console.log('Total combined offers:', allOffers.length);
      console.log('All offers:', allOffers.map(o => ({ id: o.offerId, status: o.status, type: o.type })));
      
      setOffers(allOffers);
      console.log('=== LOAD OFFERS END ===');
    } catch (error) {
      console.error('Failed to load offers:', error);
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
      setOffers(prev => prev.map(offer => 
        offer.offerId === update.new.offerId ? update.new : offer
      ));
    } else if (update.eventType === 'INSERT') {
      setOffers(prev => [...prev, update.new]);
    } else if (update.eventType === 'DELETE') {
      setOffers(prev => prev.filter(offer => offer.offerId !== update.old.offerId));
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

  const handleWithdrawOffer = async (offerId: string) => {
    if (!confirm('Вы уверены, что хотите отозвать это предложение?')) return;

    try {
      console.log('=== WITHDRAW DEBUG START ===');
      console.log('Withdrawing offer/application with ID:', offerId);
      console.log('Current user ID:', currentUserId);
      
      // Find the offer to determine if it's a real offer or application
      const offer = offers.find(o => o.offerId === offerId);
      console.log('Found offer/application:', offer);
      console.log('Offer type:', offer?.type);
      
      if (offer?.type === 'application') {
        console.log('Processing as application withdrawal...');
        // This is an application, use application service
        const { applicationService } = await import('../../applications/services/applicationService');
        console.log('About to call withdrawApplication...');
        await applicationService.withdrawApplication(offerId);
        console.log('withdrawApplication completed successfully');
        
        // Send chat notification
        console.log('Sending chat notification...');
        console.log('SenderId:', currentUserId, 'ReceiverId:', offer.advertiserId);
        const { chatService } = await import('../../chat/services/chatService');
        await chatService.sendMessage({
          senderId: currentUserId,
          receiverId: offer.advertiserId,
          messageContent: 'Заявка на сотрудничество была отозвана отправителем.',
          messageType: 'text',
          metadata: {
            applicationId: offerId,
            actionType: 'application_withdrawn'
          }
        });
        console.log('Chat notification sent successfully');
        
        toast.success('Заявка отозвана успешно!');
      } else {
        console.log('Processing as real offer withdrawal...');
        // This is a real offer
        await offerService.withdrawOffer(offerId);
        toast.success('Предложение отозвано успешно!');
      }
      
      console.log('About to reload offers...');
      // Force reload the offers list to get fresh data from database
      await loadOffers();
      console.log('Offers reloaded successfully');
      console.log('=== WITHDRAW DEBUG END ===');
    } catch (error: any) {
      console.error('=== WITHDRAW ERROR ===');
      console.error('Failed to withdraw offer:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      toast.error(error.message || 'Не удалось отозвать заявку');
    }
  };

  const handleModifyOffer = (offerId: string) => {
    // For now, just show a message - in a real app this would open an edit modal
    toast('Функция изменения условий будет доступна в следующем обновлении');
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
              onAction={!showMyOffers ? handleOfferAction : undefined}
              onWithdraw={showMyOffers ? handleWithdrawOffer : undefined}
              onModify={showMyOffers ? handleModifyOffer : undefined}
              showSenderActions={showMyOffers}
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