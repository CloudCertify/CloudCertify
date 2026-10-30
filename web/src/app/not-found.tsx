import Link from 'next/link';
import { getRequestLanguage } from '@/i18n/server';
import { MESSAGES } from '@/i18n/messages';
import { Button } from '@/components/ui/button';

export default async function NotFound() {
  const t = MESSAGES[await getRequestLanguage()];
  return (
    <main className='container flex min-h-dvh items-center justify-center py-12'>
      <div className='max-w-xl space-y-4'>
        <h1 className='text-2xl font-black'>{t.route.notFound}</h1>
        <p>{t.route.notFoundBody}</p>
        <Button asChild><Link href='/dashboard'>{t.common.backToDashboard}</Link></Button>
      </div>
    </main>
  );
}
