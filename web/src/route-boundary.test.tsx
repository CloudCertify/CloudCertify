import { StrictMode, lazy, useState, type ReactNode } from 'react';
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
    await act(async () => finish({ default: () => <main><h1>Ready</h1></main> }));
    expect(screen.getByRole('heading', { name: 'Ready' })).toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveFocus();
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
          <Route path='/working'><main><h1>Working route</h1></main></Route>
        </RouteBoundary>
      </Router>
    );
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    act(() => location.navigate('/working'));
    expect(screen.getByRole('heading', { name: 'Working route' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('hands focus to main only after a navigated lazy page commits, preserving later input', async () => {
    let finish!: (module: { default: () => ReactNode }) => void;
    const Page = lazy(() => new Promise<{ default: () => ReactNode }>(resolve => { finish = resolve; }));
    const location = memoryLocation({ path: '/' });
    function Destination() {
      const [answer, setAnswer] = useState('');
      return <main><h1>Destination</h1><input aria-label='Answer' value={answer} onChange={event => setAnswer(event.target.value)} /></main>;
    }
    render(
      <StrictMode>
        <Router hook={location.hook}>
          <RouteBoundary>
            <Route path='/'><main><button onClick={() => location.navigate('/next')}>Continue</button></main></Route>
            <Route path='/next' component={Page} />
          </RouteBoundary>
        </Router>
      </StrictMode>
    );
    const button = screen.getByRole('button', { name: 'Continue' });
    button.focus();
    fireEvent.click(button);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveFocus();
    await act(async () => finish({ default: Destination }));
    expect(screen.getByRole('main')).toHaveFocus();
    const input = screen.getByRole('textbox', { name: 'Answer' });
    input.focus();
    fireEvent.change(input, { target: { value: 'Keep this answer' } });
    expect(input).toHaveFocus();
    expect(input).toHaveValue('Keep this answer');
  });

  it('does not steal focus from an editable field used while a route is loading', async () => {
    let finish!: (module: { default: () => ReactNode }) => void;
    const Page = lazy(() => new Promise<{ default: () => ReactNode }>(resolve => { finish = resolve; }));
    const location = memoryLocation({ path: '/' });
    render(
      <Router hook={location.hook}>
        <input aria-label='Draft' />
        <RouteBoundary>
          <Route path='/'><main>Home</main></Route>
          <Route path='/next' component={Page} />
        </RouteBoundary>
      </Router>
    );
    act(() => location.navigate('/next'));
    const input = screen.getByRole('textbox', { name: 'Draft' });
    input.focus();
    fireEvent.change(input, { target: { value: 'Keep typing' } });
    await act(async () => finish({ default: () => <main>Destination</main> }));
    expect(input).toHaveFocus();
    expect(input).toHaveValue('Keep typing');
    expect(screen.getByRole('main')).not.toHaveFocus();
  });
});
