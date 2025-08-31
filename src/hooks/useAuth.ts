import { useState, useEffect } from 'react';
import { authService, AuthState } from '../core/auth';
import { UserRole } from '../core/types';
import { roleService } from '../services/roleService';
import { supabase } from '../core/supabase';
import { realtimeService } from '../core/realtime';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({ user: null, loading: true });
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [roleLoading, setRoleLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockCheckLoading, setBlockCheckLoading] = useState(true);

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

    // Subscribe to real-time updates for user profile
    const channel = supabase
      .channel(`user_profile_${authState.user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_profiles',
        filter: `user_id=eq.${authState.user.id}`,
      }, (payload) => {
        console.log('User profile updated:', payload);
        if (payload.new.is_deleted === true) {
          setIsBlocked(true);
          // Force logout
          authService.signOut();
          alert('Ваш аккаунт был заблокирован администратором.');
          window.location.reload();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };
  const checkUserStatus = async () => {
    try {
      setBlockCheckLoading(true);
      if (!authState.user) return;
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_deleted, deleted_at')
        .eq('user_id', authState.user.id)
        .maybeSingle();
      
      if (profile?.is_deleted === true) {
        setIsBlocked(true);
        await authService.signOut();
        alert('Ваш аккаунт был заблокирован администратором.');
        window.location.reload();
      } else {
        setIsBlocked(false);
      }
    } catch (error) {
      console.error('Failed to check user status:', error);
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