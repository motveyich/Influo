import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Target, DollarSign, MessageCircle, Eye, Calendar, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { analytics, AnalyticsData, AccountStats, CampaignAnalytics } from '../../../core/analytics';
import { useAuth } from '../../../hooks/useAuth';
import { useProfileCompletion } from '../../profiles/hooks/useProfileCompletion';
import { useTranslation } from '../../../hooks/useTranslation';
import { FeatureGate } from '../../../components/FeatureGate';
import toast from 'react-hot-toast';

interface ConnectionStatus {
  ga: boolean;
  mixpanel: boolean;
  hasQueuedEvents: boolean;
}

export function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ ga: false, mixpanel: false, hasQueuedEvents: false });
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [userPermissions, setUserPermissions] = useState({ canViewAnalytics: false, canViewDetailedMetrics: false });
  
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);

  useEffect(() => {
    if (currentUserId && !loading) {
      checkPermissions();
      loadAnalytics();
      checkConnectionStatus();
    }
  }, [timeRange, currentUserId, loading]);

  useEffect(() => {
    // Track dashboard view
    if (currentUserId) {
      analytics.trackDashboardView(currentUserId, 'main_dashboard');
    }

    // Track engagement time
    const startTime = Date.now();
    return () => {
      if (currentUserId) {
        const duration = Date.now() - startTime;
        analytics.trackEngagement(currentUserId, 'analytics_dashboard', duration);
      }
    };
  }, [currentUserId]);

  const checkPermissions = async () => {
    try {
      const permissions = await analytics.getUserPermissions(currentUserId);
      setUserPermissions(permissions);
    } catch (error) {
      console.error('Failed to check permissions:', error);
      setUserPermissions({ canViewAnalytics: false, canViewDetailedMetrics: false });
    }
  };

  const checkConnectionStatus = () => {
    const status = analytics.getConnectionStatus();
    setConnectionStatus(status);
  };

  const loadAnalytics = async () => {
    if (!userPermissions.canViewAnalytics) {
      setError(t('analytics.errors.noPermission'));
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const data = await analytics.getAnalyticsData(currentUserId, timeRange);
      setAnalyticsData(data);
      setLastRefresh(new Date());
      
      // Track successful data load
      analytics.trackDashboardInteraction(currentUserId, 'data_loaded', 'analytics_dashboard');
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setError(t('analytics.errors.loadFailed'));
      
      // Track error
      analytics.track('analytics_load_error', {
        user_id: currentUserId,
        error: (error as Error).message,
        time_range: timeRange
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    analytics.trackDashboardInteraction(currentUserId, 'refresh_clicked', 'refresh_button');
    await loadAnalytics();
    checkConnectionStatus();
  };

  const handleRetryFailedEvents = async () => {
    try {
      await analytics.retryFailedEvents();
      checkConnectionStatus();
      toast.success('Повторная попытка отправки событий аналитики...');
    } catch (error) {
      toast.error('Не удалось повторить отправку событий');
    }
  };

  const handleTimeRangeChange = (newTimeRange: '7d' | '30d' | '90d') => {
    analytics.trackDashboardInteraction(currentUserId, 'time_range_changed', `time_range_${newTimeRange}`);
    setTimeRange(newTimeRange);
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

  const getUserTypeLabel = () => {
    if (!currentUserProfile) return 'User';
    if (currentUserProfile.influencerData && currentUserProfile.advertiserData) {
      return 'Инфлюенсер и рекламодатель';
    } else if (currentUserProfile.influencerData) {
      return 'Инфлюенсер';
    } else if (currentUserProfile.advertiserData) {
      return 'Рекламодатель';
    }
    return 'Пользователь';
  };

  // Show loading state
  if (isLoading) {
    return (
      <FeatureGate
        profile={currentUserProfile}
        requiredSection="any"
        featureName="Аналитика"
        onCompleteProfile={() => window.location.href = '/profiles'}
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="h-8 bg-gray-300 rounded w-48 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-300 rounded w-64 animate-pulse"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-300 rounded mb-4"></div>
                <div className="h-8 bg-gray-300 rounded mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </FeatureGate>
    );
  }

  // Show error state
  if (error || !analyticsData) {
    return (
      <FeatureGate
        profile={currentUserProfile}
        requiredSection="any"
        featureName="Аналитика"
        onCompleteProfile={() => window.location.href = '/profiles'}
      >
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {error || t('analytics.errors.loadFailed')}
          </h3>
          <p className="text-gray-600 mb-4">
            {!userPermissions.canViewAnalytics 
              ? t('analytics.errors.noPermission')
              : t('analytics.errors.tryAgain')
            }
          </p>
          {userPermissions.canViewAnalytics && (
            <button
              onClick={handleRefresh}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Попробовать снова
            </button>
          )}
        </div>
      </FeatureGate>
    );
  }

  return (
    <FeatureGate
      profile={currentUserProfile}
      requiredSection="any"
      featureName="Аналитика"
      onCompleteProfile={() => window.location.href = '/profiles'}
    >
      <div className="space-y-6">
        {/* Connection Status Banner */}
        {(!connectionStatus.ga && !connectionStatus.mixpanel) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">Сервис аналитики недоступен</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Сервисы аналитики в настоящее время недоступны. Показываются кэшированные данные.
                  {connectionStatus.hasQueuedEvents && ` ${t('analytics.connection.eventsQueued')}`}
                </p>
              </div>
              {connectionStatus.hasQueuedEvents && (
                <button
                  onClick={handleRetryFailedEvents}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                >
                  {t('analytics.connection.retrySync')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('analytics.title')}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {t('analytics.subtitle')} как {getUserTypeLabel()}
            </p>
            {lastRefresh && (
              <p className="text-xs text-gray-500 mt-1">
                {t('analytics.lastUpdated')}: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Connection indicators */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${connectionStatus.ga ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-xs text-gray-600">GA</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${connectionStatus.mixpanel ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-xs text-gray-600">MP</span>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Обновить данные"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <select
                value={timeRange}
                onChange={(e) => handleTimeRangeChange(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="7d">{t('analytics.timeRange.last7Days')}</option>
                <option value="30d">{t('analytics.timeRange.last30Days')}</option>
                <option value="90d">{t('analytics.timeRange.last90Days')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Account Stats */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.accountPerformance')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Eye className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{t('analytics.metrics.totalReach')}</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(analyticsData.accountStats.reach)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {currentUserProfile?.influencerData ? t('analytics.metrics.offerAcceptanceRate') : t('analytics.metrics.totalCampaigns')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {currentUserProfile?.influencerData 
                      ? `${analyticsData.accountStats.offerAcceptanceRate}%`
                      : analyticsData.accountStats.totalCampaigns
                    }
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <MessageCircle className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{t('analytics.metrics.totalOffers')}</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData.accountStats.totalOffers}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{t('analytics.metrics.revenue')}</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(analyticsData.accountStats.revenue)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.performanceMetrics')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  <span className="ml-2 text-sm font-medium text-gray-600">{t('analytics.metrics.engagement')}</span>
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(analyticsData.accountStats.engagement)}</p>
              <p className="text-sm text-green-600">+12% с прошлого периода</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="ml-2 text-sm font-medium text-gray-600">{t('analytics.metrics.completionRate')}</span>
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.accountStats.completionRate}%</p>
              <p className="text-sm text-green-600">+8% с прошлого периода</p>
            </div>
            
            {currentUserProfile?.influencerData && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="ml-2 text-sm font-medium text-gray-600">{t('analytics.metrics.offerAcceptanceRate')}</span>
                  </div>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.accountStats.offerAcceptanceRate}%</p>
                <p className="text-sm text-green-600">+5% с прошлого периода</p>
              </div>
            )}
          </div>
        </div>

        {/* Campaign Analytics (for Advertisers) */}
        {currentUserProfile?.advertiserData && userPermissions.canViewDetailedMetrics && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.campaignPerformance')}</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Кампания
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Просмотры
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Клики
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Конверсии
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ROI
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analyticsData.campaignAnalytics.slice(0, 5).map((campaign) => (
                      <tr key={campaign.campaignId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {campaign.campaignId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(campaign.views)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(campaign.clicks)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {campaign.conversions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`font-medium ${campaign.roi >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                            {campaign.roi}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Offer Analytics (for Influencers) */}
        {currentUserProfile?.influencerData && userPermissions.canViewDetailedMetrics && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.offerPerformance')}</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID предложения
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Статус
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Стоимость
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Время ответа
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Просмотры
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analyticsData.offerAnalytics.slice(0, 5).map((offer) => (
                      <tr key={offer.offerId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {offer.offerId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            offer.status === 'declined' ? 'bg-red-100 text-red-800' :
                            offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {offer.status === 'accepted' ? t('offers.status.accepted') :
                             offer.status === 'declined' ? t('offers.status.declined') :
                             offer.status === 'pending' ? t('offers.status.pending') : offer.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(offer.value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {offer.responseTime}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {offer.views}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Data Quality Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <BarChart3 className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Интеграция аналитики</h3>
              <p className="text-sm text-blue-700 mt-1">
                Данные собираются из Google Analytics и Mixpanel. 
                {!connectionStatus.ga && !connectionStatus.mixpanel && ' В настоящее время показываются кэшированные данные из-за недоступности сервиса.'}
                {connectionStatus.hasQueuedEvents && ` ${t('analytics.connection.eventsQueued')}`}
              </p>
              <div className="mt-2 flex items-center space-x-4 text-xs text-blue-600">
                <div className="flex items-center space-x-1">
                  {connectionStatus.ga ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>Google Analytics</span>
                </div>
                <div className="flex items-center space-x-1">
                  {connectionStatus.mixpanel ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>Mixpanel</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FeatureGate>
  );
}