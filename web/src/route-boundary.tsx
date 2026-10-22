import { Component, Suspense, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/use-i18n';
import type { Language } from '@/i18n/language';

// Kept here to avoid overlapping the shared translation slice.
const messages: Record<Language, { loading: string; failed: string; recovery: string }> = {
  'en-US': {
    loading: 'Loading page...',
    failed: 'This page could not load.',
    recovery: 'Check your connection, then try again. If an attempt is open in another tab, keep that tab open.'
  },
  'pt-BR': {
    loading: 'Carregando página...',
    failed: 'Não foi possível carregar esta página.',
    recovery: 'Verifique sua conexão e tente novamente. Se uma tentativa estiver aberta em outra aba, mantenha essa aba aberta.'
  }
};

function RouteLoading() {
  const { language } = useI18n();
  return (
    <main className='container flex min-h-dvh items-center justify-center py-12'>
      <p role='status'>{messages[language].loading}</p>
    </main>
  );
}

function RouteUnavailable() {
  const { language, t } = useI18n();
  return (
    <main className='container flex min-h-dvh items-center justify-center py-12'>
      <div className='max-w-xl space-y-4'>
        <h1 className='text-2xl font-black'>{messages[language].failed}</h1>
        <p role='alert'>{messages[language].recovery}</p>
        <Button onClick={() => window.location.reload()}>{t.common.tryAgain}</Button>
      </div>
    </main>
  );
}

class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <RouteUnavailable /> : this.props.children;
  }
}

/** Providers remain mounted while a route chunk loads or fails. No automatic reloads. */
export function RouteBoundary({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  return (
    <RouteErrorBoundary key={path}>
      <Suspense fallback={<RouteLoading />}>{children}</Suspense>
    </RouteErrorBoundary>
  );
}
