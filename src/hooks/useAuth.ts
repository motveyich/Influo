import { useState, useEffect } from 'react';
import { authService, AuthState, User } from '../core/auth';
import { UserRole } from '../core/types';
import { apiClient } from '../core/api';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({ user: null, loading: true });
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [roleLoading, setRoleLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockCheckLoading, setBlockCheckLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authState.user) {
      loadUserRole();
    } else {
      setUserRole('user');
      setRoleLoading(false);
      setIsBlocked(false);
      setBlockCheckLoading(false);
    }
  }, [authState.user?.id]);

  const loadUserRole = async () => {
    try {
      setRoleLoading(true);
      const { data, error } = await apiClient.get<{ role: UserRole }>(`/roles/user/${authState.user!.id}`);
      if (data && !error) {
        setUserRole(data.role || 'user');
      } else {
        setUserRole('user');
      }
    } catch (error) {
      console.error('Failed to load user role:', error);
      setUserRole('user');
    } finally {
      setRoleLoading(false);
    }
  };

  const checkUserStatus = async () => {
    if (!authState.user) return;
    setBlockCheckLoading(true);
    try {
      const { data, error } = await apiClient.get<{ isBlocked?: boolean }>(`/profiles/${authState.user.id}`);
      if (data && !error) {
        setIsBlocked(data.isBlocked || false);
      }
    } catch (error) {
      console.error('Failed to check user status:', error);
    } finally {
      setBlockCheckLoading(false);
    }
  };

  const user: User | null = authState.user;

  return {
    user,
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
