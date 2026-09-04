import { createContext } from 'react';
import type { MeDto } from '@/http/generated/api.schemas';
import type { OAuthProvider } from './token';

export type AuthContextValue = {
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

export const AuthContext = createContext<AuthContextValue | null>(null);
