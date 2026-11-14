import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { tick } from '@/lib/cue';
import { cn } from '@/lib/utils';
import type { Confidence } from '@/http/generated/api.schemas';

export type StripCell = {
  /** Percent of the strip's height; ignored for `empty`. */
  height: number;
  tone: 'empty' | 'answered' | 'revisit' | 'correct' | 'wrong';
  dim?: boolean;
};

const TONE: Record<StripCell['tone'], string> = {
  empty: 'bg-black/20',
  answered: 'bg-primary',
  revisit: 'bg-secondary',
  correct: 'bg-success',
  wrong: 'bg-destructive'
};

/** A loupe tile carries the column's colour, with a number that stays readable on it. */
const TILE_TONE: Record<StripCell['tone'], string> = {
  empty: 'bg-white text-black',
  answered: 'bg-primary text-white',
  revisit: 'bg-secondary text-black',
  correct: 'bg-success text-black',
  wrong: 'bg-destructive text-black'
};

const TILE = 36;
const CENTER = 60;
const LOUPE_WIDTH = CENTER + 4 * TILE + 4 * 6 + 24;
const LOUPE_HEIGHT = 112;

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

/** Confidence sets a column's height; an answer with no rating stays low. */
export function confidenceHeight(confidence: Confidence | null | undefined): number {
  return confidence === 'confident' ? 100 : confidence === 'unsure' ? 70 : confidence === 'guess' ? 45 : 25;
}

/**
 * An Exam as a strip of columns, one per Question. Correctness is deferred to Submit,
 * so while the Exam runs a column says only what the visitor knows: answered or not,
 * and how sure. On the results screen the same columns take their verdict colour, so a
 * tall wrong one is a misconception and a short right one a lucky guess.
 *
 * With `onJump` the strip is the Navigator: the Question is the column under the
 * pointer, and releasing goes there. At 65 across a column is about 5px on a phone, too
 * small to see under a finger, so a touch brings up a loupe glued to it: the Question
 * under the finger and its neighbours, large, numbered, in their colours. The loupe sits
 * just above the fingertip when there is room and just below it while the finger is up
 * at the strip, and never leaves the screen sideways. Only horizontal travel counts once
 * the drag starts, so the thumb can slide down to somewhere comfortable and keep going.
 * A mouse needs no loupe: it gets the number on hover.
 */
export function ExamStrip({ cells, current, onJump, label, valueText, stagger = false, className }: {
  cells: StripCell[];
  current?: number;
  onJump?: (index: number) => void;
  /** Accessible name of the Navigator. */
  label?: string;
  /** Describes a Question in words: for the slider's value, and under the loupe. */
  valueText?: (index: number) => string;
  /** Results: colours arrive left to right. */
  stagger?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  /** Where the finger is, while a touch is scrubbing; a mouse leaves this null. */
  const [finger, setFinger] = useState<{ x: number; y: number } | null>(null);
  const last = cells.length - 1;
  const at = (x: number) => {
    const box = ref.current!.getBoundingClientRect();
    return clamp(Math.floor(((x - box.left) / box.width) * cells.length), 0, last);
  };
  const point = (index: number) => {
    // Android only; iOS Safari has no Vibration API.
    if (index !== scrub && finger) tick();
    setScrub(index);
  };
  const end = (commit: boolean) => {
    if (commit && scrub != null) onJump?.(scrub);
    setScrub(null);
    setFinger(null);
  };
  const pointed = scrub ?? hover;
  const percent = (i: number) => `${((i + 0.5) / cells.length) * 100}%`;

  // Above the fingertip when it fits, as the iOS loupe does; below it while the finger is at the strip.
  const above = finger ? finger.y - 28 - LOUPE_HEIGHT : 0;
  const loupeAbove = above >= 8;

  return (
    <div
      ref={ref}
      className={cn(
        'relative',
        // The strip owns the whole gesture; a long press must not select text or pop a callout.
        onJump && 'cursor-pointer touch-none select-none py-2 [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/40',
        className
      )}
      {...(onJump && {
        role: 'slider',
        tabIndex: 0,
        'aria-label': label,
        'aria-valuemin': 1,
        'aria-valuemax': cells.length,
        'aria-valuenow': (current ?? 0) + 1,
        'aria-valuetext': valueText?.(current ?? 0),
        // A focused slider owns its keys: handled here and kept from the page-wide quiz
        // keys, which would otherwise move focus to an answer option or scroll the page.
        onKeyDown: (event: React.KeyboardEvent) => {
          const here = current ?? 0;
          const target =
            event.key === 'ArrowRight' || event.key === 'ArrowUp'
              ? here + 1
              : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
                ? here - 1
                : event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? last
                    : null;
          if (target == null) return;
          event.preventDefault();
          event.stopPropagation();
          onJump(clamp(target, 0, last));
        },
        onPointerDown: (event: React.PointerEvent) => {
          // Keeps the drag alive when the finger slides off the strip.
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            /* nothing to capture (a scripted pointer) */
          }
          if (event.pointerType !== 'mouse') setFinger({ x: event.clientX, y: event.clientY });
          setScrub(at(event.clientX));
        },
        onPointerMove: (event: React.PointerEvent) => {
          if (scrub != null) {
            if (finger) setFinger({ x: event.clientX, y: event.clientY });
            point(at(event.clientX));
          } else if (event.pointerType === 'mouse') setHover(at(event.clientX));
        },
        onPointerUp: () => end(true),
        onPointerCancel: () => end(false),
        onPointerLeave: () => setHover(null)
      })}
    >
      {/* No per-column borders: at 65 across, a phone would show nothing but borders. */}
      <div className='flex h-full items-end gap-px border-b-2 border-black' aria-hidden='true'>
        {cells.map((cell, i) => (
          <div
            key={i}
            className={cn('flex-1 transition-[height,background-color,opacity] duration-300 ease-[var(--ease-out)]', TONE[cell.tone], cell.dim && 'opacity-15', i === pointed && 'outline-2 outline-black')}
            style={{ height: cell.tone === 'empty' ? 3 : `${cell.height}%`, transitionDelay: stagger && !reduce ? `${i * 20}ms` : undefined }}
          />
        ))}
      </div>
      {current != null && (
        <motion.div
          className='absolute bottom-0 h-1.5 -translate-x-1/2 bg-black'
          style={{ width: `max(6px, ${100 / cells.length}%)` }}
          initial={false}
          animate={{ left: percent(current) }}
          transition={reduce ? { duration: 0 } : { type: 'spring', duration: 0.35, bounce: 0.2 }}
          aria-hidden='true'
        />
      )}
      {finger && scrub != null ? (
        <motion.div
          data-testid='strip-loupe'
          className='pointer-events-none fixed z-40 border-4 border-black bg-white px-2 pb-1.5 pt-2 shadow-[5px_5px_0px_0px_#000]'
          style={{
            top: loupeAbove ? above : finger.y + 40,
            left: clamp(finger.x - LOUPE_WIDTH / 2, 8, window.innerWidth - LOUPE_WIDTH - 8),
            width: LOUPE_WIDTH,
            transformOrigin: loupeAbove ? '50% 100%' : '50% 0%'
          }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', duration: 0.2, bounce: 0.2 }}
          aria-hidden='true'
        >
          <div className='flex items-center justify-center gap-1.5' style={{ height: CENTER }}>
            {[-2, -1, 0, 1, 2].map(offset => {
              const cell = cells[scrub + offset];
              const size = offset === 0 ? CENTER : TILE;
              return (
                <div
                  key={offset}
                  className={cn('flex shrink-0 items-center justify-center border-2 border-black font-black tabular-nums', offset === 0 ? 'text-3xl outline-4 outline-black' : 'text-sm', cell ? TILE_TONE[cell.tone] : 'invisible')}
                  style={{ width: size, height: size }}
                >
                  {scrub + offset + 1}
                </div>
              );
            })}
          </div>
          {valueText && <p className='mt-2 truncate text-center text-xs font-bold'>{valueText(scrub)}</p>}
        </motion.div>
      ) : (
        pointed != null && (
          <span className='pointer-events-none absolute top-full z-10 -translate-x-1/2 bg-black px-2 py-0.5 text-sm font-black tabular-nums text-white' style={{ left: percent(pointed) }} aria-hidden='true'>
            {pointed + 1}
          </span>
        )
      )}
    </div>
  );
}
