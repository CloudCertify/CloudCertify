'use client';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/use-i18n';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <main className='container flex min-h-dvh items-center justify-center py-12'>
      <div className='max-w-xl space-y-4'>
        <h1 className='text-2xl font-black'>{t.route.failed}</h1>
        <p role='alert'>{t.route.recovery}</p>
        <Button onClick={reset}>{t.common.tryAgain}</Button>
      </div>
    </main>
  );
}
