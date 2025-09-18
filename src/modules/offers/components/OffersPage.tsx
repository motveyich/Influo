import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CollaborationOffer, OfferStatus } from '../../../core/types';
import { offerService } from '../services/offerService';
import { useAuth } from '../../../hooks/useAuth';
import { useProfileCompletion } from '../../profiles/hooks/useProfileCompletion';
import { FeatureGate } from '../../../components/FeatureGate';
import { OfferCard } from './OfferCard';
import { OfferDetailsModal } from './OfferDetailsModal';
import { 
  Search, 
  Filter,
  Target,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  PlayCircle,
  Archive,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

type OfferTab = 'active' | 'completed';

export function OffersPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<OfferTab>('active');
  const [offers, setOffers] = useState<CollaborationOffer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OfferStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<CollaborationOffer | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { user, loading } = useAuth();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);

  useEffect(() => {
    if (currentUserId && !loading) {
      loadOffers();
    }
  }, [currentUserId, loading, activeTab, location.pathname]);

  const loadOffers = async () => {
    try {
      setIsLoading(true);
      
      // Загружаем все предложения, где пользователь является участником
      const allOffers = await offerService.getOffersByParticipant(currentUserId);
      
      // Фильтруем по вкладке
      const filteredByTab = allOffers.filter(offer => {
        if (activeTab === 'active') {
          return ['pending', 'accepted', 'in_progress'].includes(offer.status);
        } else {
          return ['completed', 'declined', 'cancelled', 'terminated'].includes(offer.status);
        }
      });
      
      setOffers(filteredByTab);
    } catch (error) {
      console.error('Failed to load offers:', error);
      toast.error('Не удалось загрузить предложения');
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfferUpdated = (updatedOffer: CollaborationOffer) => {
    setOffers(prev => prev.map(offer => 
      offer.id === updatedOffer.id ? updatedOffer : offer
    ));
    if (selectedOffer?.id === updatedOffer.id) {
      setSelectedOffer(updatedOffer);
    }
    
    // Если статус изменился так, что предложение перешло в другую категорию, перезагружаем
    const isActiveStatus = ['pending', 'accepted', 'in_progress'].includes(updatedOffer.status);
    const shouldRefresh = (activeTab === 'active' && !isActiveStatus) || 
                         (activeTab === 'completed' && isActiveStatus);
    
    if (shouldRefresh) {
      loadOffers();
    }
  };

  const handleViewDetails = (offer: CollaborationOffer) => {
    setSelectedOffer(offer);
    setShowDetailsModal(true);
  };

  const getUserRole = (offer: CollaborationOffer): 'influencer' | 'advertiser' => {
    return offer.influencerId === currentUserId ? 'influencer' : 'advertiser';
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         offer.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || offer.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getOfferStats = () => {
    const activeOffers = offers.filter(o => ['pending', 'accepted', 'in_progress'].includes(o.status));
    const completedOffers = offers.filter(o => ['completed', 'declined', 'cancelled', 'terminated'].includes(o.status));
    
    return {
      total: offers.length,
      pending: offers.filter(o => o.status === 'pending').length,
      accepted: offers.filter(o => o.status === 'accepted').length,
      inProgress: offers.filter(o => o.status === 'in_progress').length,
      completed: offers.filter(o => o.status === 'completed').length,
      totalValue: offers
        .filter(o => ['accepted', 'in_progress', 'completed'].includes(o.status))
        .reduce((sum, o) => sum + (o.acceptedRate || o.proposedRate), 0),
      activeCount: activeOffers.length,
      completedCount: completedOffers.length
    };
  };

  const getStatusFiltersForTab = (): { value: OfferStatus | 'all'; label: string }[] => {
    if (activeTab === 'active') {
      return [
        { value: 'all', label: 'Все статусы' },
        { value: 'pending', label: 'Ожидают ответа' },
        { value: 'accepted', label: 'Приняты' },
        { value: 'in_progress', label: 'В работе' }
      ];
    } else {
      return [
        { value: 'all', label: t('offers.allStatuses') },
        { value: 'completed', label: t('offers.completed') },
        { value: 'declined', label: t('offers.declined') },
        { value: 'cancelled', label: t('offers.cancelled') },
        { value: 'terminated', label: t('offers.terminated') }
      ];
    }
  };

  const stats = getOfferStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTabLabel = (tab: OfferTab) => {
    return tab === 'active' ? t('offers.active') : t('offers.completed');
  };

  const getEmptyStateMessage = () => {
    if (activeTab === 'active') {
      return {
        icon: <PlayCircle className="w-16 h-16 text-gray-400" />,
        title: t('offers.noActiveOffers'),
        subtitle: t('offers.activeOffersDescription'),
        description: t('offers.offersCreatedDescription')
      };
    } else {
      return {
        icon: <Archive className="w-16 h-16 text-gray-400" />,
        title: t('offers.noCompletedOffers'),
        subtitle: t('offers.completedOffersDescription'),
        description: t('offers.afterCompletionDescription')
      };
    }
  };

  return (
    <FeatureGate
      profile={currentUserProfile}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('offers.title')}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {t('offers.subtitle')}
            </p>
          </div>
          
          {/* Информационная подсказка */}
          <div className="mt-4 sm:mt-0 bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-xs">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-800">{t('offers.howToCreateOffers')}</p>
                <p className="text-xs text-blue-700 mt-1">
                  {t('offers.offersCreatedAutomatically')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Target className="w-5 h-5 text-purple-600" />
              <span className="ml-2 text-sm font-medium text-gray-600">{t('offers.total')}</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <PlayCircle className="w-5 h-5 text-blue-600" />
              <span className="ml-2 text-sm font-medium text-gray-600">{t('offers.activeOffers')}</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.activeCount}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Archive className="w-5 h-5 text-gray-600" />
              <span className="ml-2 text-sm font-medium text-gray-600">{t('offers.completedOffers')}</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.completedCount}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="ml-2 text-sm font-medium text-gray-600">{t('offers.pending')}</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.pending}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="ml-2 text-sm font-medium text-gray-600">{t('offers.inProgress')}</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.inProgress}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="ml-2 text-sm font-medium text-gray-600">{t('offers.income')}</span>
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
              {(['active', 'completed'] as OfferTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab
                      ? 'text-purple-600 border-purple-600 bg-purple-50 dark:text-purple-300 dark:bg-purple-900'
                      : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>{getTabLabel(tab)}</span>
                    {((tab === 'active' && stats.activeCount > 0) || (tab === 'completed' && stats.completedCount > 0)) && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        activeTab === tab
                          ? 'bg-purple-600 text-white dark:bg-purple-500'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {tab === 'active' ? stats.activeCount : stats.completedCount}
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
                  placeholder={t('offers.searchOffers')}
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
                  {getStatusFiltersForTab().map(filter => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {getEmptyStateMessage().title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {getEmptyStateMessage().subtitle}
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-gray-700">
                    {getEmptyStateMessage().description}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOffers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    currentUserId={currentUserId}
                    userRole={getUserRole(offer)}
                    onOfferUpdated={handleOfferUpdated}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

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