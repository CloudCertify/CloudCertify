import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { dockButton, focusRing, press } from '@/components/attempt-frame';
import { ExamStrip, TILE_TONE, type StripCell } from '@/components/exam-strip';
import { useI18n } from '@/i18n/use-i18n';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'empty' | 'revisit';

/**
 * The Exam at a glance, before Submit: every Question as a numbered tile in its strip
 * colour, with what is still blank and what the visitor marked to come back to (a Guess
 * or Unsure rating) one tap away. A tile jumps to its Question. Correctness is deferred
 * to Submit, so nothing here says right or wrong. A whole screen on a phone, a panel on
 * a desktop.
 */
export function AttemptReview({ open, onClose, cells, current, onJump, valueText, onFinish, finishLabel, isSubmitting }: {
  open: boolean;
  onClose: () => void;
  /** The Navigator's own cells, so tile and column always agree. */
  cells: StripCell[];
  current: number;
  onJump: (index: number) => void;
  /** Describes a Question in words, for its tile. */
  valueText: (index: number) => string;
  onFinish: () => void;
  finishLabel: string;
  isSubmitting: boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setFilter('all');
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const count = (tone: StripCell['tone']) => cells.filter(cell => cell.tone === tone).length;
  const filters: { id: Filter; label: string; count: number; swatch: string }[] = [
    { id: 'all', label: t.navigator.all, count: cells.length, swatch: 'bg-primary' },
    { id: 'empty', label: t.navigator.blank, count: count('empty'), swatch: 'bg-white' },
    { id: 'revisit', label: t.navigator.toRevisit, count: count('revisit'), swatch: 'bg-secondary' }
  ];

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className='m-0 h-dvh max-h-none w-full max-w-none bg-background p-0 text-black backdrop:bg-black/50 sm:m-auto sm:h-auto sm:max-w-2xl sm:border-4 sm:border-black sm:shadow-[8px_8px_0px_0px_#000]'
    >
      <div className='flex h-dvh flex-col sm:h-auto sm:max-h-[85dvh]'>
        <div className='flex items-center justify-between gap-4 px-4 pt-3 sm:px-6 sm:pt-5'>
          <h2 id={titleId} className='text-2xl font-black font-stretch-[88%]'>
            {t.navigator.title}
          </h2>
          <button type='button' onClick={onClose} aria-label={t.navigator.close} className={cn('-mr-2 flex size-11 cursor-pointer items-center justify-center', focusRing)}>
            <X className='size-6' strokeWidth={3} aria-hidden='true' />
          </button>
        </div>

        <div className='px-4 sm:px-6'>
          <ExamStrip cells={cells} current={current} className='mt-2 h-16 sm:h-20' />
          <div className='mt-4 flex flex-wrap gap-2'>
            {filters.map(item => (
              <button
                key={item.id}
                type='button'
                aria-pressed={filter === item.id}
                disabled={item.count === 0}
                onClick={() => setFilter(item.id)}
                className={cn(
                  'flex h-11 cursor-pointer items-center gap-2 border-2 border-black px-3 text-sm font-black disabled:cursor-default disabled:opacity-40',
                  filter === item.id ? 'bg-black text-white' : 'bg-white',
                  focusRing
                )}
              >
                <span className={cn('size-3 border-2', filter === item.id ? 'border-white' : 'border-black', item.swatch)} aria-hidden='true' />
                {item.label}
                <span className='tabular-nums'>{item.count}</span>
              </button>
            ))}
          </div>
        </div>

        <ul className='mt-4 grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] content-start gap-2 overflow-y-auto px-4 pb-4 pt-1 sm:px-6'>
          {cells.map((cell, i) =>
            filter === 'all' || cell.tone === filter ? (
              <li key={i}>
                <button
                  type='button'
                  onClick={() => {
                    onJump(i);
                    onClose();
                  }}
                  aria-label={valueText(i)}
                  aria-current={i === current ? 'true' : undefined}
                  className={cn(
                    'flex aspect-square w-full cursor-pointer items-center justify-center border-2 border-black font-black tabular-nums transition-transform duration-100 active:scale-95',
                    TILE_TONE[cell.tone],
                    i === current && 'outline-4 -outline-offset-2 outline-black',
                    focusRing
                  )}
                >
                  {i + 1}
                </button>
              </li>
            ) : null
          )}
        </ul>

        <div className='border-t-4 border-black bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6'>
          <button
            type='button'
            disabled={isSubmitting}
            onClick={() => {
              onClose();
              onFinish();
            }}
            className={cn(dockButton, press, focusRing, 'w-full bg-primary px-10 text-white sm:ml-auto sm:block sm:w-auto sm:min-w-52')}
          >
            {isSubmitting ? t.common.submitting : finishLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
