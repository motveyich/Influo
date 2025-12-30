/**
 * ⚠️ ВАЖНО: Frontend НЕ использует Supabase напрямую!
 *
 * Архитектура:
 * - Frontend → Backend API → Supabase
 * - Все запросы данных идут через backend
 * - Используйте apiClient из './api.ts'
 *
 * Этот файл оставлен для обратной совместимости с legacy кодом.
 * Все функции помечены как deprecated и будут удалены.
 */

// Database tables (только для reference, не используйте напрямую)
export const TABLES = {
  USER_PROFILES: 'user_profiles',
  INFLUENCER_CARDS: 'influencer_cards',
  CAMPAIGNS: 'campaigns',
  COLLABORATION_FORMS: 'collaboration_forms',
  CHAT_MESSAGES: 'chat_messages',
  ANALYTICS_EVENTS: 'analytics_events',
  APPLICATIONS: 'applications',
  FAVORITES: 'favorites',
  CARD_ANALYTICS: 'card_analytics',
  APPLICATION_ANALYTICS: 'application_analytics',
  USER_ROLES: 'user_roles',
  CONTENT_REPORTS: 'content_reports',
  MODERATION_QUEUE: 'moderation_queue',
  ADMIN_LOGS: 'admin_logs',
  CONTENT_FILTERS: 'content_filters',
  PLATFORM_UPDATES: 'platform_updates',
  PLATFORM_EVENTS: 'platform_events',
  AI_CHAT_THREADS: 'ai_chat_threads',
  AI_CHAT_MESSAGES: 'ai_chat_messages',
  DEALS: 'deals',
  REVIEWS: 'reviews',
  PAYMENT_CONFIRMATIONS: 'payment_confirmations',
  PAYMENT_WINDOWS: 'payment_windows',
  PAYMENT_REQUESTS: 'payment_requests',
  COLLABORATION_REVIEWS: 'collaboration_reviews',
  OFFER_STATUS_HISTORY: 'offer_status_history',
  PAYMENT_STATUS_HISTORY: 'payment_status_history',
  OFFERS: 'offers',
  COLLABORATION_OFFERS: 'collaboration_offers',
  USER_SETTINGS: 'user_settings',
  AUTO_CAMPAIGNS: 'auto_campaigns',
} as const;

/**
 * @deprecated НЕ используйте! Frontend не имеет прямого доступа к Supabase.
 */
export const supabase = null;

/**
 * @deprecated НЕ используйте! Frontend не имеет прямого доступа к Supabase.
 */
export const isSupabaseConfigured = () => false;

/**
 * @deprecated НЕ используйте! Frontend не имеет прямого доступа к Supabase.
 */
export const checkSupabaseConnection = async () => {
  throw new Error('Frontend не имеет прямого доступа к Supabase. Используйте backend API.');
};
