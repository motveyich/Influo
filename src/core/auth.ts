import { apiClient } from './api';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  userType?: string;
  role?: string;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

class AuthService {
  private listeners: ((state: AuthState) => void)[] = [];
  private currentState: AuthState = { user: null, loading: true };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (apiClient.isAuthenticated()) {
      try {
        const { data, error } = await apiClient.get<User>('/auth/me');
        if (data && !error) {
          this.currentState = { user: data, loading: false };
        } else {
          apiClient.clearTokens();
          this.currentState = { user: null, loading: false };
        }
      } catch {
        apiClient.clearTokens();
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

  async signUp(email: string, password: string, fullName?: string, userType: string = 'influencer') {
    const { data, error } = await apiClient.post<AuthResponse>('/auth/signup', {
      email,
      password,
      fullName: fullName || '',
      userType,
    });

    if (error) {
      return { data: null, error: { message: error.message, name: 'SignupError' } };
    }

    if (data) {
      apiClient.setTokens(data.accessToken, data.refreshToken);
      this.currentState = { user: data.user, loading: false };
      this.notifyListeners();
      return { data: { user: data.user }, error: null };
    }

    return { data: null, error: { message: 'Unknown error', name: 'SignupError' } };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });

    if (error) {
      let errorName = 'AuthError';
      if (error.status === 401) {
        errorName = 'InvalidCredentialsError';
      } else if (error.message.includes('blocked') || error.message.includes('заблокирован')) {
        errorName = 'AccountBlockedError';
      }
      return { data: null, error: { message: error.message, name: errorName } };
    }

    if (data) {
      apiClient.setTokens(data.accessToken, data.refreshToken);
      this.currentState = { user: data.user, loading: false };
      this.notifyListeners();
      return { data: { user: data.user }, error: null };
    }

    return { data: null, error: { message: 'Unknown error', name: 'AuthError' } };
  }

  async signOut() {
    try {
      await apiClient.post('/auth/logout');
    } catch {
    }

    apiClient.clearTokens();
    this.currentState = { user: null, loading: false };
    this.notifyListeners();
    return { error: null };
  }

  getCurrentUser(): User | null {
    return this.currentState.user;
  }

  isAuthenticated(): boolean {
    return !!this.currentState.user;
  }

  isLoading(): boolean {
    return this.currentState.loading;
  }

  async refreshUserData() {
    if (!apiClient.isAuthenticated()) return;

    const { data, error } = await apiClient.get<User>('/auth/me');
    if (data && !error) {
      this.currentState = { user: data, loading: false };
      this.notifyListeners();
    }
  }
}

export const authService = new AuthService();
