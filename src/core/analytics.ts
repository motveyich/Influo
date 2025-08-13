// Analytics integration with fallback to local storage
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export interface AccountStats {
  reach: number;
  offerAcceptanceRate: number;
  engagement: number;
  totalCampaigns: number;
  totalOffers: number;
  averageResponseTime: number;
  completionRate: number;
  revenue: number;
}

export interface CampaignAnalytics {
  campaignId: string;
  views: number;
  clicks: number;
  conversions: number;
  impressions: number;
  engagement: number;
  reach: number;
  cost: number;
  roi: number;
}

export interface OfferAnalytics {
  offerId: string;
  views: number;
  responseTime: number;
  status: string;
  value: number;
  negotiationRounds: number;
}

export interface AnalyticsData {
  accountStats: AccountStats;
  campaignAnalytics: CampaignAnalytics[];
  offerAnalytics: OfferAnalytics[];
  timeRange: string;
  lastUpdated: string;
}

export class AnalyticsService {
  private isGALoaded = false;
  private isMixpanelLoaded = false;
  private eventQueue: Array<{ event: string; data: any }> = [];
  private localStorageKey = 'influo_analytics_queue';
  private cacheKey = 'influo_analytics_cache';
  private retryAttempts = 3;
  private retryDelay = 1000;
  private rateLimitQueue: Array<{ event: string; data: any; timestamp: number }> = [];

  constructor() {
    this.initializeGA();
    this.initializeMixpanel();
    this.loadQueuedEvents();
    this.startRetryProcessor();
  }

  private initializeGA() {
    try {
      const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
      if (!measurementId) {
        console.warn('Google Analytics measurement ID not found');
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.async = true;
      document.head.appendChild(script);

      script.onload = () => {
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function() {
          window.dataLayer!.push(arguments);
        };
        
        window.gtag('js', new Date());
        window.gtag('config', measurementId, {
          anonymize_ip: true,
          allow_google_signals: false,
          allow_ad_personalization_signals: false
        });
        
        this.isGALoaded = true;
        this.flushEventQueue();
      };

      script.onerror = () => {
        console.warn('Failed to load Google Analytics. Events will be stored locally.');
        this.isGALoaded = false;
      };
    } catch (error) {
      console.warn('Analytics initialization failed:', error);
      this.isGALoaded = false;
    }
  }

  private initializeMixpanel() {
    try {
      const mixpanelToken = import.meta.env.VITE_MIXPANEL_TOKEN;
      if (!mixpanelToken) {
        console.warn('Mixpanel token not found');
        return;
      }

      // Load Mixpanel
      const script = document.createElement('script');
      script.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
      script.async = true;
      document.head.appendChild(script);

      script.onload = () => {
        if ((window as any).mixpanel) {
          (window as any).mixpanel.init(mixpanelToken, {
            debug: import.meta.env.DEV,
            track_pageview: true,
            persistence: 'localStorage'
          });
          this.isMixpanelLoaded = true;
          this.flushEventQueue();
        }
      };

      script.onerror = () => {
        console.warn('Failed to load Mixpanel. Events will be stored locally.');
        this.isMixpanelLoaded = false;
      };
    } catch (error) {
      console.warn('Mixpanel initialization failed:', error);
      this.isMixpanelLoaded = false;
    }
  }

  private startRetryProcessor() {
    setInterval(() => {
      this.processRateLimitQueue();
    }, 60000); // Process queue every minute
  }

  private processRateLimitQueue() {
    const now = Date.now();
    const itemsToRetry = this.rateLimitQueue.filter(item => 
      now - item.timestamp > 60000 // Retry after 1 minute
    );

    itemsToRetry.forEach(item => {
      this.track(item.event, item.data);
    });

    this.rateLimitQueue = this.rateLimitQueue.filter(item => 
      now - item.timestamp <= 60000
    );
  }

  private loadQueuedEvents() {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (stored) {
        this.eventQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load queued analytics events:', error);
    }
  }

  private saveQueuedEvents() {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(this.eventQueue));
    } catch (error) {
      console.warn('Failed to save analytics events to local storage:', error);
    }
  }

  private saveCachedData(data: any) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        version: '1.0'
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache analytics data:', error);
    }
  }

  private getCachedData(): any | null {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const isExpired = Date.now() - cacheData.timestamp > 3600000; // 1 hour
      
      if (isExpired) {
        localStorage.removeItem(this.cacheKey);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.warn('Failed to load cached analytics data:', error);
      return null;
    }
  }

  private flushEventQueue() {
    if ((this.isGALoaded || this.isMixpanelLoaded) && this.eventQueue.length > 0) {
      this.eventQueue.forEach(({ event, data }) => {
        this.sendToAnalytics(event, data);
      });
      this.eventQueue = [];
      this.saveQueuedEvents();
    }
  }

  private sendToAnalytics(event: string, data: any) {
    if (window.gtag) {
      window.gtag('event', event, data);
    }
    
    if ((window as any).mixpanel) {
      (window as any).mixpanel.track(event, data);
    }
  }

  public track(event: string, data: any = {}) {
    const eventData = {
      ...data,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      platform: 'web',
      version: '1.0'
    };

    if (this.isGALoaded || this.isMixpanelLoaded) {
      try {
        this.sendToAnalytics(event, eventData);
      } catch (error) {
        console.warn('Analytics tracking failed, queuing event:', error);
        this.queueEvent(event, eventData);
      }
    } else {
      this.queueEvent(event, eventData);
    }

    // Always log locally for debugging
    console.log('Analytics Event:', event, eventData);
  }

  private queueEvent(event: string, data: any) {
    this.eventQueue.push({ event, data });
    this.saveQueuedEvents();
    
    // Try to flush after a delay
    setTimeout(() => {
      if (this.isGALoaded || this.isMixpanelLoaded) {
        this.flushEventQueue();
      }
    }, 2000);
  }

  public async getAnalyticsData(userId: string, timeRange: string = '30d'): Promise<AnalyticsData> {
    try {
      // Try to get fresh data from analytics service
      const data = await this.fetchAnalyticsData(userId, timeRange);
      this.saveCachedData(data);
      return data;
    } catch (error) {
      console.warn('Failed to fetch analytics data, using cached data:', error);
      
      // Fallback to cached data
      const cachedData = this.getCachedData();
      if (cachedData) {
        return cachedData;
      }
      
      // Fallback to mock data if no cache available
      return this.getMockAnalyticsData(userId, timeRange);
    }
  }

  private async fetchAnalyticsData(userId: string, timeRange: string): Promise<AnalyticsData> {
    // In a real implementation, this would call Google Analytics or Mixpanel API
    // For now, we'll simulate the API call and return mock data
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate potential API failures
    if (Math.random() < 0.1) {
      throw new Error('Analytics API temporarily unavailable');
    }
    
    return this.getMockAnalyticsData(userId, timeRange);
  }

  private getMockAnalyticsData(userId: string, timeRange: string): AnalyticsData {
    const now = new Date();
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    
    return {
      accountStats: {
        reach: Math.floor(Math.random() * 100000) + 50000,
        offerAcceptanceRate: Math.floor(Math.random() * 40) + 60,
        engagement: Math.floor(Math.random() * 10000) + 5000,
        totalCampaigns: Math.floor(Math.random() * 20) + 5,
        totalOffers: Math.floor(Math.random() * 50) + 10,
        averageResponseTime: Math.floor(Math.random() * 24) + 1,
        completionRate: Math.floor(Math.random() * 20) + 80,
        revenue: Math.floor(Math.random() * 50000) + 10000
      },
      campaignAnalytics: Array.from({ length: 5 }, (_, i) => ({
        campaignId: `campaign_${i + 1}`,
        views: Math.floor(Math.random() * 10000) + 1000,
        clicks: Math.floor(Math.random() * 1000) + 100,
        conversions: Math.floor(Math.random() * 100) + 10,
        impressions: Math.floor(Math.random() * 50000) + 5000,
        engagement: Math.floor(Math.random() * 5000) + 500,
        reach: Math.floor(Math.random() * 20000) + 2000,
        cost: Math.floor(Math.random() * 5000) + 1000,
        roi: Math.floor(Math.random() * 300) + 100
      })),
      offerAnalytics: Array.from({ length: 10 }, (_, i) => ({
        offerId: `offer_${i + 1}`,
        views: Math.floor(Math.random() * 100) + 10,
        responseTime: Math.floor(Math.random() * 48) + 1,
        status: ['pending', 'accepted', 'declined', 'counter'][Math.floor(Math.random() * 4)],
        value: Math.floor(Math.random() * 5000) + 500,
        negotiationRounds: Math.floor(Math.random() * 3) + 1
      })),
      timeRange,
      lastUpdated: now.toISOString()
    };
  }

  public async getUserPermissions(userId: string): Promise<{ canViewAnalytics: boolean; canViewDetailedMetrics: boolean }> {
    try {
      // In a real implementation, this would check user permissions from the database
      // For now, we'll assume all authenticated users can view analytics
      return {
        canViewAnalytics: true,
        canViewDetailedMetrics: true
      };
    } catch (error) {
      console.error('Failed to check user permissions:', error);
      return {
        canViewAnalytics: false,
        canViewDetailedMetrics: false
      };
    }
  }

  public trackDashboardView(userId: string, section: string) {
    this.track('analytics_dashboard_viewed', {
      user_id: userId,
      section: section,
      timestamp: new Date().toISOString()
    });
  }

  public trackDashboardInteraction(userId: string, action: string, element: string) {
    this.track('analytics_dashboard_interaction', {
      user_id: userId,
      action: action,
      element: element,
      timestamp: new Date().toISOString()
    });
  }

  public trackCampaignCreated(campaignId: string, advertiserId: string) {
    this.track('campaign_created', {
      campaign_id: campaignId,
      advertiser_id: advertiserId,
    });
  }

  public trackOfferSent(offerId: string, influencerId: string, campaignId: string) {
    this.track('offer_sent', {
      offer_id: offerId,
      influencer_id: influencerId,
      campaign_id: campaignId,
    });
  }

  public trackOfferReceived(offerId: string, influencerId: string, campaignId: string) {
    this.track('offer_received', {
      offer_id: offerId,
      influencer_id: influencerId,
      campaign_id: campaignId,
    });
  }

  public trackOfferResponse(offerId: string, response: string, userId: string) {
    this.track('offer_response', {
      offer_id: offerId,
      response: response,
      user_id: userId,
    });
  }

  public trackChatMessage(senderId: string, receiverId: string) {
    this.track('chat_message', {
      sender_id: senderId,
      receiver_id: receiverId,
    });
  }

  public trackProfileView(profileId: string, viewerId: string) {
    this.track('profile_view', {
      profile_id: profileId,
      viewer_id: viewerId,
    });
  }

  public trackSearch(query: string, filters: any) {
    this.track('search_performed', {
      query,
      filters,
    });
  }

  public trackEngagement(userId: string, feature: string, duration: number) {
    this.track('user_engagement', {
      user_id: userId,
      feature: feature,
      duration: duration,
      timestamp: new Date().toISOString()
    });
  }

  public async retryFailedEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    let attempt = 0;
    while (attempt < this.retryAttempts && this.eventQueue.length > 0) {
      try {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
        this.flushEventQueue();
        break;
      } catch (error) {
        attempt++;
        console.warn(`Retry attempt ${attempt} failed:`, error);
      }
    }
  }

  public getConnectionStatus(): { ga: boolean; mixpanel: boolean; hasQueuedEvents: boolean } {
    return {
      ga: this.isGALoaded,
      mixpanel: this.isMixpanelLoaded,
      hasQueuedEvents: this.eventQueue.length > 0
    };
  }
}

export const analytics = new AnalyticsService();