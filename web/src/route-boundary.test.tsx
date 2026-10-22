import { lazy, useState, type ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Route, Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { I18nContext, MESSAGES } from '@/i18n/i18n-context';
import type { Language } from '@/i18n/language';
import { RouteBoundary } from './route-boundary';

function withLanguage(language: Language, children: ReactNode) {
  return (
    <I18nContext.Provider value={{ language, t: MESSAGES[language], setLanguage: () => {} }}>
      {children}
    </I18nContext.Provider>
  );
}

afterEach(() => vi.restoreAllMocks());

describe('lazy route feedback', () => {
  it.each([
    ['en-US', 'Loading page...'],
    ['pt-BR', 'Carregando página...']
  ] as const)('announces loading in %s, then renders the route', async (language, loading) => {
    let finish!: (module: { default: () => ReactNode }) => void;
    const Page = lazy(() => new Promise<{ default: () => ReactNode }>(resolve => { finish = resolve; }));
    render(withLanguage(language, <RouteBoundary><Page /></RouteBoundary>));
    expect(screen.getByRole('status')).toHaveTextContent(loading);
    await act(async () => finish({ default: () => <h1>Ready</h1> }));
    expect(screen.getByRole('heading', { name: 'Ready' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.each([
    ['en-US', 'This page could not load.', 'Try Again'],
    ['pt-BR', 'Não foi possível carregar esta página.', 'Tentar de novo']
  ] as const)('offers explicit recovery after a chunk failure in %s', async (language, title, retry) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Page = lazy(() => Promise.reject(new Error('chunk download failed')));
    render(withLanguage(language, <RouteBoundary><Page /></RouteBoundary>));
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/another tab|outra aba/);
    expect(screen.getByRole('button', { name: retry })).toBeEnabled();
  });

  it('preserves state above the boundary while a route suspends', () => {
    const Page = lazy(() => new Promise<{ default: () => ReactNode }>(() => {}));
    function ProviderState() {
      const [count, setCount] = useState(0);
      const [showPage, setShowPage] = useState(false);
      return <>
        <button onClick={() => { setCount(count + 1); setShowPage(true); }}>Navigate {count}</button>
        <RouteBoundary>{showPage ? <Page /> : <h1>Home</h1>}</RouteBoundary>
      </>;
    }
    render(<ProviderState />);
    fireEvent.click(screen.getByRole('button', { name: 'Navigate 0' }));
    expect(screen.getByRole('button', { name: 'Navigate 1' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading page...');
  });

  it('recovers when browser navigation changes away from a failed route', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Page = lazy(() => Promise.reject(new Error('missing chunk')));
    const location = memoryLocation({ path: '/broken' });
    render(
      <Router hook={location.hook}>
        <RouteBoundary>
          <Route path='/broken' component={Page} />
          <Route path='/working'><h1>Working route</h1></Route>
        </RouteBoundary>
      </Router>
    );
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    act(() => location.navigate('/working'));
    expect(screen.getByRole('heading', { name: 'Working route' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
