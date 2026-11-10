import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n/use-i18n';
import { AppHeader } from '@/components/app-header';
import { Footer } from '@/components/footer';

/** An attempt that came back with no Questions: say so and offer the way back. */
export function AttemptEmpty({ quizId }: { quizId: number }) {
  const { t } = useI18n();
  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      <AppHeader />
      <main id='main-content' tabIndex={-1} className='flex-1 container max-w-4xl mx-auto py-12 px-4'>
        <Card className='w-full border-4 border-black shadow-[8px_8px_0px_0px_#000]'>
          <CardHeader className='border-b-2 border-black pb-6'>
            <CardTitle className='text-2xl font-black text-black'>
              <h1>{t.attempt.emptyTitle}</h1>
            </CardTitle>
          </CardHeader>
          <CardContent className='py-6'>
            <p className='font-medium text-black'>{t.attempt.emptyBody}</p>
          </CardContent>
          <CardFooter className='border-t-2 border-black pt-6'>
            <Button asChild>
              <Link href={`/quiz/${quizId}`}>{t.common.backToCertification}</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
