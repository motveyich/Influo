import { supabase } from './supabase';
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
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    this.currentState = { user: session?.user || null, loading: false };
    this.notifyListeners();

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      this.currentState = { user: session?.user || null, loading: false };
      this.notifyListeners();
    });
  }

  subscribe(callback: (state: AuthState) => void) {
    this.listeners.push(callback);
    // Immediately call with current state
    callback(this.currentState);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentState));
  }

  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Check if user is blocked after successful authentication
    if (data.user && !error) {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_deleted, deleted_at')
          .eq('user_id', data.user.id)
          .single();
        
        if (profile?.is_deleted) {
          // Sign out the user immediately
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
        console.error('Failed to check user status:', profileError);
      }
    }
    
    return { data, error };
  }

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      
      // If session doesn't exist, treat as successful logout
      if (error && (error as any).status === 403 && 
          error.message?.includes('session_id claim') && 
          error.message?.includes('not exist')) {
        return { error: null };
      }
      
      return { error };
    } catch (error: any) {
      // Handle exceptions thrown by Supabase client
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