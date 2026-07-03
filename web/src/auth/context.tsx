import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetMe, getGetMeQueryKey } from '@/http/generated/api';
import type { MeDto } from '@/http/generated/api.schemas';
import { registerAuthInterceptor } from './interceptor';
import {
  buildLoginUrl,
  clearToken,
  getValidToken,
  setToken,
  RETURN_TO_STORAGE_KEY,
  type OAuthProvider
} from './token';

type AuthContextValue = {
  /** True when a valid (non-expired) token is present. */
  isAuthenticated: boolean;
  /** Provider-sourced profile from GET /me; null while loading or anonymous. */
  user: MeDto | null;
  /** Redirects the browser to the API's OAuth login endpoint. */
  login: (provider: OAuthProvider) => void;
  logout: () => void;
  /** Called by the OAuth callback route after validating the fragment token. */
  completeLogin: (token: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getValidToken());
  const queryClient = useQueryClient();

  const resetToAnonymous = useCallback(() => {
    clearToken();
    setTokenState(null);
    queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
  }, [queryClient]);

  useEffect(() => {
    registerAuthInterceptor(() => setTokenState(null));
  }, []);

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

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
