import axios from 'axios';
import { apiClient } from '@/http/axios-instance';
import { clearToken, getValidToken } from './token';

let registered = false;
let onUnauthorized: (() => void) | undefined;

/**
 * Attaches `Authorization: Bearer <token>` to every request made through the
 * app's axios instance (the orval-generated client goes through `apiClient`).
 * Expired tokens are dropped, never sent. A 401 response resets the client
 * to anonymous by clearing the stored token (no refresh tokens per ADR 0003).
 *
 * Interceptors are installed at module load so the first React Query fetch
 * (useSyncExternalStore subscribe, before AuthProvider's useEffect) still
 * carries the Bearer header. `onUnauthorized` can be attached later.
 */
export function registerAuthInterceptor(handler?: () => void): void {
  if (handler) onUnauthorized = handler;
  if (registered) return;
  registered = true;

  apiClient.interceptors.request.use(config => {
    const token = getValidToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  });

  apiClient.interceptors.response.use(
    response => response,
    error => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearToken();
        onUnauthorized?.();
      }
      return Promise.reject(error);
    }
  );
}

registerAuthInterceptor();
