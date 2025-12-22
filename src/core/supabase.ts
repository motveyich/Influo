import { createClient } from '@supabase/supabase-js';

// Get environment variables with validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl && 
         supabaseAnonKey &&
         supabaseUrl.startsWith('https://') &&
         (supabaseUrl.includes('.supabase.co') || supabaseUrl.includes('.supabase.com')) &&
         supabaseAnonKey.startsWith('eyJ') &&
         supabaseAnonKey.length > 100; // Supabase anon keys are JWT tokens starting with 'eyJ' and longer than 100 chars
};

// Use actual values or throw error if not configured
if (!isSupabaseConfigured()) {
  console.error('❌ Supabase is not configured properly!');
  console.error('Please set up your Supabase environment variables:');
  console.error('1. Copy .env.example to .env');
  console.error('2. Update VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY with your actual values');
  console.error('3. Restart the development server');
  
  // Show user-friendly error in the browser
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      alert('Supabase не настроен! Пожалуйста, настройте переменные окружения и перезапустите сервер.');
    }, 1000);
  }
}

// Use actual values or fallback to prevent errors
const safeSupabaseUrl = supabaseUrl || 'https://placeholder.supabase.co';
const safeSupabaseAnonKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const supabase = createClient(safeSupabaseUrl, safeSupabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: {
      getItem: (key: string) => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(key);
      },
      setItem: (key: string, value: string) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(key, value);
      },
      removeItem: (key: string) => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(key);
      },
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const setSupabaseSession = async (session: {
  access_token: string;
  refresh_token: string;
}) => {
  try {
    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (error) {
      console.error('Failed to set Supabase session:', error);
      return false;
    }

    console.log('✅ Supabase session set successfully');
    return true;
  } catch (error) {
    console.error('Error setting Supabase session:', error);
    return false;
  }
};

export const clearSupabaseSession = async () => {
  try {
    await supabase.auth.signOut();
    console.log('✅ Supabase session cleared');
  } catch (error) {
    console.error('Error clearing Supabase session:', error);
  }
};

// Add a helper function to check connection status
export const checkSupabaseConnection = async () => {
  if (!isSupabaseConfigured()) {
    return { connected: false, error: 'Supabase not configured' };
  }
  
  try {
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
    return { connected: !error, error: error?.message };
  } catch (err) {
    return { connected: false, error: (err as Error).message };
  }
};
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
  OFFERS: 'offers', // Унифицированная таблица предложений
  COLLABORATION_OFFERS: 'collaboration_offers', // Deprecated - используйте OFFERS
  USER_SETTINGS: 'user_settings',
  AUTO_CAMPAIGNS: 'auto_campaigns',
} as const;