import { supabase } from './supabase';

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
}

class AuthService {
  private listeners: ((state: AuthState) => void)[] = [];
  private currentState: AuthState = { user: null, loading: true };
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.initialized) return;
    this.initialized = true;

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      await this.loadUserProfile(session.user.id);
    } else {
      this.currentState = { user: null, loading: false };
      this.notifyListeners();
    }

    supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'SIGNED_IN' && session?.user) {
          await this.loadUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          this.currentState = { user: null, loading: false };
          this.notifyListeners();
        }
      })();
    });
  }

  private async loadUserProfile(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (profile?.is_deleted) {
        await supabase.auth.signOut();
        this.currentState = { user: null, loading: false };
        this.notifyListeners();
        return;
      }

      const user: User = {
        id: userId,
        email: profile?.email || '',
        userType: profile?.user_type,
        username: profile?.username,
        fullName: profile?.full_name,
        avatarUrl: profile?.avatar_url,
        isDeleted: profile?.is_deleted,
        deletedAt: profile?.deleted_at,
      };

      this.currentState = { user, loading: false };
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to load user profile:', error);
      this.currentState = { user: null, loading: false };
      this.notifyListeners();
    }
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Registration failed');

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: data.user.id,
          email: email,
          user_type: userType,
        });

      if (profileError) {
        console.error('Failed to create profile:', profileError);
      }

      await this.loadUserProfile(data.user.id);

      return { data: { user: this.currentState.user }, error: null };
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Login failed');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_deleted')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (profile?.is_deleted) {
        await supabase.auth.signOut();
        return {
          data: null,
          error: {
            message: 'Ваш аккаунт заблокирован администратором. Обратитесь в поддержку для получения дополнительной информации.',
            name: 'AccountBlockedError'
          }
        };
      }

      await supabase
        .from('user_profiles')
        .update({ last_active: new Date().toISOString() })
        .eq('user_id', data.user.id);

      await this.loadUserProfile(data.user.id);

      return { data: { user: this.currentState.user }, error: null };
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
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
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
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      await this.loadUserProfile(session.user.id);
    }
  }
}

export const authService = new AuthService();
