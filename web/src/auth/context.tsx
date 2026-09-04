import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetMe } from '@/http/generated/api';
import { AuthContext, type AuthContextValue } from './auth-context';
import { registerAuthInterceptor } from './interceptor';
import {
  buildLoginUrl,
  clearToken,
  getValidToken,
  setToken,
  RETURN_TO_STORAGE_KEY,
  type OAuthProvider
} from './token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getValidToken());
  const queryClient = useQueryClient();

  const resetToAnonymous = useCallback(() => {
    clearToken();
    setTokenState(null);
    queryClient.removeQueries({
      predicate: query => {
        const scope = query.queryKey[0];
        return (
          typeof scope === 'string' &&
          (scope === '/me' || scope.startsWith('/me/'))
        );
      }
    });
  }, [queryClient]);

  useEffect(() => {
    registerAuthInterceptor(resetToAnonymous);
  }, [resetToAnonymous]);

  const { data } = useGetMe({
    query: {
      enabled: token !== null,
      staleTime: 5 * 60 * 1000,
      retry: false
    }
  });

  const login = useCallback((provider: OAuthProvider) => {
    // Remember where the user was so the callback can send them back there.
    const here = window.location.pathname + window.location.search;
    try {
      sessionStorage.setItem(RETURN_TO_STORAGE_KEY, here);
    } catch {
      /* storage unavailable — callback falls back to /dashboard */
    }
    const callbackUrl = `${window.location.origin}/auth/callback`;
    window.location.href = buildLoginUrl(provider, callbackUrl);
  }, []);

  const completeLogin = useCallback((newToken: string) => {
    setToken(newToken);
    setTokenState(newToken);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: token !== null,
      user: token !== null ? (data?.data ?? null) : null,
      login,
      logout: resetToAnonymous,
      completeLogin
    }),
    [token, data, login, resetToAnonymous, completeLogin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
