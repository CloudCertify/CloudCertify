'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { QuestionCard } from '@/components/question-card';
import { QuestionNavigator } from '@/components/question-navigator';
import { ConfirmFinishDialog } from '@/components/confirm-finish-dialog';
import { QuestionReview } from '@/components/question-review';
import { ConfidenceSummary } from '@/components/confidence-summary';
import { ConfidenceRating } from '@/components/confidence-rating';
import { needsReview } from '@/lib/confidence';
import { Footer } from '@/components/footer';
import { AppHeader } from '@/components/app-header';
import { PageBackLink } from '@/components/page-back-link';
import { useI18n } from '@/i18n/use-i18n';
import { AttemptEmpty } from '@/components/attempt-empty';
import { useAttempt } from '@/attempt/use-attempt';

export function QuizSessionPage() {
  const params = useParams<{ id: string }>();
  const quizId = Number(params.id);
  const { t } = useI18n();
  const attempt = useAttempt({ quizId });

  if (attempt.status === 'loading' || attempt.payload == null) return null;

  if (attempt.status === 'empty') return <AttemptEmpty quizId={quizId} />;

  const quizDetail = attempt.payload.detail;
  const { questions, currentIndex, currentQuestion, result } = attempt;
  const questionsCount = questions.length;

  if (attempt.status === 'finished' && result) {
    const { scaledScore, passed } = result;
    // Scaled score runs 100–1000; map onto the 0–100 progress bar.
    const barValue =
      scaledScore != null
        ? Math.max(0, Math.min(100, Math.round(((scaledScore - 100) / 900) * 100)))
        : 0;
    const domainBreakdown = result.domainBreakdown ?? [];

    return (
      <div className='flex min-h-dvh flex-col bg-background'>
        <AppHeader />
        <main id='main-content' tabIndex={-1} className='flex-1 container max-w-4xl mx-auto py-12 px-4'>
          <PageBackLink href='/dashboard' className='mb-6'>
            {t.common.backToDashboard}
          </PageBackLink>
          <Card className='w-full border-4 border-black shadow-[8px_8px_0px_0px_#000]'>
            <CardHeader className='text-center border-b-2 border-black pb-6'>
              <CardTitle className='text-2xl md:text-3xl font-black text-black'>
                {t.results.quizTitle}
              </CardTitle>
              <p className='text-black/70 font-medium mt-2'>{quizDetail.title}</p>
            </CardHeader>
            <CardContent className='space-y-8 py-8'>
              <div className='flex flex-col items-center justify-center space-y-4'>
                <div
                  className='h-32 w-32 rounded-none border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_#000]'
                  style={{ backgroundColor: passed ? '#15a06e' : '#e23b48' }}
                >
                  <span className='text-4xl font-black text-white'>{scaledScore}</span>
                </div>

                <Badge className={passed ? 'bg-success' : 'bg-destructive'}>
                  {result.passingScore == null
                    ? t.attempt.verdict(passed)
                    : t.results.passingScore(passed, String(result.passingScore))}
                </Badge>

                <p className='text-xl font-bold text-black'>
                  {t.results.scoreLine(result.correctCount, result.totalQuestions)}
                </p>

                <div className='w-full max-w-md mt-4'>
                  <Progress
                    value={barValue}
                    className={passed ? 'bg-success/20' : 'bg-destructive/20'}
                    indicatorClassName={passed ? 'bg-success' : 'bg-destructive'}
                  />
                </div>
              </div>

              {domainBreakdown.length > 0 && (
                <div className='space-y-3'>
                  <h3 className='text-xl font-black text-black'>
                    {t.results.domainBreakdown}
                  </h3>
                  <div className='space-y-2'>
                    {domainBreakdown.map(domain => {
                      const pct =
                        domain.total > 0
                          ? Math.round((domain.correct / domain.total) * 100)
                          : 0;
                      return (
                        <div
                          key={domain.domain}
                          className='rounded-none border-2 border-black p-3'
                        >
                          <div className='flex items-center justify-between mb-2'>
                            <span className='font-bold text-black'>{domain.domain}</span>
                            <span className='text-sm font-bold text-black/70'>
                              {t.results.domainStats(
                                domain.correct,
                                domain.total,
                                pct,
                                Math.round(domain.weight * 100)
                              )}
                            </span>
                          </div>
                          <Progress value={pct} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <ConfidenceSummary
                luckyGuessCount={result.luckyGuessCount}
                misconceptionCount={result.misconceptionCount}
                questions={result.questions}
              />

              <QuestionReview questions={result.questions} />
            </CardContent>
            <CardFooter className='flex flex-col sm:flex-row gap-4 justify-between border-t-2 border-black pt-6'>
              <Button variant='outline' onClick={attempt.restart} disabled={attempt.restarting}>
                {attempt.restarting ? t.common.starting : t.common.tryAgain}
              </Button>
              <Button asChild>
                <Link href='/dashboard'>{t.common.backToDashboard}</Link>
              </Button>
            </CardFooter>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      <AppHeader languageLocked />
      <main id='main-content' tabIndex={-1} className='container mx-auto flex-1 max-w-7xl px-4 py-12'>
        <PageBackLink href={`/quiz/${quizId}`} className='mb-6'>
          {t.common.back}
        </PageBackLink>
        <div className='relative flex items-start justify-center gap-0 pt-12 lg:gap-6 lg:pt-0'>
          <QuestionNavigator
            currentIndex={currentIndex}
            answered={attempt.answered}
            // The visitor's own "come back to this": a Guess or Unsure rating.
            needsReview={questions.map(
              q => q.id != null && needsReview(attempt.confidences[q.id])
            )}
            onJump={attempt.goTo}
          />
          <div className='min-w-0 max-w-4xl flex-1 space-y-6'>
            <QuestionCard
              index={currentIndex}
              total={questionsCount}
              question={currentQuestion!}
              meta={<Badge>{quizDetail.title}</Badge>}
              selectedIds={attempt.selectedIds}
              onSelect={attempt.select}
              onPrev={() => attempt.goTo(currentIndex - 1)}
              onNext={() => attempt.goTo(currentIndex + 1)}
              onFinish={attempt.requestSubmit}
              finishLabel={t.question.finishQuiz}
              isSubmitting={attempt.submitting}
            />
            {attempt.selectedIds.length > 0 && (
              <ConfidenceRating value={attempt.confidence} onRate={attempt.rate} />
            )}
            <div className='flex items-center justify-end gap-4'>
              {attempt.unsavedCount > 0 && (
                <p role='status' className='text-sm font-bold text-black/70'>
                  {t.attempt.unsavedCount(attempt.unsavedCount)}
                </p>
              )}
              <Button onClick={attempt.requestSubmit} disabled={attempt.submitting}>
                {attempt.submitting ? t.common.submitting : t.question.finishQuiz}
              </Button>
            </div>
            <ConfirmFinishDialog
              open={attempt.confirmingSubmit}
              unansweredCount={attempt.unansweredCount}
              onConfirm={attempt.confirmSubmit}
              onCancel={attempt.cancelSubmit}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
