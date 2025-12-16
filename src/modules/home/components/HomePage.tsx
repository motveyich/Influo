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

interface UserStats {
  pendingApplications: number;
  unreadMessages: number;
  pendingPayouts: number;
  accountRating: number;
  totalReviews: number;
}

export function HomePage() {
  const [platformUpdates, setPlatformUpdates] = useState<PlatformUpdate[]>([]);
  const [platformEvents, setPlatformEvents] = useState<PlatformEvent[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);

  useEffect(() => {
    if (!loading) {
      loadHomeData();
    }
  }, [currentUserId, loading]);

  const loadHomeData = async () => {
    try {
      setIsLoading(true);

      const promises: Promise<any>[] = [
        homeService.getPlatformUpdates(),
        homeService.getPlatformEvents(),
      ];

      if (currentUserId) {
        promises.push(homeService.getUserStats(currentUserId));
      }

      const results = await Promise.all(promises);

      setPlatformUpdates(results[0]);
      setPlatformEvents(results[1]);

      if (currentUserId && results[2]) {
        setUserStats(results[2]);
      } else {
        setUserStats(null);
      }

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


  const getUpdateTypeIcon = (type: string) => {
    switch (type) {
      case 'feature':
        return <Zap className="w-4 h-4 text-blue-600" />;
      case 'improvement':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'announcement':
        return <Bell className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'campaign_launch':
        return <Target className="w-4 h-4 text-blue-600" />;
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
              {t('home.lastUpdated')}: {lastRefresh.toLocaleTimeString()}
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


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Updates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('home.platformUpdates')}</h2>
          </div>
          
          {platformUpdates.length > 0 ? (
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
                            {t('home.important')}
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
          ) : (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('home.noUpdates')}</h3>
              <p className="text-gray-600">{t('home.updatesWillAppearHere')}</p>
            </div>
          )}
        </div>

        {/* Platform Events */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('home.platformEvents')}</h2>
          </div>
          
          {platformEvents.length > 0 ? (
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
                          <span className="text-xs text-blue-600 font-medium">
                            {event.participantCount} {t('home.participants')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('home.noEvents')}</h3>
              <p className="text-gray-600">{t('home.eventsWillAppearHere')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}