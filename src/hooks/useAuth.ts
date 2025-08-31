import { useState, useEffect } from 'react';
import { authService, AuthState } from '../core/auth';
import { UserRole } from '../core/types';
import { roleService } from '../services/roleService';
import { supabase } from '../core/supabase';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({ user: null, loading: true });
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authState.user) {
      loadUserRole();
      checkUserStatus();
    } else {
      setUserRole('user');
      setRoleLoading(false);
    }
  }, [authState.user]);

  const checkUserStatus = async () => {
    try {
      if (!authState.user) return;
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_deleted, deleted_at')
        .eq('user_id', authState.user.id)
        .single();
      
      if (profile?.is_deleted) {
        // User is blocked, sign them out
        await authService.signOut();
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to check user status:', error);
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
    isAuthenticated: !!authState.user,
    isAdmin: userRole === 'admin',
    isModerator: userRole === 'moderator' || userRole === 'admin',
    signIn: authService.signIn.bind(authService),
    signUp: authService.signUp.bind(authService),
    signOut: authService.signOut.bind(authService),
    refreshRole: loadUserRole,
  };
}