import { ArrowLeft, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'wouter';
import { Footer } from '@/components/footer';
import { CertificationCard } from '@/components/certification-card';
import { useGetQuiz } from '@/http/generated/api';
import { getLucideIcon } from '@/lib/quiz-icon';
import { AuthMenu } from '@/components/auth-menu';

function SkeletonCard() {
  return (
    <Card className='flex flex-col overflow-hidden h-56 animate-pulse'>
      <div className='flex-1 p-6 flex flex-col gap-4'>
        <div className='w-12 h-12 rounded-full bg-muted mx-auto' />
        <div className='h-4 bg-muted rounded w-3/4 mx-auto' />
        <div className='h-3 bg-muted rounded w-full' />
        <div className='h-3 bg-muted rounded w-5/6' />
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { data, isLoading, isError } = useGetQuiz();
  const quizzes = data?.data ?? [];

  const availableQuizzes = quizzes.filter(q => q.isAvailable);
  const comingSoonQuizzes = quizzes.filter(q => !q.isAvailable);

  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      <header className='sticky top-0 z-50 w-full border-b-2 border-black bg-white'>
        <div className='container flex h-16 items-center justify-between'>
          <Link href='/' className='flex gap-2 items-center text-xl font-black'>
            <div className='h-10 w-10 rounded-[5px] border-2 border-black bg-primary flex items-center justify-center shadow-[2px_2px_0px_0px_#000]'>
              <Cloud className='h-5 w-5 text-white' />
            </div>
            <span>CloudCertify</span>
          </Link>
          <div className='flex items-center gap-4'>
            <AuthMenu />
            <Button variant='outline' size='sm' asChild>
              <Link href='/'>
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className='flex-1 container py-8'>
        <div className='flex flex-col gap-8'>
          <div>
            <h1 className='text-3xl font-black tracking-tight text-black'>Dashboard</h1>
            <p className='text-black/70 font-medium mt-1'>
              Continue your cloud certification journey
            </p>
          </div>

          {isError && (
            <Card className='p-8 text-center'>
              <p className='text-muted-foreground'>
                Failed to load certifications. Please try again later.
              </p>
            </Card>
          )}

          {!isError && (
            <>
              <section>
                <h2 className='text-xl font-black mb-4 text-black'>
                  Available certifications
                </h2>

                {isLoading ? (
                  <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                ) : availableQuizzes.length === 0 ? (
                  <Card className='p-8 text-center'>
                    <p className='text-muted-foreground'>
                      No certifications are currently available.
                    </p>
                  </Card>
                ) : (
                  <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                    {availableQuizzes.map(quiz => (
                      <CertificationCard
                        key={quiz.id}
                        title={quiz.title ?? ''}
                        description={quiz.description}
                        icon={getLucideIcon(quiz.iconName, {
                          className: 'h-6 w-6 text-current'
                        })}
                        difficulty={quiz.quizLevel ?? ''}
                        questions={quiz.questionCount ?? 0}
                        available={quiz.isAvailable}
                        href={`/quiz/${quiz.id}`}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className='mt-8'>
                <h2 className='text-xl font-black mb-4 text-black'>Coming soon</h2>

                {isLoading ? (
                  <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                ) : comingSoonQuizzes.length === 0 ? null : (
                  <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                    {comingSoonQuizzes.map(quiz => (
                      <CertificationCard
                        key={quiz.id}
                        title={quiz.title ?? ''}
                        description={quiz.description}
                        icon={getLucideIcon(quiz.iconName, {
                          className: 'h-6 w-6 text-current'
                        })}
                        difficulty={String(quiz.quizLevel ?? '')}
                        questions={quiz.questionCount ?? 0}
                        available={quiz.isAvailable}
                        href={`/quiz/${quiz.id}`}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
