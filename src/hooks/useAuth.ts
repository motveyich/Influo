import { useState, useEffect } from 'react';
import { authService, AuthState } from '../core/auth';
import { UserRole } from '../core/types';
import { roleService } from '../services/roleService';

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
      // Subscribe to real-time updates only once per user
      const cleanup = subscribeToUserUpdates();
      return cleanup;
    } else {
      setUserRole('user');
      setRoleLoading(false);
      setIsBlocked(false);
      setBlockCheckLoading(false);
    }
  }, [authState.user?.id]); // Only re-run if user ID changes

  const subscribeToUserUpdates = () => {
    if (!authState.user) return;

    console.log('🔧 [useAuth] Setting up real-time subscription for user:', authState.user.id);

    const pollInterval = setInterval(async () => {
      try {
        await authService.refreshUser();
        const currentUser = authService.getCurrentUser();
        if (currentUser?.isDeleted === true) {
          console.log('🚨 [useAuth] User blocked via polling, forcing logout');
          setIsBlocked(true);
          clearInterval(pollInterval);
          await authService.signOut();
          alert('Ваш аккаунт был заблокирован администратором. Вы будете перенаправлены на страницу входа.');
        }
      } catch (error) {
        console.error('⚠️ [useAuth] Failed to refresh user in polling:', error);
      }
    }, 30000);

    return () => {
      console.log('🔧 [useAuth] Cleaning up polling interval');
      clearInterval(pollInterval);
    };
  };
  
  const checkUserStatus = async () => {
    try {
      setBlockCheckLoading(true);
      if (!authState.user) return;

      console.log('🔧 [useAuth] Checking user status for:', authState.user.id);

      if (authState.user.isDeleted === true) {
        console.error('🚨 [useAuth] LOGOUT REASON: User is DELETED/BLOCKED', {
          userId: authState.user.id,
          isDeleted: authState.user.isDeleted,
          deletedAt: authState.user.deletedAt,
          timestamp: new Date().toISOString()
        });
        setIsBlocked(true);
        await authService.signOut();
        alert('Ваш аккаунт был заблокирован администратором.');
      } else {
        console.log('✅ [useAuth] User is not blocked');
        setIsBlocked(false);
        setError(null);
      }
    } catch (error) {
      console.warn('⚠️ [useAuth] Failed to check user status, assuming user is not blocked:', error);
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