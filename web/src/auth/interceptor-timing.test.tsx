import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { InternalAxiosRequestConfig } from 'axios';
import { AuthProvider } from './context';
import { useGetMeProgress } from '@/http/generated/api';
import { apiClient } from '@/http/axios-instance';
import { clearToken, setToken } from './token';

function makeJwt(payload: object): string {
  const b64 = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.sig`;
}

function ProgressProbe() {
  useGetMeProgress({ query: { retry: false } });
  return null;
}

describe('auth interceptor vs /me/progress', () => {
  const captured: InternalAxiosRequestConfig[] = [];
  let previousAdapter = apiClient.defaults.adapter;

  beforeEach(() => {
    captured.length = 0;
    clearToken();
    previousAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = async config => {
      captured.push(config);
      return {
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    };
  });

  afterEach(() => {
    apiClient.defaults.adapter = previousAdapter;
    clearToken();
  });

  it('sends Authorization on the first GET /me/progress after a full mount', async () => {
    const token = makeJwt({
      sub: '7',
      exp: Math.floor(Date.now() / 1000) + 3600
    });
    setToken(token);

    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false } }
          })
        }
      >
        <AuthProvider>
          <ProgressProbe />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(
        captured.some(c => c.url?.includes('/me/progress'))
      ).toBe(true);
    });

    const progress = captured.filter(c => c.url?.includes('/me/progress'));
    expect(progress[0]?.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });
});
