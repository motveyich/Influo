import { useState, useEffect } from 'react';
import { analytics, AnalyticsData } from '../../../core/analytics';

export function useAnalytics(userId: string, timeRange: string = '30d') {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState({ canViewAnalytics: false, canViewDetailedMetrics: false });

  useEffect(() => {
    if (userId) {
      loadData();
      checkPermissions();
    }
  }, [userId, timeRange]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const analyticsData = await analytics.getAnalyticsData(userId, timeRange);
      setData(analyticsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics data');
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPermissions = async () => {
    try {
      const userPermissions = await analytics.getUserPermissions(userId);
      setPermissions(userPermissions);
    } catch (err) {
      console.error('Failed to check permissions:', err);
      setPermissions({ canViewAnalytics: false, canViewDetailedMetrics: false });
    }
  };

  const refresh = async () => {
    await loadData();
  };

  const trackInteraction = (action: string, element: string) => {
    analytics.trackDashboardInteraction(userId, action, element);
  };

  return {
    data,
    isLoading,
    error,
    permissions,
    refresh,
    trackInteraction
  };
}