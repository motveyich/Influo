import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { InfluencerCard } from '../../../core/types';
import { InfluencerCardDisplay } from './InfluencerCardDisplay';
import { CardTypeSelectionModal } from './CardTypeSelectionModal';
import { InfluencerCardModal } from './InfluencerCardModal';
import { influencerCardService } from '../services/influencerCardService';
import { isSupabaseConfigured } from '../../../core/supabase';
import { favoriteService } from '../../favorites/services/favoriteService';
import { FeatureGate } from '../../../components/FeatureGate';
import { useProfileCompletion } from '../../profiles/hooks/useProfileCompletion';
import { Search, Filter, Plus, Users, TrendingUp, Star, Grid, Target, Heart, Send, Trophy } from 'lucide-react';
import { analytics } from '../../../core/analytics';
import { useTranslation } from '../../../hooks/useTranslation';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';

type TabType = 'influencers' | 'my_cards' | 'favorites';

export function InfluencerCardsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('influencers');
  const [influencerCards, setInfluencerCards] = useState<InfluencerCard[]>([]);
  const [myInfluencerCards, setMyInfluencerCards] = useState<InfluencerCard[]>([]);
  const [favoriteCards, setFavoriteCards] = useState<any[]>([]);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [minFollowersFilter, setMinFollowersFilter] = useState<string>('');
  const [maxFollowersFilter, setMaxFollowersFilter] = useState<string>('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [showInfluencerModal, setShowInfluencerModal] = useState(false);
  const [showTypeSelectionModal, setShowTypeSelectionModal] = useState(false);
  const [editingInfluencerCard, setEditingInfluencerCard] = useState<InfluencerCard | null>(null);
  
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);

  const platforms = ['all', 'instagram', 'youtube', 'twitter', 'tiktok', 'multi'];
  const countries = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France'];

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setPlatformFilter('all');
    setMinFollowersFilter('');
    setMaxFollowersFilter('');
    setSelectedCountries([]);
  };

  // Handle tab change with filter reset
  const handleTabChange = (tab: TabType) => {
    console.log('Switching to tab:', tab);
    setActiveTab(tab);
    clearFilters();
  };

  // Main data loading effect
  useEffect(() => {
    if (currentUserId && !loading) {
      loadData();
    }
  }, [currentUserId, loading, activeTab, searchQuery, platformFilter, minFollowersFilter, maxFollowersFilter, selectedCountries]);

  // Listen for favorites changes
  useEffect(() => {
    const handleFavoritesChanged = () => {
      if (activeTab === 'favorites') {
        loadFavorites();
      }
    };
    
    window.addEventListener('favoritesChanged', handleFavoritesChanged);
    
    return () => {
      window.removeEventListener('favoritesChanged', handleFavoritesChanged);
    };
  }, [activeTab]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      if (activeTab === 'influencers') {
        const cards = await influencerCardService.getAllCards({
          platform: platformFilter !== 'all' ? platformFilter : undefined,
          minFollowers: minFollowersFilter || undefined,
          maxFollowers: maxFollowersFilter || undefined,
          isActive: true
        });
        setInfluencerCards(cards);
      } else if (activeTab === 'my_cards') {
        const [influencerCards] = await Promise.all([
          influencerCardService.getUserCards(currentUserId)
        ]);
        setMyInfluencerCards(influencerCards);
      } else if (activeTab === 'favorites') {
        await loadFavorites();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, skipping favorites loading');
        setFavoriteCards([]);
        return;
      }
      
      const favorites = await favoriteService.getUserFavorites(currentUserId);
      const influencerFavorites = favorites.filter(fav => fav.targetType === 'influencer_card');
      
      const cardPromises = influencerFavorites.map(async (fav) => {
        try {
          return await influencerCardService.getCard(fav.targetId);
        } catch (error) {
          console.error('Failed to load favorite card:', error);
          return null;
        }
      });
      
      const loadedCards = (await Promise.all(cardPromises)).filter(Boolean) as InfluencerCard[];
      setFavoriteCards(loadedCards);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.warn('Supabase connection failed when loading favorites');
      } else {
        toast.error('Не удалось загрузить избранные карточки');
      }
      setFavoriteCards([]);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    analytics.trackSearch(query, {
      platform: platformFilter,
      section: 'influencer_cards'
    });
  };

  const handleCreateCard = () => {
    setShowInfluencerModal(true);
  };

  const handleInfluencerCardSaved = (card: InfluencerCard) => {
    if (editingInfluencerCard) {
      setMyInfluencerCards(prev => prev.map(c => c.id === card.id ? card : c));
    } else {
      setMyInfluencerCards(prev => [card, ...prev]);
    }
    setEditingInfluencerCard(null);
  };

  const handleEditInfluencerCard = (card: InfluencerCard) => {
    setEditingInfluencerCard(card);
    setShowInfluencerModal(true);
  };

  const handleDeleteInfluencerCard = async (cardId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту карточку?')) return;

    try {
      await influencerCardService.deleteCard(cardId);
      setMyInfluencerCards(prev => prev.filter(c => c.id !== cardId));
      toast.success('Карточка инфлюенсера удалена');
    } catch (error) {
      console.error('Failed to delete influencer card:', error);
      toast.error('Не удалось удалить карточку');
    }
  };

  const handleToggleInfluencerCardStatus = async (cardId: string, isActive: boolean) => {
    try {
      await influencerCardService.toggleCardStatus(cardId, isActive);
      setMyInfluencerCards(prev => prev.map(c => 
        c.id === cardId ? { ...c, isActive } : c
      ));
      toast.success(isActive ? 'Карточка активирована' : 'Карточка деактивирована');
    } catch (error) {
      console.error('Failed to toggle influencer card status:', error);
      toast.error('Не удалось изменить статус карточки');
    }
  };

  const handleCountryToggle = (country: string) => {
    setSelectedCountries(prev =>
      prev.includes(country)
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  const handleViewAnalytics = (cardId: string) => {
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

  const matchesFilters = (card: InfluencerCard) => {
    if (searchQuery && !card.serviceDetails.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !card.serviceDetails.contentTypes.some(type => type.toLowerCase().includes(searchQuery.toLowerCase())) &&
        !card.audienceDemographics.interests.some(interest => interest.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return false;
    }
    
    if (platformFilter !== 'all' && card.platform !== platformFilter) {
      return false;
    }
    
    if (minFollowersFilter && card.audienceDemographics.totalFollowers < parseInt(minFollowersFilter)) {
      return false;
    }
    
    if (maxFollowersFilter && card.audienceDemographics.totalFollowers > parseInt(maxFollowersFilter)) {
      return false;
    }
    
    if (selectedCountries.length > 0 && !selectedCountries.some(country => 
      card.audienceDemographics.topCountries.includes(country))) {
      return false;
    }
    
    return true;
  };

  const getFilteredData = () => {
    if (activeTab === 'influencers') {
      return influencerCards.filter(card => matchesFilters(card));
    } else if (activeTab === 'my_cards') {
      return myInfluencerCards.filter(card => matchesFilters(card));
    } else if (activeTab === 'favorites') {
      return favoriteCards.filter(card => matchesFilters(card));
    }
    return [];
  };

  const influencerStats = {
    total: myInfluencerCards.length,
    active: myInfluencerCards.filter(c => c.isActive).length,
    avgRating: myInfluencerCards.length > 0 
      ? myInfluencerCards.reduce((sum, c) => sum + c.rating, 0) / myInfluencerCards.length 
      : 0,
    campaigns: myInfluencerCards.reduce((sum, c) => sum + c.completedCampaigns, 0)
  };

  const filteredData = getFilteredData();

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
        
        {/* Section Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex">
            <button
              onClick={() => handleTabChange('influencers')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'influencers'
                  ? 'text-purple-600 border-purple-600 bg-purple-50'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Инфлюенсеры</span>
              </div>
            </button>

            <button
              onClick={() => handleTabChange('my_cards')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'my_cards'
                  ? 'text-purple-600 border-purple-600 bg-purple-50'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Grid className="w-4 h-4" />
                <span>Мои карточки</span>
                {myInfluencerCards.length > 0 && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === 'my_cards'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {myInfluencerCards.length}
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => handleTabChange('favorites')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'favorites'
                  ? 'text-purple-600 border-purple-600 bg-purple-50'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Heart className="w-4 h-4" />
                <span>Избранное</span>
                {favoriteCards.length > 0 && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === 'favorites'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {favoriteCards.length}
                  </span>
                )}
              </div>
            </button>
          </div>
          
          {/* Stats */}
          <div className="p-6 border-b border-gray-200">
            {activeTab === 'my_cards' && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <Grid className="w-5 h-5 text-purple-600" />
                    <span className="ml-2 text-sm font-medium text-gray-600">Всего карточек</span>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{influencerStats.total}</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="ml-2 text-sm font-medium text-gray-600">Активные</span>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{influencerStats.active}</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <Star className="w-5 h-5 text-yellow-600" />
                    <span className="ml-2 text-sm font-medium text-gray-600">Средний рейтинг</span>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{influencerStats.avgRating.toFixed(1)}</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <Trophy className="w-5 h-5 text-blue-600" />
                    <span className="ml-2 text-sm font-medium text-gray-600">Кампании</span>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{influencerStats.campaigns}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Filters */}
          {activeTab === 'influencers' && (
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Поиск по описанию, типам контента, интересам..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {platforms.map(platform => (
                    <option key={platform} value={platform}>
                      {platform === 'all' ? 'Все платформы' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </option>
                  ))}
                </select>
                
                <input
                  type="number"
                  placeholder="Мин. подписчиков"
                  value={minFollowersFilter}
                  onChange={(e) => setMinFollowersFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent w-40"
                />
                
                <input
                  type="number"
                  placeholder="Макс. подписчиков"
                  value={maxFollowersFilter}
                  onChange={(e) => setMaxFollowersFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent w-40"
                />
                
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Очистить
                </button>
              </div>
              
              {/* Country Filters */}
              <div className="mt-4">
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
          )}
          
          {/* Bulk Actions for Favorites */}
          {activeTab === 'favorites' && favoriteCards.length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Избранные карточки</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={handleBulkApplications}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Отправить заявки всем ({favoriteCards.length})</span>
                  </button>
                  <button
                    onClick={() => loadFavorites()}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Обновить
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
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
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12">
                <Grid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {activeTab === 'influencers' ? 'Карточки инфлюенсеров не найдены' :
                   activeTab === 'my_cards' ? 'У вас пока нет карточек' :
                   'Избранные карточки не найдены'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {activeTab === 'influencers' ? 'Попробуйте изменить фильтры поиска' :
                   activeTab === 'my_cards' ? 'Создайте свою первую карточку, чтобы начать получать предложения о сотрудничестве' :
                   'Добавьте карточки в избранное для быстрого доступа'}
                </p>
                {activeTab === 'my_cards' && (
                  <button
                    onClick={handleCreateCard}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
                  >
                    Создать первую карточку
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(activeTab === 'influencers' || activeTab === 'my_cards' || activeTab === 'favorites') && filteredData.map((card: InfluencerCard) => (
                  <InfluencerCardDisplay
                    key={card.id}
                    card={card}
                    showActions={activeTab === 'my_cards'}
                    currentUserId={currentUserId}
                    onEdit={activeTab === 'my_cards' ? handleEditInfluencerCard : undefined}
                    onDelete={activeTab === 'my_cards' ? handleDeleteInfluencerCard : undefined}
                    onToggleStatus={activeTab === 'my_cards' ? handleToggleInfluencerCardStatus : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Influencer Card Modal */}
      <InfluencerCardModal
        isOpen={showInfluencerModal}
        onClose={() => {
          setShowInfluencerModal(false);
          setEditingInfluencerCard(null);
        }}
        currentCard={editingInfluencerCard}
        userId={currentUserId}
        onCardSaved={handleInfluencerCardSaved}
      />
    </FeatureGate>
  );
}