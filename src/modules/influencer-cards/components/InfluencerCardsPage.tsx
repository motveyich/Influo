import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { InfluencerCard, AdvertiserCard } from '../../../core/types';
import { InfluencerCardDisplay } from './InfluencerCardDisplay';
import { AdvertiserCardDisplay } from '../../advertiser-cards/components/AdvertiserCardDisplay';
import { CardTypeSelectionModal } from './CardTypeSelectionModal';
import { InfluencerCardModal } from './InfluencerCardModal';
import { AdvertiserCardModal } from '../../advertiser-cards/components/AdvertiserCardModal';
import { influencerCardService } from '../services/influencerCardService';
import { advertiserCardService } from '../../advertiser-cards/services/advertiserCardService';
import { isSupabaseConfigured } from '../../../core/supabase';
import { favoriteService } from '../../favorites/services/favoriteService';
import { FeatureGate } from '../../../components/FeatureGate';
import { useProfileCompletion } from '../../profiles/hooks/useProfileCompletion';
import { Search, Filter, Plus, Users, TrendingUp, Star, Grid, Target, Heart, Send, Trophy, Briefcase } from 'lucide-react';
import { analytics } from '../../../core/analytics';
import { useTranslation } from '../../../hooks/useTranslation';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';
import { CONTENT_TYPES } from '../../../core/constants';

type TabType = 'influencers' | 'advertisers' | 'my_cards' | 'favorites';

// Platform options for different card types
const INFLUENCER_PLATFORMS = ['all', 'vk', 'youtube', 'instagram', 'telegram', 'ok', 'facebook', 'twitter', 'tiktok', 'twitch', 'rutube', 'yandex_zen', 'likee', 'multi'];
const ADVERTISER_PLATFORMS = ['all', 'vk', 'youtube', 'instagram', 'telegram', 'ok', 'facebook', 'twitter', 'tiktok', 'twitch', 'rutube', 'yandex_zen', 'likee'];

const PRODUCT_CATEGORIES = [
  'Косметика', 'Химия для дома', 'Электроника', 'Одежда', 'Информационный продукт',
  'Курсы', 'Заведения', 'Продукты питания', 'Напитки', 'Спортивные товары',
  'Детские товары', 'Товары для дома', 'Мебель', 'Автомобили', 'Недвижимость',
  'Финансовые услуги', 'Страхование', 'Медицинские услуги', 'Образовательные услуги',
  'Туристические услуги', 'Развлечения', 'Игры и приложения', 'Программное обеспечение',
  'Книги и издания', 'Музыка', 'Фильмы и сериалы', 'Подписки и сервисы',
  'Криптовалюта', 'Инвестиции', 'Ювелирные изделия', 'Часы', 'Аксессуары',
  'Обувь', 'Сумки', 'Парфюмерия', 'Средства по уходу', 'Витамины и БАДы',
  'Спортивное питание', 'Диетические продукты', 'Органические продукты',
  'Веганские продукты', 'Товары для животных', 'Садоводство', 'Инструменты',
  'Строительные материалы', 'Канцелярские товары', 'Хобби и рукоделие',
  'Музыкальные инструменты', 'Фототехника', 'Видеотехника', 'Компьютеры',
  'Мобильные устройства', 'Бытовая техника', 'Климатическая техника',
  'Освещение', 'Текстиль', 'Постельное белье', 'Посуда', 'Кухонная утварь', 'Другое'
];


const COUNTRIES = [
  'Россия', 'Беларусь', 'Казахстан', 'Украина', 'Узбекистан', 'Киргизия',
  'Таджикистан', 'Армения', 'Азербайджан', 'Молдова', 'Грузия', 'США',
  'Германия', 'Великобритания', 'Франция', 'Италия', 'Испания', 'Канада',
  'Австралия', 'Турция', 'Польша', 'Чехия'
];

export function InfluencerCardsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('influencers');
  const [influencerCards, setInfluencerCards] = useState<InfluencerCard[]>([]);
  const [advertiserCards, setAdvertiserCards] = useState<AdvertiserCard[]>([]);
  const [myInfluencerCards, setMyInfluencerCards] = useState<InfluencerCard[]>([]);
  const [myAdvertiserCards, setMyAdvertiserCards] = useState<AdvertiserCard[]>([]);
  const [favoriteCards, setFavoriteCards] = useState<any[]>([]);
  
  // Common filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  
  // Influencer-specific filter states
  const [minFollowersFilter, setMinFollowersFilter] = useState<string>('');
  const [maxFollowersFilter, setMaxFollowersFilter] = useState<string>('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  
  // Advertiser-specific filter states
  const [minBudgetFilter, setMinBudgetFilter] = useState<string>('');
  const [maxBudgetFilter, setMaxBudgetFilter] = useState<string>('');
  const [selectedProductCategories, setSelectedProductCategories] = useState<string[]>([]);
  const [selectedServiceFormats, setSelectedServiceFormats] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [showInfluencerModal, setShowInfluencerModal] = useState(false);
  const [showAdvertiserModal, setShowAdvertiserModal] = useState(false);
  const [showTypeSelectionModal, setShowTypeSelectionModal] = useState(false);
  const [editingInfluencerCard, setEditingInfluencerCard] = useState<InfluencerCard | null>(null);
  const [editingAdvertiserCard, setEditingAdvertiserCard] = useState<AdvertiserCard | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setPlatformFilter('all');
    // Clear influencer filters
    setMinFollowersFilter('');
    setMaxFollowersFilter('');
    setSelectedCountries([]);
    // Clear advertiser filters
    setMinBudgetFilter('');
    setMaxBudgetFilter('');
    setSelectedProductCategories([]);
    setSelectedServiceFormats([]);
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
  }, [currentUserId, loading, activeTab, searchQuery, platformFilter, minFollowersFilter, maxFollowersFilter, selectedCountries, minBudgetFilter, maxBudgetFilter, selectedProductCategories, selectedServiceFormats]);

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
        const cards = await influencerCardService.getCards({
          platform: platformFilter !== 'all' ? platformFilter : undefined,
          minFollowers: minFollowersFilter ? parseInt(minFollowersFilter) : undefined,
          maxFollowers: maxFollowersFilter ? parseInt(maxFollowersFilter) : undefined,
          countries: selectedCountries.length > 0 ? selectedCountries : undefined,
          searchQuery: searchQuery || undefined
        });
        setInfluencerCards(cards);
      } else if (activeTab === 'advertisers') {
        const cards = await advertiserCardService.getCards({
          platform: platformFilter !== 'all' ? platformFilter : undefined,
          minBudget: minBudgetFilter ? parseInt(minBudgetFilter) : undefined,
          maxBudget: maxBudgetFilter ? parseInt(maxBudgetFilter) : undefined,
          productCategories: selectedProductCategories.length > 0 ? selectedProductCategories : undefined,
          serviceFormats: selectedServiceFormats.length > 0 ? selectedServiceFormats : undefined,
          searchQuery: searchQuery || undefined
        });
        setAdvertiserCards(cards);
      } else if (activeTab === 'my_cards') {
        const [influencerCards, advertiserCards] = await Promise.all([
          influencerCardService.getMyCards(currentUserId),
          advertiserCardService.getMyCards(currentUserId)
        ]);
        setMyInfluencerCards(influencerCards);
        setMyAdvertiserCards(advertiserCards);
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
      
      const favorites = await favoriteService.getFavorites();
      const influencerFavorites = favorites.filter(fav =>
        fav.targetType === 'influencer_card' || fav.targetType === 'advertiser_card'
      );
      
      const cardPromises = influencerFavorites.map(async (fav) => {
        try {
          if (fav.targetType === 'influencer_card') {
            return await influencerCardService.getCard(fav.targetId);
          } else if (fav.targetType === 'advertiser_card') {
            return await advertiserCardService.getCard(fav.targetId);
          }
          return null;
        } catch (error) {
          console.error('Failed to load favorite card:', error);
          return null;
        }
      });
      
      const loadedCards = (await Promise.all(cardPromises)).filter(Boolean);
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
    setShowTypeSelectionModal(true);
  };

  const handleTypeSelected = (type: 'influencer' | 'advertiser') => {
    setShowTypeSelectionModal(false);
    if (type === 'influencer') {
      setShowInfluencerModal(true);
    } else {
      setShowAdvertiserModal(true);
    }
  };

  const handleInfluencerCardSaved = (card: InfluencerCard) => {
    if (editingInfluencerCard) {
      setMyInfluencerCards(prev => prev.map(c => c.id === card.id ? card : c));
    } else {
      setMyInfluencerCards(prev => [card, ...prev]);
    }
    setEditingInfluencerCard(null);
  };

  const handleAdvertiserCardSaved = (card: AdvertiserCard) => {
    if (editingAdvertiserCard) {
      setMyAdvertiserCards(prev => prev.map(c => c.id === card.id ? card : c));
    } else {
      setMyAdvertiserCards(prev => [card, ...prev]);
    }
    setEditingAdvertiserCard(null);
  };

  const handleEditInfluencerCard = (card: InfluencerCard) => {
    setEditingInfluencerCard(card);
    setShowInfluencerModal(true);
  };

  const handleEditAdvertiserCard = (card: AdvertiserCard) => {
    setEditingAdvertiserCard(card);
    setShowAdvertiserModal(true);
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

  const handleDeleteAdvertiserCard = async (cardId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту карточку?')) return;

    try {
      await advertiserCardService.deleteCard(cardId);
      setMyAdvertiserCards(prev => prev.filter(c => c.id !== cardId));
      toast.success('Карточка рекламодателя удалена');
    } catch (error) {
      console.error('Failed to delete advertiser card:', error);
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

  const handleToggleAdvertiserCardStatus = async (cardId: string, isActive: boolean) => {
    try {
      await advertiserCardService.toggleCardStatus(cardId, isActive);
      setMyAdvertiserCards(prev => prev.map(c => 
        c.id === cardId ? { ...c, isActive } : c
      ));
      toast.success(isActive ? 'Карточка активирована' : 'Карточка деактивирована');
    } catch (error) {
      console.error('Failed to toggle advertiser card status:', error);
      toast.error('Не удалось изменить статус карточки');
    }
  };

  const handleInfluencerCountryToggle = (country: string) => {
    setSelectedCountries(prev =>
      prev.includes(country)
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  const handleProductCategoryToggle = (category: string) => {
    setSelectedProductCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleServiceFormatToggle = (format: string) => {
    setSelectedServiceFormats(prev =>
      prev.includes(format)
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };

  const handleViewAnalytics = (cardId: string) => {
    navigate(`/influencer-cards/${cardId}`);
  };

  const handleBulkApplications = async () => {
    try {
      const favoriteIds = favoriteCards.map(card => card.id);
      const result = await favoriteService.sendBulkApplications(currentUserId, favoriteIds, {
        message: 'Заинтересован в сотрудничестве с вашей карточкой',
        proposedRate: 1000
      });

      if (result.sent === 0) {
        if (result.skipped > 0) {
          toast.error('Все заявки были пропущены (вы недавно уже отправляли заявки этим пользователям)');
        } else if (result.failed > 0) {
          toast.error(`Не удалось отправить заявки. Ошибок: ${result.failed}`);
        } else {
          toast.error('Не удалось отправить заявки');
        }
      } else if (result.sent === result.total) {
        toast.success(`Заявки успешно отправлены ${result.sent} инфлюенсерам!`);
      } else {
        const parts = [];
        if (result.sent > 0) parts.push(`отправлено: ${result.sent}`);
        if (result.skipped > 0) parts.push(`пропущено: ${result.skipped}`);
        if (result.failed > 0) parts.push(`ошибок: ${result.failed}`);
        toast.success(`Результат: ${parts.join(', ')}`);
      }
    } catch (error: any) {
      console.error('Failed to send bulk applications:', error);
      toast.error('Не удалось отправить массовые заявки');
    }
  };

  const getFilteredData = () => {
    if (activeTab === 'influencers') {
      return influencerCards; // Filtering is now done in the service
    } else if (activeTab === 'advertisers') {
      return advertiserCards; // Filtering is now done in the service
    } else if (activeTab === 'my_cards') {
      // For my cards, we still need client-side filtering since they come from different sources
      const filteredInfluencerCards = myInfluencerCards.filter(card => {
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          if (!card.serviceDetails.description.toLowerCase().includes(searchLower) &&
              !card.serviceDetails.contentTypes.some(type => type.toLowerCase().includes(searchLower)) &&
              !card.audienceDemographics.interests.some(interest => interest.toLowerCase().includes(searchLower))) {
            return false;
          }
        }
        if (platformFilter !== 'all' && card.platform !== platformFilter) {
          return false;
        }
        return true;
      });
      
      const filteredAdvertiserCards = myAdvertiserCards.filter(card => {
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          if (!card.campaignTitle.toLowerCase().includes(searchLower) &&
              !card.companyName.toLowerCase().includes(searchLower) &&
              !card.campaignDescription.toLowerCase().includes(searchLower) &&
              !card.productCategories.some(cat => cat.toLowerCase().includes(searchLower)) &&
              !card.serviceFormat.some(format => format.toLowerCase().includes(searchLower))) {
            return false;
          }
        }
        if (platformFilter !== 'all' && card.platform !== platformFilter) {
          return false;
        }
        return true;
      });
      
      return [...filteredInfluencerCards, ...filteredAdvertiserCards];
    } else if (activeTab === 'favorites') {
      return favoriteCards.filter(card => {
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          // Check if it's an influencer card
          if ('reach' in card) {
            const influencerCard = card as InfluencerCard;
            if (!influencerCard.serviceDetails.description.toLowerCase().includes(searchLower) &&
                !influencerCard.serviceDetails.contentTypes.some(type => type.toLowerCase().includes(searchLower)) &&
                !influencerCard.audienceDemographics.interests.some(interest => interest.toLowerCase().includes(searchLower))) {
              return false;
            }
          } else {
            // It's an advertiser card
            const advertiserCard = card as AdvertiserCard;
            if (!advertiserCard.campaignTitle.toLowerCase().includes(searchLower) &&
                !advertiserCard.companyName.toLowerCase().includes(searchLower) &&
                !advertiserCard.campaignDescription.toLowerCase().includes(searchLower) &&
                !advertiserCard.productCategories.some(cat => cat.toLowerCase().includes(searchLower))) {
              return false;
            }
          }
        }
        if (platformFilter !== 'all' && card.platform !== platformFilter) {
          return false;
        }
        return true;
      });
    }
    return [];
  };

  const influencerStats = {
    total: myInfluencerCards.length + myAdvertiserCards.length,
    active: myInfluencerCards.filter(c => c.isActive).length,
    avgRating: myInfluencerCards.length > 0 
      ? myInfluencerCards.reduce((sum, c) => sum + c.rating, 0) / myInfluencerCards.length 
      : 0,
    campaigns: myInfluencerCards.reduce((sum, c) => sum + c.completedCampaigns, 0)
  };

  const advertiserStats = {
    total: myAdvertiserCards.length,
    active: myAdvertiserCards.filter(c => c.isActive).length,
    avgRating: myAdvertiserCards.length > 0 && myAdvertiserCards[0].campaignStats
      ? myAdvertiserCards.reduce((sum, c) => sum + (c.campaignStats?.averageRating || 0), 0) / myAdvertiserCards.length 
      : 0,
    campaigns: myAdvertiserCards.reduce((sum, c) => sum + (c.campaignStats?.completedCampaigns || 0), 0)
  };

  const filteredData = getFilteredData();

  // Get platform options based on active tab
  const getPlatformOptions = () => {
    if (activeTab === 'influencers' || (activeTab === 'my_cards' && myInfluencerCards.length > 0) || (activeTab === 'favorites' && favoriteCards.some(card => 'reach' in card))) {
      return INFLUENCER_PLATFORMS;
    } else {
      return ADVERTISER_PLATFORMS;
    }
  };

  // Check if we should show influencer-specific filters
  const shouldShowInfluencerFilters = () => {
    return activeTab === 'influencers' || (activeTab === 'my_cards' && myInfluencerCards.length > 0);
  };

  // Check if we should show advertiser-specific filters
  const shouldShowAdvertiserFilters = () => {
    return activeTab === 'advertisers' || (activeTab === 'my_cards' && myAdvertiserCards.length > 0);
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 shadow-sm"
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
                  ? 'text-blue-600 border-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Users className="w-4 h-4" />
                <span>{t('influencerCards.influencers')}</span>
              </div>
            </button>

            <button
              onClick={() => handleTabChange('advertisers')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'advertisers'
                  ? 'text-blue-600 border-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Briefcase className="w-4 h-4" />
                <span>{t('influencerCards.advertisers')}</span>
              </div>
            </button>

            <button
              onClick={() => handleTabChange('my_cards')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'my_cards'
                  ? 'text-blue-600 border-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Grid className="w-4 h-4" />
                <span>{t('influencerCards.myCards')}</span>
                {(myInfluencerCards.length + myAdvertiserCards.length) > 0 && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === 'my_cards'
                      ? 'bg-blue-600 text-white dark:bg-blue-500'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {myInfluencerCards.length + myAdvertiserCards.length}
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => handleTabChange('favorites')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'favorites'
                  ? 'text-blue-600 border-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Heart className="w-4 h-4" />
                <span>{t('influencerCards.favorites')}</span>
                {favoriteCards.length > 0 && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === 'favorites'
                      ? 'bg-blue-600 text-white dark:bg-blue-500'
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
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <Grid className="w-5 h-5 text-blue-600" />
                      <span className="ml-2 text-sm font-medium text-gray-600">{t('influencerCards.totalCards')}</span>
                    </div>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">{influencerStats.total}</p>
                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Инфлюенсер:</span>
                        <span className="font-medium">{myInfluencerCards.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Рекламодатель:</span>
                        <span className="font-medium">{myAdvertiserCards.length}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="ml-2 text-sm font-medium text-gray-600">{t('influencerCards.active')}</span>
                    </div>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">{influencerStats.active + advertiserStats.active}</p>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <Star className="w-5 h-5 text-yellow-600" />
                      <span className="ml-2 text-sm font-medium text-gray-600">{t('influencerCards.avgRating')}</span>
                    </div>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {((influencerStats.avgRating + advertiserStats.avgRating) / 2).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Filters */}
          {(activeTab === 'influencers' || activeTab === 'advertisers' || activeTab === 'favorites') && (
            <div className="p-6 border-b border-gray-200">
              {/* Search and Filter Toggle */}
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-4">
                <div className="flex-1 flex space-x-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder={
                        activeTab === 'influencers' ? "Поиск по описанию, типам контента, интересам..." :
                        activeTab === 'advertisers' ? "Поиск по названию кампании, компании, описанию..." :
                        "Поиск карточек..."
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && loadData()}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={loadData}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
                  >
                    <Search className="w-4 h-4" />
                    <span>Поиск</span>
                  </button>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                      showFilters
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span>Фильтры</span>
                  </button>
                  
                  {(platformFilter !== 'all' || 
                    minFollowersFilter || maxFollowersFilter || selectedCountries.length > 0 ||
                    minBudgetFilter || maxBudgetFilter || selectedProductCategories.length > 0 || selectedServiceFormats.length > 0) && (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Очистить
                    </button>
                  )}
                </div>
              </div>
              
              {/* Collapsible Filters Section */}
              {showFilters && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  {/* Platform Filter - Always shown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('influencerCards.platform')}</label>
                    <select
                      value={platformFilter}
                      onChange={(e) => setPlatformFilter(e.target.value)}
                      className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {getPlatformOptions().map(platform => (
                        <option key={platform} value={platform}>
                          {platform === 'all' ? t('influencerCards.allPlatforms') : platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Influencer-specific filters */}
                  {shouldShowInfluencerFilters() && (
                    <>
                      {/* Followers Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('influencerCards.followersCount')}</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="number"
                            placeholder={t('influencerCards.minimum')}
                            value={minFollowersFilter}
                            onChange={(e) => setMinFollowersFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="number"
                            placeholder={t('influencerCards.maximum')}
                            value={maxFollowersFilter}
                            onChange={(e) => setMaxFollowersFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                      {/* Countries */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('influencerCards.targetCountries')}</label>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                          {COUNTRIES.map(country => (
                            <button
                              key={country}
                              onClick={() => handleInfluencerCountryToggle(country)}
                              className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                                selectedCountries.includes(country)
                                  ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {country}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Advertiser-specific filters */}
                  {shouldShowAdvertiserFilters() && (
                    <>
                      {/* Budget Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('influencerCards.budget')}</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="number"
                            placeholder={t('influencerCards.minimum')}
                            value={minBudgetFilter}
                            onChange={(e) => setMinBudgetFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="number"
                            placeholder={t('influencerCards.maximum')}
                            value={maxBudgetFilter}
                            onChange={(e) => setMaxBudgetFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                      {/* Product Categories */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('influencerCards.productCategories')}</label>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                          {PRODUCT_CATEGORIES.map(category => (
                            <button
                              key={category}
                              onClick={() => handleProductCategoryToggle(category)}
                              className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                                selectedProductCategories.includes(category)
                                  ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {category}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Service Formats */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('influencerCards.serviceFormats')}</label>
                        <div className="flex flex-wrap gap-2">
                          {CONTENT_TYPES.map(format => (
                            <button
                              key={format}
                              onClick={() => handleServiceFormatToggle(format)}
                              className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                                selectedServiceFormats.includes(format)
                                  ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {format}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* Active Filters Summary */}
              {!showFilters && (platformFilter !== 'all' || 
                minFollowersFilter || maxFollowersFilter || selectedCountries.length > 0 ||
                minBudgetFilter || maxBudgetFilter || selectedProductCategories.length > 0 || selectedServiceFormats.length > 0) && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-gray-600">{t('influencerCards.activeFilters')}:</span>
                  
                  {platformFilter !== 'all' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">
                      {t('influencerCards.platform')}: {platformFilter}
                    </span>
                  )}
                  
                  {minFollowersFilter && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">
                      {t('influencerCards.minFollowers')}: {minFollowersFilter}
                    </span>
                  )}
                  
                  {maxFollowersFilter && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">
                      {t('influencerCards.maxFollowers')}: {maxFollowersFilter}
                    </span>
                  )}
                  
                  {selectedCountries.length > 0 && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md">
                      {t('influencerCards.countries')}: {selectedCountries.length}
                    </span>
                  )}
                  
                  {minBudgetFilter && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-md">
                      {t('influencerCards.minBudget')}: {minBudgetFilter}
                    </span>
                  )}
                  
                  {maxBudgetFilter && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-md">
                      {t('influencerCards.maxBudget')}: {maxBudgetFilter}
                    </span>
                  )}
                  
                  {selectedProductCategories.length > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md">
                      {t('influencerCards.categories')}: {selectedProductCategories.length}
                    </span>
                  )}
                  
                  {selectedServiceFormats.length > 0 && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-md">
                      {t('influencerCards.formats')}: {selectedServiceFormats.length}
                    </span>
                  )}
                  
                  <button
                    onClick={clearFilters}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md hover:bg-gray-200 transition-colors"
                  >
                    {t('influencerCards.clearAll')}
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Bulk Actions for Favorites */}
          {activeTab === 'favorites' && favoriteCards.length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{t('influencerCards.favoriteCards')}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={handleBulkApplications}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{t('influencerCards.sendApplicationsToAll', { count: favoriteCards.length })}</span>
                  </button>
                  <button
                    onClick={() => loadFavorites()}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {t('influencerCards.update')}
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
                  {activeTab === 'influencers' ? t('influencerCards.noInfluencerCards') :
                   activeTab === 'advertisers' ? t('influencerCards.noAdvertiserCards') :
                   activeTab === 'my_cards' ? t('influencerCards.noMyCards') :
                   t('influencerCards.noFavoriteCards')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {activeTab === 'influencers' ? t('influencerCards.tryChangingFilters') :
                   activeTab === 'advertisers' ? t('influencerCards.tryChangingFilters') :
                   activeTab === 'my_cards' ? t('influencerCards.createFirstCardDescription') :
                   t('influencerCards.addToFavoritesDescription')}
                </p>
                {activeTab === 'my_cards' && (
                  <button
                    onClick={handleCreateCard}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
                  >
                    {t('influencerCards.createFirstCard')}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredData.map((card: InfluencerCard | AdvertiserCard) => {
                  // Check if this is an influencer card or advertiser card
                  const isInfluencerCard = 'platform' in card && 'reach' in card;
                  
                  if (isInfluencerCard) {
                    return (
                      <InfluencerCardDisplay
                        key={card.id}
                        card={card as InfluencerCard}
                        showActions={activeTab === 'my_cards'}
                        currentUserId={currentUserId}
                        onEdit={activeTab === 'my_cards' ? handleEditInfluencerCard : undefined}
                        onDelete={activeTab === 'my_cards' ? handleDeleteInfluencerCard : undefined}
                        onToggleStatus={activeTab === 'my_cards' ? handleToggleInfluencerCardStatus : undefined}
                        onViewAnalytics={handleViewAnalytics}
                      />
                    );
                  } else {
                    return (
                      <AdvertiserCardDisplay
                        key={card.id}
                        card={card as AdvertiserCard}
                        showActions={activeTab === 'my_cards'}
                        currentUserId={currentUserId}
                        onEdit={activeTab === 'my_cards' ? handleEditAdvertiserCard : undefined}
                        onDelete={activeTab === 'my_cards' ? handleDeleteAdvertiserCard : undefined}
                        onToggleStatus={activeTab === 'my_cards' ? handleToggleAdvertiserCardStatus : undefined}
                        onViewAnalytics={handleViewAnalytics}
                      />
                    );
                  }
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Type Selection Modal */}
      <CardTypeSelectionModal
        isOpen={showTypeSelectionModal}
        onClose={() => setShowTypeSelectionModal(false)}
        onSelectType={handleTypeSelected}
        profile={currentUserProfile}
      />

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

      {/* Advertiser Card Modal */}
      <AdvertiserCardModal
        isOpen={showAdvertiserModal}
        onClose={() => {
          setShowAdvertiserModal(false);
          setEditingAdvertiserCard(null);
        }}
        currentCard={editingAdvertiserCard}
        userId={currentUserId}
        onCardSaved={handleAdvertiserCardSaved}
      />
    </FeatureGate>
  );
}