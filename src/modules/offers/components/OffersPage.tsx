import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CollaborationOffer, OfferStatus } from '../../../core/types';
import { offerService } from '../services/offerService';
import { applicationService } from '../../applications/services/applicationService';
import { CollaborationAdapter, UnifiedCollaboration } from '../services/collaborationAdapter';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation } from '../../../hooks/useTranslation';
import { useProfileCompletion } from '../../profiles/hooks/useProfileCompletion';
import { FeatureGate } from '../../../components/FeatureGate';
import { OfferCard } from './OfferCard';
import { OfferDetailsModal } from './OfferDetailsModal';
import { UserPublicProfileModal } from '../../profiles/components/UserPublicProfileModal';
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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<OfferTab>('active');
  const [collaborations, setCollaborations] = useState<UnifiedCollaboration[]>([]);
  const [allCollaborations, setAllCollaborations] = useState<UnifiedCollaboration[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OfferStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<CollaborationOffer | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const { user, loading } = useAuth();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);

  useEffect(() => {
    if (currentUserId && !loading) {
      loadCollaborations();
    }
  }, [currentUserId, loading, activeTab, location.pathname]);

  const loadCollaborations = async () => {
    try {
      setIsLoading(true);

      const [loadedApplications, loadedOffers] = await Promise.all([
        applicationService.getApplicationsByParticipant(currentUserId).catch((err) => {
          console.error('Failed to load applications:', err);
          return [];
        }),
        offerService.getOffersByParticipant(currentUserId).catch((err) => {
          console.error('Failed to load offers:', err);
          return [];
        })
      ]);

      console.log('Loaded data:', {
        applications: loadedApplications.length,
        offers: loadedOffers.length,
        applicationsData: loadedApplications,
        offersData: loadedOffers
      });

      const unified = CollaborationAdapter.mergeAndSort(
        loadedApplications,
        loadedOffers,
        currentUserId
      );

      console.log('Unified collaborations:', unified);

      setAllCollaborations(unified);

      const filteredByTab = unified.filter(collab => {
        if (activeTab === 'active') {
          return CollaborationAdapter.isActiveStatus(collab.status);
        } else {
          return CollaborationAdapter.isCompletedStatus(collab.status);
        }
      });

      console.log(`Filtered for ${activeTab} tab:`, filteredByTab);

      setCollaborations(filteredByTab);
    } catch (error) {
      console.error('Failed to load collaborations:', error);
      toast.error('Не удалось загрузить предложения');
      setCollaborations([]);
      setAllCollaborations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfferUpdated = (updatedOffer: CollaborationOffer) => {
    const isActiveStatus = CollaborationAdapter.isActiveStatus(updatedOffer.status);
    const shouldRefresh = (activeTab === 'active' && !isActiveStatus) ||
                         (activeTab === 'completed' && isActiveStatus);

    if (shouldRefresh) {
      loadCollaborations();
    }
  };

  const handleViewDetails = (collab: UnifiedCollaboration) => {
    if (collab.type === 'offer') {
      setSelectedOffer(collab.originalData as CollaborationOffer);
      setShowDetailsModal(true);
    } else {
      toast.info('Детали заявок скоро будут доступны');
    }
  };

  const handleViewProfile = (userId: string) => {
    setProfileUserId(userId);
    setShowProfileModal(true);
  };

  const getUserRole = (collab: UnifiedCollaboration): 'influencer' | 'advertiser' => {
    return collab.influencerId === currentUserId ? 'influencer' : 'advertiser';
  };

  const getUserRoleInOffer = (collab: UnifiedCollaboration) => {
    const baseRole = getUserRole(collab);
    const isInitiator = collab.type === 'application' ?
      (collab.originalData as any).applicantId === currentUserId :
      (collab.originalData as CollaborationOffer).initiatedBy === currentUserId;

    return {
      baseRole,
      isInitiator,
      roleLabel: `${baseRole === 'influencer' ? 'Инфлюенсер' : 'Рекламодатель'} (${isInitiator ? 'Отправитель' : 'Получатель'})`
    };
  };

  const filteredCollaborations = collaborations.filter(collab => {
    try {
      const title = collab.title || '';
      const description = collab.description || '';
      const searchLower = searchQuery.toLowerCase();

      const matchesSearch = title.toLowerCase().includes(searchLower) ||
                           description.toLowerCase().includes(searchLower);

      const matchesStatus = statusFilter === 'all' || collab.status === statusFilter;

      return matchesSearch && matchesStatus;
    } catch (error) {
      console.error('Error filtering collaboration:', collab, error);
      return false;
    }
  });

  const getOfferStats = () => {
    const activeCollabs = allCollaborations.filter(c => CollaborationAdapter.isActiveStatus(c.status));
    const completedCollabs = allCollaborations.filter(c => CollaborationAdapter.isCompletedStatus(c.status));

    return {
      total: allCollaborations.length,
      pending: allCollaborations.filter(c => c.status === 'pending' || c.status === 'sent').length,
      accepted: allCollaborations.filter(c => c.status === 'accepted').length,
      inProgress: allCollaborations.filter(c => c.status === 'in_progress').length,
      completed: allCollaborations.filter(c => c.status === 'completed').length,
      totalValue: allCollaborations
        .filter(c => ['accepted', 'in_progress', 'completed'].includes(c.status))
        .reduce((sum, c) => sum + (c.proposedRate || 0), 0),
      activeCount: activeCollabs.length,
      completedCount: completedCollabs.length
    };
  };

  const getStatusFiltersForTab = (): { value: OfferStatus | 'all'; label: string }[] => {
    if (activeTab === 'active') {
      return [
        { value: 'all', label: t('offers.allStatuses') },
        { value: 'pending', label: t('offers.status.pending') },
        { value: 'accepted', label: t('offers.status.accepted') },
        { value: 'in_progress', label: t('offers.status.inProgress') }
      ];
    } else {
      return [
        { value: 'all', label: t('offers.allStatuses') },
        { value: 'completed', label: t('offers.status.completed') },
        { value: 'declined', label: t('offers.status.declined') },
        { value: 'cancelled', label: t('offers.status.cancelled') },
        { value: 'terminated', label: t('offers.status.terminated') }
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
              <Target className="w-5 h-5 text-blue-600" />
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
                      ? 'text-blue-600 border-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900'
                      : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>{getTabLabel(tab)}</span>
                    {((tab === 'active' && stats.activeCount > 0) || (tab === 'completed' && stats.completedCount > 0)) && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        activeTab === tab
                          ? 'bg-blue-600 text-white dark:bg-blue-500'
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as OfferStatus | 'all')}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            ) : filteredCollaborations.length === 0 ? (
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
                {filteredCollaborations.map((collab) => {
                  const offerData = collab.type === 'application'
                    ? CollaborationAdapter.applicationToOfferFormat(
                        collab.originalData as any,
                        currentUserId
                      )
                    : (collab.originalData as CollaborationOffer);

                  return (
                    <div key={collab.id} className="relative">
                      {collab.type === 'application' && (
                        <div className="absolute top-2 right-2 z-10">
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                            Заявка
                          </span>
                        </div>
                      )}
                      <OfferCard
                        offer={offerData}
                        currentUserId={currentUserId}
                        userRole={getUserRole(collab)}
                        onOfferUpdated={handleOfferUpdated}
                        onViewDetails={() => handleViewDetails(collab)}
                        onViewProfile={handleViewProfile}
                      />
                    </div>
                  );
                })}
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


        {/* Public Profile Modal */}
        {showProfileModal && profileUserId && (
          <UserPublicProfileModal
            userId={profileUserId}
            currentUserId={currentUserId}
            onClose={() => {
              setShowProfileModal(false);
              setProfileUserId(null);
            }}
          />
        )}
      </div>
    </FeatureGate>
  );
}