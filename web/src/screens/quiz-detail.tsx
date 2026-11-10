'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Lock, RotateCcw, Shuffle, Target } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/footer';
import { DrawRule, type DrillDto, type QuizDto, type QuizProvider } from '@/http/generated/api.schemas';
import { getLucideIcon } from '@/lib/quiz-icon';
import { getLevelStyle } from '@/lib/quiz-level';
import { capitalize } from '@/lib/utils';
import { useAuth } from '@/auth/use-auth';
import { AppHeader } from '@/components/app-header';
import { AuthMenu } from '@/components/auth-menu';
import { PageBackLink } from '@/components/page-back-link';
import { useI18n } from '@/i18n/use-i18n';
import { useStartAttempt } from '@/attempt/start';
import { rememberedEmail } from '@/attempt/storage';
import { isWholeQuizMix } from '@/lib/whole-quiz-mix';

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
export function QuizDetailPage({ quiz }: { quiz: QuizDto }) {
  const quizId = quiz.id!;
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const emailSchema = z.email(t.quizDetail.emailInvalid);

  const [email, setEmail] = useState('');
  useEffect(() => setEmail(rememberedEmail(quizId)), [quizId]);
  const [emailError, setEmailError] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const { starting, start } = useStartAttempt();
  const isStartingExam = starting != null && starting.drillId == null;
  const startingDrillId = starting?.drillId ?? null;
  const isStarting = starting !== null;

  const validateEmail = (): boolean => {
    // Logged-in Users are identified by their Bearer token; no email needed.
    if (isAuthenticated) return true;
    const result = emailSchema.safeParse(email.trim());
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? t.quizDetail.emailInvalid;
      setEmailError(true);
      toast.error(msg);
      emailRef.current?.focus();
      return false;
    }
    setEmailError(false);
    return true;
  };

  const startFrom = (drillId?: number) => {
    if (isStarting || !validateEmail()) return;
    void start({ quizId, drillId }, isAuthenticated ? null : email.trim());
  };
  const handleStartExam = () => startFrom();
  const handleStartDrill = (drill: DrillDto) => startFrom(drill.id);

  const { bg: levelColor, ink: levelInk } = getLevelStyle(quiz.quizLevel);
  const drills = quiz.drills ?? [];
  // The whole-Quiz Mix leads, whatever order the drills arrive in (ADR 0013).
  const mix = drills.find(isWholeQuizMix);
  const domainDrills = drills.filter(drill => drill.domain != null);
  // Whole-Quiz drills that are not the Mix, such as Mistakes.
  const otherDrills = drills.filter(drill => drill !== mix && drill.domain == null);
  const examQuestionCount = formatExamQuestionRange(
    quiz.minQuestions,
    quiz.maxQuestions
  );

  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      <AppHeader anonymousActions={<AuthMenu />} />

      <main id='main-content' tabIndex={-1} className='flex-1 container max-w-3xl mx-auto py-12 px-4 space-y-10'>
        <PageBackLink href='/dashboard'>
          {t.common.backToDashboard}
        </PageBackLink>
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
                ref={emailRef}
                id='email'
                type='email'
                name='email'
                autoComplete='email'
                required
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? 'email-error' : undefined}
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(false);
                }}
                onBlur={() => {
                  if (email.trim()) {
                    const result = emailSchema.safeParse(email.trim());
                    if (!result.success) {
                      setEmailError(true);
                    } else {
                      setEmailError(false);
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
                <p id='email-error' role='alert' className='text-sm font-bold text-destructive'>{t.quizDetail.emailInvalid}</p>
              )}
            </div>
            )}

            {/* Practice: the Mix and the Full exam as the two main starts, then one
                click per Domain, then Mistakes apart (it spans the whole Quiz) */}
            <section className='space-y-6'>
              <div className={`grid gap-4 ${mix ? 'sm:grid-cols-[3fr_2fr]' : ''}`}>
                {mix && (
                  <PracticeTile
                    primary
                    icon={<Shuffle className='h-7 w-7' aria-hidden='true' />}
                    title={t.quizDetail.mixTitle}
                    body={t.quizDetail.mixBody(isAuthenticated)}
                    isStarting={startingDrillId === mix.id}
                    disabled={!mix.isAvailable}
                    onStart={() => handleStartDrill(mix)}
                  />
                )}
                <PracticeTile
                  icon={<Target className='h-7 w-7' aria-hidden='true' />}
                  title={t.quizDetail.examTitle}
                  body={t.quizDetail.examBody(examQuestionCount)}
                  isStarting={isStartingExam}
                  onStart={handleStartExam}
                />
              </div>

              {domainDrills.length > 0 && (
                <div className='space-y-3'>
                  <div className='flex flex-wrap items-baseline gap-x-2'>
                    <h2
                      id='domain-drills-heading'
                      className='text-sm font-black uppercase tracking-wide text-black'
                    >
                      {t.quizDetail.domainHeading}
                    </h2>
                    <span className='text-sm font-bold text-black/60'>
                      {t.quizDetail.domainCount}
                    </span>
                  </div>
                  <div
                    role='group'
                    aria-labelledby='domain-drills-heading'
                    className='flex flex-col gap-3 sm:flex-row sm:flex-wrap'
                  >
                    {domainDrills.map(drill => (
                      <DrillButton
                        key={drill.id}
                        drill={drill}
                        label={drill.domain ?? drill.title}
                        isStarting={startingDrillId === drill.id}
                        onStart={() => handleStartDrill(drill)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {otherDrills.map(drill => (
                <DrillButton
                  key={drill.id}
                  drill={drill}
                  label={
                    drill.drawRule === DrawRule.mistakes
                      ? t.quizDetail.reviewMistakes
                      : drill.title
                  }
                  icon={<RotateCcw className='h-3.5 w-3.5' aria-hidden='true' />}
                  isStarting={startingDrillId === drill.id}
                  onStart={() => handleStartDrill(drill)}
                />
              ))}
            </section>
        </>
      </main>
      <Footer />
    </div>
  );
}

const pressable =
  'transition-[translate,box-shadow] duration-150 ease-[var(--ease-out)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-x-0 disabled:active:translate-y-0 aria-disabled:opacity-50';

/** One of the two main starts. The whole tile is the button; the body describes it. */
function PracticeTile({
  icon,
  title,
  body,
  primary = false,
  isStarting,
  disabled = false,
  onStart
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  primary?: boolean;
  isStarting: boolean;
  disabled?: boolean;
  onStart: () => void;
}) {
  const { t } = useI18n();
  const id = useId();

  return (
    <button
      type='button'
      onClick={onStart}
      disabled={disabled}
      aria-disabled={isStarting || undefined}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-body`}
      className={`group flex cursor-pointer flex-col items-start gap-2 border-4 border-black p-4 text-left shadow-[6px_6px_0px_0px_#000] sm:gap-3 sm:p-6 ${pressable} ${
        primary ? 'bg-primary text-white' : 'bg-white text-black'
      }`}
    >
      {disabled ? <Lock className='h-7 w-7' aria-hidden='true' /> : icon}
      <span id={`${id}-title`} className='text-xl font-black sm:text-2xl'>
        {isStarting ? t.common.starting : title}
      </span>
      <span
        id={`${id}-body`}
        className={`text-sm font-medium ${primary ? 'text-white/85' : 'text-black/70'}`}
      >
        {body}
      </span>
      <ArrowRight
        className='mt-auto h-6 w-6 self-end transition-transform group-hover:translate-x-1'
        aria-hidden='true'
      />
    </button>
  );
}

/** A one-click start for a narrower drill: full-width rows on phones, wrapping buttons above. */
function DrillButton({
  drill,
  label,
  icon,
  isStarting,
  onStart
}: {
  drill: DrillDto;
  label: string;
  icon?: React.ReactNode;
  isStarting: boolean;
  onStart: () => void;
}) {
  const { t } = useI18n();
  const isUnavailable = !drill.isAvailable;

  return (
    <button
      type='button'
      onClick={onStart}
      disabled={isUnavailable}
      aria-disabled={isStarting || undefined}
      className={`inline-flex w-full cursor-pointer items-center justify-between gap-2 border-2 border-black bg-white px-4 py-2.5 text-left text-sm font-bold text-black shadow-[3px_3px_0px_0px_#000] hover:bg-secondary sm:w-auto sm:justify-start ${pressable}`}
    >
      <span className='flex min-w-0 items-center gap-2'>
        {isUnavailable ? <Lock className='h-3.5 w-3.5 shrink-0' aria-hidden='true' /> : icon}
        <span className='text-pretty'>{isStarting ? t.common.starting : label}</span>
      </span>
      <ArrowRight className='h-3.5 w-3.5 shrink-0' aria-hidden='true' />
    </button>
  );
}
