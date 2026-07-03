// Client-side JWT handling per ADR 0003: the token is JS-readable by design
// (localStorage + Bearer header). Decode only — no signature verification.

export const TOKEN_STORAGE_KEY = 'cloudcertify:token';
export const RETURN_TO_STORAGE_KEY = 'cloudcertify:returnTo';

export const API_BASE_URL = 'https://api-cloudcertify.snowye.dev';

export type JwtPayload = {
  /** Unix seconds */
  exp?: number;
  sub?: string;
  [claim: string]: unknown;
};

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const payload = JSON.parse(json);
    if (typeof payload !== 'object' || payload === null) return null;
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload) return true;
  if (typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 <= Date.now();
}

/** Returns the stored token only when it decodes and is not expired. */
export function getValidToken(): string | null {
  const token = getToken();
  if (!token) return null;
  if (isTokenExpired(token)) {
    clearToken();
    return null;
  }
  return token;
}

export type OAuthProvider = 'google' | 'github';

export function buildLoginUrl(provider: OAuthProvider, returnTo?: string): string {
  const url = new URL(`${API_BASE_URL}/auth/${provider}/login`);
  if (returnTo) url.searchParams.set('returnTo', returnTo);
  return url.toString();
}

/**
 * Parses `#token=...` from a URL fragment ("#token=abc" or "#/token=abc" variants
 * are not supported — the API emits exactly `#token=`).
 */
export function parseTokenFromFragment(hash: string): string | null {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(fragment);
  const token = params.get('token');
  return token && token.length > 0 ? token : null;
}

/** Only same-origin relative paths are honored as post-login destinations. */
export function sanitizeReturnTo(returnTo: string | null): string | null {
  if (!returnTo) return null;
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return null;
  return returnTo;
}
