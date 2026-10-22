import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { InternalAxiosRequestConfig } from 'axios';
import { AuthProvider } from './context';
import { useGetMeProgress } from '@/http/generated/api';
import { apiClient } from '@/http/axios-instance';
import { clearToken, getToken, setToken } from './token';
import { useAuth } from './use-auth';

function makeJwt(payload: object): string {
  const b64 = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.sig`;
}

function ProgressProbe({ onRender }: { onRender?: (authenticated: boolean) => void }) {
  const { isAuthenticated, logout } = useAuth();
  onRender?.(isAuthenticated);
  useGetMeProgress({ query: { enabled: isAuthenticated, retry: false } });
  return <button onClick={logout}>{isAuthenticated ? 'signed in' : 'anonymous'}</button>;
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
    vi.restoreAllMocks();
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

  it('renders and hydrates anonymously before restoring a token and starting private queries', async () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    setToken(token);
    const states: boolean[] = [];
    const queryClient = new QueryClient();
    const element = (
      <QueryClientProvider client={queryClient}>
        <AuthProvider><ProgressProbe onRender={value => states.push(value)} /></AuthProvider>
      </QueryClientProvider>
    );
    const read = vi.spyOn(Storage.prototype, 'getItem');
    const container = document.createElement('div');
    container.innerHTML = renderToString(element);
    expect(container.textContent).toBe('anonymous');
    expect(read).not.toHaveBeenCalled();
    expect(captured).toHaveLength(0);
    states.length = 0;

    const recover = vi.fn();
    const root = hydrateRoot(container, element, { onRecoverableError: recover });
    await act(async () => {});
    expect(states[0]).toBe(false);
    await waitFor(() => expect(container.textContent).toBe('signed in'));
    expect(recover).not.toHaveBeenCalled();
    await waitFor(() => expect(captured.some(c => c.url?.includes('/me/progress'))).toBe(true));
    expect(captured.every(c => c.headers.get('Authorization') === `Bearer ${token}`)).toBe(true);
    await act(async () => root.unmount());
    queryClient.clear();
  });

  it('does not restore an expired token or fetch private data', () => {
    setToken(makeJwt({ exp: Math.floor(Date.now() / 1000) - 3600 }));
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider><ProgressProbe /></AuthProvider>
      </QueryClientProvider>
    );
    expect(screen.getByRole('button')).toHaveTextContent('anonymous');
    expect(getToken()).toBeNull();
    expect(captured).toHaveLength(0);
  });

  it('removes private cached queries and token on logout while preserving public data', async () => {
    setToken(makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    const queryClient = new QueryClient();
    queryClient.setQueryData(['/me/progress'], []);
    queryClient.setQueryData(['/quiz'], ['public']);
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider><ProgressProbe /></AuthProvider>
      </QueryClientProvider>
    );
    await screen.findByRole('button', { name: 'signed in' });
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('anonymous');
    expect(getToken()).toBeNull();
    expect(queryClient.getQueryData(['/me/progress'])).toBeUndefined();
    expect(queryClient.getQueryData(['/quiz'])).toEqual(['public']);
  });
});
