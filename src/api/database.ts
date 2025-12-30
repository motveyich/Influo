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
  ADVERTISER_CARDS: 'advertiser_cards',
  PLATFORMS: 'platforms',
  INTERESTS: 'interests',
  SUPPORT_TICKETS: 'support_tickets',
  SUPPORT_MESSAGES: 'support_messages',
} as const;

interface DatabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

interface QueryResult<T = any> {
  data: T | null;
  error: DatabaseError | null;
}

interface QueryBuilder {
  select: (columns?: string) => QueryBuilder;
  insert: (data: any) => QueryBuilder;
  update: (data: any) => QueryBuilder;
  delete: () => QueryBuilder;
  eq: (column: string, value: any) => QueryBuilder;
  neq: (column: string, value: any) => QueryBuilder;
  gt: (column: string, value: any) => QueryBuilder;
  gte: (column: string, value: any) => QueryBuilder;
  lt: (column: string, value: any) => QueryBuilder;
  lte: (column: string, value: any) => QueryBuilder;
  like: (column: string, pattern: string) => QueryBuilder;
  ilike: (column: string, pattern: string) => QueryBuilder;
  in: (column: string, values: any[]) => QueryBuilder;
  contains: (column: string, value: any) => QueryBuilder;
  containedBy: (column: string, value: any) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  single: () => Promise<QueryResult>;
  maybeSingle: () => Promise<QueryResult>;
  execute: () => Promise<QueryResult>;
}

class DatabaseStub {
  from(table: string): QueryBuilder {
    const builder: QueryBuilder = {
      select: () => builder,
      insert: () => builder,
      update: () => builder,
      delete: () => builder,
      eq: () => builder,
      neq: () => builder,
      gt: () => builder,
      gte: () => builder,
      lt: () => builder,
      lte: () => builder,
      like: () => builder,
      ilike: () => builder,
      in: () => builder,
      contains: () => builder,
      containedBy: () => builder,
      order: () => builder,
      limit: () => builder,
      range: () => builder,
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      execute: async () => ({ data: [], error: null })
    };
    return builder;
  }

  auth = {
    getSession: async () => ({
      data: { session: null },
      error: null
    }),

    getUser: async () => ({
      data: { user: null },
      error: null
    }),

    signUp: async (credentials: { email: string; password: string; options?: any }) => ({
      data: { user: null, session: null },
      error: { message: 'Database not connected' }
    }),

    signInWithPassword: async (credentials: { email: string; password: string }) => ({
      data: { user: null, session: null },
      error: { message: 'Database not connected' }
    }),

    signOut: async () => ({
      error: null
    }),

    onAuthStateChange: (callback: (event: string, session: any) => void) => ({
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    })
  };

  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, file: File | Blob) => ({
        data: null,
        error: { message: 'Database not connected' }
      }),

      getPublicUrl: (path: string) => ({
        data: { publicUrl: '' }
      }),

      remove: async (paths: string[]) => ({
        data: null,
        error: { message: 'Database not connected' }
      })
    })
  };

  rpc = async (functionName: string, params: any = {}) => ({
    data: null,
    error: { message: 'Database not connected' }
  });
}

export const db = new DatabaseStub();

export const checkDatabaseConnection = async () => ({
  connected: false,
  error: 'No database configured'
});
