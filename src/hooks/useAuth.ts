import { useState, useEffect } from 'react';
import { authService, AuthState } from '../core/auth';
import { UserRole } from '../core/types';
import { roleService } from '../services/roleService';
import { supabase, isSupabaseConfigured } from '../core/supabase';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({ user: null, loading: true });
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [roleLoading, setRoleLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockCheckLoading, setBlockCheckLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authState.user) {
      loadUserRole();
      checkUserStatus();
      subscribeToUserUpdates();
    } else {
      setUserRole('user');
      setRoleLoading(false);
      setIsBlocked(false);
      setBlockCheckLoading(false);
    }
  }, [authState.user]);

  const subscribeToUserUpdates = () => {
    if (!authState.user) return;

    console.log('🔧 [useAuth] Setting up real-time subscription for user:', authState.user.id);
    
    // Subscribe to real-time updates for user profile
    const channel = supabase
      .channel(`user_profile_${authState.user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_profiles',
        filter: `user_id=eq.${authState.user.id}`,
      }, (payload) => {
        console.log('🔄 [useAuth] Real-time profile update received:', payload);
        if (payload.new && payload.new.is_deleted === true) {
          console.log('🚨 [useAuth] User blocked via real-time update, forcing logout');
          setIsBlocked(true);
          // Force logout
          authService.signOut();
          alert('Ваш аккаунт был заблокирован администратором. Вы будете перенаправлены на страницу входа.');
        }
      })
      .subscribe();

    return () => {
      console.log('🔧 [useAuth] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  };
  
  const checkUserStatus = async () => {
    try {
      setBlockCheckLoading(true);
      if (!authState.user) return;
      
      // Check if Supabase is configured before making database calls
      if (!isSupabaseConfigured()) {
        console.warn('⚠️ [useAuth] Supabase not configured, skipping user status check');
        setIsBlocked(false);
        return;
      }
      
      console.log('🔧 [useAuth] Checking user status for:', authState.user.id);
      
      let profile, error;
      try {
        const result = await supabase
          .from('user_profiles')
          .select('is_deleted, deleted_at')
          .eq('user_id', authState.user.id)
          .maybeSingle();
        profile = result.data;
        error = result.error;
      } catch (fetchError) {
        // Handle network/connection errors gracefully
        if (fetchError instanceof TypeError && fetchError.message === 'Failed to fetch') {
          console.warn('⚠️ [useAuth] Supabase connection failed (network error). User is assumed not blocked.');
          setIsBlocked(false);
          setError(null);
          return;
        }
        console.warn('⚠️ [useAuth] Database fetch error:', fetchError);
        setIsBlocked(false);
        setError(null);
        return;
      }
      
      if (error) {
        console.error('❌ [useAuth] Failed to check user status:', error);
        // Don't set blocked state if we can't check
        setIsBlocked(false);
        setError(null);
        return;
      }
      
      if (!profile) {
        console.log('⚠️ [useAuth] No profile found for user, assuming not blocked');
        setIsBlocked(false);
        setError(null);
        return;
      }
      
      console.log('✅ [useAuth] User status check result:', { 
        userId: authState.user.id, 
        profile,
        isDeleted: profile?.is_deleted 
      });
      
      if (profile?.is_deleted === true) {
        console.log('🚨 [useAuth] User is blocked, setting blocked state and forcing logout');
        setIsBlocked(true);
        // Force logout for blocked users
        await authService.signOut();
        alert('Ваш аккаунт был заблокирован администратором.');
      } else {
        console.log('✅ [useAuth] User is not blocked');
        setIsBlocked(false);
        setError(null);
      }
    } catch (error) {
      console.warn('⚠️ [useAuth] Failed to check user status, assuming user is not blocked:', error);
      
      // Handle specific network errors more gracefully
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.warn('⚠️ [useAuth] Network error during user status check (Supabase connection issue). Assuming user is not blocked.');
      } else if (error && (error as any).message?.includes('Failed to fetch')) {
        console.warn('⚠️ [useAuth] Supabase fetch error, likely configuration issue. Assuming user is not blocked.');
      }
      
      // Always assume user is not blocked for any error to prevent false blocks
      setIsBlocked(false);
      setError(null);
    } finally {
      setBlockCheckLoading(false);
    }
  };

  const loadUserRole = async () => {
    try {
      setRoleLoading(true);
      const role = await roleService.getUserRole(authState.user!.id);
      setUserRole(role);
    } catch (error) {
      console.error('Failed to load user role:', error);
      setUserRole('user');
    } finally {
      setRoleLoading(false);
    }
  };

  return {
    user: authState.user,
    loading: authState.loading,
    userRole,
    roleLoading,
    isBlocked,
    blockCheckLoading,
    isAuthenticated: !!authState.user,
    isAdmin: userRole === 'admin',
    isModerator: userRole === 'moderator' || userRole === 'admin',
    signIn: authService.signIn.bind(authService),
    signUp: authService.signUp.bind(authService),
    signOut: authService.signOut.bind(authService),
    refreshRole: loadUserRole,
    checkUserStatus,
  };
}