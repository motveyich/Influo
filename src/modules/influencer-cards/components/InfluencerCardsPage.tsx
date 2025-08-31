import React, { useState, useEffect } from 'react';
import { InfluencerCard } from '../../../core/types';
import { AdvertiserCard } from '../../../core/types';
import { InfluencerCardDisplay } from './InfluencerCardDisplay';
import { CardTypeSelectionModal } from './CardTypeSelectionModal';
import { AdvertiserCardDisplay } from '../../advertiser-cards/components/AdvertiserCardDisplay';
import { InfluencerCardModal } from './InfluencerCardModal';
import { AdvertiserCardModal } from '../../advertiser-cards/components/AdvertiserCardModal';
import { influencerCardService } from '../services/influencerCardService';
import { advertiserCardService } from '../../advertiser-cards/services/advertiserCardService';
import { favoriteService } from '../../favorites/services/favoriteService';
import { FeatureGate } from '../../../components/FeatureGate';
import { useProfileCompletion } from '../../profiles/hooks/useProfileCompletion';
import { Search, Filter, Plus, Users, TrendingUp, Star, Grid, Target, Heart, Send } from 'lucide-react';
import { analytics } from '../../../core/analytics';
import { useTranslation } from '../../../hooks/useTranslation';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';

export function InfluencerCardsPage() {
  const [cards, setCards] = useState<InfluencerCard[]>([]);
  const [advertiserCards, setAdvertiserCards] = useState<AdvertiserCard[]>([]);
  const [favoriteCards, setFavoriteCards] = useState<InfluencerCard[]>([]);
  const [favoriteAdvertiserCards, setFavoriteAdvertiserCards] = useState<AdvertiserCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<InfluencerCard[]>([]);
  const [filteredAdvertiserCards, setFilteredAdvertiserCards] = useState<AdvertiserCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedProductType, setSelectedProductType] = useState<string>('all');
  const [minFollowers, setMinFollowers] = useState<string>('');
  const [maxFollowers, setMaxFollowers] = useState<string>('');
  const [minBudget, setMinBudget] = useState<string>('');
  const [maxBudget, setMaxBudget] = useState<string>('');
  const [selectedCampaignFormat, setSelectedCampaignFormat] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAdvertiserModal, setShowAdvertiserModal] = useState(false);
  const [showTypeSelectionModal, setShowTypeSelectionModal] = useState(false);
  const [editingCard, setEditingCard] = useState<InfluencerCard | null>(null);
  const [editingAdvertiserCard, setEditingAdvertiserCard] = useState<AdvertiserCard | null>(null);
  const [showMyCards, setShowMyCards] = useState(false);
  const [showMyCardsSection, setShowMyCardsSection] = useState(false);
  const [activeSection, setActiveSection] = useState<'all' | 'favorites'>('all');
  const [myInfluencerCards, setMyInfluencerCards] = useState<InfluencerCard[]>([]);
  const [myAdvertiserCards, setMyAdvertiserCards] = useState<AdvertiserCard[]>([]);
  
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);

  const platforms = ['all', 'instagram', 'youtube', 'twitter', 'tiktok', 'multi'];
  const productTypes = ['all', 'fashion', 'technology', 'food', 'travel', 'fitness', 'lifestyle', 'automotive', 'finance', 'education', 'other'];
  const campaignFormats = ['all', 'post', 'story', 'reel', 'video', 'live', 'unboxing', 'review', 'tutorial', 'integration'];
  const priorities = ['all', 'low', 'medium', 'high'];
  const countries = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France'];

  useEffect(() => {
    if (currentUserId && !loading) {
      loadCards();
      loadAdvertiserCards();
      loadMyCards();
      loadFavorites();
      
      // Listen for favorites changes
      const handleFavoritesChanged = () => {
        loadFavorites();
      };
      
      window.addEventListener('favoritesChanged', handleFavoritesChanged);
      
      return () => {
        window.removeEventListener('favoritesChanged', handleFavoritesChanged);
      };
    }
  }, [showMyCards, currentUserId, loading]);

  const loadMyCards = async () => {
    try {
      const myInfluencerCardsData = await influencerCardService.getUserCards(currentUserId);
      const myAdvertiserCardsData = await advertiserCardService.getUserCards(currentUserId);
      
      setMyInfluencerCards(myInfluencerCardsData);
      setMyAdvertiserCards(myAdvertiserCardsData);
    } catch (error) {
      console.error('Failed to load my cards:', error);
      setMyInfluencerCards([]);
      setMyAdvertiserCards([]);
    }
  };

  useEffect(() => {
    if (activeSection === 'favorites') {
      if (showMyCards) {
        setFilteredAdvertiserCards(favoriteAdvertiserCards);
      } else {
        setFilteredCards(favoriteCards);
      }
    } else if (showMyCards) {
      applyAdvertiserFilters();
    } else {
      applyInfluencerFilters();
    }
  }, [cards, advertiserCards, favoriteCards, favoriteAdvertiserCards, searchQuery, selectedPlatform, selectedProductType, minFollowers, maxFollowers, minBudget, maxBudget, selectedCampaignFormat, selectedPriority, selectedCountries, showMyCards, activeSection]);

  const loadCards = async () => {
    try {
      setIsLoading(true);
      let loadedCards: InfluencerCard[];
      
      loadedCards = await influencerCardService.getAllCards({ isActive: true });
      
      setCards(loadedCards);
    } catch (error) {
      console.error('Failed to load cards:', error);
      toast.error(t('influencerCards.errors.loadFailed'));
      setCards([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdvertiserCards = async () => {
    try {
      let loadedCards: AdvertiserCard[];
      
      if (showMyCards) {
        loadedCards = await advertiserCardService.getUserCards(currentUserId);
      } else {
        loadedCards = await advertiserCardService.getAllCards({ isActive: true });
      }
      
      setAdvertiserCards(loadedCards);
    } catch (error) {
      console.error('Failed to load advertiser cards:', error);
      toast.error('Не удалось загрузить карточки рекламодателей');
      setAdvertiserCards([]);
    }
  };

  const loadFavorites = async () => {
    try {
      const favorites = await favoriteService.getUserFavorites(currentUserId);
      
      // Separate influencer and advertiser favorites
      const influencerFavorites = favorites.filter(fav => fav.targetType === 'influencer_card');
      const advertiserFavorites = favorites.filter(fav => fav.targetType === 'advertiser_card');
      
      // Load full card data for favorites
      const influencerCardPromises = influencerFavorites.map(async (fav) => {
        try {
          return await influencerCardService.getCard(fav.targetId);
        } catch (error) {
          console.error('Failed to load favorite influencer card:', error);
          return null;
        }
      });
      
      const advertiserCardPromises = advertiserFavorites.map(async (fav) => {
        try {
          return await advertiserCardService.getCard(fav.targetId);
        } catch (error) {
          console.error('Failed to load favorite advertiser card:', error);
          return null;
        }
      });
      
      const loadedInfluencerCards = (await Promise.all(influencerCardPromises)).filter(Boolean) as InfluencerCard[];
      const loadedAdvertiserCards = (await Promise.all(advertiserCardPromises)).filter(Boolean) as AdvertiserCard[];
      
      setFavoriteCards(loadedInfluencerCards);
      setFavoriteAdvertiserCards(loadedAdvertiserCards);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      setFavoriteCards([]);
      setFavoriteAdvertiserCards([]);
    }
  };

  const applyInfluencerFilters = () => {
    if (activeSection === 'favorites') return; // Don't filter favorites
    
    let filtered = [...cards];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(card =>
        card.serviceDetails.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.serviceDetails.contentTypes.some(type => 
          type.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        card.audienceDemographics.interests.some(interest =>
          interest.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Platform filter
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(card => card.platform === selectedPlatform);
    }

    // Followers filter
    if (minFollowers) {
      const min = parseInt(minFollowers);
      filtered = filtered.filter(card => card.reach.followers >= min);
    }
    if (maxFollowers) {
      const max = parseInt(maxFollowers);
      filtered = filtered.filter(card => card.reach.followers <= max);
    }

    // Countries filter
    if (selectedCountries.length > 0) {
      filtered = filtered.filter(card =>
        selectedCountries.some(country =>
          card.audienceDemographics.topCountries.includes(country)
        )
      );
    }

    setFilteredCards(filtered);
  };

  const applyAdvertiserFilters = () => {
    if (activeSection === 'favorites') return; // Don't filter favorites
    
    let filtered = [...advertiserCards];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(card =>
        card.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.campaignTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.campaignDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.targetAudience.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Product type filter
    if (selectedProductType !== 'all') {
      filtered = filtered.filter(card => card.productType === selectedProductType);
    }

    // Budget filter
    if (minBudget) {
      const min = parseInt(minBudget);
      filtered = filtered.filter(card => {
        const budget = card.budget.type === 'fixed' ? card.budget.amount : card.budget.min;
        return budget && budget >= min;
      });
    }
    if (maxBudget) {
      const max = parseInt(maxBudget);
      filtered = filtered.filter(card => {
        const budget = card.budget.type === 'fixed' ? card.budget.amount : card.budget.max;
        return budget && budget <= max;
      });
    }

    // Campaign format filter
    if (selectedCampaignFormat !== 'all') {
      filtered = filtered.filter(card => card.campaignFormat.includes(selectedCampaignFormat));
    }

    // Priority filter
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(card => card.priority === selectedPriority);
    }

    // Countries filter
    if (selectedCountries.length > 0) {
      filtered = filtered.filter(card =>
        selectedCountries.some(country =>
          card.targetAudience.countries.includes(country)
        )
      );
    }

    setFilteredAdvertiserCards(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    analytics.trackSearch(query, {
      platform: showMyCards ? selectedProductType : selectedPlatform,
      section: showMyCards ? 'advertiser_cards' : 'influencer_cards'
    });
  };

  const handleCreateCard = () => {
    // Check basic profile completion
    if (!currentUserProfile?.profileCompletion.basicInfo) {
      toast.error('Заполните основную информацию профиля для создания карточек');
      return;
    }

    // Show type selection modal
    setShowTypeSelectionModal(true);
  };

  const handleCardTypeSelected = (type: 'influencer' | 'advertiser') => {
    setShowTypeSelectionModal(false);
    
    if (type === 'influencer') {
      setEditingCard(null);
      setShowModal(true);
    } else {
      setEditingAdvertiserCard(null);
      setShowAdvertiserModal(true);
    }
  };

  const handleEditCard = (card: InfluencerCard) => {
    setEditingCard(card);
    setShowModal(true);
  };

  const handleEditAdvertiserCard = (card: AdvertiserCard) => {
    setEditingAdvertiserCard(card);
    setShowAdvertiserModal(true);
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return;

    try {
      await influencerCardService.deleteCard(cardId);
      setCards(prev => prev.filter(card => card.id !== cardId));
      toast.success(t('influencerCards.success.deleted'));
    } catch (error) {
      console.error('Failed to delete card:', error);
      toast.error(t('influencerCards.errors.deleteFailed'));
    }
  };

  const handleDeleteAdvertiserCard = async (cardId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту карточку?')) return;

    try {
      await advertiserCardService.deleteCard(cardId);
      setAdvertiserCards(prev => prev.filter(card => card.id !== cardId));
      toast.success('Карточка рекламодателя удалена успешно');
    } catch (error) {
      console.error('Failed to delete advertiser card:', error);
      toast.error('Не удалось удалить карточку рекламодателя');
    }
  };

  const handleToggleStatus = async (cardId: string, isActive: boolean) => {
    try {
      const updatedCard = await influencerCardService.toggleCardStatus(cardId, isActive);
      setCards(prev => prev.map(card => 
        card.id === cardId ? updatedCard : card
      ));
      toast.success(isActive ? t('influencerCards.success.activated') : t('influencerCards.success.deactivated'));
    } catch (error) {
      console.error('Failed to toggle card status:', error);
      toast.error(t('influencerCards.errors.toggleFailed'));
    }
  };

  const handleToggleAdvertiserStatus = async (cardId: string, isActive: boolean) => {
    try {
      const updatedCard = await advertiserCardService.toggleCardStatus(cardId, isActive);
      setAdvertiserCards(prev => prev.map(card => 
        card.id === cardId ? updatedCard : card
      ));
      toast.success(isActive ? 'Карточка активирована успешно' : 'Карточка деактивирована успешно');
    } catch (error) {
      console.error('Failed to toggle advertiser card status:', error);
      toast.error('Не удалось обновить статус карточки');
    }
  };

  const handleCardSaved = (savedCard: InfluencerCard) => {
    if (editingCard) {
      setCards(prev => prev.map(card => 
        card.id === savedCard.id ? savedCard : card
      ));
      setMyInfluencerCards(prev => prev.map(card => 
        card.id === savedCard.id ? savedCard : card
      ));
    } else {
      setCards(prev => [savedCard, ...prev]);
      setMyInfluencerCards(prev => [savedCard, ...prev]);
    }
  };

  const handleAdvertiserCardSaved = (savedCard: AdvertiserCard) => {
    if (editingAdvertiserCard) {
      setAdvertiserCards(prev => prev.map(card => 
        card.id === savedCard.id ? savedCard : card
      ));
      setMyAdvertiserCards(prev => prev.map(card => 
        card.id === savedCard.id ? savedCard : card
      ));
    } else {
      setAdvertiserCards(prev => [savedCard, ...prev]);
      setMyAdvertiserCards(prev => [savedCard, ...prev]);
    }
  };

  const handleCountryToggle = (country: string) => {
    setSelectedCountries(prev =>
      prev.includes(country)
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  const handleApplyToAdvertiser = (cardId: string) => {
    toast.success('Заявка отправлена успешно!');
    analytics.track('advertiser_application_sent', {
      user_id: currentUserId,
      advertiser_card_id: cardId
    });
  };

  const handleFavoriteAdvertiser = (cardId: string) => {
    // Refresh favorites after adding/removing
    loadFavorites();
    analytics.track('advertiser_favorited', {
      user_id: currentUserId,
      advertiser_card_id: cardId
    });
  };

  const handleContactAdvertiser = (cardId: string) => {
    toast.success('Переход к чату...');
    analytics.track('advertiser_contact_initiated', {
      user_id: currentUserId,
      advertiser_card_id: cardId
    });
  };

  const handleViewAnalytics = (cardId: string) => {
    // Navigate to card detail page
    navigate(`/influencer-cards/${cardId}`);
  };

  const handleBulkApplications = async () => {
    try {
      const favoriteIds = favoriteCards.map(card => card.id);
      await favoriteService.sendBulkApplications(currentUserId, favoriteIds, {
        message: 'Заинтересован в сотрудничестве с вашей карточкой',
        proposedRate: 1000
      });
      toast.success(`Заявки отправлены ${favoriteCards.length} инфлюенсерам!`);
    } catch (error: any) {
      console.error('Failed to send bulk applications:', error);
      toast.error('Не удалось отправить массовые заявки');
    }
  };

  const clearFilters = () => {
    if (activeSection === 'favorites') {
      toast.info('Фильтры не применяются к избранному');
      return;
    }
    
    setSearchQuery('');
    setSelectedPlatform('all');
    setSelectedProductType('all');
    setMinFollowers('');
    setMaxFollowers('');
    setMinBudget('');
    setMaxBudget('');
    setSelectedCampaignFormat('all');
    setSelectedPriority('all');
    setSelectedCountries([]);
  };

  const influencerStats = {
    total: activeSection === 'favorites' ? favoriteCards.length : cards.length,
    active: activeSection === 'favorites' ? favoriteCards.filter(c => c.isActive).length : cards.filter(c => c.isActive).length,
    avgRating: activeSection === 'favorites' 
      ? (favoriteCards.length > 0 ? favoriteCards.reduce((sum, c) => sum + c.rating, 0) / favoriteCards.length : 0)
      : (cards.length > 0 ? cards.reduce((sum, c) => sum + c.rating, 0) / cards.length : 0),
    totalCampaigns: activeSection === 'favorites' 
      ? favoriteCards.reduce((sum, c) => sum + c.completedCampaigns, 0)
      : cards.reduce((sum, c) => sum + c.completedCampaigns, 0)
  };

  const advertiserStats = {
    total: activeSection === 'favorites' ? favoriteAdvertiserCards.length : advertiserCards.length,
    active: activeSection === 'favorites' ? favoriteAdvertiserCards.filter(c => c.isActive).length : advertiserCards.filter(c => c.isActive).length,
    avgRating: activeSection === 'favorites'
      ? (favoriteAdvertiserCards.length > 0 ? favoriteAdvertiserCards.reduce((sum, c) => sum + (c.campaignStats?.averageRating || 0), 0) / favoriteAdvertiserCards.length : 0)
      : (advertiserCards.length > 0 ? advertiserCards.reduce((sum, c) => sum + (c.campaignStats?.averageRating || 0), 0) / advertiserCards.length : 0),
    totalCampaigns: activeSection === 'favorites'
      ? favoriteAdvertiserCards.reduce((sum, c) => sum + (c.campaignStats?.completedCampaigns || 0), 0)
      : advertiserCards.reduce((sum, c) => sum + (c.campaignStats?.completedCampaigns || 0), 0)
  };

  return (
    <FeatureGate
      profile={currentUserProfile}
      requiredSection="basic"
      featureName="Карточки"
      onCompleteProfile={() => window.location.href = '/profiles'}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('influencerCards.title')}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {t('influencerCards.subtitle')}
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0">
            <button
              onClick={handleCreateCard}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>Создать карточку</span>
            </button>
          </div>
        </div>
        
        {/* Section Tabs with Feature Gates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex border-b border-gray-200">
            {/* Influencers Tab - Available to Advertisers */}
            <button
              onClick={() => {
                if (!currentUserProfile?.profileCompletion.advertiserSetup) {
                  toast.error('Заполните раздел "Рекламодатель" для просмотра карточек инфлюенсеров');
                  return;
                }
                setShowMyCards(false);
                setActiveSection('all');
              }}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                !showMyCards && activeSection === 'all'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900'
              } ${!currentUserProfile?.profileCompletion.advertiserSetup ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Инфлюенсеры</span>
                {!currentUserProfile?.profileCompletion.advertiserSetup && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Требует настройку</span>
                )}
              </div>
            </button>
            
            {/* Advertisers Tab - Available to Influencers */}
            <button
              onClick={() => {
                if (!currentUserProfile?.profileCompletion.influencerSetup) {
                  toast.error('Заполните раздел "Инфлюенсер" для просмотра карточек рекламодателей');
                  return;
                }
                setShowMyCards(true);
                setActiveSection('all');
              }}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                showMyCards && activeSection === 'all'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900'
              } ${!currentUserProfile?.profileCompletion.influencerSetup ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Target className="w-4 h-4" />
                <span>Рекламодатели</span>
                {!currentUserProfile?.profileCompletion.influencerSetup && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Требует настройку</span>
                )}
              </div>
            </button>
            
            {/* My Cards Tab */}
            <button
              onClick={() => {
                setShowMyCardsSection(true);
                setActiveSection('all');
              }}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                showMyCardsSection && activeSection === 'all'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Grid className="w-4 h-4" />
                <span>Мои карточки</span>
                {(myInfluencerCards.length > 0 || myAdvertiserCards.length > 0) && (
                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">
                    {myInfluencerCards.length + myAdvertiserCards.length}
                  </span>
                )}
              </div>
            </button>
            
            {/* Favorites Tab */}
            <button
              onClick={() => setActiveSection('favorites')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeSection === 'favorites'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Heart className="w-4 h-4" />
                <span>Избранное</span>
                {((showMyCards && favoriteAdvertiserCards.length > 0) || (!showMyCards && favoriteCards.length > 0)) && (
                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">
                    {showMyCards ? favoriteAdvertiserCards.length : favoriteCards.length}
                  </span>
                )}
              </div>
            </button>
          </div>
          
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {showMyCardsSection
                    ? 'Мои карточки'
                    : activeSection === 'favorites' 
                    ? (showMyCards ? 'Избранные рекламодатели' : 'Избранные инфлюенсеры')
                    : (showMyCards ? 'Карточки рекламодателей' : 'Карточки инфлюенсеров')
                  }
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {showMyCardsSection
                    ? 'Управляйте вашими карточками и отслеживайте их эффективность'
                    : activeSection === 'favorites'
                    ? (showMyCards 
                        ? 'Ваши избранные рекламодатели и их кампании'
                        : 'Ваши избранные инфлюенсеры для сотрудничества'
                      )
                    : (showMyCards 
                        ? 'Найдите подходящие кампании от рекламодателей'
                        : 'Откройте для себя талантливых инфлюенсеров для вашей следующей кампании'
                      )
                  }
                </p>
              </div>
              
              {/* Bulk Actions for Favorites */}
              {activeSection === 'favorites' && !showMyCardsSection && (
                <div className="flex space-x-2">
                  {!showMyCards && favoriteCards.length > 0 && (
                    <button
                      onClick={() => handleBulkApplications()}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Отправить заявки всем ({favoriteCards.length})</span>
                    </button>
                  )}
                  <button
                    onClick={loadFavorites}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Обновить
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Show content only if user has access */}
        {(showMyCardsSection || 
          (showMyCards && currentUserProfile?.profileCompletion.influencerSetup) || 
          (!showMyCards && currentUserProfile?.profileCompletion.advertiserSetup)) ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <Grid className="w-5 h-5 text-purple-600" />
                  <span className="ml-2 text-sm font-medium text-gray-600">
                    {showMyCardsSection 
                      ? 'Мои карточки'
                      : activeSection === 'favorites' ? 'В избранном' : (showMyCards ? 'Всего карточек' : t('influencerCards.stats.totalCards'))
                    }
                  </span>
                </div>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {showMyCardsSection 
                    ? myInfluencerCards.length + myAdvertiserCards.length
                    : showMyCards ? advertiserStats.total : influencerStats.total
                  }
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="ml-2 text-sm font-medium text-gray-600">
                    {showMyCardsSection
                      ? 'Активные'
                      : activeSection === 'favorites' ? 'Активные' : (showMyCards ? 'Активные' : t('influencerCards.stats.active'))
                    }
                  </span>
                </div>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {showMyCardsSection
                    ? myInfluencerCards.filter(c => c.isActive).length + myAdvertiserCards.filter(c => c.isActive).length
                    : showMyCards ? advertiserStats.active : influencerStats.active
                  }
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-600" />
                  <span className="ml-2 text-sm font-medium text-gray-600">
                    {showMyCardsSection
                      ? 'Средний рейтинг'
                      : activeSection === 'favorites' ? 'Средний рейтинг' : (showMyCards ? 'Средний рейтинг' : t('influencerCards.stats.avgRating'))
                    }
                  </span>
                </div>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {showMyCardsSection
                    ? ((myInfluencerCards.reduce((sum, c) => sum + c.rating, 0) + myAdvertiserCards.reduce((sum, c) => sum + (c.campaignStats?.averageRating || 0), 0)) / Math.max(myInfluencerCards.length + myAdvertiserCards.length, 1)).toFixed(1)
                    : showMyCards ? advertiserStats.avgRating.toFixed(1) : influencerStats.avgRating.toFixed(1)
                  }
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="ml-2 text-sm font-medium text-gray-600">
                    {showMyCardsSection
                      ? 'Кампании'
                      : activeSection === 'favorites' ? 'Кампании' : (showMyCards ? 'Кампании' : t('influencerCards.stats.campaigns'))
                    }
                  </span>
                </div>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {showMyCardsSection
                    ? myInfluencerCards.reduce((sum, c) => sum + c.completedCampaigns, 0) + myAdvertiserCards.reduce((sum, c) => sum + (c.campaignStats?.completedCampaigns || 0), 0)
                    : showMyCards ? advertiserStats.totalCampaigns : influencerStats.totalCampaigns
                  }
                </p>
              </div>
            </div>

            {/* Search and Filters - Hide for favorites */}
            {activeSection !== 'favorites' && !showMyCardsSection && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder={showMyCards ? "Поиск по названию компании, кампании, описанию..." : "Поиск по описанию, типам контента, интересам..."}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Filters - Different for each section */}
                {showMyCards ? (
                  /* Advertiser Filters */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Product Type Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Тип продукта</label>
                        <select
                          value={selectedProductType}
                          onChange={(e) => setSelectedProductType(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          {productTypes.map(type => (
                            <option key={type} value={type}>
                              {type === 'all' ? 'Все типы' :
                               type === 'fashion' ? 'Мода' :
                               type === 'technology' ? 'Технологии' :
                               type === 'food' ? 'Еда и напитки' :
                               type === 'travel' ? 'Путешествия' :
                               type === 'fitness' ? 'Фитнес' :
                               type === 'lifestyle' ? 'Образ жизни' :
                               type === 'automotive' ? 'Автомобили' :
                               type === 'finance' ? 'Финансы' :
                               type === 'education' ? 'Образование' :
                               type === 'other' ? 'Другое' : type}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Budget Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Мин. бюджет</label>
                        <input
                          type="number"
                          placeholder="например, 1000"
                          value={minBudget}
                          onChange={(e) => setMinBudget(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Макс. бюджет</label>
                        <input
                          type="number"
                          placeholder="например, 10000"
                          value={maxBudget}
                          onChange={(e) => setMaxBudget(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      {/* Clear Filters */}
                      <div className="flex items-end">
                        <button
                          onClick={clearFilters}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Очистить фильтры
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Campaign Format Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Формат кампании</label>
                        <select
                          value={selectedCampaignFormat}
                          onChange={(e) => setSelectedCampaignFormat(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          {campaignFormats.map(format => (
                            <option key={format} value={format}>
                              {format === 'all' ? 'Все форматы' :
                               format === 'post' ? 'Пост' :
                               format === 'story' ? 'Сторис' :
                               format === 'reel' ? 'Рилс' :
                               format === 'video' ? 'Видео' :
                               format === 'live' ? 'Прямой эфир' :
                               format === 'unboxing' ? 'Распаковка' :
                               format === 'review' ? 'Обзор' :
                               format === 'tutorial' ? 'Туториал' :
                               format === 'integration' ? 'Интеграция' : format}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Priority Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                        <select
                          value={selectedPriority}
                          onChange={(e) => setSelectedPriority(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          {priorities.map(priority => (
                            <option key={priority} value={priority}>
                              {priority === 'all' ? 'Все приоритеты' :
                               priority === 'high' ? 'Высокий' :
                               priority === 'medium' ? 'Средний' :
                               priority === 'low' ? 'Низкий' : priority}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Country Filters */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Целевые страны</label>
                      <div className="flex flex-wrap gap-2">
                        {countries.map(country => (
                          <button
                            key={country}
                            onClick={() => handleCountryToggle(country)}
                            className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                              selectedCountries.includes(country)
                                ? 'bg-purple-100 border-purple-300 text-purple-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {country}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Influencer Filters */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Platform Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('influencerCards.platform')}</label>
                        <select
                          value={selectedPlatform}
                          onChange={(e) => setSelectedPlatform(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          {platforms.map(platform => (
                            <option key={platform} value={platform}>
                              {platform === 'all' ? 'Все платформы' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Followers Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Мин. подписчиков</label>
                        <input
                          type="number"
                          placeholder="например, 10000"
                          value={minFollowers}
                          onChange={(e) => setMinFollowers(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Макс. подписчиков</label>
                        <input
                          type="number"
                          placeholder="например, 1000000"
                          value={maxFollowers}
                          onChange={(e) => setMaxFollowers(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      {/* Clear Filters */}
                      <div className="flex items-end">
                        <button
                          onClick={clearFilters}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Очистить фильтры
                        </button>
                      </div>
                    </div>

                    {/* Country Filters */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('influencerCards.targetCountries')}</label>
                      <div className="flex flex-wrap gap-2">
                        {countries.map(country => (
                          <button
                            key={country}
                            onClick={() => handleCountryToggle(country)}
                            className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                              selectedCountries.includes(country)
                                ? 'bg-purple-100 border-purple-300 text-purple-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {country}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Cards Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                    <div className="flex justify-between items-start mb-4">
                      <div className="h-6 bg-gray-300 rounded w-20"></div>
                      <div className="h-4 bg-gray-300 rounded w-16"></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="text-center">
                          <div className="h-6 bg-gray-300 rounded mb-1"></div>
                          <div className="h-3 bg-gray-300 rounded"></div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-300 rounded"></div>
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {showMyCardsSection ? (
                  /* My Cards Section */
                  <>
                    {/* My Influencer Cards */}
                    {myInfluencerCards.map((card) => (
                      <InfluencerCardDisplay
                        key={card.id}
                        card={card}
                        showActions={true}
                        currentUserId={currentUserId}
                        onEdit={handleEditCard}
                        onDelete={handleDeleteCard}
                        onToggleStatus={handleToggleStatus}
                        onViewAnalytics={handleViewAnalytics}
                      />
                    ))}
                    
                    {/* My Advertiser Cards */}
                    {myAdvertiserCards.map((card) => (
                      <AdvertiserCardDisplay
                        key={card.id}
                        card={card}
                        showActions={true}
                        onEdit={handleEditAdvertiserCard}
                        onDelete={handleDeleteAdvertiserCard}
                        onToggleStatus={handleToggleAdvertiserStatus}
                        onViewAnalytics={handleViewAnalytics}
                        currentUserId={currentUserId}
                      />
                    ))}
                  </>
                ) : showMyCards ? (
                  filteredAdvertiserCards.filter(card => card.userId !== currentUserId).map((card) => (
                    <AdvertiserCardDisplay
                      key={card.id}
                      card={card}
                      showActions={false}
                      onViewAnalytics={handleViewAnalytics}
                      currentUserId={currentUserId}
                    />
                  ))
                ) : (
                  filteredCards.filter(card => card.userId !== currentUserId).map((card) => (
                    <InfluencerCardDisplay
                      key={card.id}
                      card={card}
                      showActions={false}
                      currentUserId={currentUserId}
                      onEdit={handleEditCard}
                      onDelete={handleDeleteCard}
                      onToggleStatus={handleToggleStatus}
                      onViewAnalytics={handleViewAnalytics}
                    />
                  ))
                )}
              </div>
            )}
          </>
        ) : (
          /* Show feature gate for specific section */
          <FeatureGate
            profile={currentUserProfile}
            requiredSection={showMyCardsSection ? "basic" : showMyCards ? "influencer" : "advertiser"}
            featureName={showMyCardsSection ? "мои карточки" : showMyCards ? "карточки рекламодателей" : "карточки инфлюенсеров"}
            onCompleteProfile={() => window.location.href = '/profiles'}
          >
            <div></div>
          </FeatureGate>
        )}

        {/* No Results */}
        {!isLoading && 
         ((showMyCardsSection && (myInfluencerCards.length === 0 && myAdvertiserCards.length === 0)) ||
          (showMyCards && currentUserProfile?.profileCompletion.influencerSetup && filteredAdvertiserCards.length === 0) ||
          (!showMyCards && !showMyCardsSection && currentUserProfile?.profileCompletion.advertiserSetup && filteredCards.length === 0)) && (
          <div className="text-center py-12">
            {showMyCardsSection ? (
              <Grid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            ) : activeSection === 'favorites' ? (
              <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            ) : (
              <Grid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            )}
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {showMyCardsSection
                ? 'У вас пока нет карточек'
                : activeSection === 'favorites' 
                ? (showMyCards ? 'Нет избранных рекламодателей' : 'Нет избранных инфлюенсеров')
                : (showMyCards ? 'Карточки рекламодателей не найдены' : 'Карточки инфлюенсеров не найдены')
              }
            </h3>
            <p className="text-gray-600">
              {showMyCardsSection
                ? 'Создайте свою первую карточку, чтобы начать получать предложения о сотрудничестве'
                : activeSection === 'favorites'
                ? (showMyCards 
                    ? 'Добавляйте интересных рекламодателей в избранное для быстрого доступа'
                    : 'Добавляйте подходящих инфлюенсеров в избранное для массовых рассылок'
                  )
                : (showMyCards 
                    ? searchQuery || selectedProductType !== 'all' || minBudget || maxBudget || selectedCampaignFormat !== 'all' || selectedPriority !== 'all' || selectedCountries.length > 0
                      ? 'Попробуйте изменить поисковый запрос или фильтры'
                      : 'В данный момент активные кампании рекламодателей отсутствуют'
                    : searchQuery || selectedPlatform !== 'all' || minFollowers || maxFollowers || selectedCountries.length > 0
                      ? 'Попробуйте изменить поисковый запрос или фильтры'
                      : 'В данный момент карточки инфлюенсеров недоступны'
                  )
              }
            </p>
            {showMyCardsSection && (
              <button
                onClick={handleCreateCard}
                className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Создать первую карточку</span>
              </button>
            )}
          </div>
        )}

        {/* Modals */}
        <CardTypeSelectionModal
          isOpen={showTypeSelectionModal}
          onClose={() => setShowTypeSelectionModal(false)}
          onSelectType={handleCardTypeSelected}
          profile={currentUserProfile}
        />

        <InfluencerCardModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          currentCard={editingCard}
          userId={currentUserId}
          onCardSaved={handleCardSaved}
        />

        <AdvertiserCardModal
          isOpen={showAdvertiserModal}
          onClose={() => setShowAdvertiserModal(false)}
          currentCard={editingAdvertiserCard}
          userId={currentUserId}
          onCardSaved={handleAdvertiserCardSaved}
        />
      </div>
    </FeatureGate>
  );
}