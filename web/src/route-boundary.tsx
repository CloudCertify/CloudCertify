import {
  Component,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject
} from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/use-i18n';

function RouteLoading() {
  const { t } = useI18n();
  return (
    <main className='container flex min-h-dvh items-center justify-center py-12'>
      <p role='status'>{t.route.loading}</p>
    </main>
  );
}

function RouteUnavailable() {
  const { t } = useI18n();
  return (
    <main className='container flex min-h-dvh items-center justify-center py-12'>
      <div className='max-w-xl space-y-4'>
        <h1 className='text-2xl font-black'>{t.route.failed}</h1>
        <p role='alert'>{t.route.recovery}</p>
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

/** This effect commits only with successful route content, never the fallback. */
function RouteFocus({ pending }: { pending: RefObject<boolean> }) {
  useEffect(() => {
    if (!pending.current) return;
    pending.current = false;
    const main = document.querySelector<HTMLElement>('main');
    const active = document.activeElement;
    if (!main || main.contains(active) || active?.matches(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
    )) return;

    if (!main.hasAttribute('tabindex')) main.tabIndex = -1;
    main.focus({ preventScroll: true });
  }, [pending]);
  return null;
}

/** Providers remain mounted while a route chunk loads or fails. No automatic reloads. */
export function RouteBoundary({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const observedPath = useRef(path);
  const focusPending = useRef(false);
  // Layout runs before RouteFocus's passive effect, including eager navigation.
  useLayoutEffect(() => {
    if (observedPath.current !== path) {
      observedPath.current = path;
      focusPending.current = true;
    }
  }, [path]);
  return (
    <RouteErrorBoundary key={path}>
      <Suspense fallback={<RouteLoading />}>
        {children}
        <RouteFocus pending={focusPending} />
      </Suspense>
    </RouteErrorBoundary>
  );
}
