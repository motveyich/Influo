import { useState, useEffect } from 'react';
import { authService, AuthState } from '../core/auth';
import { UserRole } from '../core/types';
import { roleService } from '../services/roleService';

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
    } else {
      setUserRole('user');
      setRoleLoading(false);
    }
  }, [authState.user]);

  const loadUserRole = async () => {
    try {
      // Check if role column exists
      const { data: columnExists } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'user_profiles')
        .eq('column_name', 'role')
        .maybeSingle();

      const selectFields = columnExists ? 'role' : '*';
      
      setRoleLoading(true);
      const role = await roleService.getUserRole(authState.user!.id);
      setUserRole(role);
    } catch (error) {
      console.error('Failed to load user role:', error);
      setUserRole('user');
    } finally {
        .select(selectFields)
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
      setUserRole(data?.role || 'user');
    signIn: authService.signIn.bind(authService),
    signOut: authService.signOut.bind(authService),
      setUserRole('user');
    refreshRole: loadUserRole,
  };
}