export function cleanSupabaseTokens() {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') && key.includes('-auth-token'))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log('🧹 Cleaned Supabase token:', key);
  });

  if (keysToRemove.length > 0) {
    console.log(`✅ Cleaned ${keysToRemove.length} Supabase token(s)`);
  }
}

export function cleanAllAuthTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  cleanSupabaseTokens();
  console.log('🧹 Cleaned all auth tokens');
}
