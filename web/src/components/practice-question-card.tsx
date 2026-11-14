import { useEffect, useRef, type ReactNode } from 'react';
import { CornerDownLeft, Flame, LoaderCircle } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { AttemptFrame, AttemptQuestion, dockButton, focusRing, press } from '@/components/attempt-frame';
import { DrillColumns } from '@/components/drill-columns';
import { ShortcutLegend } from '@/components/shortcut-legend';
import { useQuizKeyboard } from '@/hooks/use-quiz-keyboard';
import { useI18n } from '@/i18n/use-i18n';
import { cue } from '@/lib/cue';
import { cn } from '@/lib/utils';
import type { CheckAnswerResponseDto, QuestionDto } from '@/http/generated/api.schemas';

/**
 * Per-question state in the Check→Continue practice flow (issue #27 / ADR 0002):
 * `answering` — options selectable, Check enabled once the selection is valid;
 * `revealed` — options locked, correctness highlighted, explanation shown, Continue enabled.
 */
export type PracticePhase = 'answering' | 'revealed';

type PracticeQuestionCardProps = {
  /** Zero-based index of the current question. */
  index: number;
  total: number;
  question: QuestionDto;
  /** Answer ids the user has currently selected for this question. */
  selectedIds: number[];
  onSelect: (answerId: number) => void;
  phase: PracticePhase;
  /** Reveal payload from the Check call; present only while `phase === 'revealed'`. */
  reveal: CheckAnswerResponseDto | null;
  onCheck: () => void;
  onContinue: () => void;
  /** Whether Check is allowed now; the attempt module decides (required count reached). */
  canCheck: boolean;
  /** Network in flight for the Check call. */
  isChecking: boolean;
  /** Network in flight for the finish call (last question's Continue). */
  isFinishing: boolean;
  /** True on the last question, so Continue finishes the drill. */
  isLast: boolean;
  /** Per Question, in order: checked right, checked wrong, or not checked yet. */
  outcomes?: (boolean | null)[];
  /** Where the leave control goes. */
  exitHref?: string;
  /** Shown above the Question: the Drill's make-up, before the first answer. */
  banner?: ReactNode;
  /**
   * Report control for this Question. Rendered only in the revealed state — a
   * Report hangs off a Check (issue #41), so it must not be reachable before.
   */
  reportControl?: ReactNode;
};

/**
 * A Drill in progress, full screen. Check and Continue are one button in one place;
 * on Check the dock around it takes the verdict's colour and says what was right.
 */
export function PracticeQuestionCard({
  index,
  total,
  question,
  selectedIds,
  onSelect,
  phase,
  reveal,
  onCheck,
  onContinue,
  canCheck,
  isChecking,
  isFinishing,
  isLast,
  outcomes = Array.from({ length: total }, () => null),
  exitHref = '/quiz',
  banner,
  reportControl
}: PracticeQuestionCardProps) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const answers = question.answers ?? [];
  const revealed = phase === 'revealed' && reveal != null;
  const busy = isChecking || isFinishing;
  const correctText = answers
    .filter(answer => answer.id != null && reveal?.correctAnswerIds.includes(answer.id))
    .map(answer => answer.text)
    .join(', ');

  // Right answers in a row, ending at the latest Check.
  let streak = 0;
  for (let i = revealed ? index : index - 1; i >= 0 && outcomes[i]; i--) streak++;

  // The verdict arrives from the network, not from the tap, so it is cued here.
  const cued = useRef(reveal);
  useEffect(() => {
    if (reveal && reveal !== cued.current) cue(!reveal.isCorrect ? 'wrong' : streak >= 3 ? 'streak' : 'correct');
    cued.current = reveal;
  }, [reveal, streak]);

  // A long Question may have been scrolled; the next one starts at its top.
  useEffect(() => {
    if (window.scrollY > 0) window.scrollTo({ top: 0 });
  }, [index]);

  const primary = () => {
    if (revealed) {
      if (!isFinishing) onContinue();
    } else if (canCheck && !isChecking) {
      onCheck();
    }
  };

  const { getOptionProps } = useQuizKeyboard({
    count: answers.length,
    selectionEnabled: !revealed && !isChecking,
    onActivate: i => {
      const id = answers[i]?.id;
      if (id != null) select(id);
    },
    onPrimary: primary,
    resetKey: question.id
  });

  function select(answerId: number) {
    cue('select');
    onSelect(answerId);
  }

  return (
    <AttemptFrame
      exitHref={exitHref}
      strip={<DrillColumns outcomes={outcomes} current={revealed ? -1 : index} className='h-9 flex-1 sm:h-14' />}
      aside={
        <p className={cn('flex min-w-11 items-center justify-end gap-1 pb-0.5 transition-opacity', streak === 0 && 'opacity-30')}>
          <Flame className='size-5' strokeWidth={3} fill={streak >= 3 ? 'var(--secondary)' : 'none'} aria-hidden='true' />
          <motion.span
            key={streak}
            className='text-xl font-black tabular-nums'
            initial={reduce || streak === 0 ? false : { y: 10, scale: 1.6 }}
            animate={{ y: 0, scale: 1 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.5 }}
            aria-hidden='true'
          >
            {streak}
          </motion.span>
          <span className='sr-only'>{t.question.streak(streak)}</span>
        </p>
      }
      dockTone={!revealed ? 'plain' : reveal.isCorrect ? 'correct' : 'wrong'}
      dock={
        <>
          <div className='min-w-0 flex-1' aria-live='polite'>
            {revealed ? (
              <motion.div
                className='overflow-hidden'
                initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
              >
                {/* A long explanation scrolls inside the dock instead of pushing the button off a phone. */}
                <div className='max-h-[40dvh] overflow-y-auto'>
                  <p className='text-2xl font-black font-stretch-[112%] sm:text-3xl'>
                    {!reveal.isCorrect ? t.question.notQuite : streak >= 2 ? t.question.correctStreak(streak) : t.common.correct}
                  </p>
                  {!reveal.isCorrect && correctText && <p className='mt-1 font-bold'>{t.question.answerIs(correctText)}</p>}
                  {reveal.explanation && <p className='mt-1 max-w-[70ch] text-[0.9375rem] font-medium leading-snug'>{reveal.explanation}</p>}
                  {reportControl && <div className='mt-2'>{reportControl}</div>}
                </div>
              </motion.div>
            ) : (
              <ShortcutLegend
                items={[
                  { keys: [`1–${Math.min(answers.length, 9)}`], label: t.shortcuts.select },
                  { keys: [<CornerDownLeft key='enter' className='size-3' />], label: t.shortcuts.check }
                ]}
              />
            )}
          </div>
          {/* One button for Check and Continue: focus and the thumb stay where they were.
              Busy stays focusable (aria-disabled): disabling a focused button drops focus to <body>. */}
          <button
            type='button'
            onClick={primary}
            disabled={!revealed && !canCheck && !isChecking}
            aria-disabled={busy || undefined}
            aria-busy={busy}
            aria-keyshortcuts='Enter'
            className={cn(dockButton, press, focusRing, 'flex w-full items-center justify-center gap-2 px-10 sm:w-auto sm:min-w-52', revealed ? 'bg-white text-black' : 'bg-primary text-white')}
          >
            {busy && <LoaderCircle className='size-5 animate-spin' aria-hidden='true' />}
            {isChecking
              ? t.question.checking
              : !revealed
                ? t.question.check
                : isFinishing
                  ? t.question.finishing
                  : isLast
                    ? t.question.finishPractice
                    : t.question.continue}
          </button>
        </>
      }
    >
      {banner}
      <AttemptQuestion
        index={index}
        total={total}
        question={question}
        selectedIds={selectedIds}
        onSelect={select}
        locked={isChecking}
        reveal={revealed ? reveal : null}
        getOptionProps={getOptionProps}
      />
    </AttemptFrame>
  );
}
