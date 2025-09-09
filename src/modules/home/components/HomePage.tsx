import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useProfileCompletion } from '../../profiles/hooks/useProfileCompletion';
import { useTranslation } from '../../../hooks/useTranslation';
import { homeService } from '../services/homeService';
import { 
  TrendingUp, 
  Users, 
  Target, 
  DollarSign, 
  Calendar,
  Star,
  Award,
  Zap,
  Bell,
  ExternalLink,
  ChevronRight,
  Trophy,
  Activity,
  Eye,
  MessageCircle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: string;
  category: 'industry' | 'platform' | 'trends';
}

interface PlatformUpdate {
  id: string;
  title: string;
  description: string;
  type: 'feature' | 'improvement' | 'announcement';
  publishedAt: string;
  isImportant: boolean;
}

interface PlatformEvent {
  id: string;
  title: string;
  description: string;
  type: 'campaign_launch' | 'achievement' | 'contest' | 'milestone';
  participantCount?: number;
  publishedAt: string;
}

interface TopUser {
  id: string;
  name: string;
  avatar?: string;
  userType: 'influencer' | 'advertiser';
  rating: number;
  completedDeals: number;
  totalReach?: number;
  successRate: number;
}

interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  averageBudget: number;
  averageConversion: number;
  newApplicationsThisWeek: number;
  totalBudgetThisMonth: number;
  successfulDeals: number;
  averageResponseTime: number;
}

export function HomePage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [platformUpdates, setPlatformUpdates] = useState<PlatformUpdate[]>([]);
  const [platformEvents, setPlatformEvents] = useState<PlatformEvent[]>([]);
  const [topInfluencers, setTopInfluencers] = useState<TopUser[]>([]);
  const [topAdvertisers, setTopAdvertisers] = useState<TopUser[]>([]);
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);

  useEffect(() => {
    if (currentUserId && !loading) {
      loadHomeData();
    }
  }, [currentUserId, loading]);

  const loadHomeData = async () => {
    try {
      setIsLoading(true);
      
      const [
        newsData,
        updatesData,
        eventsData,
        influencersData,
        advertisersData,
        statsData
      ] = await Promise.all([
        homeService.getNews(),
        homeService.getPlatformUpdates(),
        homeService.getPlatformEvents(),
        homeService.getTopInfluencers(),
        homeService.getTopAdvertisers(),
        homeService.getCampaignStats(currentUserId)
      ]);

      setNews(newsData);
      setPlatformUpdates(updatesData);
      setPlatformEvents(eventsData);
      setTopInfluencers(influencersData);
      setTopAdvertisers(advertisersData);
      setCampaignStats(statsData);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load home data:', error);
      toast.error('Не удалось загрузить данные главной страницы');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadHomeData();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'industry':
        return 'bg-blue-100 text-blue-700';
      case 'platform':
        return 'bg-purple-100 text-purple-700';
      case 'trends':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getUpdateTypeIcon = (type: string) => {
    switch (type) {
      case 'feature':
        return <Zap className="w-4 h-4 text-blue-600" />;
      case 'improvement':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'announcement':
        return <Bell className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'campaign_launch':
        return <Target className="w-4 h-4 text-purple-600" />;
      case 'achievement':
        return <Trophy className="w-4 h-4 text-yellow-600" />;
      case 'contest':
        return <Award className="w-4 h-4 text-orange-600" />;
      case 'milestone':
        return <Star className="w-4 h-4 text-blue-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading || isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-300 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="h-5 bg-gray-300 rounded mb-4"></div>
                <div className="space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-300 rounded mb-1"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Добро пожаловать в Influo
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Ваш центр управления инфлюенс-маркетингом
          </p>
          {lastRefresh && (
            <p className="text-xs text-gray-500 mt-1">
              Последнее обновление: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <button
          onClick={handleRefresh}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title="Обновить данные"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Campaign Statistics */}
      {campaignStats && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Ваша статистика</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Activity className="w-4 h-4" />
              <span>Обновлено сегодня</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600">Активные кампании</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{campaignStats.activeCampaigns}</p>
              <p className="text-sm text-blue-600">
                {campaignStats.activeCampaigns === 0 ? 'Нет активных' : 'Запущено'}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-600">Заявки</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{campaignStats.pendingApplications}</p>
              <p className="text-sm text-orange-600">
                {campaignStats.pendingApplications === 0 ? 'Нет новых' : 'Ожидают ответа'}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600">Неотвеченные</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{campaignStats.unreadMessages}</p>
              <p className="text-sm text-green-600">
                {campaignStats.unreadMessages === 0 ? 'Все прочитано' : 'Новые сообщения'}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-gray-600">Ждут выплат</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{campaignStats.pendingPayouts}</p>
              <p className="text-sm text-red-600">
                {campaignStats.pendingPayouts === 0 ? 'Нет ожидающих' : 'Требуют внимания'}
              </p>
            </div>
          
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Star className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-gray-600">Рейтинг</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {campaignStats.accountRating > 0 ? campaignStats.accountRating : '—'}
              </p>
              <p className="text-sm text-yellow-600">
                {campaignStats.totalReviews === 0 ? (
                  <span className="text-gray-500">Нет отзывов</span>
                ) : (
                  `Из ${campaignStats.totalReviews} отзывов`
                )}
              </p>
            </div>
          </div>
            
          {/* Call to actions для пустых метрик */}
          <div className="mt-6 space-y-3">
            {campaignStats.totalReviews === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Star className="w-5 h-5 text-yellow-600" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-yellow-800">Получите первый отзыв</h4>
                    <p className="text-sm text-yellow-700">Завершите сделку и попросите клиента оставить отзыв для повышения доверия.</p>
                  </div>
                  <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md text-sm transition-colors">
                    Узнать как
                  </button>
                </div>
              </div>
            )}
            
            {campaignStats.activeCampaigns === 0 && currentUserProfile?.profileCompletion.advertiserSetup && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-800">Создайте первую кампанию</h4>
                    <p className="text-sm text-blue-700">Запустите автоматическую кампанию для поиска инфлюенсеров.</p>
                  </div>
                  <button 
                    onClick={() => window.location.href = '/campaigns'}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                  >
                    Создать
                  </button>
                </div>
              </div>
            )}
            
            {campaignStats.pendingApplications > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-orange-600" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-orange-800">У вас {campaignStats.pendingApplications} новых заявок</h4>
                    <p className="text-sm text-orange-700">Рассмотрите заявки и ответьте инфлюенсерам.</p>
                  </div>
                  <button 
                    onClick={() => window.location.href = '/offers'}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                  >
                    Просмотреть
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* News Feed */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Новости индустрии</h2>
                <span className="text-sm text-gray-500">Обновляется ежедневно</span>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {news.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-md ${getCategoryColor(item.category)}`}>
                          {item.category === 'industry' ? 'Индустрия' :
                           item.category === 'platform' ? 'Платформы' :
                           item.category === 'trends' ? 'Тренды' : item.category}
                        </span>
                        <span className="text-xs text-gray-500">{item.source}</span>
                      </div>
                      <h3 className="text-md font-semibold text-gray-900 mb-2 line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {item.summary}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(parseISO(item.publishedAt), { addSuffix: true })}
                        </span>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center space-x-1"
                        >
                          <span>Читать далее</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Events */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">События платформы</h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {platformEvents.map((event) => (
                <div key={event.id} className="p-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getEventTypeIcon(event.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-md font-medium text-gray-900 mb-1">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {event.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(parseISO(event.publishedAt), { addSuffix: true })}
                        </span>
                        {event.participantCount && (
                          <span className="text-xs text-purple-600 font-medium">
                            {event.participantCount} участников
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Platform Updates */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Обновления платформы</h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {platformUpdates.map((update) => (
                <div key={update.id} className={`p-4 ${update.isImportant ? 'bg-yellow-50' : ''}`}>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getUpdateTypeIcon(update.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-sm font-medium text-gray-900">
                          {update.title}
                        </h3>
                        {update.isImportant && (
                          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                            Важно
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {update.description}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(parseISO(update.publishedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Influencers */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Топ инфлюенсеров</h2>
                <Trophy className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {topInfluencers.map((influencer, index) => (
                <div key={influencer.id} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                      {influencer.avatar ? (
                        <img 
                          src={influencer.avatar} 
                          alt={influencer.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold text-sm">
                          {influencer.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {influencer.name}
                    </p>
                    <div className="flex items-center space-x-3 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span>{influencer.rating.toFixed(1)}</span>
                      </div>
                      <span>{influencer.completedDeals} сделок</span>
                      {influencer.totalReach && (
                        <span>{formatNumber(influencer.totalReach)} охват</span>
                      )}
                    </div>
                  </div>
                  
                  <button className="text-purple-600 hover:text-purple-700">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Top Advertisers */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Топ рекламодателей</h2>
                <Award className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {topAdvertisers.map((advertiser, index) => (
                <div key={advertiser.id} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-green-400 rounded-full flex items-center justify-center">
                      {advertiser.avatar ? (
                        <img 
                          src={advertiser.avatar} 
                          alt={advertiser.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold text-sm">
                          {advertiser.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {advertiser.name}
                    </p>
                    <div className="flex items-center space-x-3 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span>{advertiser.rating.toFixed(1)}</span>
                      </div>
                      <span>{advertiser.completedDeals} кампаний</span>
                      <span>{advertiser.successRate}% успешность</span>
                    </div>
                  </div>
                  
                  <button className="text-blue-600 hover:text-blue-700">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}