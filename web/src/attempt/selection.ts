import type { QuestionDto } from '@/http/generated/api.schemas';

/** How many answers a Question asks for; a missing count means one. */
export function requiredCount(question: QuestionDto): number {
  return question.selectCount ?? 1;
}

/**
 * The one selection rule for both Modes: a single choice replaces, a multiple
 * response toggles and is capped at the Question's required count. Returns the
 * same array when nothing changes, so callers can skip a no-op.
 */
export function nextSelection(
  question: QuestionDto,
  current: number[],
  answerId: number
): number[] {
  if (question.type !== 'multiple_response') {
    return current.length === 1 && current[0] === answerId ? current : [answerId];
  }
  if (current.includes(answerId)) return current.filter(id => id !== answerId);
  if (current.length >= requiredCount(question)) return current;
  return [...current, answerId];
}
