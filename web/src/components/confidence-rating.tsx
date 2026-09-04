import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useI18n } from '@/i18n/use-i18n';
import { Confidence } from '@/http/generated/api.schemas';
import { cn } from '@/lib/utils';
import { needsReview } from '@/lib/confidence';

type ConfidenceRatingProps = {
  /** The current rating, or null when the question is unrated. */
  value: Confidence | null;
  onRate: (confidence: Confidence) => void;
};

/**
 * Traffic-light scale: the two ratings that mean "come back to this" are the
 * warm ones, so a glance at the card says the same thing the Navigator's
 * revisit marker does.
 */
// Confidence admits null on the wire ("unrated"), which is not a style to look up.
const STYLES: Record<
  NonNullable<Confidence>,
  { icon: LucideIcon; selected: string; icons: string }
> =
  {
    // Black on colour throughout: white labels on the red and green fills miss
    // WCAG AA at this size, and black is the theme's ink anyway.
    guess: {
      icon: HelpCircle,
      selected: 'bg-destructive text-black',
      icons: 'text-destructive'
    },
    unsure: {
      icon: AlertTriangle,
      selected: 'bg-warning text-black',
      icons: 'text-warning'
    },
    confident: {
      icon: CheckCircle2,
      selected: 'bg-success text-black',
      icons: 'text-success'
    }
  };

const OPTIONS = [Confidence.guess, Confidence.unsure, Confidence.confident] as const;

/**
 * How sure the visitor is about the answer they just gave, in a full Quiz only —
 * a Drill Check reveals correctness immediately, so it collects none (ADR 0006).
 *
 * Always optional: nothing here gates Submit, and there is no "unrated" option
 * because unrated is the absence of a rating, not a value. Plain buttons on
 * purpose — they are Tab-reachable and activate on Enter/Space natively, so the
 * quiz's global keyboard model (digits select answers, arrows navigate) keeps
 * working untouched.
 *
 * Colour is never the only signal: each rating carries its own icon and label,
 * and a low rating adds a written "revisit" hint below the control.
 *
 * @example <ConfidenceRating value={null} onRate={c => commit(qId, ids, c)} />
 */
export function ConfidenceRating({ value, onRate }: ConfidenceRatingProps) {
  const { t } = useI18n();

  return (
    <div
      role='group'
      aria-label={t.confidence.label}
      className='space-y-2 rounded-none border-2 border-black bg-white p-4'
    >
      <div className='flex flex-wrap items-center gap-3'>
        <span className='font-bold text-black'>{t.confidence.label}</span>
        <div className='flex flex-wrap gap-2'>
          {OPTIONS.map(option => {
            const isSelected = value === option;
            const { icon: Icon, selected, icons } = STYLES[option];
            return (
              <button
                key={option}
                type='button'
                aria-pressed={isSelected}
                onClick={() => onRate(option)}
                className={cn(
                  'flex items-center gap-1.5 rounded-none border-2 border-black px-3 py-1.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/40 focus-visible:ring-offset-2',
                  isSelected
                    ? cn('translate-x-[2px] translate-y-[2px] shadow-none', selected)
                    : 'bg-white text-black shadow-[4px_4px_0px_0px_#000] hover:bg-background'
                )}
              >
                <Icon className={cn('h-4 w-4', !isSelected && icons)} aria-hidden='true' />
                {t.confidence.options[option]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Persistent live region: focus stays on the rating button, so the hint
          has to announce itself rather than wait to be found. */}
      <p
        role='status'
        className='flex min-h-5 items-center gap-1.5 text-sm font-bold text-black/70'
      >
        {needsReview(value) && (
          <>
            <AlertTriangle className='h-4 w-4 text-warning' aria-hidden='true' />
            {t.confidence.revisitHint}
          </>
        )}
      </p>
    </div>
  );
}
