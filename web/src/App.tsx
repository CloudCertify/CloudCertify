import { lazy, useEffect } from 'react';
import { HomePage } from './pages/home';
import { Route, Router } from 'wouter';
import { Providers } from './providers';
import { RouteBoundary } from './route-boundary';

const QuizPage = lazy(() =>
  import('./pages/quiz').then(module => ({ default: module.QuizPage }))
);
const DashboardPage = lazy(() =>
  import('./pages/dashboard').then(module => ({ default: module.DashboardPage }))
);
const QuizDetailPage = lazy(() =>
  import('./pages/quiz-detail').then(module => ({ default: module.QuizDetailPage }))
);
const QuizSessionPage = lazy(() =>
  import('./pages/quiz-session').then(module => ({ default: module.QuizSessionPage }))
);
const DrillSessionPage = lazy(() =>
  import('./pages/drill-session').then(module => ({ default: module.DrillSessionPage }))
);
const AuthCallbackPage = lazy(() =>
  import('./pages/auth-callback').then(module => ({ default: module.AuthCallbackPage }))
);
const ProgressPage = lazy(() =>
  import('./pages/progress').then(module => ({ default: module.ProgressPage }))
);

const QuizMotionPrototypePage = import.meta.env.DEV ? lazy(() => import('./pages/quiz-motion-prototype').then(module => ({ default: module.QuizMotionPrototypePage }))) : null;

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
        <RouteBoundary>
          {QuizMotionPrototypePage && <Route path='/prototype/quiz-motion' component={QuizMotionPrototypePage} />}
          <Route path='/' component={HomePage} />
          <Route path='/quiz' component={QuizPage} />
          <Route path='/quiz/:id' component={QuizDetailPage} />
          <Route path='/quiz/:id/session' component={QuizSessionPage} />
          <Route path='/quiz/:id/drill/:drillId/session' component={DrillSessionPage} />
          <Route path='/dashboard' component={DashboardPage} />
          <Route path='/progress' component={ProgressPage} />
          <Route path='/auth/callback' component={AuthCallbackPage} />
        </RouteBoundary>
      </Router>
    </Providers>
  );
}
