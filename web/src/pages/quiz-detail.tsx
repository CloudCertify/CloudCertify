import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Cloud,
  Lock,
  Target,
  Zap
} from 'lucide-react';
import { Link, useLocation, useParams } from 'wouter';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/footer';
import {
  postQuizQuizIdStart,
  postQuizQuizIdSubquizzesSubquizIdStart,
  useGetQuizQuizId
} from '@/http/generated/api';
import type { SubquizDto } from '@/http/generated/api.schemas';
import { getLucideIcon } from '@/lib/quiz-icon';
import { getLevelStyle } from '@/lib/quiz-level';
import { capitalize } from '@/lib/utils';
import { useAuth } from '@/auth/context';
import { AuthMenu } from '@/components/auth-menu';

// --- Validation ---
const emailSchema = z.email('Please enter a valid email address.');

// --- Constants ---
const PROVIDER_LABELS: Record<string, string> = {
  aws: 'Amazon Web Services',
  gcp: 'Google Cloud',
  azure: 'Microsoft Azure'
};

// --- Helpers ---
// The per-exam count comes from the quiz's own [min, max] range: a single number
// when fixed (min === max), else "min–max". Falls back to null if unset (issue #24).
function formatExamQuestionRange(
  min: number | undefined,
  max: number | undefined
): string | null {
  if (min == null || max == null || min <= 0 || max < min) return null;
  return min === max ? `${min}` : `${min}–${max}`;
}

// --- Page ---
export function QuizDetailPage() {
  const params = useParams<{ id: string }>();
  const quizId = Number(params.id);
  const [, navigate] = useLocation();

  const { data, isLoading } = useGetQuizQuizId(quizId);
  const quiz = data?.data;
  const { isAuthenticated } = useAuth();

  const [email, setEmail] = useState(() => {
    try {
      const raw = sessionStorage.getItem(`quiz-session-${quizId}`);
      if (raw) return JSON.parse(raw).email ?? '';
    } catch {
      /* no saved session */
    }
    return '';
  });
  const [emailError, setEmailError] = useState<string | null>(null);

  const [isStartingExam, setIsStartingExam] = useState(false);
  const [startingSubquizId, setStartingSubquizId] = useState<number | null>(
    null
  );

  const validateEmail = (): boolean => {
    // Logged-in Users are identified by their Bearer token; no email needed.
    if (isAuthenticated) return true;
    const result = emailSchema.safeParse(email.trim());
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? 'Invalid email.';
      setEmailError(msg);
      toast.error(msg);
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleStartExam = async () => {
    if (!validateEmail()) return;
    setIsStartingExam(true);
    try {
      const response = await postQuizQuizIdStart(
        quizId,
        isAuthenticated ? {} : { email: email.trim() }
      );
      sessionStorage.setItem(
        `quiz-session-${quizId}`,
        JSON.stringify({
          quizDetail: response.data,
          email: isAuthenticated ? null : email.trim()
        })
      );
      navigate(`/quiz/${quizId}/session`);
    } catch {
      toast.error('Failed to start the exam. Please try again.');
    } finally {
      setIsStartingExam(false);
    }
  };

  const handleStartSubquiz = async (subquiz: SubquizDto) => {
    if (!validateEmail()) return;
    setStartingSubquizId(subquiz.id);
    try {
      const response = await postQuizQuizIdSubquizzesSubquizIdStart(
        quizId,
        subquiz.id,
        isAuthenticated ? {} : { email: email.trim() }
      );
      sessionStorage.setItem(
        `subquiz-session-${quizId}-${subquiz.id}`,
        JSON.stringify({
          subquizDetail: response.data,
          email: isAuthenticated ? null : email.trim()
        })
      );
      navigate(`/quiz/${quizId}/subquiz/${subquiz.id}/session`);
    } catch {
      toast.error('Failed to start the practice. Please try again.');
    } finally {
      setStartingSubquizId(null);
    }
  };

  const { bg: levelColor, ink: levelInk } = getLevelStyle(quiz?.quizLevel);
  const subquizzes = quiz?.subQuizzes ?? [];
  const examQuestionCount = formatExamQuestionRange(
    quiz?.minQuestions,
    quiz?.maxQuestions
  );

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
              <Link href='/dashboard'>
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className='flex-1 container max-w-3xl mx-auto py-12 px-4 space-y-10'>
        {isLoading ? (
          <div className='h-64 animate-pulse rounded-[5px] border-2 border-dashed border-black bg-white' />
        ) : quiz ? (
          <>
            {/* Certification header */}
            <div className='flex flex-col items-center text-center space-y-4'>
              <div
                className={`h-20 w-20 rounded-[5px] border-2 border-black ${levelColor} flex items-center justify-center shadow-[4px_4px_0px_0px_#000]`}
              >
                {getLucideIcon(quiz.iconName, {
                  className: `h-10 w-10 ${levelInk}`
                })}
              </div>
              <h1 className='text-3xl md:text-4xl font-black text-black text-balance'>
                {quiz.title}
              </h1>
              {quiz.description && (
                <p className='text-black/70 font-medium max-w-xl text-pretty'>
                  {quiz.description}
                </p>
              )}
              <div className='flex justify-center gap-3 flex-wrap'>
                {quiz.quizProvider && (
                  <Badge className='bg-primary border-2 border-black text-white font-bold'>
                    {PROVIDER_LABELS[quiz.quizProvider] ??
                      quiz.quizProvider.toUpperCase()}
                  </Badge>
                )}
                {quiz.quizLevel && (
                  <Badge
                    className={`${levelColor} border-2 border-black ${levelInk} font-bold`}
                  >
                    {capitalize(quiz.quizLevel)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Shared email input — hidden for logged-in Users, whose
                identity travels in the Bearer token instead */}
            {!isAuthenticated && (
            <div className='space-y-2'>
              <label
                htmlFor='email'
                className='block text-sm font-black text-black'
              >
                Your email
              </label>
              <input
                id='email'
                type='email'
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                onBlur={() => {
                  if (email.trim()) {
                    const result = emailSchema.safeParse(email.trim());
                    if (!result.success) {
                      setEmailError(
                        result.error.issues[0]?.message ?? 'Invalid email.'
                      );
                    } else {
                      setEmailError(null);
                    }
                  }
                }}
                placeholder='you@example.com'
                className={`w-full rounded-[5px] border-2 px-4 py-3 text-black font-medium placeholder:text-black/40 focus:outline-none bg-white transition-shadow ${
                  emailError
                    ? 'border-destructive shadow-[2px_2px_0px_0px_#e23b48] focus:shadow-[4px_4px_0px_0px_#e23b48]'
                    : 'border-black shadow-[2px_2px_0px_0px_#000] focus:shadow-[4px_4px_0px_0px_#000]'
                }`}
              />
              {emailError && (
                <p className='text-sm font-bold text-destructive'>{emailError}</p>
              )}
            </div>
            )}

            {/* Full simulation exam */}
            <section className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Target className='h-5 w-5 text-black' />
                <h2 className='text-xl font-black text-black'>
                  Full simulation exam
                </h2>
              </div>
              <Card className='border-4 border-black shadow-[6px_6px_0px_0px_#000]'>
                <CardHeader className='border-b-2 border-black pb-4'>
                  <CardTitle className='text-lg font-black text-black'>
                    {quiz.title}
                  </CardTitle>
                  <p className='text-sm font-medium text-black/70 mt-1'>
                    Full-length exam simulation. At the end you&apos;ll see your
                    scaled score, whether you&apos;d pass, and which domains
                    need work.
                  </p>
                </CardHeader>
                <CardContent className='py-4'>
                  <div className='flex gap-3 flex-wrap'>
                    {quiz.questionCount != null && (
                      <Badge
                        variant='outline'
                        className='border-2 border-black font-bold flex items-center gap-1'
                      >
                        <BookOpen className='h-3 w-3' />
                        {quiz.questionCount} Questions in pool
                      </Badge>
                    )}
                    {examQuestionCount && (
                      <Badge
                        variant='outline'
                        className='border-2 border-black font-bold flex items-center gap-1'
                      >
                        <Target className='h-3 w-3' />~{examQuestionCount} per
                        exam
                      </Badge>
                    )}
                    <Badge
                      variant='outline'
                      className='border-2 border-black font-bold'
                    >
                      Scaled Score
                    </Badge>
                    <Badge
                      variant='outline'
                      className='border-2 border-black font-bold'
                    >
                      Pass / Fail
                    </Badge>
                    <Badge
                      variant='outline'
                      className='border-2 border-black font-bold'
                    >
                      Domain Breakdown
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className='border-t-2 border-black pt-4'>
                  <Button
                    className='w-full'
                    onClick={handleStartExam}
                    disabled={isStartingExam}
                  >
                    {isStartingExam ? 'Starting...' : 'Start Exam'}
                    {!isStartingExam && <ArrowRight className='ml-2 h-4 w-4' />}
                  </Button>
                </CardFooter>
              </Card>
            </section>

            {/* Domain Practice Subquizzes */}
            {subquizzes.length > 0 && (
              <section className='space-y-4'>
                <div className='flex items-center gap-2'>
                  <Zap className='h-5 w-5 text-black' />
                  <h2 className='text-xl font-black text-black'>
                    Domain practice
                  </h2>
                </div>
                <p className='text-sm text-black/70 font-medium -mt-2'>
                  15-question focused quizzes per domain. Fast feedback, no
                  pass/fail pressure.
                </p>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {subquizzes.map(sq => (
                    <SubquizCard
                      key={sq.id}
                      subquiz={sq}
                      isStarting={startingSubquizId === sq.id}
                      onStart={() => handleStartSubquiz(sq)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className='text-center space-y-4'>
            <p className='font-bold text-black'>Quiz not found.</p>
            <Button variant='outline' asChild>
              <Link href='/dashboard'>Back to Dashboard</Link>
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function SubquizCard({
  subquiz,
  isStarting,
  onStart
}: {
  subquiz: SubquizDto;
  isStarting: boolean;
  onStart: () => void;
}) {
  const isUnavailable = !subquiz.isAvailable;

  return (
    <Card
      className={`border-2 border-black ${
        isUnavailable
          ? 'opacity-60 shadow-none bg-white/60'
          : 'shadow-[4px_4px_0px_0px_#000] bg-white'
      }`}
    >
      <CardHeader className='pb-2'>
        <div className='flex items-start justify-between gap-2'>
          <CardTitle className='text-base font-black text-black leading-tight'>
            {subquiz.title}
          </CardTitle>
          {isUnavailable && (
            <Lock className='h-4 w-4 text-black/40 shrink-0 mt-0.5' />
          )}
        </div>
        <Badge
          variant='outline'
          className='border-2 border-black font-bold text-xs w-fit mt-1'
        >
          {subquiz.domain}
        </Badge>
      </CardHeader>
      <CardFooter className='pt-0'>
        <div className='flex items-center justify-between w-full'>
          <span className='text-xs font-bold text-black/50'>15 Questions</span>
          <Button
            size='sm'
            onClick={onStart}
            disabled={isUnavailable || isStarting}
          >
            {isStarting ? 'Starting...' : 'Practice'}
            {!isStarting && <ArrowRight className='ml-1 h-3 w-3' />}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
