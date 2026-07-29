import { Confidence } from '@/http/generated/api.schemas';

/**
 * Ratings that mean "come back to this before Submit" — the visitor's own flag,
 * not a correctness judgement (nothing reveals correctness mid-attempt, ADR 0002).
 *
 * @example needsReview(Confidence.guess) // true
 */
export function needsReview(confidence: Confidence | null | undefined): boolean {
  return confidence === Confidence.guess || confidence === Confidence.unsure;
}
