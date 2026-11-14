'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { QuestionCard } from '@/components/question-card';
import { ConfirmFinishDialog } from '@/components/confirm-finish-dialog';
import { QuestionReview } from '@/components/question-review';
import { ConfidenceSummary, findingOf, type ConfidenceFinding } from '@/components/confidence-summary';
import { confidenceHeight, ExamStrip, type StripCell } from '@/components/exam-strip';
import { ScoreCount } from '@/components/score-count';
import { needsReview } from '@/lib/confidence';
import { cue } from '@/lib/cue';
import { cn } from '@/lib/utils';
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
  const finished = attempt.status === 'finished';
  const [spot, setSpot] = useState<ConfidenceFinding | null>(null);
  // Results open on the strip as the visitor left it; then the verdict colours sweep in.
  const [graded, setGraded] = useState(false);

  useEffect(() => {
    if (!finished) return setGraded(false);
    cue('finish');
    const frame = requestAnimationFrame(() => setGraded(true));
    return () => cancelAnimationFrame(frame);
  }, [finished]);

  if (attempt.status === 'loading' || attempt.payload == null) return null;

  if (attempt.status === 'empty') return <AttemptEmpty quizId={quizId} />;

  const quizDetail = attempt.payload.detail;
  const { questions, currentIndex, currentQuestion, result } = attempt;

  if (finished && result) {
    const { scaledScore, passed } = result;
    const domainBreakdown = result.domainBreakdown ?? [];
    const cells: StripCell[] = result.questions.map(question => ({
      height: confidenceHeight(question.confidence),
      tone: !graded ? (needsReview(question.confidence) ? 'revisit' : 'answered') : question.isCorrect ? 'correct' : 'wrong',
      dim: spot != null && findingOf(question) !== spot
    }));
    const afterStrip = 0.3 + cells.length * 0.02;

    return (
      <div className='flex min-h-dvh flex-col bg-background text-black'>
        <AppHeader />
        <main id='main-content' tabIndex={-1} className='mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-12'>
          <PageBackLink href='/dashboard' className='mb-6'>
            {t.common.backToDashboard}
          </PageBackLink>
          <h1 className='text-lg font-black'>
            {t.results.quizTitle}
            <span className='font-medium text-black/60'>, {quizDetail.title}</span>
          </h1>

          {/* Once a finding is singled out the change is instant: the sweep is for the first reveal only. */}
          <ExamStrip cells={cells} stagger={spot == null} className='mt-6 h-28 sm:h-48' />
          <p className='mt-2 text-sm font-medium text-black/60'>{t.results.stripLegend}</p>

          <div className='mt-6 sm:mt-8'>
            <ScoreCount value={scaledScore} from={100} delay={afterStrip} />
          </div>
          <p className={cn('mt-4 inline-block border-2 border-black px-3 py-1 font-black', passed ? 'bg-success' : 'bg-destructive')}>
            {result.passingScore == null
              ? t.attempt.verdict(passed)
              : t.results.passingScore(passed, String(result.passingScore))}
          </p>
          <p className='mt-4 max-w-[30ch] text-2xl font-extrabold leading-tight font-stretch-[88%] sm:text-3xl'>
            {t.results.scoreLine(result.correctCount, result.totalQuestions)}.
          </p>

          <div className='mt-8 flex flex-col gap-4 sm:flex-row'>
            <Button size='lg' asChild>
              <Link href='/dashboard'>{t.common.backToDashboard}</Link>
            </Button>
            <Button size='lg' variant='outline' onClick={attempt.restart} disabled={attempt.restarting}>
              {attempt.restarting ? t.common.starting : t.common.tryAgain}
            </Button>
          </div>

          <div className='mt-10 space-y-8'>
            <ConfidenceSummary
              luckyGuessCount={result.luckyGuessCount}
              misconceptionCount={result.misconceptionCount}
              questions={result.questions}
              spot={spot}
              onSpot={setSpot}
            />

            {domainBreakdown.length > 0 && (
              <div className='space-y-3'>
                <h2 className='text-xl font-black'>{t.results.domainBreakdown}</h2>
                <dl className='border-t-2 border-black'>
                  {domainBreakdown.map(domain => {
                    const pct = domain.total > 0 ? Math.round((domain.correct / domain.total) * 100) : 0;
                    return (
                      <div key={domain.domain} className='grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 border-b-2 border-black py-3 sm:grid-cols-[14rem_1fr_auto]'>
                        <dt className='font-bold'>{domain.domain}</dt>
                        <dd className='order-last col-span-2 h-3 border-2 border-black bg-white sm:order-none sm:col-span-1' aria-hidden='true'>
                          <div className='h-full bg-success' style={{ width: `${pct}%` }} />
                        </dd>
                        <dd className='text-sm font-bold tabular-nums text-black/70'>
                          {t.results.domainStats(domain.correct, domain.total, pct, Math.round(domain.weight * 100))}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            )}

            <QuestionReview questions={result.questions} />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <QuestionCard
        index={currentIndex}
        total={questions.length}
        question={currentQuestion!}
        selectedIds={attempt.selectedIds}
        onSelect={attempt.select}
        onPrev={() => attempt.goTo(currentIndex - 1)}
        onNext={() => attempt.goTo(currentIndex + 1)}
        onFinish={attempt.requestSubmit}
        finishLabel={t.question.finishQuiz}
        isSubmitting={attempt.submitting}
        answered={attempt.answered}
        confidences={questions.map(question => (question.id == null ? null : attempt.confidences[question.id]))}
        onJump={attempt.goTo}
        confidence={attempt.confidence}
        onRate={attempt.rate}
        exitHref={`/quiz/${quizId}`}
        notice={
          attempt.unsavedCount > 0 && (
            <p role='status' className='text-sm font-bold text-black/70'>
              {t.attempt.unsavedCount(attempt.unsavedCount)}
            </p>
          )
        }
      />
      <ConfirmFinishDialog
        open={attempt.confirmingSubmit}
        unansweredCount={attempt.unansweredCount}
        onConfirm={attempt.confirmSubmit}
        onCancel={attempt.cancelSubmit}
      />
    </>
  );
}
