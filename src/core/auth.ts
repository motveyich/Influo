import { apiClient } from './api';

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

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  private listeners: ((state: AuthState) => void)[] = [];
  private currentState: AuthState = { user: null, loading: true };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    const token = apiClient.getAccessToken();

    if (token) {
      try {
        const user = await apiClient.get<User>('/auth/me');
        this.currentState = { user, loading: false };
      } catch (error) {
        console.error('Failed to get current user:', error);
        apiClient.setAccessToken(null);
        this.currentState = { user: null, loading: false };
      }
    } else {
      this.currentState = { user: null, loading: false };
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

  async signUp(email: string, password: string, userType: string = 'influencer', fullName?: string) {
=======
  async signUp(email: string, password: string) {

    try {
      // Use email username as fullName if not provided
      const defaultFullName = fullName || email.split('@')[0];

      const response = await apiClient.post<AuthResponse>('/auth/signup', {
        email,
        password,
        userType,
        fullName: defaultFullName,
      });

      apiClient.setAccessToken(response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);

      this.currentState = { user: response.user, loading: false };
      this.notifyListeners();

      return { data: response, error: null };
    } catch (error: any) {
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
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        email,
        password,
      });

      if (response.user.isDeleted) {
        return {
          data: null,
          error: {
            message: 'Ваш аккаунт заблокирован администратором. Обратитесь в поддержку для получения дополнительной информации.',
            name: 'AccountBlockedError'
          }
        };
      }

      apiClient.setAccessToken(response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);

      this.currentState = { user: response.user, loading: false };
      this.notifyListeners();

      return { data: response, error: null };
    } catch (error: any) {
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
        const user = await apiClient.get<User>('/auth/me');
        this.currentState = { user, loading: false };
        this.notifyListeners();
      } catch (error) {
        console.error('Failed to refresh user:', error);
      }
    }
  }
}

export const authService = new AuthService();
