import { DrawRule } from '@/http/generated/api.schemas';

/**
 * The whole-Quiz Mix the API seeds on every Quiz: a Drill Mix with no Domain (ADR 0013).
 * The web titles it "Exam mix" and lists it first, as the main way to practice.
 *
 * @example isWholeQuizMix({ drawRule: DrawRule.drill_mix, domain: null }) // true
 */
export function isWholeQuizMix(drill: { drawRule?: DrawRule; domain?: string | null }): boolean {
  return drill.drawRule === DrawRule.drill_mix && drill.domain == null;
}
