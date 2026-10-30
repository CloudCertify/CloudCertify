import { StrictMode, act } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from './context';
import { useI18n } from './use-i18n';
import { apiClient } from '@/http/axios-instance';
import {
  getCurrentLanguage,
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_STORAGE_KEY,
  setCurrentLanguage,
  type Language
} from './language';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

function Probe() {
  const { language, setLanguage } = useI18n();
  return <button onClick={() => setLanguage('pt-BR')}>{language}</button>;
}

function tree(initialLanguage: Language, queryClient = new QueryClient()) {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider initialLanguage={initialLanguage}><Probe /></LanguageProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}

beforeEach(() => {
  document.cookie = `${LANGUAGE_COOKIE_NAME}=; Path=/; Max-Age=0`;
  localStorage.clear();
  refresh.mockClear();
});

afterEach(() => vi.restoreAllMocks());

describe('LanguageProvider', () => {
  it('renders the server language without reading browser storage', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'pt-BR');
    const read = vi.spyOn(Storage.prototype, 'getItem');
    expect(renderToString(tree('en-US'))).toContain('en-US');
    expect(read).not.toHaveBeenCalled();
  });

  it('hydrates the server language before migrating the legacy choice once', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'pt-BR');
    const element = tree('en-US');
    const container = document.createElement('div');
    container.innerHTML = renderToString(element);
    const recover = vi.fn();
    const root = hydrateRoot(container, element, { onRecoverableError: recover });
    await act(async () => {});
    expect(container.textContent).toBe('pt-BR');
    expect(recover).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
    expect(document.cookie).toContain(`${LANGUAGE_COOKIE_NAME}=pt-BR`);
    await act(async () => root.unmount());
  });

  it('honors a server cookie over conflicting localStorage without refreshing', () => {
    document.cookie = `${LANGUAGE_COOKIE_NAME}=en-US; Path=/`;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'pt-BR');
    render(tree('en-US'));
    expect(screen.getByRole('button')).toHaveTextContent('en-US');
    expect(getCurrentLanguage()).toBe('en-US');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('syncs a changed server language to the UI and requests without another refresh', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { rerender } = render(tree('en-US', queryClient));
    document.cookie = `${LANGUAGE_COOKIE_NAME}=pt-BR; Path=/`;
    rerender(tree('pt-BR', queryClient));

    expect(screen.getByRole('button')).toHaveTextContent('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
    expect(getCurrentLanguage()).toBe('pt-BR');
    const adapter = vi.fn(async (config: import('axios').InternalAxiosRequestConfig) => {
      expect(config.headers.get('Accept-Language')).toBe('pt-BR');
      return { data: [], status: 200, statusText: 'OK', headers: {}, config };
    });
    await apiClient.get('/language-probe', { adapter });
    expect(adapter).toHaveBeenCalledOnce();
    rerender(tree('pt-BR', queryClient));
    expect(invalidate).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('tags the first child query with the server language before browser restoration', async () => {
    setCurrentLanguage('en-US');
    document.cookie = `${LANGUAGE_COOKIE_NAME}=; Path=/; Max-Age=0`;
    localStorage.clear();
    const headers: unknown[] = [];
    function FetchProbe() {
      useQuery({
        queryKey: ['language-probe'],
        queryFn: () => apiClient.get('/language-probe', {
          adapter: async config => {
            headers.push(config.headers.get('Accept-Language'));
            return { data: [], status: 200, statusText: 'OK', headers: {}, config };
          }
        })
      });
      return null;
    }
    render(
      <QueryClientProvider client={new QueryClient()}>
        <LanguageProvider initialLanguage='pt-BR'><FetchProbe /></LanguageProvider>
      </QueryClientProvider>
    );
    await waitFor(() => expect(headers).toEqual(['pt-BR']));
  });

  it('retags requests immediately, persists the switch, invalidates queries and refreshes the URL', () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { rerender } = render(tree('en-US', queryClient));
    fireEvent.click(screen.getByRole('button'));
    rerender(tree('en-US', queryClient));
    expect(getCurrentLanguage()).toBe('pt-BR');
    expect(screen.getByRole('button')).toHaveTextContent('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('pt-BR');
    expect(invalidate).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
