import React, { useState, useEffect } from 'react';
import { CollaborationOffer, OfferStatus } from '../../../core/types';
import { offerService } from '../services/offerService';
import { useAuth } from '../../../hooks/useAuth';
import { useProfileCompletion } from '../../profiles/hooks/useProfileCompletion';
import { FeatureGate } from '../../../components/FeatureGate';
import { OfferCard } from './OfferCard';
import { CreateOfferModal } from './CreateOfferModal';
import { OfferDetailsModal } from './OfferDetailsModal';
import { 
  Send, 
  Inbox, 
  Plus, 
  Search, 
  Filter,
  Target,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Trophy
} from 'lucide-react';
import toast from 'react-hot-toast';

type OfferTab = 'sent' | 'received';

export function OffersPage() {
  const [activeTab, setActiveTab] = useState<OfferTab>('received');
  const [offers, setOffers] = useState<CollaborationOffer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OfferStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<CollaborationOffer | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { user, loading } = useAuth();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);

  useEffect(() => {
    if (currentUserId && !loading) {
      loadOffers();
    }
  }, [currentUserId, loading, activeTab]);

  const loadOffers = async () => {
    try {
      setIsLoading(true);
      const loadedOffers = await offerService.getUserOffers(currentUserId, activeTab);
      setOffers(loadedOffers);
    } catch (error) {
      console.error('Failed to load offers:', error);
      toast.error('Не удалось загрузить предложения');
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOffer = () => {
    // Only influencers can create offers
    if (!currentUserProfile?.profileCompletion.influencerSetup) {
      toast.error('Заполните раздел "Инфлюенсер" для создания предложений');
      return;
    }
    setShowCreateModal(true);
  };

  const handleOfferCreated = (newOffer: CollaborationOffer) => {
    if (activeTab === 'sent') {
      setOffers(prev => [newOffer, ...prev]);
    }
    setShowCreateModal(false);
  };

  const handleOfferUpdated = (updatedOffer: CollaborationOffer) => {
    setOffers(prev => prev.map(offer => 
      offer.id === updatedOffer.id ? updatedOffer : offer
    ));
    if (selectedOffer?.id === updatedOffer.id) {
      setSelectedOffer(updatedOffer);
    }
  };

  const handleViewDetails = (offer: CollaborationOffer) => {
    setSelectedOffer(offer);
    setShowDetailsModal(true);
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         offer.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || offer.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getTabCounts = () => {
    const sentOffers = offers.filter(offer => offer.influencerId === currentUserId);
    const receivedOffers = offers.filter(offer => offer.advertiserId === currentUserId);
    
    return {
      sent: sentOffers.length,
      received: receivedOffers.length
    };
  };

  const getOfferStats = () => {
    return {
      total: offers.length,
      pending: offers.filter(o => o.status === 'pending').length,
      accepted: offers.filter(o => o.status === 'accepted').length,
      inProgress: offers.filter(o => o.status === 'in_progress').length,
      completed: offers.filter(o => o.status === 'completed').length,
      totalValue: offers
        .filter(o => ['accepted', 'in_progress', 'completed'].includes(o.status))
        .reduce((sum, o) => sum + (o.acceptedRate || o.proposedRate), 0)
    };
  };

  const tabCounts = getTabCounts();
  const stats = getOfferStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTabIcon = (tab: OfferTab) => {
    return tab === 'sent' ? <Send className="w-4 h-4" /> : <Inbox className="w-4 h-4" />;
  };

  const getTabLabel = (tab: OfferTab) => {
    return tab === 'sent' ? 'Отправленные' : 'Полученные';
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
            <h1 className="text-2xl font-bold text-gray-900">Предложения о сотрудничестве</h1>
            <p className="mt-1 text-sm text-gray-600">
              Управление заявками и сотрудничеством с партнерами
            </p>
          </div>
          
          {currentUserProfile?.profileCompletion.influencerSetup && (
            <button
              onClick={handleCreateOffer}
              className="mt-4 sm:mt-0 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Создать предложение</span>
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Target className="w-5 h-5 text-purple-600" />
              <span className="ml-2 text-sm font-medium text-gray-600">Всего</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="ml-2 text-sm font-medium text-gray-600">Ожидают</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.pending}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="ml-2 text-sm font-medium text-gray-600">Приняты</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.accepted}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="ml-2 text-sm font-medium text-gray-600">В работе</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.inProgress}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Trophy className="w-5 h-5 text-green-600" />
              <span className="ml-2 text-sm font-medium text-gray-600">Завершены</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.completed}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="ml-2 text-sm font-medium text-gray-600">Доход</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatCurrency(stats.totalValue)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              {(['sent', 'received'] as OfferTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab
                      ? 'text-purple-600 border-purple-600 bg-purple-50'
                      : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    {getTabIcon(tab)}
                    <span>{getTabLabel(tab)}</span>
                    {tabCounts[tab] > 0 && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        activeTab === tab
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {tabCounts[tab]}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Поиск предложений..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as OfferStatus | 'all')}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">Все статусы</option>
                  <option value="pending">Ожидают ответа</option>
                  <option value="accepted">Приняты</option>
                  <option value="in_progress">В работе</option>
                  <option value="completed">Завершены</option>
                  <option value="terminated">Расторгнуты</option>
                  <option value="declined">Отклонены</option>
                  <option value="cancelled">Отменены</option>
                </select>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-6 animate-pulse">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="h-6 bg-gray-300 rounded mb-2"></div>
                        <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                      </div>
                      <div className="h-8 bg-gray-300 rounded w-20"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-300 rounded"></div>
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="text-center py-12">
                {getTabIcon(activeTab)}
                <div className="w-16 h-16 text-gray-400 mx-auto mb-4">
                  {getTabIcon(activeTab)}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {activeTab === 'sent' ? 'Нет отправленных предложений' : 'Нет полученных предложений'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {activeTab === 'sent' 
                    ? 'Создайте первое предложение о сотрудничестве'
                    : 'Когда рекламодатели отправят вам предложения, они появятся здесь'
                  }
                </p>
                {activeTab === 'sent' && currentUserProfile?.profileCompletion.influencerSetup && (
                  <button
                    onClick={handleCreateOffer}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Создать предложение</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOffers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    currentUserId={currentUserId}
                    userRole={activeTab === 'sent' ? 'influencer' : 'advertiser'}
                    onOfferUpdated={handleOfferUpdated}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Offer Modal */}
        <CreateOfferModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          influencerId={currentUserId}
          onOfferCreated={handleOfferCreated}
        />

        {/* Offer Details Modal */}
        {selectedOffer && (
          <OfferDetailsModal
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedOffer(null);
            }}
            offer={selectedOffer}
            currentUserId={currentUserId}
            onOfferUpdated={handleOfferUpdated}
          />
        )}
      </div>
    </FeatureGate>
  );
}