import { useEffect } from 'react';
import { HomePage } from './pages/home';
import { Route, Router } from 'wouter';
import { QuizPage } from './pages/quiz';
import { DashboardPage } from './pages/dashboard';
import { QuizDetailPage } from './pages/quiz-detail';
import { QuizSessionPage } from './pages/quiz-session';
import { SubquizSessionPage } from './pages/subquiz-session';
import { AuthCallbackPage } from './pages/auth-callback';
import { Providers } from './providers';

export function App() {
  useEffect(() => {
    const setFavicon = (isDarkMode: boolean) => {
      const favicon = document.getElementById('icon') as HTMLLinkElement | null;
      if (!favicon) return;
      favicon.href = isDarkMode ? '/icon-dark.svg' : '/icon-light.svg';
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setFavicon(mediaQuery.matches);

    const onChange = (e: MediaQueryListEvent) => setFavicon(e.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  return (
    <Providers>
      <Router>
        <Route path='/' component={HomePage} />
        <Route path='/quiz' component={QuizPage} />
        <Route path='/quiz/:id' component={QuizDetailPage} />
        <Route path='/quiz/:id/session' component={QuizSessionPage} />
        <Route path='/quiz/:id/subquiz/:subquizId/session' component={SubquizSessionPage} />
        <Route path='/dashboard' component={DashboardPage} />
        <Route path='/auth/callback' component={AuthCallbackPage} />
      </Router>
    </Providers>
  );
}
