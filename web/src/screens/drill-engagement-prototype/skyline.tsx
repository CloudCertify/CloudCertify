// PROTOTYPE (throwaway). Variant A, "Skyline".
//
// One idea carries the run: every Check raises a column. A right answer stands one
// step taller than the last, so a streak is a staircase you can see climbing; a miss
// drops it back to the ground. The strip is the progress bar, the streak meter and,
// at the end, the picture of how the run went. Everything else stays quiet.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Archivo } from 'next/font/google';
import { Check, Flame, Volume2, VolumeX, X } from 'lucide-react';
import { animate, motion, useReducedMotion } from 'motion/react';
import { useQuizKeyboard } from '@/hooks/use-quiz-keyboard';
import { cn } from '@/lib/utils';
import { useSound } from './feedback';
import { PASS_AT, type DrillSim, type Outcome } from './use-drill-sim';

// Width is the type scale's second axis: questions run slightly condensed so they
// take fewer lines on a phone; the score runs expanded so it reads as a result.
export const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], display: 'swap' });

export const press = 'transition-[translate,box-shadow,background-color,opacity] duration-150 ease-[var(--ease-out)]';
export const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/40 focus-visible:ring-offset-2';

/** Sits on the counter line, so it costs the columns no width on a phone. */
export function SoundToggle() {
  const [on, toggle] = useSound();
  return (
    <button
      type='button'
      onClick={toggle}
      aria-pressed={!on}
      aria-label='Mute sound'
      title={on ? 'Sound on' : 'Sound off'}
      className={cn('-my-3 -mr-2 flex size-11 cursor-pointer items-center justify-center', on ? 'text-black' : 'text-black/40', focusRing)}
    >
      {on ? <Volume2 className='size-5' strokeWidth={2.5} /> : <VolumeX className='size-5' strokeWidth={2.5} />}
    </button>
  );
}

export function Skyline({ sim }: { sim: DrillSim }) {
  return (
    <div className={cn(archivo.className, 'flex min-h-dvh flex-col bg-background text-black')}>
      {sim.phase === 'finished' ? <Results sim={sim} /> : <Run sim={sim} />}
    </div>
  );
}

/** How many right answers in a row end at each checked question (0 for a miss). */
function runLengths(outcomes: Outcome[]) {
  const runs: number[] = [];
  for (const [i, outcome] of outcomes.entries()) runs.push(outcome === 'correct' ? (runs[i - 1] ?? 0) + 1 : 0);
  return runs;
}

function Columns({ outcomes, total, current, replay = false, className }: {
  outcomes: Outcome[];
  total: number;
  /** Index being answered, or -1 when the run is over. */
  current: number;
  /** Raise the columns one after another, as the results screen's opening. */
  replay?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const runs = runLengths(outcomes);

  return (
    <div className={cn('flex items-end border-b-2 border-black', className)} aria-hidden='true'>
      {Array.from({ length: total }, (_, i) => {
        const outcome = outcomes[i];
        // Neighbouring right answers share a border, so a streak is one unbroken shape.
        const joined = outcome === 'correct' && outcomes[i - 1] === 'correct';
        const gap = i === 0 ? '' : joined ? '-ml-[2px]' : 'ml-[3px]';
        if (!outcome) {
          return i === current
            ? <div key={i} className={cn('h-1/4 flex-1 border-2 border-b-0 border-dashed border-black', gap, !reduce && 'animate-pulse')} />
            : <div key={i} className={cn('h-[3px] flex-1 bg-black/20', gap)} />;
        }
        const height = outcome === 'correct' ? `${20 + 16 * Math.min(runs[i], 5)}%` : '14%';
        return (
          <motion.div
            key={i}
            className={cn('min-h-[6px] flex-1 border-2 border-b-0 border-black', outcome === 'correct' ? 'bg-success' : 'bg-destructive', gap)}
            initial={reduce ? false : { height: replay ? '0%' : '25%' }}
            animate={{ height }}
            transition={reduce ? { duration: 0 } : { type: 'spring', duration: 0.5, bounce: 0.45, delay: replay ? 0.15 + i * 0.05 : 0 }}
          />
        );
      })}
    </div>
  );
}

function Run({ sim }: { sim: DrillSim }) {
  const reduce = useReducedMotion();
  const { question, reveal, phase, streak } = sim;
  const answers = question.answers ?? [];
  const revealed = phase === 'revealed';
  const multiple = question.type === 'multiple_response';
  const correctText = answers.filter(answer => reveal?.correctAnswerIds.includes(answer.id!)).map(answer => answer.text).join(' and ');

  const { getOptionProps } = useQuizKeyboard({
    count: answers.length,
    selectionEnabled: !revealed,
    onActivate: i => sim.select(answers[i].id!),
    onPrimary: () => (revealed ? sim.proceed() : sim.check()),
    resetKey: question.id
  });

  return (
    <>
      <header className='sticky top-0 z-10 bg-background px-4 pt-[max(0.75rem,env(safe-area-inset-top))]'>
        <div className='mx-auto flex max-w-4xl items-end gap-3 sm:gap-5'>
          <Link href='/quiz' aria-label='Leave drill' className={cn('-ml-2 flex size-11 items-center justify-center', focusRing)}>
            <X className='size-6' strokeWidth={3} />
          </Link>
          <Columns outcomes={sim.outcomes} total={sim.total} current={revealed ? -1 : sim.index} className='h-9 flex-1 sm:h-14' />
          <div className={cn('flex min-w-11 items-center justify-end gap-1 pb-0.5 transition-opacity', streak === 0 && 'opacity-30')}>
            <Flame className='size-5' strokeWidth={3} fill={streak >= 3 ? 'var(--secondary)' : 'none'} />
            <motion.span
              key={streak}
              className='text-xl font-black tabular-nums'
              initial={reduce || streak === 0 ? false : { y: 10, scale: 1.6 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.5 }}
            >
              {streak}
            </motion.span>
            <span className='sr-only'>right in a row</span>
          </div>
        </div>
      </header>

      {/* Bottom padding leaves room to scroll the last option clear of the dock. */}
      <main id='main-content' tabIndex={-1} className='mx-auto w-full max-w-4xl flex-1 px-4 pb-72 pt-6 sm:pb-64 sm:pt-12'>
        <motion.div
          key={question.id}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.1 }}
        >
          <div className='flex items-center justify-between'>
            <p className='text-sm font-bold text-black/60'>
              {sim.index + 1} of {sim.total}
            </p>
            <SoundToggle />
          </div>
          <h1 className='mt-2 max-w-[34ch] text-[1.625rem] font-extrabold leading-[1.15] font-stretch-[88%] sm:text-4xl'>
            {question.text}
          </h1>
          {multiple && <p className='mt-3 font-bold'>Choose {question.selectCount}</p>}
        </motion.div>

        <div
          className='mt-6 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4'
          role={multiple ? 'group' : 'radiogroup'}
          aria-label={question.text ?? undefined}
        >
          {answers.map((answer, i) => {
            const id = answer.id!;
            const selected = sim.selectedIds.includes(id);
            const isCorrect = revealed && reveal!.correctAnswerIds.includes(id);
            const isWrongPick = revealed && reveal!.selectedAnswerIds.includes(id) && !isCorrect;
            const capped = multiple && !selected && sim.selectedIds.length >= (question.selectCount ?? 1);
            const disabled = revealed || capped;

            return (
              <motion.div
                key={id}
                {...getOptionProps(i)}
                role={multiple ? 'checkbox' : 'radio'}
                aria-checked={selected}
                aria-disabled={disabled || undefined}
                aria-keyshortcuts={String(i + 1)}
                onClick={() => !disabled && sim.select(id)}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                // Motion owns opacity here, so the dimming of the other options lives here too.
                animate={
                  reduce
                    ? { opacity: revealed && !isCorrect && !isWrongPick ? 0.4 : 1 }
                    : isWrongPick
                      ? { opacity: 1, y: 0, x: [0, -8, 6, -4, 2, 0] }
                      : isCorrect
                        ? { opacity: 1, y: 0, scale: [1, 1.04, 1] }
                        : { opacity: revealed ? 0.4 : 1, y: 0 }
                }
                transition={revealed ? { duration: 0.35, ease: 'easeOut' } : { type: 'spring', duration: 0.3, bounce: 0.2, delay: 0.04 + i * 0.035 }}
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
                      : revealed
                        ? 'bg-white'
                        : selected
                          ? 'translate-x-1 translate-y-1 bg-primary text-white'
                          : cn('bg-white shadow-[4px_4px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none', capped ? 'opacity-50' : 'hover:bg-secondary/25')
                )}
              >
                {/* One box, three jobs: the shortcut key, the pick, then the verdict. */}
                <span className='flex size-7 shrink-0 items-center justify-center border-2 border-black bg-white text-sm font-black text-black'>
                  {isCorrect || (selected && !revealed) ? (
                    <Check className='size-4' strokeWidth={4} />
                  ) : isWrongPick ? (
                    <X className='size-4' strokeWidth={4} />
                  ) : (
                    <span className='hidden pointer-fine:inline' aria-hidden='true'>{i + 1}</span>
                  )}
                </span>
                {answer.text}
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* The dock: Check and Continue share one spot, so the thumb never travels. */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-20 border-t-4 border-black px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 transition-colors duration-150',
          !revealed ? 'bg-white' : reveal!.isCorrect ? 'bg-success' : 'bg-destructive'
        )}
      >
        <div className='mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-end sm:gap-8'>
          <div className='min-w-0 flex-1' aria-live='polite'>
            {revealed ? (
              <motion.div
                className='overflow-hidden'
                initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
              >
                <p className='text-2xl font-black font-stretch-[112%] sm:text-3xl'>
                  {!reveal!.isCorrect ? 'Not quite' : streak >= 2 ? `Correct, ${streak} in a row` : 'Correct'}
                </p>
                {!reveal!.isCorrect && <p className='mt-1 font-bold'>Answer: {correctText}</p>}
                <p className='mt-1 max-w-[70ch] text-[0.9375rem] font-medium leading-snug'>{reveal!.explanation}</p>
              </motion.div>
            ) : (
              <p className='hidden text-sm font-medium text-black/60 pointer-fine:sm:block'>
                Press 1 to {answers.length} to choose, Enter to check
              </p>
            )}
          </div>
          <button
            type='button'
            onClick={revealed ? sim.proceed : sim.check}
            disabled={!revealed && !sim.canCheck}
            aria-keyshortcuts='Enter'
            className={cn(
              'h-14 w-full shrink-0 cursor-pointer border-2 border-black px-10 text-lg font-black shadow-[4px_4px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-default disabled:opacity-40 sm:w-auto sm:min-w-52',
              press,
              focusRing,
              revealed ? 'bg-white text-black' : 'bg-primary text-white'
            )}
          >
            {!revealed ? 'Check' : sim.isLast ? 'See results' : 'Continue'}
          </button>
        </div>
      </div>
    </>
  );
}

function Results({ sim }: { sim: DrillSim }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? sim.score : 0);
  const [reviewing, setReviewing] = useState(false);
  const missed = sim.total - sim.correctCount;
  const needed = Math.ceil((PASS_AT / 100) * sim.total);
  // The columns finish rising first; the number answers them.
  const afterColumns = 0.15 + sim.total * 0.05 + 0.2;

  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, sim.score, { duration: 0.9, delay: afterColumns, ease: [0.22, 1, 0.36, 1], onUpdate: value => setShown(Math.round(value)) });
    return () => controls.stop();
  }, [reduce, sim.score, afterColumns]);

  const settle = (delay: number) => ({
    initial: reduce ? false as const : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay: afterColumns + delay, ease: [0.22, 1, 0.36, 1] as const }
  });

  return (
    <main id='main-content' tabIndex={-1} className='mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-[max(2rem,env(safe-area-inset-top))] sm:pt-16'>
      <Columns outcomes={sim.outcomes} total={sim.total} current={-1} replay className='h-28 border-b-4 sm:h-48' />

      <p className='mt-6 text-[5.5rem] font-black leading-none tabular-nums font-stretch-[125%] sm:mt-8 sm:text-[9rem]' aria-label={`${sim.score}%`}>
        {shown}%
      </p>

      <motion.div {...settle(0.7)}>
        <p className='mt-4 max-w-[30ch] text-2xl font-extrabold leading-tight font-stretch-[88%] sm:text-3xl'>
          {sim.passed
            ? `You passed. ${sim.correctCount} of ${sim.total} right, longest run ${sim.bestStreak}.`
            : `${sim.correctCount} of ${sim.total} right. Passing takes ${needed}.`}
        </p>
        <p className='mt-3 max-w-[46ch] text-lg font-medium text-black/70'>
          {missed === 0
            ? 'Nothing to bring back. The next mix pulls in questions you have not seen yet.'
            : `The next mix brings back the ${missed} you missed, alongside new ones.`}
        </p>
      </motion.div>

      <motion.div {...settle(0.9)} className='mt-8 flex flex-col gap-4 sm:flex-row'>
        <button
          type='button'
          autoFocus
          onClick={sim.restart}
          className={cn('h-14 cursor-pointer border-2 border-black bg-primary px-10 text-lg font-black text-white shadow-[4px_4px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none', press, focusRing)}
        >
          Start next drill
        </button>
        <button
          type='button'
          onClick={() => setReviewing(value => !value)}
          aria-expanded={reviewing}
          className={cn('h-14 cursor-pointer border-2 border-black bg-white px-10 text-lg font-black shadow-[4px_4px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none', press, focusRing)}
        >
          {reviewing ? 'Hide answers' : 'Review answers'}
        </button>
      </motion.div>

      {reviewing && (
        <ol className='mt-10 border-t-2 border-black'>
          {sim.samples.map((sample, i) => {
            const right = sim.outcomes[i] === 'correct';
            return (
              <li key={sample.question.id} className='flex gap-3 border-b-2 border-black py-4'>
                <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center border-2 border-black', right ? 'bg-success' : 'bg-destructive')}>
                  {right ? <Check className='size-4' strokeWidth={4} /> : <X className='size-4' strokeWidth={4} />}
                  <span className='sr-only'>{right ? 'Right' : 'Missed'}</span>
                </span>
                <div>
                  <p className='font-semibold leading-snug'>{sample.question.text}</p>
                  {!right && (
                    <p className='mt-1 text-[0.9375rem] font-medium text-black/70'>
                      {(sample.question.answers ?? []).filter(answer => sample.correct.includes(answer.id!)).map(answer => answer.text).join(' and ')}. {sample.explanation}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
