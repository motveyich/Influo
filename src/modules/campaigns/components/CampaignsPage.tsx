import React, { useState, useEffect } from 'react';
import { Campaign } from '../../../core/types';
import { CampaignCard } from './CampaignCard';
import { CampaignModal } from './CampaignModal';
import { AutomaticCampaignModal } from './AutomaticCampaignModal';
import { campaignService } from '../services/campaignService';
import { FeatureGate } from '../../../components/FeatureGate';
import { useProfileCompletion } from '../../profiles/hooks/useProfileCompletion';
import { useTranslation } from '../../../hooks/useTranslation';
import { Search, Filter, Plus, Target, TrendingUp, Users, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';
import { analytics } from '../../../core/analytics';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';

// Remove mock data - will be loaded from database
// Mock data - replace with actual API calls
const mockCampaigns: Campaign[] = [
  {
    campaignId: '1',
    advertiserId: '2',
    title: 'Summer Fashion Collection Launch',
    description: 'Promote our new summer collection featuring sustainable fashion pieces. Looking for fashion influencers with engaged audiences who align with our brand values of sustainability and style.',
    brand: 'EcoStyle',
    budget: {
      min: 1000,
      max: 5000,
      currency: 'USD'
    },
    preferences: {
      platforms: ['instagram', 'tiktok'],
      contentTypes: ['post', 'story', 'reel'],
      audienceSize: {
        min: 10000,
        max: 500000
      },
      demographics: {
        ageRange: [18, 35],
        genders: ['female', 'male'],
        countries: ['US', 'CA', 'UK']
      }
    },
    status: 'active',
    timeline: {
      startDate: '2024-02-01T00:00:00Z',
      endDate: '2024-03-01T00:00:00Z',
      deliverables: [
        { type: 'Instagram Post', dueDate: '2024-02-15T00:00:00Z', completed: false },
        { type: 'Story Series', dueDate: '2024-02-20T00:00:00Z', completed: false }
      ]
    },
    metrics: {
      applicants: 24,
      accepted: 3,
      impressions: 125000,
      engagement: 8500
    },
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-20T10:30:00Z'
  },
  {
    campaignId: '2',
    advertiserId: '2',
    title: 'Tech Product Review Campaign',
    description: 'Seeking tech reviewers to showcase our new wireless headphones. Perfect for tech enthusiasts who create unboxing and review content.',
    brand: 'TechWave',
    budget: {
      min: 800,
      max: 2500,
      currency: 'USD'
    },
    preferences: {
      platforms: ['youtube', 'tiktok', 'twitter'],
      contentTypes: ['video', 'post'],
      audienceSize: {
        min: 5000,
        max: 200000
      },
      demographics: {
        ageRange: [20, 45],
        genders: ['male', 'female'],
        countries: ['US', 'UK', 'DE']
      }
    },
    status: 'active',
    timeline: {
      startDate: '2024-01-20T00:00:00Z',
      endDate: '2024-02-15T00:00:00Z',
      deliverables: [
        { type: 'Product Review Video', dueDate: '2024-02-10T00:00:00Z', completed: false }
      ]
    },
    metrics: {
      applicants: 18,
      accepted: 2,
      impressions: 89000,
      engagement: 5200
    },
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-18T14:20:00Z'
  }
];

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'draft' | 'completed'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [showAutomaticModal, setShowAutomaticModal] = useState(false);
  const [showMyCampaigns, setShowMyCampaigns] = useState(false);
  
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);

  useEffect(() => {
    if (currentUserId && !loading) {
      loadCampaigns();
    }
  }, [currentUserId, loading]);

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      
      let loadedCampaigns: Campaign[];
      if (showMyCampaigns) {
        // Load user's own campaigns
        loadedCampaigns = await campaignService.getAdvertiserCampaigns(currentUserId);
      } else {
        // Load all campaigns with filters
        loadedCampaigns = await campaignService.getAllCampaigns({
          searchQuery: searchQuery || undefined,
          platform: selectedPlatform !== 'all' ? selectedPlatform : undefined
        });
      }
      setCampaigns(loadedCampaigns);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      toast.error(t('campaigns.errors.loadFailed'));
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    analytics.trackSearch(query, { 
      filter: selectedFilter,
      platform: selectedPlatform,
      section: 'campaigns'
    });
  };

  const handleCreateCampaign = () => {
    if (!currentUserProfile?.profileCompletion.advertiserSetup) {
      toast.error('Заполните раздел "Рекламодатель" для создания автоматических кампаний');
      return;
    }
    setShowAutomaticModal(true);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    // Check if this is an automatic campaign
    const isAutomaticCampaign = (campaign as any).metadata?.isAutomatic;
    if (isAutomaticCampaign) {
      setShowAutomaticModal(true);
    } else {
      setShowCampaignModal(true);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      await campaignService.deleteCampaign(campaignId);
      setCampaigns(prev => prev.filter(c => c.campaignId !== campaignId));
      toast.success(t('campaigns.success.deleted'));
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      toast.error(t('campaigns.errors.deleteFailed'));
    }
  };

  const handleCampaignSaved = (savedCampaign: Campaign) => {
    if (editingCampaign) {
      setCampaigns(prev => prev.map(c => 
        c.campaignId === savedCampaign.campaignId ? savedCampaign : c
      ));
    } else {
      setCampaigns(prev => [savedCampaign, ...prev]);
    }
  };

  const handleApply = (campaignId: string) => {
    // Check if user has sufficient profile completion
    if (!currentUserProfile || currentUserProfile.profileCompletion.completionPercentage < 70) {
      toast.error('Пожалуйста, завершите профиль для подачи заявок на кампании');
      return;
    }

    analytics.trackOfferSent(
      `offer_${Date.now()}`,
      currentUserId,
      campaignId
    );
    // Handle application logic
    console.log('Applying to campaign:', campaignId);
    toast.success(t('campaigns.success.applied'));
  };

  const handleFindInfluencers = (campaign: Campaign) => {
    // Start automatic influencer matching for this campaign
    toast.success('Запуск автоматического подбора инфлюенсеров...');
  };

  // Update campaigns loading when filters change
  useEffect(() => {
    if (currentUserId) {
      loadCampaigns();
    }
  }, [showMyCampaigns, searchQuery, selectedPlatform]);

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || campaign.status === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    totalBudget: campaigns.reduce((sum, c) => sum + c.budget.max, 0),
    totalApplicants: campaigns.reduce((sum, c) => sum + c.metrics.applicants, 0),
    accepted: campaigns.reduce((sum, c) => sum + c.metrics.accepted, 0)
  };

  const platforms = ['all', 'instagram', 'tiktok', 'youtube', 'twitter'];

  return (
    <div className="space-y-6">
      {/* Feature Gate Check */}
      {!currentUserProfile?.profileCompletion.advertiserSetup ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-gray-400" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('profile.setupAdvertiserProfile')}
          </h3>
          
          <p className="text-gray-600 mb-6">
            {t('profile.setupAdvertiserDescription')}
          </p>

          <button
            onClick={() => window.location.href = '/profiles'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            {t('profile.goToProfileSettings')}
          </button>
        </div>
      ) : (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {showMyCampaigns ? t('campaigns.myAutomaticCampaigns') : t('campaigns.automaticTitle')}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {showMyCampaigns 
                ? t('campaigns.automaticCampaignsDescription')
                : t('campaigns.automaticSubtitle')
              }
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={() => setShowMyCampaigns(!showMyCampaigns)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                showMyCampaigns
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              <span>{showMyCampaigns ? t('campaigns.viewAll') : t('campaigns.myCampaigns')}</span>
            </button>
            
            {showMyCampaigns && (
              <button 
                onClick={handleCreateCampaign}
                className="bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white px-6 py-3 rounded-md text-sm font-medium flex items-center space-x-2 transition-all shadow-lg hover:shadow-xl dark:text-white"
              >
                <Plus className="w-4 h-4" />
                <span>{t('campaigns.createAutomaticCampaign')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="ml-2 text-sm font-medium text-gray-600">{t('campaigns.stats.active')}</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.active}</p>
          </div>
        
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="ml-2 text-sm font-medium text-gray-600">{t('campaigns.totalBudget')}</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              ${(stats.totalBudget / 1000).toFixed(0)}K
            </p>
          </div>
        
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-orange-600" />
              <span className="ml-2 text-sm font-medium text-gray-600">{t('campaigns.stats.applicants')}</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalApplicants}</p>
          </div>
        
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-red-600" />
              <span className="ml-2 text-sm font-medium text-gray-600">{t('home.awaitingPayouts')}</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">0</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('campaigns.searchCampaigns')}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        
          <div className="flex space-x-2">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">{t('campaigns.allStatuses')}</option>
                <option value="active">{t('campaigns.status.active')}</option>
                <option value="draft">{t('campaigns.status.draft')}</option>
                <option value="completed">{t('campaigns.status.completed')}</option>
              </select>
            </div>
          
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {platforms.map(platform => (
                <option key={platform} value={platform}>
                  {platform === 'all' ? t('campaigns.allPlatforms') : platform.charAt(0).toUpperCase() + platform.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Campaigns Grid */}
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
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.campaignId}
                campaign={campaign}
                onApply={showMyCampaigns ? undefined : handleApply}
                showActions={showMyCampaigns}
                onEdit={handleEditCampaign}
                onDelete={handleDeleteCampaign}
                onFindInfluencers={handleFindInfluencers}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}

        {!isLoading && filteredCampaigns.length === 0 && (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('campaigns.noResults.title')}</h3>
            <p className="text-gray-600">
              {searchQuery || selectedFilter !== 'all' || selectedPlatform !== 'all'
                ? t('campaigns.noResults.subtitle')
                : t('campaigns.noResults.suggestions')
              }
            </p>
          </div>
        )}

        {/* Campaign Modal */}
        <AutomaticCampaignModal
          isOpen={showAutomaticModal}
          onClose={() => setShowAutomaticModal(false)}
          currentCampaign={editingCampaign}
          advertiserId={currentUserId}
          onCampaignSaved={handleCampaignSaved}
        />

      </div>
      )}
    </div>
  );
}