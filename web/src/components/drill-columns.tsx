import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

/** How many right answers in a row end at each Question (0 for a miss or an unchecked one). */
export function runLengths(outcomes: (boolean | null)[]): number[] {
  const runs: number[] = [];
  for (const [i, outcome] of outcomes.entries()) runs.push(outcome ? (runs[i - 1] ?? 0) + 1 : 0);
  return runs;
}

/**
 * A Drill as a row of columns, one per Question. Every Check raises one: a right
 * answer stands a step taller than the last, so a streak is a staircase, and a miss
 * drops it back to the ground. It is the progress bar and the streak at once, and on
 * the results screen the picture of how the Drill went.
 */
export function DrillColumns({ outcomes, current, replay = false, className }: {
  /** Per Question, in order: right, wrong, or not checked yet. */
  outcomes: (boolean | null)[];
  /** Index being answered, or -1 when none is. */
  current: number;
  /** Raise the columns one after another, as the results screen's opening. */
  replay?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const runs = runLengths(outcomes);

  return (
    <div className={cn('flex items-end border-b-2 border-black', className)} aria-hidden='true'>
      {outcomes.map((outcome, i) => {
        // Neighbouring right answers share a border, so a streak is one unbroken shape.
        const joined = outcome === true && outcomes[i - 1] === true;
        const gap = i === 0 ? '' : joined ? '-ml-[2px]' : 'ml-[3px]';
        if (outcome == null) {
          return i === current ? (
            <div key={i} className={cn('h-1/4 flex-1 border-2 border-b-0 border-dashed border-black', gap, !reduce && 'animate-pulse')} />
          ) : (
            <div key={i} className={cn('h-[3px] flex-1 bg-black/20', gap)} />
          );
        }
        return (
          <motion.div
            key={i}
            className={cn('min-h-[6px] flex-1 border-2 border-b-0 border-black', outcome ? 'bg-success' : 'bg-destructive', gap)}
            initial={reduce ? false : { height: replay ? '0%' : '25%' }}
            animate={{ height: outcome ? `${20 + 16 * Math.min(runs[i], 5)}%` : '14%' }}
            transition={reduce ? { duration: 0 } : { type: 'spring', duration: 0.5, bounce: 0.45, delay: replay ? 0.15 + i * 0.05 : 0 }}
          />
        );
      })}
    </div>
  );
}
