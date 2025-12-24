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

const DB_URL = import.meta.env.VITE_DATABASE_URL;
const DB_KEY = import.meta.env.VITE_DATABASE_KEY;

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

class DatabaseClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(url: string, key: string) {
    this.baseUrl = url;
    this.apiKey = key;
  }

  from(table: string): QueryBuilder {
    let method = 'GET';
    let selectColumns = '*';
    let insertData: any = null;
    let updateData: any = null;
    let filters: string[] = [];
    let orderBy: string[] = [];
    let limitCount: number | null = null;
    let rangeFrom: number | null = null;
    let rangeTo: number | null = null;
    let isDelete = false;

    const builder: QueryBuilder = {
      select: (columns = '*') => {
        method = 'GET';
        selectColumns = columns;
        return builder;
      },

      insert: (data) => {
        method = 'POST';
        insertData = data;
        return builder;
      },

      update: (data) => {
        method = 'PATCH';
        updateData = data;
        return builder;
      },

      delete: () => {
        method = 'DELETE';
        isDelete = true;
        return builder;
      },

      eq: (column, value) => {
        filters.push(`${column}=eq.${value}`);
        return builder;
      },

      neq: (column, value) => {
        filters.push(`${column}=neq.${value}`);
        return builder;
      },

      gt: (column, value) => {
        filters.push(`${column}=gt.${value}`);
        return builder;
      },

      gte: (column, value) => {
        filters.push(`${column}=gte.${value}`);
        return builder;
      },

      lt: (column, value) => {
        filters.push(`${column}=lt.${value}`);
        return builder;
      },

      lte: (column, value) => {
        filters.push(`${column}=lte.${value}`);
        return builder;
      },

      like: (column, pattern) => {
        filters.push(`${column}=like.${pattern}`);
        return builder;
      },

      ilike: (column, pattern) => {
        filters.push(`${column}=ilike.${pattern}`);
        return builder;
      },

      in: (column, values) => {
        filters.push(`${column}=in.(${values.join(',')})`);
        return builder;
      },

      contains: (column, value) => {
        filters.push(`${column}=cs.${JSON.stringify(value)}`);
        return builder;
      },

      containedBy: (column, value) => {
        filters.push(`${column}=cd.${JSON.stringify(value)}`);
        return builder;
      },

      order: (column, options = {}) => {
        const direction = options.ascending === false ? 'desc' : 'asc';
        orderBy.push(`${column}.${direction}`);
        return builder;
      },

      limit: (count) => {
        limitCount = count;
        return builder;
      },

      range: (from, to) => {
        rangeFrom = from;
        rangeTo = to;
        return builder;
      },

      single: async () => {
        const result = await builder.execute();
        if (result.data && Array.isArray(result.data) && result.data.length > 1) {
          return {
            data: null,
            error: { message: 'Multiple rows returned' }
          };
        }
        return {
          data: Array.isArray(result.data) ? result.data[0] : result.data,
          error: result.error
        };
      },

      maybeSingle: async () => {
        const result = await builder.execute();
        return {
          data: Array.isArray(result.data) && result.data.length > 0 ? result.data[0] : null,
          error: result.error
        };
      },

      execute: async () => {
        try {
          let url = `${this.baseUrl}/rest/v1/${table}`;
          const headers: Record<string, string> = {
            'apikey': this.apiKey,
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          };

          if (method === 'GET') {
            url += `?select=${selectColumns}`;
            if (filters.length > 0) {
              url += `&${filters.join('&')}`;
            }
            if (orderBy.length > 0) {
              url += `&order=${orderBy.join(',')}`;
            }
            if (limitCount !== null) {
              headers['Range'] = `0-${limitCount - 1}`;
            }
            if (rangeFrom !== null && rangeTo !== null) {
              headers['Range'] = `${rangeFrom}-${rangeTo}`;
            }
          } else if (filters.length > 0) {
            url += `?${filters.join('&')}`;
          }

          const options: RequestInit = {
            method,
            headers
          };

          if (method === 'POST' && insertData) {
            options.body = JSON.stringify(insertData);
          } else if (method === 'PATCH' && updateData) {
            options.body = JSON.stringify(updateData);
          }

          const response = await fetch(url, options);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
              data: null,
              error: {
                message: errorData.message || `Request failed with status ${response.status}`,
                details: errorData.details,
                hint: errorData.hint,
                code: errorData.code
              }
            };
          }

          if (method === 'DELETE' || response.status === 204) {
            return { data: null, error: null };
          }

          const data = await response.json();
          return { data, error: null };

        } catch (error) {
          return {
            data: null,
            error: {
              message: error instanceof Error ? error.message : 'Unknown error'
            }
          };
        }
      }
    };

    return builder;
  }

  auth = {
    getSession: async () => {
      try {
        const sessionStr = localStorage.getItem('auth_session');
        if (!sessionStr) {
          return { data: { session: null }, error: null };
        }
        const session = JSON.parse(sessionStr);
        return { data: { session }, error: null };
      } catch (error) {
        return {
          data: { session: null },
          error: { message: error instanceof Error ? error.message : 'Unknown error' }
        };
      }
    },

    getUser: async () => {
      try {
        const sessionStr = localStorage.getItem('auth_session');
        if (!sessionStr) {
          return { data: { user: null }, error: null };
        }
        const session = JSON.parse(sessionStr);
        return { data: { user: session.user }, error: null };
      } catch (error) {
        return {
          data: { user: null },
          error: { message: error instanceof Error ? error.message : 'Unknown error' }
        };
      }
    },

    signUp: async (credentials: { email: string; password: string; options?: any }) => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'apikey': this.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
            data: credentials.options?.data || {}
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            data: { user: null, session: null },
            error: { message: errorData.message || 'Signup failed' }
          };
        }

        const data = await response.json();

        if (data.access_token) {
          const session = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            user: data.user
          };
          localStorage.setItem('auth_session', JSON.stringify(session));
        }

        return {
          data: { user: data.user, session: data },
          error: null
        };
      } catch (error) {
        return {
          data: { user: null, session: null },
          error: { message: error instanceof Error ? error.message : 'Unknown error' }
        };
      }
    },

    signInWithPassword: async (credentials: { email: string; password: string }) => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'apikey': this.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            data: { user: null, session: null },
            error: { message: errorData.error_description || errorData.message || 'Login failed' }
          };
        }

        const data = await response.json();

        const session = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: data.user
        };
        localStorage.setItem('auth_session', JSON.stringify(session));

        return {
          data: { user: data.user, session: data },
          error: null
        };
      } catch (error) {
        return {
          data: { user: null, session: null },
          error: { message: error instanceof Error ? error.message : 'Unknown error' }
        };
      }
    },

    signOut: async () => {
      try {
        localStorage.removeItem('auth_session');
        return { error: null };
      } catch (error) {
        return {
          error: { message: error instanceof Error ? error.message : 'Unknown error' }
        };
      }
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      const checkAuth = async () => {
        const { data } = await this.auth.getSession();
        if (data.session) {
          callback('SIGNED_IN', data.session);
        }
      };

      checkAuth();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'auth_session') {
          if (e.newValue) {
            const session = JSON.parse(e.newValue);
            callback('SIGNED_IN', session);
          } else {
            callback('SIGNED_OUT', null);
          }
        }
      };

      window.addEventListener('storage', handleStorageChange);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              window.removeEventListener('storage', handleStorageChange);
            }
          }
        }
      };
    }
  };

  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, file: File | Blob) => {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch(`${this.baseUrl}/storage/v1/object/${bucket}/${path}`, {
            method: 'POST',
            headers: {
              'apikey': this.apiKey,
              'Authorization': `Bearer ${this.apiKey}`
            },
            body: formData
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
              data: null,
              error: { message: errorData.message || 'Upload failed' }
            };
          }

          const data = await response.json();
          return { data, error: null };
        } catch (error) {
          return {
            data: null,
            error: { message: error instanceof Error ? error.message : 'Unknown error' }
          };
        }
      },

      getPublicUrl: (path: string) => {
        return {
          data: {
            publicUrl: `${this.baseUrl}/storage/v1/object/public/${bucket}/${path}`
          }
        };
      },

      remove: async (paths: string[]) => {
        try {
          const response = await fetch(`${this.baseUrl}/storage/v1/object/${bucket}`, {
            method: 'DELETE',
            headers: {
              'apikey': this.apiKey,
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prefixes: paths })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
              data: null,
              error: { message: errorData.message || 'Delete failed' }
            };
          }

          const data = await response.json();
          return { data, error: null };
        } catch (error) {
          return {
            data: null,
            error: { message: error instanceof Error ? error.message : 'Unknown error' }
          };
        }
      }
    })
  };

  rpc = async (functionName: string, params: any = {}) => {
    try {
      const response = await fetch(`${this.baseUrl}/rest/v1/rpc/${functionName}`, {
        method: 'POST',
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          data: null,
          error: {
            message: errorData.message || `RPC call failed with status ${response.status}`,
            details: errorData.details,
            hint: errorData.hint,
            code: errorData.code
          }
        };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  };
}

export const db = new DatabaseClient(DB_URL, DB_KEY);

export const checkDatabaseConnection = async () => {
  try {
    const result = await db.from('user_profiles').select('user_id').limit(1).execute();
    return { connected: !result.error, error: result.error?.message };
  } catch (err) {
    return { connected: false, error: (err as Error).message };
  }
};
