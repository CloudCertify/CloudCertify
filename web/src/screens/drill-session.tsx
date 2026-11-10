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
import { PracticeQuestionCard } from '@/components/practice-question-card';
import { QuestionReview } from '@/components/question-review';
import { DrillBanner } from '@/components/drill-banner';
import { ReportQuestionControl } from '@/components/report-question-control';
import { Footer } from '@/components/footer';
import { AppHeader } from '@/components/app-header';
import { PageBackLink } from '@/components/page-back-link';
import { useI18n } from '@/i18n/use-i18n';
import { isWholeQuizMix } from '@/lib/whole-quiz-mix';
import type { DrillDetailDto } from '@/http/generated/api.schemas';
import { AttemptEmpty } from '@/components/attempt-empty';
import { useAttempt } from '@/attempt/use-attempt';

export function DrillSessionPage() {
  const params = useParams<{ id: string; drillId: string }>();
  const quizId = Number(params.id);
  const drillId = Number(params.drillId);
  const { t } = useI18n();
  const attempt = useAttempt({ quizId, drillId });

  if (attempt.status === 'loading' || attempt.payload == null) return null;

  if (attempt.status === 'empty') return <AttemptEmpty quizId={quizId} />;

  const drillDetail: DrillDetailDto = attempt.payload.detail;
  const { questions, currentIndex, result, checkResponse: reveal, reported } = attempt;
  const currentQuestion = attempt.currentQuestion!;
  const drillTitle = isWholeQuizMix(drillDetail) ? t.quizDetail.mixTitle : drillDetail.title;
  const questionsCount = questions.length;

  if (attempt.status === 'finished' && result) {
    const { passed, score: percentage } = result;

    return (
      <div className='flex min-h-dvh flex-col bg-background'>
        <AppHeader />
        <main id='main-content' tabIndex={-1} className='flex-1 container max-w-4xl mx-auto py-12 px-4'>
          <PageBackLink href={`/quiz/${quizId}`} className='mb-6'>
            {t.common.backToCertification}
          </PageBackLink>
          <Card className='w-full border-4 border-black shadow-[8px_8px_0px_0px_#000]'>
            <CardHeader className='text-center border-b-2 border-black pb-6'>
              <CardTitle className='text-2xl md:text-3xl font-black text-black'>
                {t.results.practiceTitle}
              </CardTitle>
              <p className='text-black/70 font-medium mt-1'>
                {drillTitle}
              </p>
              {drillDetail.domain && (
                <div className='flex justify-center mt-2'>
                  <Badge
                    variant='outline'
                    className='border-2 border-black font-bold'
                  >
                    {drillDetail.domain}
                  </Badge>
                </div>
              )}
            </CardHeader>
            <CardContent className='space-y-8 py-8'>
              <div className='flex flex-col items-center space-y-4'>
                <div
                  className='h-32 w-32 rounded-none border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_#000]'
                  // The server's verdict decides the colour, never a band of our own.
                  style={{ backgroundColor: passed ? '#15a06e' : '#e23b48' }}
                >
                  <span className='text-5xl font-black text-white'>
                    {percentage}%
                  </span>
                </div>
                <Badge className={passed ? 'bg-success' : 'bg-destructive'}>
                  {result.passingScore == null
                    ? t.attempt.verdict(passed)
                    : t.results.passingScore(passed, `${result.passingScore}%`)}
                </Badge>
                <p className='text-xl font-bold text-black'>
                  {t.results.scoreLine(result.correctCount, result.totalQuestions)}
                </p>
                <div className='w-full max-w-md'>
                  <Progress value={percentage} />
                </div>
              </div>

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
            </CardContent>
            <CardFooter className='flex flex-col sm:flex-row gap-4 justify-between border-t-2 border-black pt-6'>
              <Button
                variant='outline'
                onClick={attempt.restart}
                disabled={attempt.restarting}
              >
                {attempt.restarting ? t.common.starting : t.common.tryAgain}
              </Button>
              <Button asChild>
                <Link href={`/quiz/${quizId}`}>
                  {t.common.backToCertification}
                </Link>
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
      <main id='main-content' tabIndex={-1} className='flex-1 container max-w-4xl mx-auto py-12 px-4'>
        <PageBackLink href={`/quiz/${quizId}`} className='mb-6'>
          {t.common.back}
        </PageBackLink>
        {/* Only before the first answer: once the drill is under way the slot has said its
            piece, and repeating it would just be noise. */}
        {currentIndex === 0 && attempt.phase !== 'checked' && (
          <DrillBanner
            composition={drillDetail.composition}
            drawRule={drillDetail.drawRule}
            questionCount={questionsCount}
          />
        )}
        <PracticeQuestionCard
          index={currentIndex}
          total={questionsCount}
          question={currentQuestion}
          meta={<Badge>{drillTitle}</Badge>}
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
      </main>
      <Footer />
    </div>
  );
}
