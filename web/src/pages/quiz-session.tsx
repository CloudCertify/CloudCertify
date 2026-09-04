import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'wouter';
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
import { toast } from 'sonner';
import {
  postQuizQuizIdAnswer,
  postQuizQuizIdStart,
  postQuizQuizIdSubmit
} from '@/http/generated/api';
import type {
  Confidence,
  QuizDetailDto,
  QuizResultQuestionDto,
  DomainResult
} from '@/http/generated/api.schemas';

// Full-quiz attempts report an AWS-style scaled score (100–1000); pass is server-decided.
const PASSING_SCALED_SCORE = 700;

type SessionData = {
  quizDetail: QuizDetailDto;
  email: string | null;
};

type Phase = 'quiz' | 'results';

export function QuizSessionPage() {
  const params = useParams<{ id: string }>();
  const quizId = Number(params.id);
  const [, navigate] = useLocation();
  const { t } = useI18n();

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [phase, setPhase] = useState<Phase>('quiz');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number[]>>({});
  // Confidence is optional and never gates Submit, so an unrated question is simply absent here.
  const [confidences, setConfidences] = useState<Record<number, Confidence>>({});
  const [scaledScore, setScaledScore] = useState<number | null>(null);
  const [passed, setPassed] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState<number | null>(null);
  const [domainBreakdown, setDomainBreakdown] = useState<DomainResult[]>([]);
  // Server-counted from the persisted Recorded Answers, never recomputed from the
  // in-memory ratings above: the attempt is the source of truth (ADR 0006).
  const [luckyGuessCount, setLuckyGuessCount] = useState(0);
  const [misconceptionCount, setMisconceptionCount] = useState(0);
  const [resultQuestions, setResultQuestions] = useState<QuizResultQuestionDto[] | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(`quiz-session-${quizId}`);
    if (!raw) {
      navigate(`/quiz/${quizId}`);
      return;
    }
    try {
      setSessionData(JSON.parse(raw));
    } catch {
      navigate(`/quiz/${quizId}`);
    }
  }, [quizId, navigate]);

  if (!sessionData) return null;

  const { quizDetail, email } = sessionData;
  const questions = quizDetail.questions ?? [];
  const questionsCount = questions.length;
  const currentQuestion = questions[currentIndex];

  // Every selection is committed to the server as a Recorded Answer, so the attempt —
  // not the browser — is the source of truth at Submit (ADR 0006). Re-answering a
  // Question overwrites its previous commit; nothing about correctness comes back.
  const commitAnswer = (
    questionId: number,
    answerIds: number[],
    confidence: Confidence | null
  ) => {
    postQuizQuizIdAnswer(quizId, {
      submissionId: quizDetail.submissionId,
      questionId,
      answerIds,
      confidence
    }).catch(() => toast.error(t.results.answerError));
  };

  // Rating rides along with the answer it describes; the latest commit wins (ADR 0006).
  const handleRate = (confidence: Confidence) => {
    const qId = currentQuestion?.id;
    if (qId == null) return;
    setConfidences(prev => ({ ...prev, [qId]: confidence }));
    commitAnswer(qId, userAnswers[qId] ?? [], confidence);
  };

  const handleAnswerSelect = (answerId: number) => {
    if (currentQuestion.id == null) return;
    const qId = currentQuestion.id!;
    const type = currentQuestion.type;
    const selectCount = currentQuestion.selectCount ?? 1;

    const current = userAnswers[qId] ?? [];
    const next =
      type === 'multiple_response'
        ? current.includes(answerId)
          ? current.filter(id => id !== answerId)
          : current.length >= selectCount
            ? current
            : [...current, answerId]
        : [answerId];

    // Nothing changed (selection capped, or the same single choice re-picked): don't commit,
    // and above all don't drop a Confidence the visitor already gave for this same answer.
    if (next.length === current.length && next.every(id => current.includes(id))) return;

    setUserAnswers(prev => ({ ...prev, [qId]: next }));
    // A new answer invalidates the old rating: changing the answer means re-rating it.
    setConfidences(prev => {
      const remaining = { ...prev };
      delete remaining[qId];
      return remaining;
    });
    commitAnswer(qId, next, null);
  };

  const unansweredCount = questions.filter(
    q => q.id == null || (userAnswers[q.id]?.length ?? 0) === 0
  ).length;

  // Submission is final and Finish is reachable from anywhere (Navigator,
  // persistent button, Enter on the last question) — always confirm.
  const handleFinishRequest = () => setConfirmFinishOpen(true);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // No answers in the body: the server grades the Recorded Answers it collected (ADR 0006).
      const res = await postQuizQuizIdSubmit(quizId, {
        submissionId: quizDetail.submissionId
      });
      setScaledScore(res.data.scaledScore);
      setPassed(res.data.passed);
      setTotalQuestions(res.data.totalQuestions);
      setCorrectCount(res.data.correctCount);
      setDomainBreakdown(res.data.domainBreakdown ?? []);
      setLuckyGuessCount(res.data.luckyGuessCount);
      setMisconceptionCount(res.data.misconceptionCount);
      setResultQuestions(res.data.questions);
      setPhase('results');
    } catch {
      // A finished submission can't be re-graded (server-authoritative, issue #12):
      // surface it instead of silently re-enabling the button on a dead-ended attempt.
      toast.error(t.results.submitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTryAgain = async () => {
    setIsRestarting(true);
    try {
      const res = await postQuizQuizIdStart(quizId, { email });
      const newData: SessionData = { quizDetail: res.data, email };
      sessionStorage.setItem(`quiz-session-${quizId}`, JSON.stringify(newData));
      setSessionData(newData);
      setCurrentIndex(0);
      setUserAnswers({});
      setConfidences({});
      setScaledScore(null);
      setPassed(false);
      setTotalQuestions(null);
      setCorrectCount(null);
      setDomainBreakdown([]);
      setLuckyGuessCount(0);
      setMisconceptionCount(0);
      setResultQuestions(null);
      setPhase('quiz');
    } catch {
      toast.error(t.results.restartError);
    } finally {
      setIsRestarting(false);
    }
  };

  if (phase === 'results') {
    // Scaled score runs 100–1000; map onto the 0–100 progress bar.
    const barValue =
      scaledScore != null
        ? Math.max(0, Math.min(100, Math.round(((scaledScore - 100) / 900) * 100)))
        : 0;

    return (
      <div className='flex min-h-dvh flex-col bg-background'>
        <AppHeader />
        <main className='flex-1 container max-w-4xl mx-auto py-12 px-4'>
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
                  {t.results.passingScore(passed, String(PASSING_SCALED_SCORE))}
                </Badge>

                <p className='text-xl font-bold text-black'>
                  {t.results.scoreLine(correctCount ?? 0, totalQuestions ?? 0)}
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
                luckyGuessCount={luckyGuessCount}
                misconceptionCount={misconceptionCount}
                questions={resultQuestions ?? []}
              />

              <QuestionReview questions={resultQuestions ?? []} />
            </CardContent>
            <CardFooter className='flex flex-col sm:flex-row gap-4 justify-between border-t-2 border-black pt-6'>
              <Button variant='outline' onClick={handleTryAgain} disabled={isRestarting}>
                {isRestarting ? t.common.starting : t.common.tryAgain}
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
      <main className='container mx-auto flex-1 max-w-7xl px-4 py-12'>
        <PageBackLink href={`/quiz/${quizId}`} className='mb-6'>
          {t.common.back}
        </PageBackLink>
        <div className='relative flex items-start justify-center gap-0 pt-12 lg:gap-6 lg:pt-0'>
          <QuestionNavigator
            currentIndex={currentIndex}
            answered={questions.map(
              q => q.id != null && (userAnswers[q.id]?.length ?? 0) > 0
            )}
            // The visitor's own "come back to this": a Guess or Unsure rating.
            needsReview={questions.map(
              q => q.id != null && needsReview(confidences[q.id])
            )}
            onJump={setCurrentIndex}
          />
          <div className='min-w-0 max-w-4xl flex-1 space-y-6'>
            <QuestionCard
              index={currentIndex}
              total={questionsCount}
              question={currentQuestion}
              meta={<Badge>{quizDetail.title}</Badge>}
              selectedIds={
                currentQuestion?.id != null ? userAnswers[currentQuestion.id] ?? [] : []
              }
              onSelect={handleAnswerSelect}
              onPrev={() => setCurrentIndex(i => i - 1)}
              onNext={() => setCurrentIndex(i => i + 1)}
              onFinish={handleFinishRequest}
              finishLabel={t.question.finishQuiz}
              isSubmitting={isSubmitting}
            />
            {currentQuestion?.id != null &&
              (userAnswers[currentQuestion.id]?.length ?? 0) > 0 && (
                <ConfidenceRating
                  value={confidences[currentQuestion.id] ?? null}
                  onRate={handleRate}
                />
              )}
            <div className='flex justify-end'>
              <Button onClick={handleFinishRequest} disabled={isSubmitting}>
                {isSubmitting ? t.common.submitting : t.question.finishQuiz}
              </Button>
            </div>
            <ConfirmFinishDialog
              open={confirmFinishOpen}
              unansweredCount={unansweredCount}
              onConfirm={() => {
                setConfirmFinishOpen(false);
                handleSubmit();
              }}
              onCancel={() => setConfirmFinishOpen(false)}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
