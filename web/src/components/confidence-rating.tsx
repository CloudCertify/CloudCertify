import { useI18n } from '@/i18n/use-i18n';
import { Confidence } from '@/http/generated/api.schemas';
import { cn } from '@/lib/utils';
import { needsReview } from '@/lib/confidence';

type ConfidenceRatingProps = {
  /** The current rating, or null when the question is unrated. */
  value: Confidence | null;
  onRate: (confidence: Confidence) => void;
  /** Nothing to rate yet: the Question has no answer. Shown, but inert. */
  disabled?: boolean;
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
 * The pressed colour is the one the Navigator strip gives that Question: amber for
 * the two ratings that mean "come back to this", blue for Confident. Colour is never
 * the only signal: each rating is a word, and a low one adds a written hint.
 *
 * @example <ConfidenceRating value={null} onRate={c => commit(qId, ids, c)} />
 */
export function ConfidenceRating({ value, onRate, disabled = false }: ConfidenceRatingProps) {
  const { t } = useI18n();

  return (
    <div role='group' aria-label={t.confidence.label} className={cn('transition-opacity', disabled && 'opacity-30')}>
      <div className='mb-1.5 flex flex-wrap items-baseline gap-x-3'>
        <span className='text-sm font-bold text-black'>{t.confidence.label}</span>
        {/* Persistent live region: focus stays on the rating button, so the hint
            has to announce itself rather than wait to be found. */}
        <p role='status' className='text-sm font-medium text-black/70'>
          {needsReview(value) && t.confidence.revisitHint}
        </p>
      </div>
      <div className='grid grid-cols-3 gap-2 sm:max-w-md'>
        {OPTIONS.map(option => {
          const isSelected = value === option;
          return (
            <button
              key={option}
              type='button'
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => onRate(option)}
              className={cn(
                'h-11 cursor-pointer border-2 border-black text-[0.9375rem] font-bold transition-[translate,box-shadow,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/40 focus-visible:ring-offset-2 disabled:cursor-default',
                isSelected
                  ? cn('translate-x-0.5 translate-y-0.5', option === Confidence.confident ? 'bg-primary text-white' : 'bg-secondary text-black')
                  : 'bg-white text-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
              )}
            >
              {t.confidence.options[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
