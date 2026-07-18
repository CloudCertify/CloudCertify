import { useState, useEffect } from 'react';
import { ArrowLeft, Cloud } from 'lucide-react';
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
import { Footer } from '@/components/footer';
import { toast } from 'sonner';
import { postQuizQuizIdStart, postQuizQuizIdSubmit } from '@/http/generated/api';
import type {
  QuizDetailDto,
  QuizAnswer,
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

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [phase, setPhase] = useState<Phase>('quiz');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number[]>>({});
  const [scaledScore, setScaledScore] = useState<number | null>(null);
  const [passed, setPassed] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState<number | null>(null);
  const [domainBreakdown, setDomainBreakdown] = useState<DomainResult[]>([]);
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

  const handleAnswerSelect = (answerId: number) => {
    if (currentQuestion.id == null) return;
    const qId = currentQuestion.id!;
    const type = currentQuestion.type;
    const selectCount = currentQuestion.selectCount ?? 1;

    setUserAnswers(prev => {
      const current = prev[qId] ?? [];
      if (type === 'multiple_response') {
        if (current.includes(answerId)) {
          return { ...prev, [qId]: current.filter(id => id !== answerId) };
        }
        if (current.length >= selectCount) return prev;
        return { ...prev, [qId]: [...current, answerId] };
      }
      return { ...prev, [qId]: [answerId] };
    });
  };

  const unansweredCount = questions.filter(
    q => q.id == null || (userAnswers[q.id]?.length ?? 0) === 0
  ).length;

  // Submission is final and Finish is reachable from anywhere (Navigator,
  // persistent button, Enter on the last question) — always confirm.
  const handleFinishRequest = () => setConfirmFinishOpen(true);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const answers: QuizAnswer[] = Object.entries(userAnswers).map(
      ([questionId, answerIds]) => ({ questionId: Number(questionId), answerIds })
    );
    try {
      const res = await postQuizQuizIdSubmit(quizId, {
        submissionId: quizDetail.submissionId,
        answers
      });
      setScaledScore(res.data.scaledScore);
      setPassed(res.data.passed);
      setTotalQuestions(res.data.totalQuestions);
      setCorrectCount(res.data.correctCount);
      setDomainBreakdown(res.data.domainBreakdown ?? []);
      setResultQuestions(res.data.questions);
      setPhase('results');
    } catch {
      // A finished submission can't be re-graded (server-authoritative, issue #12):
      // surface it instead of silently re-enabling the button on a dead-ended attempt.
      toast.error(
        'Could not submit this attempt. It may already be finished — use "Try Again" to start a new one.'
      );
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
      setScaledScore(null);
      setPassed(false);
      setTotalQuestions(null);
      setCorrectCount(null);
      setDomainBreakdown([]);
      setResultQuestions(null);
      setPhase('quiz');
    } catch {
      toast.error('Could not start a new attempt. Please try again.');
    } finally {
      setIsRestarting(false);
    }
  };

  const header = (backHref: string, backLabel: string) => (
    <header className='sticky top-0 z-50 w-full border-b-2 border-black bg-white'>
      <div className='container flex h-16 items-center justify-between'>
        <Link href='/' className='flex gap-2 items-center text-xl font-black'>
          <div className='h-10 w-10 rounded-[5px] border-2 border-black bg-primary flex items-center justify-center shadow-[2px_2px_0px_0px_#000]'>
            <Cloud className='h-5 w-5 text-white' />
          </div>
          <span>CloudCertify</span>
        </Link>
        <Button variant='outline' size='sm' asChild>
          <Link href={backHref}>
            <ArrowLeft className='mr-2 h-4 w-4' />
            {backLabel}
          </Link>
        </Button>
      </div>
    </header>
  );

  if (phase === 'results') {
    // Scaled score runs 100–1000; map onto the 0–100 progress bar.
    const barValue =
      scaledScore != null
        ? Math.max(0, Math.min(100, Math.round(((scaledScore - 100) / 900) * 100)))
        : 0;

    return (
      <div className='flex min-h-dvh flex-col bg-background'>
        {header('/dashboard', 'Back to Dashboard')}
        <main className='flex-1 container max-w-4xl mx-auto py-12 px-4'>
          <Card className='w-full border-4 border-black shadow-[8px_8px_0px_0px_#000]'>
            <CardHeader className='text-center border-b-2 border-black pb-6'>
              <CardTitle className='text-2xl md:text-3xl font-black text-black'>
                Quiz results
              </CardTitle>
              <p className='text-black/70 font-medium mt-2'>{quizDetail.title}</p>
            </CardHeader>
            <CardContent className='space-y-8 py-8'>
              <div className='flex flex-col items-center justify-center space-y-4'>
                <div
                  className='h-32 w-32 rounded-[5px] border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_#000]'
                  style={{ backgroundColor: passed ? '#15a06e' : '#e23b48' }}
                >
                  <span className='text-4xl font-black text-white'>{scaledScore}</span>
                </div>

                <Badge className={passed ? 'bg-success' : 'bg-destructive'}>
                  {passed ? 'PASS' : 'FAIL'} (Passing score: {PASSING_SCALED_SCORE})
                </Badge>

                <p className='text-xl font-bold text-black'>
                  You got <span className='font-black'>{correctCount ?? 0}</span> out of{' '}
                  <span className='font-black'>{totalQuestions}</span> questions correct
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
                  <h3 className='text-xl font-black text-black'>Domain breakdown</h3>
                  <div className='space-y-2'>
                    {domainBreakdown.map(domain => {
                      const pct =
                        domain.total > 0
                          ? Math.round((domain.correct / domain.total) * 100)
                          : 0;
                      return (
                        <div
                          key={domain.domain}
                          className='rounded-[5px] border-2 border-black p-3'
                        >
                          <div className='flex items-center justify-between mb-2'>
                            <span className='font-bold text-black'>{domain.domain}</span>
                            <span className='text-sm font-bold text-black/70'>
                              {domain.correct}/{domain.total} ({pct}%) · weight{' '}
                              {Math.round(domain.weight * 100)}%
                            </span>
                          </div>
                          <Progress value={pct} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <QuestionReview
                questions={resultQuestions ?? []}
                heading='Question summary'
              />
            </CardContent>
            <CardFooter className='flex flex-col sm:flex-row gap-4 justify-between border-t-2 border-black pt-6'>
              <Button variant='outline' onClick={handleTryAgain} disabled={isRestarting}>
                {isRestarting ? 'Starting...' : 'Try Again'}
              </Button>
              <Button asChild>
                <Link href='/dashboard'>Back to Dashboard</Link>
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
      {header(`/quiz/${quizId}`, 'Back')}
      <main className='container mx-auto flex-1 max-w-7xl px-4 py-12'>
        <div className='relative flex items-start justify-center gap-0 pt-12 lg:gap-6 lg:pt-0'>
          <QuestionNavigator
            currentIndex={currentIndex}
            answered={questions.map(
              q => q.id != null && (userAnswers[q.id]?.length ?? 0) > 0
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
              finishLabel='Finish Quiz'
              isSubmitting={isSubmitting}
            />
            <div className='flex justify-end'>
              <Button onClick={handleFinishRequest} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Finish Quiz'}
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
