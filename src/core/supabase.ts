import { createClient } from '@supabase/supabase-js';

// Get environment variables with validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl && 
         supabaseAnonKey &&
         supabaseUrl.startsWith('https://') &&
         supabaseUrl.includes('.supabase.co') &&
         supabaseAnonKey.startsWith('eyJ') &&
         supabaseAnonKey.length > 100; // Supabase anon keys are JWT tokens starting with 'eyJ' and longer than 100 chars
};

// Use safe defaults if not configured
const safeSupabaseUrl = isSupabaseConfigured() ? supabaseUrl! : 'https://placeholder.supabase.co';
const safeSupabaseAnonKey = isSupabaseConfigured() ? supabaseAnonKey! : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxMjM0NTYsImV4cCI6MTk2MDY5OTQ1Nn0.placeholder';

if (!isSupabaseConfigured()) {
  console.warn('Supabase is not configured. Please click "Connect to Supabase" in the top right corner or check your .env file.');
}

export const supabase = createClient(safeSupabaseUrl, safeSupabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database tables
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
  PLATFORM_NEWS: 'platform_news',
  PLATFORM_UPDATES: 'platform_updates',
  PLATFORM_EVENTS: 'platform_events',
  AI_CHAT_THREADS: 'ai_chat_threads',
  AI_CHAT_MESSAGES: 'ai_chat_messages',
  DEALS: 'deals',
  REVIEWS: 'reviews',
  PAYMENT_CONFIRMATIONS: 'payment_confirmations',
  PAYMENT_WINDOWS: 'payment_windows',
} as const;