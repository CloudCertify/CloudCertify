import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { AuthCallbackPage } from './auth-callback';
import { AuthProvider } from '@/auth/context';
import { RETURN_TO_STORAGE_KEY, TOKEN_STORAGE_KEY } from '@/auth/token';

vi.mock('@/http/generated/api', () => ({
  useGetMe: () => ({ data: undefined }),
  getGetMeQueryKey: () => ['me']
}));

function makeJwt(payload: object): string {
  const b64 = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.sig`;
}

function renderCallback() {
  const { hook, history } = memoryLocation({
    path: '/auth/callback',
    record: true
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <Router hook={hook}>
          <AuthCallbackPage />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
  return history;
}

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('stores the token, strips the fragment and redirects to returnTo', async () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    window.location.hash = `#token=${token}`;
    sessionStorage.setItem(RETURN_TO_STORAGE_KEY, '/quiz/3');

    const history = renderCallback();

    await waitFor(() => {
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe(token);
    });
    expect(window.location.hash).toBe('');
    expect(history.at(-1)).toBe('/quiz/3');
  });

  it('redirects to /dashboard when no returnTo is stored', async () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    window.location.hash = `#token=${token}`;

    const history = renderCallback();

    await waitFor(() => {
      expect(history.at(-1)).toBe('/dashboard');
    });
  });

  it('shows an error with retry when the fragment is missing', async () => {
    renderCallback();
    expect(
      await screen.findByText(/login didn't work/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /try again/i })
    ).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('shows an error when the token is expired', async () => {
    window.location.hash = `#token=${makeJwt({
      exp: Math.floor(Date.now() / 1000) - 3600
    })}`;
    renderCallback();
    expect(
      await screen.findByText(/login didn't work/i)
    ).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(window.location.hash).toBe('');
  });
});
