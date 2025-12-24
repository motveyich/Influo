import { db } from '../api/database';

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

interface UserProfile {
  user_id: string;
  email: string;
  full_name: string;
  user_type: string;
  role: string;
  avatar: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
}

interface AuthUser {
  id: string;
  email: string;
}

class AuthService {
  private listeners: ((state: AuthState) => void)[] = [];
  private currentState: AuthState = { user: null, loading: true };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    const { data: { session } } = await db.auth.getSession();

    if (session?.user) {
      await this.loadUserProfile(session.user);
    } else {
      this.currentState = { user: null, loading: false };
    }

    this.notifyListeners();

    db.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await this.loadUserProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        this.currentState = { user: null, loading: false };
        this.notifyListeners();
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        await this.loadUserProfile(session.user);
      }
    });
  }

  private async loadUserProfile(authUser: AuthUser) {
    try {
      const { data: profile, error } = await db
        .from('user_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (profile && (profile.is_deleted || profile.deleted_at)) {
        await db.auth.signOut();
        this.currentState = { user: null, loading: false };
        this.notifyListeners();
        return;
      }

      if (profile) {
        this.currentState = {
          user: {
            id: profile.user_id,
            email: profile.email,
            fullName: profile.full_name,
            userType: profile.user_type,
            role: profile.role,
            avatar: profile.avatar || undefined,
          },
          loading: false,
        };
      } else {
        this.currentState = { user: null, loading: false };
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
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
    try {
      const { data: authData, error: authError } = await db.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
            fullName: fullName || '',
            user_type: userType,
            userType: userType,
          },
        },
      });

      if (authError) {
        return {
          data: null,
          error: {
            message: authError.message,
            name: 'SignupError'
          }
        };
      }

      if (authData.user) {
        await this.loadUserProfile(authData.user);
        return { data: { user: this.currentState.user }, error: null };
      }

      return { data: null, error: { message: 'Unknown error', name: 'SignupError' } };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: 'SignupError',
        },
      };
    }
  }

  async signIn(email: string, password: string) {
    try {
      const { data: authData, error: authError } = await db.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        let errorName = 'AuthError';
        if (authError.message.includes('Invalid login credentials')) {
          errorName = 'InvalidCredentialsError';
        }
        return {
          data: null,
          error: {
            message: authError.message,
            name: errorName
          }
        };
      }

      if (authData.user) {
        const { data: profile } = await db
          .from('user_profiles')
          .select('is_deleted, deleted_at')
          .eq('user_id', authData.user.id)
          .maybeSingle();

        if (profile && (profile.is_deleted || profile.deleted_at)) {
          await db.auth.signOut();
          return {
            data: null,
            error: {
              message: 'Ваш аккаунт заблокирован',
              name: 'AccountBlockedError',
            },
          };
        }

        await this.loadUserProfile(authData.user);
        return { data: { user: this.currentState.user }, error: null };
      }

      return { data: null, error: { message: 'Unknown error', name: 'AuthError' } };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: 'AuthError',
        },
      };
    }
  }

  async signOut() {
    try {
      const { error } = await db.auth.signOut();
      if (error) throw error;

      this.currentState = { user: null, loading: false };
      this.notifyListeners();
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: 'SignOutError',
        },
      };
    }
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
    const { data: { user } } = await db.auth.getUser();
    if (user) {
      await this.loadUserProfile(user);
    }
  }
}

export const authService = new AuthService();
