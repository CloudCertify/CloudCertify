'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DrillColumns, runLengths } from '@/components/drill-columns';
import { ScoreCount } from '@/components/score-count';
import { PracticeQuestionCard } from '@/components/practice-question-card';
import { QuestionReview } from '@/components/question-review';
import { DrillBanner } from '@/components/drill-banner';
import { ReportQuestionControl } from '@/components/report-question-control';
import { Footer } from '@/components/footer';
import { AppHeader } from '@/components/app-header';
import { PageBackLink } from '@/components/page-back-link';
import { useI18n } from '@/i18n/use-i18n';
import { cue } from '@/lib/cue';
import { cn } from '@/lib/utils';
import { isWholeQuizMix } from '@/lib/whole-quiz-mix';
import { DrawRule, type DrillDetailDto } from '@/http/generated/api.schemas';
import { AttemptEmpty } from '@/components/attempt-empty';
import { useAttempt } from '@/attempt/use-attempt';

export function DrillSessionPage() {
  const params = useParams<{ id: string; drillId: string }>();
  const quizId = Number(params.id);
  const drillId = Number(params.drillId);
  const { t } = useI18n();
  const attempt = useAttempt({ quizId, drillId });
  const finished = attempt.status === 'finished';

  // The run just ended: one closing cue (silent on a reload, which is no gesture).
  useEffect(() => {
    if (finished) cue('finish');
  }, [finished]);

  if (attempt.status === 'loading' || attempt.payload == null) return null;

  if (attempt.status === 'empty') return <AttemptEmpty quizId={quizId} />;

  const drillDetail: DrillDetailDto = attempt.payload.detail;
  const { questions, currentIndex, result, checkResponse: reveal, reported } = attempt;
  const currentQuestion = attempt.currentQuestion!;
  const drillTitle = isWholeQuizMix(drillDetail) ? t.quizDetail.mixTitle : drillDetail.title;
  const questionsCount = questions.length;

  if (finished && result) {
    const { passed, score: percentage } = result;
    // The verdict the Score counted, not today's key (ADR 0007).
    const outcomes = result.questions.map(question => question.isCorrect);
    const longestRun = Math.max(0, ...runLengths(outcomes));
    // The columns finish rising first; the number answers them.
    const afterColumns = 0.35 + outcomes.length * 0.05;

    return (
      <div className='flex min-h-dvh flex-col bg-background text-black'>
        <AppHeader />
        <main id='main-content' tabIndex={-1} className='mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-12'>
          <PageBackLink href={`/quiz/${quizId}`} className='mb-6'>
            {t.common.backToCertification}
          </PageBackLink>
          <h1 className='text-lg font-black'>
            {t.results.practiceTitle}
            <span className='font-medium text-black/60'>, {drillTitle}</span>
          </h1>

          <DrillColumns outcomes={outcomes} current={-1} replay className='mt-6 h-28 border-b-4 sm:h-48' />

          <div className='mt-6 sm:mt-8'>
            <ScoreCount value={percentage} suffix='%' delay={afterColumns} />
          </div>
          <p
            // The server's verdict decides the colour, never a band of our own.
            className={cn('mt-4 inline-block border-2 border-black px-3 py-1 font-black', passed ? 'bg-success' : 'bg-destructive')}
          >
            {result.passingScore == null
              ? t.attempt.verdict(passed)
              : t.results.passingScore(passed, `${result.passingScore}%`)}
          </p>
          <p className='mt-4 max-w-[30ch] text-2xl font-extrabold leading-tight font-stretch-[88%] sm:text-3xl'>
            {t.results.scoreLine(result.correctCount, result.totalQuestions)}.
            {longestRun > 1 && ` ${t.results.longestRun(longestRun)}`}
          </p>
          {/* Only a Drill Mix built from the visitor's own history brings misses back, and it
              promises no particular mix: the draw has its own seats and cooldown. */}
          {drillDetail.drawRule === DrawRule.drill_mix && drillDetail.composition && result.correctCount < result.totalQuestions && (
            <p className='mt-3 max-w-[46ch] text-lg font-medium text-black/70'>{t.results.missedReturn}</p>
          )}

          <div className='mt-8 flex flex-col gap-4 sm:flex-row'>
            {/* Focused on arrival, so Enter starts the next one. */}
            <Button size='lg' autoFocus onClick={attempt.restart} disabled={attempt.restarting}>
              {attempt.restarting ? t.common.starting : t.results.nextDrill}
            </Button>
            <Button size='lg' variant='outline' asChild>
              <Link href={`/quiz/${quizId}`}>{t.common.backToCertification}</Link>
            </Button>
          </div>

          <div className='mt-10 space-y-8'>
            {/* After the Check the same fact is a reward, not a prime (issue #53): over the
                review it lands as a win, and an anonymous visitor sees the pitch here too. */}
            <DrillBanner
              composition={drillDetail.composition}
              drawRule={drillDetail.drawRule}
              questionCount={questionsCount}
              place='review'
            />

            <QuestionReview
              questions={result.questions}
              heading={t.review.reviewHeading}
              renderReportControl={question =>
                drillDetail.submissionId == null ? null : (
                  <ReportQuestionControl
                    submissionId={drillDetail.submissionId}
                    questionId={question.id}
                    reported={reported.includes(question.id)}
                    onReported={attempt.markReported}
                    suggestable={{
                      text: question.text,
                      answers: question.answers.map(answer => ({
                        id: answer.id,
                        text: answer.text ?? '',
                        isCorrect: answer.isCorrect
                      }))
                    }}
                  />
                )
              }
            />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <PracticeQuestionCard
      index={currentIndex}
      total={questionsCount}
      question={currentQuestion}
      selectedIds={attempt.selectedIds}
      onSelect={attempt.select}
      phase={attempt.phase === 'checked' ? 'revealed' : 'answering'}
      reveal={reveal}
      onCheck={attempt.check}
      onContinue={attempt.proceed}
      canCheck={attempt.canCheck}
      isChecking={attempt.phase === 'checking'}
      isFinishing={attempt.submitting}
      isLast={attempt.isLast}
      outcomes={attempt.outcomes}
      exitHref={`/quiz/${quizId}`}
      // Only before the first answer: once the drill is under way the slot has said its
      // piece, and repeating it would just be noise.
      banner={
        currentIndex === 0 && attempt.phase !== 'checked' && (
          <DrillBanner
            composition={drillDetail.composition}
            drawRule={drillDetail.drawRule}
            questionCount={questionsCount}
          />
        )
      }
      reportControl={
        currentQuestion.id != null &&
        drillDetail.submissionId != null && (
          <ReportQuestionControl
            submissionId={drillDetail.submissionId}
            questionId={currentQuestion.id}
            reported={reported.includes(currentQuestion.id)}
            onReported={attempt.markReported}
            // The key only exists after the Check, which is also the only
            // moment this control is rendered (issue #41).
            suggestable={
              reveal == null
                ? undefined
                : {
                    text: currentQuestion.text ?? '',
                    answers: (currentQuestion.answers ?? [])
                      .filter(answer => answer.id != null)
                      .map(answer => ({
                        id: answer.id!,
                        text: answer.text ?? '',
                        isCorrect: (reveal.correctAnswerIds ?? []).includes(
                          answer.id!
                        )
                      }))
                  }
            }
          />
        )
      }
    />
  );
}
