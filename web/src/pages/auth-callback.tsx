import { useEffect, useState } from 'react';
import { AlertTriangle, Cloud } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/context';
import { useI18n } from '@/i18n/context';
import {
  isTokenExpired,
  parseTokenFromFragment,
  sanitizeReturnTo,
  RETURN_TO_STORAGE_KEY
} from '@/auth/token';

/**
 * Landing route for the API's OAuth redirect (`/auth/callback#token=...`).
 * The fragment is read and stripped from the address bar before anything else
 * happens — it must never reach history, logging, or analytics (ADR 0003).
 */
export function AuthCallbackPage() {
  const [, navigate] = useLocation();
  const { completeLogin } = useAuth();
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = parseTokenFromFragment(window.location.hash);

    // Strip the fragment immediately, valid or not.
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search
    );

    if (!token || isTokenExpired(token)) {
      setFailed(true);
      return;
    }

    completeLogin(token);

    let returnTo: string | null = null;
    try {
      returnTo = sessionStorage.getItem(RETURN_TO_STORAGE_KEY);
      sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    navigate(sanitizeReturnTo(returnTo) ?? '/dashboard', { replace: true });
  }, [completeLogin, navigate]);

  if (!failed) {
    return (
      <div className='flex min-h-dvh items-center justify-center bg-background'>
        <div className='flex items-center gap-3 font-black text-black'>
          <Cloud className='h-6 w-6 animate-pulse' />
          {t.auth.signingIn}
        </div>
      </div>
    );
  }

  return (
    <div className='flex min-h-dvh items-center justify-center bg-background px-4'>
      <div className='w-full max-w-md rounded-[5px] border-2 border-black bg-white p-8 text-center shadow-[4px_4px_0px_0px_#000] space-y-4'>
        <AlertTriangle className='mx-auto h-10 w-10 text-destructive' />
        <h1 className='text-xl font-black text-black'>{t.auth.failedTitle}</h1>
        <p className='text-sm font-medium text-black/70'>{t.auth.failedBody}</p>
        <div className='flex justify-center gap-3'>
          <Button asChild>
            <Link href='/dashboard'>{t.auth.tryAgainFromDashboard}</Link>
          </Button>
          <Button variant='outline' asChild>
            <Link href='/'>{t.auth.goHome}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
