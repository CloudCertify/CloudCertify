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
import { PracticeQuestionCard } from '@/components/practice-question-card';
import type { PracticePhase } from '@/components/practice-question-card';
import { QuestionReview } from '@/components/question-review';
import { Footer } from '@/components/footer';
import { toast } from 'sonner';
import {
  postQuizQuizIdSubquizzesSubquizIdStart,
  postQuizQuizIdSubquizzesSubquizIdCheck,
  postQuizQuizIdSubquizzesSubquizIdFinish
} from '@/http/generated/api';

// Subquiz attempts are scored as a 0–100 percentage; pass is server-decided (issue #10).
const PASS_THRESHOLD = 70;
import type {
  SubquizDetailDto,
  CheckAnswerResponseDto,
  QuizResultQuestionDto
} from '@/http/generated/api.schemas';

type SessionData = {
  subquizDetail: SubquizDetailDto;
  email: string | null;
};

type Phase = 'quiz' | 'results';

export function SubquizSessionPage() {
  const params = useParams<{ id: string; subquizId: string }>();
  const quizId = Number(params.id);
  const subquizId = Number(params.subquizId);
  const [, navigate] = useLocation();

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [phase, setPhase] = useState<Phase>('quiz');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  // Per-question reveal state machine: `answering` until Check, then `revealed`.
  const [questionPhase, setQuestionPhase] =
    useState<PracticePhase>('answering');
  const [reveal, setReveal] = useState<CheckAnswerResponseDto | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [passed, setPassed] = useState(false);
  const [correctCount, setCorrectCount] = useState<number | null>(null);
  const [totalQuestions, setTotalQuestions] = useState<number | null>(null);
  const [resultQuestions, setResultQuestions] = useState<
    QuizResultQuestionDto[] | null
  >(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(
      `subquiz-session-${quizId}-${subquizId}`
    );
    if (!raw) {
      navigate(`/quiz/${quizId}`);
      return;
    }
    try {
      setSessionData(JSON.parse(raw));
    } catch {
      navigate(`/quiz/${quizId}`);
    }
  }, [quizId, subquizId, navigate]);

  if (!sessionData) return null;

  const { subquizDetail, email } = sessionData;
  const questions = subquizDetail.questions ?? [];
  const questionsCount = questions.length;
  const currentQuestion = questions[currentIndex];

  const isLast = currentIndex >= questionsCount - 1;

  const handleAnswerSelect = (answerId: number) => {
    // Options lock once Checked; ignore any clicks while revealed.
    if (questionPhase === 'revealed') return;
    const type = currentQuestion.type;
    const selectCount = currentQuestion.selectCount ?? 1;

    setSelectedIds(current => {
      if (type === 'multiple_response') {
        if (current.includes(answerId)) {
          return current.filter(id => id !== answerId);
        }
        if (current.length >= selectCount) return current;
        return [...current, answerId];
      }
      return [answerId];
    });
  };

  const handleCheck = async () => {
    if (currentQuestion.id == null) return;
    setIsChecking(true);
    try {
      const res = await postQuizQuizIdSubquizzesSubquizIdCheck(
        quizId,
        subquizId,
        {
          submissionId: subquizDetail.submissionId,
          questionId: currentQuestion.id,
          answerIds: selectedIds
        }
      );
      setReveal(res.data);
      setQuestionPhase('revealed');
    } catch {
      // Leave the question in `answering` so the learner can retry the Check.
      toast.error('Could not check this answer. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const finishSubquiz = async () => {
    setIsFinishing(true);
    try {
      const res = await postQuizQuizIdSubquizzesSubquizIdFinish(
        quizId,
        subquizId,
        {
          submissionId: subquizDetail.submissionId
        }
      );
      setScore(res.data.score);
      setPassed(res.data.passed);
      setCorrectCount(res.data.correctCount);
      setTotalQuestions(res.data.totalQuestions);
      setResultQuestions(res.data.questions);
      setPhase('results');
    } catch {
      // Keep the session intact so Continue can be retried.
      toast.error('Could not finish this practice. Please try again.');
    } finally {
      setIsFinishing(false);
    }
  };

  const handleContinue = () => {
    if (isLast) {
      finishSubquiz();
      return;
    }
    // Advance to the next question and reset its reveal state. No going back.
    setCurrentIndex(i => i + 1);
    setSelectedIds([]);
    setReveal(null);
    setQuestionPhase('answering');
  };

  const handleTryAgain = async () => {
    setIsRestarting(true);
    try {
      const res = await postQuizQuizIdSubquizzesSubquizIdStart(
        quizId,
        subquizId,
        { email }
      );
      const newData: SessionData = { subquizDetail: res.data, email };
      sessionStorage.setItem(
        `subquiz-session-${quizId}-${subquizId}`,
        JSON.stringify(newData)
      );
      setSessionData(newData);
      setCurrentIndex(0);
      setSelectedIds([]);
      setReveal(null);
      setQuestionPhase('answering');
      setScore(null);
      setPassed(false);
      setCorrectCount(null);
      setTotalQuestions(null);
      setResultQuestions(null);
      setPhase('quiz');
    } catch {
      toast.error('Could not start a new attempt. Please try again.');
    } finally {
      setIsRestarting(false);
    }
  };

  const pageHeader = (backLabel: string) => (
    <header className='sticky top-0 z-50 w-full border-b-2 border-black bg-white'>
      <div className='container flex h-16 items-center justify-between'>
        <Link href='/' className='flex gap-2 items-center text-xl font-black'>
          <div className='h-10 w-10 rounded-[5px] border-2 border-black bg-primary flex items-center justify-center shadow-[2px_2px_0px_0px_#000]'>
            <Cloud className='h-5 w-5 text-white' />
          </div>
          <span>CloudCertify</span>
        </Link>
        <Button variant='outline' size='sm' asChild>
          <Link href={`/quiz/${quizId}`}>
            <ArrowLeft className='mr-2 h-4 w-4' />
            {backLabel}
          </Link>
        </Button>
      </div>
    </header>
  );

  if (phase === 'results') {
    const total = totalQuestions ?? 0;
    const correct = correctCount ?? 0;
    // Server-authoritative 0–100 score; fall back to a local ratio only if absent.
    const percentage =
      score ?? (total > 0 ? Math.round((correct / total) * 100) : 0);
    const scoreColor =
      percentage >= 80 ? '#15a06e' : percentage >= 60 ? '#ffb020' : '#e23b48';
    // Amber reads with black ink; the darker green/red bands take white.
    const scoreInk =
      percentage >= 60 && percentage < 80 ? 'text-black' : 'text-white';

    return (
      <div className='flex min-h-dvh flex-col bg-background'>
        {pageHeader('Back to Certification')}
        <main className='flex-1 container max-w-4xl mx-auto py-12 px-4'>
          <Card className='w-full border-4 border-black shadow-[8px_8px_0px_0px_#000]'>
            <CardHeader className='text-center border-b-2 border-black pb-6'>
              <CardTitle className='text-2xl md:text-3xl font-black text-black'>
                Practice results
              </CardTitle>
              <p className='text-black/70 font-medium mt-1'>
                {subquizDetail.title}
              </p>
              {subquizDetail.domain && (
                <div className='flex justify-center mt-2'>
                  <Badge
                    variant='outline'
                    className='border-2 border-black font-bold'
                  >
                    {subquizDetail.domain}
                  </Badge>
                </div>
              )}
            </CardHeader>
            <CardContent className='space-y-8 py-8'>
              <div className='flex flex-col items-center space-y-4'>
                <div
                  className='h-32 w-32 rounded-[5px] border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_#000]'
                  style={{ backgroundColor: scoreColor }}
                >
                  <span className={`text-5xl font-black ${scoreInk}`}>
                    {percentage}%
                  </span>
                </div>
                <Badge className={passed ? 'bg-success' : 'bg-destructive'}>
                  {passed ? 'PASS' : 'FAIL'} (Passing score: {PASS_THRESHOLD}%)
                </Badge>
                <p className='text-xl font-bold text-black'>
                  You got <span className='font-black'>{correct}</span> out of{' '}
                  <span className='font-black'>{total}</span> questions correct
                </p>
                <div className='w-full max-w-md'>
                  <Progress value={percentage} />
                </div>
              </div>

              <QuestionReview
                questions={resultQuestions ?? []}
                heading='Question review'
              />
            </CardContent>
            <CardFooter className='flex flex-col sm:flex-row gap-4 justify-between border-t-2 border-black pt-6'>
              <Button
                variant='outline'
                onClick={handleTryAgain}
                disabled={isRestarting}
              >
                {isRestarting ? 'Starting...' : 'Try Again'}
              </Button>
              <Button asChild>
                <Link href={`/quiz/${quizId}`}>Back to Certification</Link>
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
      {pageHeader('Back')}
      <main className='flex-1 container max-w-4xl mx-auto py-12 px-4'>
        <PracticeQuestionCard
          index={currentIndex}
          total={questionsCount}
          question={currentQuestion}
          meta={<Badge>{subquizDetail.title}</Badge>}
          selectedIds={selectedIds}
          onSelect={handleAnswerSelect}
          phase={questionPhase}
          reveal={reveal}
          onCheck={handleCheck}
          onContinue={handleContinue}
          isChecking={isChecking}
          isFinishing={isFinishing}
          isLast={isLast}
        />
      </main>
      <Footer />
    </div>
  );
}
