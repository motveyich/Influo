// Configuration and constants
export const APP_CONFIG = {
  name: 'Influo',
  version: '1.0.0',
  description: 'Connect influencers with advertisers',
  supportEmail: 'support@influo.com',
};

export const ROUTES = {
  HOME: '/',
  PROFILES: '/profiles',
  CAMPAIGNS: '/campaigns',
  CHAT: '/chat',
  OFFERS: '/offers',
  ANALYTICS: '/analytics',
  PROFILE: '/profile/:id',
  CAMPAIGN: '/campaign/:id',
} as const;

export const USER_TYPES = {
  INFLUENCER: 'influencer',
  ADVERTISER: 'advertiser',
} as const;

export const PLATFORMS = {
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
  YOUTUBE: 'youtube',
  TWITTER: 'twitter',
  MULTI: 'multi',
} as const;

export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const OFFER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  COUNTER: 'counter',
  COMPLETED: 'completed',
} as const;

// Real-time configuration
export const REALTIME_CONFIG = {
  CHAT_CHANNEL: 'chat',
  OFFERS_CHANNEL: 'offers',
  NOTIFICATIONS_CHANNEL: 'notifications',
  HEARTBEAT_INTERVAL: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Analytics events
export const ANALYTICS_EVENTS = {
  CAMPAIGN_CREATED: 'campaign_created',
  OFFER_SENT: 'offer_sent',
  OFFER_RECEIVED: 'offer_received',
  CHAT_MESSAGE: 'chat_message',
  PROFILE_VIEW: 'profile_view',
  SEARCH_PERFORMED: 'search_performed',
} as const;