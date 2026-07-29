import { useI18n } from "@/i18n/context";
import { Confidence } from "@/http/generated/api.schemas";

type ConfidenceRatingProps = {
  /** The current rating, or null when the question is unrated. */
  value: Confidence | null;
  onRate: (confidence: Confidence) => void;
};

const OPTIONS = [
  Confidence.guess,
  Confidence.unsure,
  Confidence.confident,
] as const;

/**
 * How sure the visitor is about the answer they just gave, in a full Quiz only —
 * a Subquiz Check reveals correctness immediately, so it collects none (ADR 0006).
 *
 * Always optional: nothing here gates Submit, and there is no "unrated" option
 * because unrated is the absence of a rating, not a value. Plain buttons on
 * purpose — they are Tab-reachable and activate on Enter/Space natively, so the
 * quiz's global keyboard model (digits select answers, arrows navigate) keeps
 * working untouched while the rating is focused.
 *
 * @example <ConfidenceRating value={null} onRate={c => commit(qId, ids, c)} />
 */
export function ConfidenceRating({ value, onRate }: ConfidenceRatingProps) {
  const { t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t.confidence.label}
      className="flex flex-wrap items-center gap-3 rounded-[5px] border-2 border-black bg-white p-4"
    >
      <span className="font-bold text-black">{t.confidence.label}</span>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => {
          const isSelected = value === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onRate(option)}
              className={`rounded-[5px] border-2 border-black px-3 py-1.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/40 focus-visible:ring-offset-2 ${
                isSelected
                  ? "bg-primary text-white shadow-none translate-x-[2px] translate-y-[2px]"
                  : "bg-white text-black shadow-[4px_4px_0px_0px_#000] hover:bg-background"
              }`}
            >
              {t.confidence.options[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
