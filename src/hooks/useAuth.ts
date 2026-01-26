import { useState, useEffect } from 'react';
import { authService, AuthState } from '../core/auth';
import { UserRole } from '../core/types';
import { roleService } from '../services/roleService';
import { apiClient } from '../core/api';

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

  const userId = authState.user?.id;

  useEffect(() => {
    if (userId) {
      // Get role from authState.user.role instead of separate API call
      const loadedRole = (authState.user?.role as UserRole) || 'user';
      console.log('🔐 [useAuth] Loading user role:', {
        userId,
        roleFromUser: authState.user?.role,
        loadedRole,
        fullUser: authState.user
      });
      setUserRole(loadedRole);
      setRoleLoading(false);
      checkUserStatus();
    } else {
      setUserRole('user');
      setRoleLoading(false);
      setIsBlocked(false);
      setBlockCheckLoading(false);
    }
  }, [userId, authState.user?.role]);
  
  const checkUserStatus = async () => {
    try {
      setBlockCheckLoading(true);
      if (!authState.user) return;

      console.log('🔧 [useAuth] Checking user status for:', authState.user.id);

      let profile;
      try {
        profile = await apiClient.get<any>(`/profiles/${authState.user.id}`);
      } catch (fetchError: any) {
        if (fetchError?.message === 'Unauthorized') {
          console.log('⚠️ [useAuth] User is not authenticated, assuming NOT blocked');
          setIsBlocked(false);
          setError(null);
          setBlockCheckLoading(false);
          return;
        }

        console.warn('⚠️ [useAuth] API fetch error (network issue), assuming user is NOT blocked:', fetchError);
        setIsBlocked(false);
        setError(null);
        setBlockCheckLoading(false);
        return;
      }

      if (!profile) {
        console.log('⚠️ [useAuth] No profile found for user, assuming NOT blocked (new user?)');
        setIsBlocked(false);
        setError(null);
        setBlockCheckLoading(false);
        return;
      }

      console.log('✅ [useAuth] User status check result:', {
        userId: authState.user.id,
        profile,
        isDeleted: profile?.isDeleted,
        deletedAt: profile?.deletedAt
      });

      if (profile && profile.isDeleted === true) {
        console.error('🚨 [useAuth] LOGOUT REASON: User is DELETED/BLOCKED', {
          userId: authState.user.id,
          isDeleted: profile.isDeleted,
          deletedAt: profile.deletedAt,
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

  const refreshRole = async () => {
    try {
      setRoleLoading(true);
      // Refresh entire user object including role
      await authService.refreshUser();
    } catch (error) {
      console.error('Failed to refresh user role:', error);
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
    refreshRole,
    checkUserStatus,
  };
}