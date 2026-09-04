import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
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
  postQuizQuizIdDrillsDrillIdStart,
  useGetQuizQuizId
} from '@/http/generated/api';
import type { DrillDto } from '@/http/generated/api.schemas';
import { getLucideIcon } from '@/lib/quiz-icon';
import { getLevelStyle } from '@/lib/quiz-level';
import { capitalize } from '@/lib/utils';
import { useAuth } from '@/auth/use-auth';
import { AppHeader } from '@/components/app-header';
import { AuthMenu } from '@/components/auth-menu';
import { PageBackLink } from '@/components/page-back-link';
import { useI18n } from '@/i18n/use-i18n';
import type { QuizProvider } from '@/http/generated/api.schemas';

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
  const { t } = useI18n();
  const emailSchema = z.email(t.quizDetail.emailInvalid);

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
  const [startingDrillId, setStartingDrillId] = useState<number | null>(null);

  const validateEmail = (): boolean => {
    // Logged-in Users are identified by their Bearer token; no email needed.
    if (isAuthenticated) return true;
    const result = emailSchema.safeParse(email.trim());
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? t.quizDetail.emailInvalid;
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
      toast.error(t.quizDetail.startExamError);
    } finally {
      setIsStartingExam(false);
    }
  };

  const handleStartDrill = async (drill: DrillDto) => {
    if (!validateEmail()) return;
    setStartingDrillId(drill.id);
    try {
      const response = await postQuizQuizIdDrillsDrillIdStart(
        quizId,
        drill.id,
        isAuthenticated ? {} : { email: email.trim() }
      );
      sessionStorage.setItem(
        `drill-session-${quizId}-${drill.id}`,
        JSON.stringify({
          drillDetail: response.data,
          email: isAuthenticated ? null : email.trim()
        })
      );
      navigate(`/quiz/${quizId}/drill/${drill.id}/session`);
    } catch {
      toast.error(t.quizDetail.startPracticeError);
    } finally {
      setStartingDrillId(null);
    }
  };

  const { bg: levelColor, ink: levelInk } = getLevelStyle(quiz?.quizLevel);
  const drills = quiz?.drills ?? [];
  const examQuestionCount = formatExamQuestionRange(
    quiz?.minQuestions,
    quiz?.maxQuestions
  );

  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      <AppHeader anonymousActions={<AuthMenu />} />

      <main className='flex-1 container max-w-3xl mx-auto py-12 px-4 space-y-10'>
        <PageBackLink href='/dashboard'>
          {t.common.backToDashboard}
        </PageBackLink>
        {isLoading ? (
          <div className='h-64 animate-pulse rounded-none border-2 border-dashed border-black bg-white' />
        ) : quiz ? (
          <>
            {/* Certification header */}
            <div className='flex flex-col items-center text-center space-y-4'>
              <div
                className={`h-20 w-20 rounded-none border-2 border-black ${levelColor} flex items-center justify-center shadow-[4px_4px_0px_0px_#000]`}
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
                    {t.providers[quiz.quizProvider as QuizProvider] ??
                      quiz.quizProvider.toUpperCase()}
                  </Badge>
                )}
                {quiz.quizLevel && (
                  <Badge
                    className={`${levelColor} border-2 border-black ${levelInk} font-bold`}
                  >
                    {t.levels[quiz.quizLevel] ?? capitalize(quiz.quizLevel)}
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
                {t.quizDetail.emailLabel}
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
                        result.error.issues[0]?.message ??
                          t.quizDetail.emailInvalid
                      );
                    } else {
                      setEmailError(null);
                    }
                  }
                }}
                placeholder={t.quizDetail.emailPlaceholder}
                className={`w-full rounded-none border-2 px-4 py-3 text-black font-medium placeholder:text-black/40 focus:outline-none bg-white transition-shadow ${
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
                  {t.quizDetail.fullExamHeading}
                </h2>
              </div>
              <Card className='border-4 border-black shadow-[6px_6px_0px_0px_#000]'>
                <CardHeader className='border-b-2 border-black pb-4'>
                  <CardTitle className='text-lg font-black text-black'>
                    {quiz.title}
                  </CardTitle>
                  <p className='text-sm font-medium text-black/70 mt-1'>
                    {t.quizDetail.fullExamBody}
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
                        {t.quizDetail.questionsInPool(quiz.questionCount)}
                      </Badge>
                    )}
                    {examQuestionCount && (
                      <Badge
                        variant='outline'
                        className='border-2 border-black font-bold flex items-center gap-1'
                      >
                        <Target className='h-3 w-3' />
                        {t.quizDetail.perExam(examQuestionCount)}
                      </Badge>
                    )}
                    <Badge
                      variant='outline'
                      className='border-2 border-black font-bold'
                    >
                      {t.quizDetail.scaledScoreBadge}
                    </Badge>
                    <Badge
                      variant='outline'
                      className='border-2 border-black font-bold'
                    >
                      {t.quizDetail.passFailBadge}
                    </Badge>
                    <Badge
                      variant='outline'
                      className='border-2 border-black font-bold'
                    >
                      {t.quizDetail.domainBreakdownBadge}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className='border-t-2 border-black pt-4'>
                  <Button
                    className='w-full'
                    onClick={handleStartExam}
                    disabled={isStartingExam}
                  >
                    {isStartingExam ? t.common.starting : t.quizDetail.startExam}
                    {!isStartingExam && <ArrowRight className='ml-2 h-4 w-4' />}
                  </Button>
                </CardFooter>
              </Card>
            </section>

            {drills.length > 0 && (
              <section className='space-y-4'>
                <div className='flex items-center gap-2'>
                  <Zap className='h-5 w-5 text-black' />
                  <h2 className='text-xl font-black text-black'>
                    {t.quizDetail.practiceHeading}
                  </h2>
                </div>
                <p className='text-sm text-black/70 font-medium -mt-2'>
                  {t.quizDetail.practiceSubtitle}
                </p>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {drills.map(drill => (
                    <DrillCard
                      key={drill.id}
                      drill={drill}
                      isStarting={startingDrillId === drill.id}
                      onStart={() => handleStartDrill(drill)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className='text-center space-y-4'>
            <p className='font-bold text-black'>{t.quizDetail.notFound}</p>
            <Button variant='outline' asChild>
              <Link href='/dashboard'>{t.common.backToDashboard}</Link>
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function DrillCard({
  drill,
  isStarting,
  onStart
}: {
  drill: DrillDto;
  isStarting: boolean;
  onStart: () => void;
}) {
  const { t } = useI18n();
  const isUnavailable = !drill.isAvailable;

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
            {drill.title}
          </CardTitle>
          {isUnavailable && (
            <Lock className='h-4 w-4 text-black/40 shrink-0 mt-0.5' />
          )}
        </div>
        {drill.domain ? (
          <Badge
            variant='outline'
            className='border-2 border-black font-bold text-xs w-fit mt-1'
          >
            {drill.domain}
          </Badge>
        ) : null}
      </CardHeader>
      <CardFooter className='pt-0'>
        <div className='flex items-center justify-between w-full'>
          <span className='text-xs font-bold text-black/50'>
            {t.common.questions(15)}
          </span>
          <Button
            size='sm'
            onClick={onStart}
            disabled={isUnavailable || isStarting}
          >
            {isStarting ? t.common.starting : t.quizDetail.practice}
            {!isStarting && <ArrowRight className='ml-1 h-3 w-3' />}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
