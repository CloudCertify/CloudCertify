import Link from 'next/link';
import { getRequestLanguage } from '@/i18n/server';
import { MESSAGES } from '@/i18n/messages';
import { Button } from '@/components/ui/button';

export default async function NotFound() {
  const language = await getRequestLanguage();
  const t = MESSAGES[language];
  const copy = language === 'pt-BR'
    ? { title: 'Página não encontrada', body: 'A página que você procura não existe.' }
    : { title: 'Page not found', body: 'The page you are looking for does not exist.' };
  return (
    <main className='container flex min-h-dvh items-center justify-center py-12'>
      <div className='max-w-xl space-y-4'>
        <h1 className='text-2xl font-black'>{copy.title}</h1>
        <p>{copy.body}</p>
        <Button asChild><Link href='/dashboard'>{t.common.backToDashboard}</Link></Button>
      </div>
    </main>
  );
}
