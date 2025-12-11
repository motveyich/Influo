import { supabase } from './supabase';
import { isSupabaseConfigured } from './supabase';
import { User } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  loading: boolean;
}

class AuthService {
  private listeners: ((state: AuthState) => void)[] = [];
  private currentState: AuthState = { user: null, loading: true };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session && isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.log('Cleared stale session data');
      }
    }

    this.currentState = { user: session?.user || null, loading: false };
    this.notifyListeners();

    supabase.auth.onAuthStateChange((event, session) => {
      this.currentState = { user: session?.user || null, loading: false };
      this.notifyListeners();
    });
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

  async signUp(email: string, password: string) {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          message: 'Supabase is not configured. Please click "Connect to Supabase" in the top right corner to set up your database connection.',
          name: 'ConfigurationError'
        }
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  }

  async signIn(email: string, password: string) {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: {
          message: 'Supabase is not configured. Please click "Connect to Supabase" in the top right corner to set up your database connection.',
          name: 'ConfigurationError'
        }
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (data.user) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('is_deleted, deleted_at')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Failed to check user profile:', profileError);
          return { data, error };
        }

        if (profile && profile.is_deleted === true) {
          await supabase.auth.signOut();
          return {
            data: null,
            error: {
              message: 'Ваш аккаунт заблокирован администратором. Обратитесь в поддержку для получения дополнительной информации.',
              name: 'AccountBlockedError'
            }
          };
        }
      } catch (profileError) {
        console.error('Exception while checking user status:', profileError);
      }
    }

    return { data, error };
  }

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error && (error as any).status === 403 &&
          error.message?.includes('session_id claim') &&
          error.message?.includes('not exist')) {
        return { error: null };
      }

      return { error };
    } catch (error: any) {
      if ((error.status === 403 || error.code === 'session_not_found') &&
          error.message?.includes('session_id claim') &&
          error.message?.includes('not exist')) {
        return { error: null };
      }
      return { error };
    }
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
}

export const authService = new AuthService();
