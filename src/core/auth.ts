import { apiClient } from './api';
import { setSupabaseSession, clearSupabaseSession } from './supabase';

export interface User {
  id: string;
  email: string;
  userType?: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export interface AuthData {
  user: User;
  accessToken: string;
  refreshToken: string;
  supabaseSession?: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    expires_in?: number;
  };
}

export interface AuthResponse {
  success: boolean;
  data: AuthData;
  timestamp: string;
}

class AuthService {
  private listeners: ((state: AuthState) => void)[] = [];
  private currentState: AuthState = { user: null, loading: true };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    const token = apiClient.getAccessToken();
    const refreshToken = localStorage.getItem('refreshToken');

    console.log('🔐 Auth initialize:', { hasToken: !!token, hasRefresh: !!refreshToken });

    if (!token) {
      this.currentState = { user: null, loading: false };
      this.notifyListeners();
      return;
    }

    try {
      const meResponse = await apiClient.get<{ success: boolean; data: User }>('/auth/me');
      const user = meResponse.data || meResponse as unknown as User;
      this.currentState = { user, loading: false };
      console.log('✅ User authenticated:', user.email);
    } catch (error) {
      console.error('❌ Failed to get current user:', error);

      // Try to refresh token if available
      if (refreshToken) {
        try {
          console.log('🔄 Attempting token refresh...');
          const response = await apiClient.post<AuthResponse>('/auth/refresh', {
            refreshToken
          });

          const authData = response.data;

          if (authData?.accessToken) {
            apiClient.setAccessToken(authData.accessToken);
            localStorage.setItem('refreshToken', authData.refreshToken);

            // Set Supabase session if available
            if (authData.supabaseSession) {
              await setSupabaseSession(authData.supabaseSession);
            }

            const meResponse = await apiClient.get<{ success: boolean; data: User }>('/auth/me');
            const user = meResponse.data || meResponse as unknown as User;
            this.currentState = { user, loading: false };
            console.log('✅ Token refreshed successfully');
          } else {
            throw new Error('Invalid refresh response');
          }
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          apiClient.setAccessToken(null);
          localStorage.removeItem('refreshToken');
          this.currentState = { user: null, loading: false };
        }
      } else {
        apiClient.setAccessToken(null);
        this.currentState = { user: null, loading: false };
      }
    }

    this.notifyListeners();
  }

  subscribe(callback: (state: AuthState) => void) {
    this.listeners.push(callback);
    callback(this.currentState);

    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentState));
  }

  async signUp(email: string, password: string, userType: string = 'influencer') {
    try {
      console.log('📝 Attempting sign up for:', email);
      const response = await apiClient.post<AuthResponse>('/auth/signup', {
        email,
        password,
        userType,
      });

      const authData = response.data;

      console.log('📦 Signup response received:', {
        hasUser: !!authData?.user,
        hasAccessToken: !!authData?.accessToken,
        hasRefreshToken: !!authData?.refreshToken,
        hasSupabaseSession: !!authData?.supabaseSession,
      });

      if (!authData?.accessToken || !authData?.refreshToken) {
        console.error('❌ Invalid response format:', response);
        throw new Error('Invalid auth response: missing tokens');
      }

      // Set backend tokens
      apiClient.setAccessToken(authData.accessToken);
      localStorage.setItem('refreshToken', authData.refreshToken);

      // Set Supabase session
      if (authData.supabaseSession) {
        await setSupabaseSession(authData.supabaseSession);
      }

      this.currentState = { user: authData.user, loading: false };
      this.notifyListeners();

      console.log('✅ Sign up successful');
      return { data: authData, error: null };
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      return {
        data: null,
        error: {
          message: error.message || 'Failed to sign up',
          name: 'SignUpError'
        }
      };
    }
  }

  async signIn(email: string, password: string) {
    try {
      console.log('🔐 Attempting sign in for:', email);
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        email,
        password,
      });

      const authData = response.data;

      console.log('📦 Login response received (raw):', response);
      console.log('📦 Login response details:', {
        hasUser: !!authData?.user,
        hasAccessToken: !!authData?.accessToken,
        hasRefreshToken: !!authData?.refreshToken,
        hasSupabaseSession: !!authData?.supabaseSession,
        userId: authData?.user?.id,
      });

      if (!authData?.accessToken || !authData?.refreshToken) {
        console.error('❌ Invalid response format:', response);
        throw new Error('Invalid auth response: missing tokens');
      }

      // Set backend tokens
      apiClient.setAccessToken(authData.accessToken);
      localStorage.setItem('refreshToken', authData.refreshToken);

      // Set Supabase session
      if (authData.supabaseSession) {
        await setSupabaseSession(authData.supabaseSession);
      }

      this.currentState = { user: authData.user, loading: false };
      this.notifyListeners();

      console.log('✅ Sign in successful');
      return { data: authData, error: null };
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      return {
        data: null,
        error: {
          message: error.message || 'Failed to sign in',
          name: 'SignInError'
        }
      };
    }
  }

  async signOut() {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      apiClient.setAccessToken(null);
      localStorage.removeItem('refreshToken');
      await clearSupabaseSession();
      this.currentState = { user: null, loading: false };
      this.notifyListeners();
    }

    return { error: null };
  }

  getCurrentUser() {
    return this.currentState.user;
  }

  isAuthenticated() {
    return !!this.currentState.user;
  }

  isLoading() {
    return this.currentState.loading;
  }

  async refreshUser() {
    const token = apiClient.getAccessToken();

    if (token) {
      try {
        const meResponse = await apiClient.get<{ success: boolean; data: User }>('/auth/me');
        const user = meResponse.data || meResponse as unknown as User;
        this.currentState = { user, loading: false };
        this.notifyListeners();
      } catch (error) {
        console.error('Failed to refresh user:', error);
      }
    }
  }
}

export const authService = new AuthService();
