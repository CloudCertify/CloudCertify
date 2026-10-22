import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const loaded = vi.hoisted(() => vi.fn());
vi.mock('./providers', () => ({ Providers: ({ children }: { children: ReactNode }) => children }));
vi.mock('./pages/home', () => ({ HomePage: () => <h1>Home route</h1> }));
vi.mock('./pages/quiz', () => { loaded('quiz'); return { QuizPage: () => <h1>Quiz route</h1> }; });
vi.mock('./pages/dashboard', () => { loaded('dashboard'); return { DashboardPage: () => <h1>Dashboard route</h1> }; });
vi.mock('./pages/quiz-detail', () => { loaded('detail'); return { QuizDetailPage: () => <h1>Detail route</h1> }; });
vi.mock('./pages/quiz-session', () => { loaded('session'); return { QuizSessionPage: () => <h1>Session route</h1> }; });
vi.mock('./pages/drill-session', () => { loaded('drill'); return { DrillSessionPage: () => <h1>Drill route</h1> }; });
vi.mock('./pages/auth-callback', () => { loaded('auth'); return { AuthCallbackPage: () => <h1>Auth route</h1> }; });
vi.mock('./pages/progress', () => { loaded('progress'); return { ProgressPage: () => <h1>Progress route</h1> }; });

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn()
  })));
});
afterEach(() => vi.unstubAllGlobals());

describe('split app routes', () => {
  it('renders Home eagerly without loading other route modules', () => {
    window.history.replaceState({}, '', '/');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Home route' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(loaded).not.toHaveBeenCalled();
  });

  it.each([
    ['/quiz', 'Quiz route'],
    ['/dashboard', 'Dashboard route'],
    ['/quiz/1', 'Detail route'],
    ['/quiz/1/session', 'Session route'],
    ['/quiz/1/drill/2/session', 'Drill route'],
    ['/auth/callback', 'Auth route'],
    ['/progress', 'Progress route']
  ])('preserves lazy route matching for %s', async (path, title) => {
    window.history.replaceState({}, '', path);
    render(<App />);
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
  });
});
