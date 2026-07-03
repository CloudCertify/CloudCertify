import axios from 'axios';
import { clearToken, getValidToken } from './token';

let registered = false;

/**
 * Attaches `Authorization: Bearer <token>` to every request made through the
 * global axios instance (the orval-generated client uses `axios.default`).
 * Expired tokens are dropped, never sent. A 401 response resets the client
 * to anonymous by clearing the stored token (no refresh tokens per ADR 0003).
 */
export function registerAuthInterceptor(onUnauthorized?: () => void): void {
  if (registered) return;
  registered = true;

  axios.interceptors.request.use(config => {
    const token = getValidToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  });

  axios.interceptors.response.use(
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
