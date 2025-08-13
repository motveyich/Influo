import { useState, useEffect } from 'react';
import { authService, AuthState } from '../core/auth';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  return {
    user: authState.user,
    loading: authState.loading,
    isAuthenticated: !!authState.user,
    signUp: authService.signUp.bind(authService),
    signIn: authService.signIn.bind(authService),
    signOut: authService.signOut.bind(authService),
  };
}