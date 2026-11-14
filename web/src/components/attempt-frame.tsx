import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Check, Volume2, VolumeX, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { DifficultyBadge } from '@/components/difficulty-badge';
import type { useQuizKeyboard } from '@/hooks/use-quiz-keyboard';
import { useI18n } from '@/i18n/use-i18n';
import { useSound } from '@/lib/cue';
import { cn } from '@/lib/utils';
import type { QuestionDto } from '@/http/generated/api.schemas';

/** Pressed-into-the-shadow feel shared by every control of an attempt. */
export const press = 'transition-[translate,box-shadow,background-color,opacity] duration-150 ease-[var(--ease-out)]';
export const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/40 focus-visible:ring-offset-2';
export const dockButton =
  'h-14 shrink-0 cursor-pointer border-2 border-black text-lg font-black shadow-[4px_4px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-default disabled:opacity-40';

/**
 * The full-screen frame of an attempt in progress, for both Modes: a way out, the
 * strip that shows the run so far, the Question, and a dock pinned to the bottom so
 * the primary action never moves under the thumb.
 */
export function AttemptFrame({ exitHref, strip, aside, children, dock, dockTone = 'plain' }: {
  exitHref: string;
  /** Drill: the columns. Exam: the Navigator strip. */
  strip: ReactNode;
  /** Right of the strip: the Drill's streak. An Exam leaves it empty so the Navigator gets the width. */
  aside: ReactNode;
  children: ReactNode;
  dock: ReactNode;
  /** Practice floods the dock with the Check's verdict. */
  dockTone?: 'plain' | 'correct' | 'wrong';
}) {
  const { t } = useI18n();
  // The dock grows with what it holds (an explanation, the rating), so the page keeps
  // exactly that much room under the last option: no more, or every Question would scroll.
  const dockRef = useRef<HTMLDivElement>(null);
  const [dockHeight, setDockHeight] = useState(0);
  useEffect(() => {
    const element = dockRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setDockHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className='flex min-h-dvh flex-col bg-background text-black'>
      <header className='sticky top-0 z-10 bg-background px-4 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))]'>
        <div className='mx-auto flex max-w-4xl items-end gap-3 sm:gap-5'>
          <Link href={exitHref} aria-label={t.attempt.leave} className={cn('-ml-2 flex size-11 items-center justify-center', focusRing)}>
            <X className='size-6' strokeWidth={3} aria-hidden='true' />
          </Link>
          {strip}
          {aside}
        </div>
      </header>
      <main id='main-content' tabIndex={-1} className='mx-auto w-full max-w-4xl flex-1 px-4 pt-4 sm:pt-10' style={{ paddingBottom: dockHeight + 24 }}>
        {children}
      </main>
      <div
        ref={dockRef}
        className={cn(
          'fixed inset-x-0 bottom-0 z-20 border-t-4 border-black px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 transition-colors duration-150',
          dockTone === 'plain' ? 'bg-white' : dockTone === 'correct' ? 'bg-success' : 'bg-destructive'
        )}
      >
        <div className='mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-end sm:gap-8'>{dock}</div>
      </div>
    </div>
  );
}

function SoundToggle() {
  const { t } = useI18n();
  const [on, toggle] = useSound();
  return (
    <button
      type='button'
      onClick={toggle}
      aria-pressed={!on}
      aria-label={t.attempt.mute}
      className={cn('-my-3 -mr-2 flex size-11 cursor-pointer items-center justify-center', on ? 'text-black' : 'text-black/40', focusRing)}
    >
      {on ? <Volume2 className='size-5' strokeWidth={2.5} aria-hidden='true' /> : <VolumeX className='size-5' strokeWidth={2.5} aria-hidden='true' />}
    </button>
  );
}

type OptionProps = ReturnType<typeof useQuizKeyboard>['getOptionProps'];

/**
 * The Question and its options, the same in both Modes. `reveal` is the Practice
 * Check response: with it the right answer stands up off the page, a wrong pick
 * shakes, and the rest fade. An Exam never passes it.
 */
export function AttemptQuestion({ index, total, question, direction = 1, selectedIds, onSelect, locked = false, reveal, getOptionProps, actions }: {
  index: number;
  total: number;
  question: QuestionDto;
  /** Which way the visitor travelled to get here: 1 forward, -1 back. */
  direction?: 1 | -1;
  selectedIds: number[];
  onSelect: (answerId: number) => void;
  /** No selection changes: the answer is being checked, or has been. */
  locked?: boolean;
  reveal?: { correctAnswerIds: number[]; selectedAnswerIds: number[] } | null;
  getOptionProps: OptionProps;
  /** Small controls on the counter line, left of the mute button. */
  actions?: ReactNode;
}) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const answers = question.answers ?? [];
  const multiple = question.type === 'multiple_response';
  const selectCount = question.selectCount ?? 1;

  return (
    <>
      <motion.div
        key={question.id}
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction * 32 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', duration: 0.35, bounce: 0.1 }}
      >
        <div className='flex items-center gap-3'>
          <p className='text-sm font-bold text-black/60'>{t.question.counter(index + 1, total)}</p>
          <DifficultyBadge difficulty={question.difficulty} />
          <span className='flex-1' />
          {actions}
          <SoundToggle />
        </div>
        <h1 className='mt-3 max-w-[34ch] text-[1.625rem] font-extrabold leading-[1.15] font-stretch-[88%] sm:text-4xl'>{question.text}</h1>
        {multiple && <p className='mt-3 font-bold'>{t.question.selectAnswers(selectCount)}</p>}
      </motion.div>

      <div className='mt-6 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4' role={multiple ? 'group' : 'radiogroup'} aria-label={question.text ?? undefined}>
        {answers.map((answer, i) => {
          const id = answer.id;
          const selected = id != null && selectedIds.includes(id);
          const isCorrect = reveal != null && id != null && reveal.correctAnswerIds.includes(id);
          const isWrongPick = reveal != null && id != null && reveal.selectedAnswerIds.includes(id) && !isCorrect;
          const capped = multiple && !selected && selectedIds.length >= selectCount;
          const disabled = locked || reveal != null || capped;
          const faded = reveal != null ? !isCorrect && !isWrongPick : capped;

          return (
            <motion.div
              key={id}
              {...getOptionProps(i)}
              role={multiple ? 'checkbox' : 'radio'}
              aria-checked={selected}
              aria-disabled={disabled || undefined}
              aria-keyshortcuts={i < 9 ? String(i + 1) : undefined}
              onClick={() => !disabled && id != null && onSelect(id)}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              // Motion owns opacity here, so fading the other options lives here too.
              animate={
                reduce
                  ? { opacity: faded ? 0.4 : 1 }
                  : isWrongPick
                    ? { opacity: 1, y: 0, x: [0, -8, 6, -4, 2, 0] }
                    : isCorrect
                      ? { opacity: 1, y: 0, scale: [1, 1.04, 1] }
                      : { opacity: faded ? 0.4 : 1, y: 0 }
              }
              transition={reveal ? { duration: 0.35, ease: 'easeOut' } : { type: 'spring', duration: 0.3, bounce: 0.2, delay: 0.04 + i * 0.035 }}
              className={cn(
                'flex min-h-16 items-center gap-3 border-2 border-black p-3 text-left font-semibold leading-snug sm:p-4 sm:text-lg',
                press,
                focusRing,
                disabled ? 'cursor-default' : 'cursor-pointer',
                isCorrect
                  ? // The right answer stands up off the page; everything else lies flat.
                    '-translate-x-0.5 -translate-y-0.5 bg-success shadow-[6px_6px_0px_0px_#000]'
                  : isWrongPick
                    ? 'bg-destructive'
                    : reveal
                      ? 'bg-white'
                      : selected
                        ? 'translate-x-1 translate-y-1 bg-primary text-white'
                        : cn('bg-white shadow-[4px_4px_0px_0px_#000]', !disabled && 'hover:bg-secondary/25 active:translate-x-1 active:translate-y-1 active:shadow-none')
              )}
            >
              {/* One box, three jobs: the shortcut key, the pick, then the verdict. */}
              <span className='flex size-7 shrink-0 items-center justify-center border-2 border-black bg-white text-sm font-black text-black' aria-hidden='true'>
                {isCorrect || (selected && !reveal) ? (
                  <Check className='size-4' strokeWidth={4} />
                ) : isWrongPick ? (
                  <X className='size-4' strokeWidth={4} />
                ) : (
                  i < 9 && <span className='hidden pointer-fine:inline'>{i + 1}</span>
                )}
              </span>
              {answer.text}
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
