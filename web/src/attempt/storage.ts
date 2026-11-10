import { z } from 'zod';
import {
  Confidence,
  type CheckAnswerResponseDto,
  type DrillDetailDto,
  type QuizDetailDto,
  type SubmitQuizResponseDto
} from '@/http/generated/api.schemas';

/** Which attempt a session route shows: an Exam has no Drill, Practice has exactly one. */
export type AttemptTarget = { quizId: number; drillId?: number };

export type Mode = 'exam' | 'practice';

export type StartPayload =
  | { mode: 'exam'; detail: QuizDetailDto; email: string | null }
  | { mode: 'practice'; detail: DrillDetailDto; email: string | null };

/**
 * The server's finish or Submit response, held whole. `passingScore` arrives with
 * the grading spec (#103); until then the views show only the server's verdict.
 */
export type SubmitResponse = SubmitQuizResponseDto & { passingScore?: number | null };

/** Everything a reload needs to put the visitor back where they were. */
export type AttemptProgress = {
  submissionId: number | null;
  currentIndex: number;
  selections: Record<number, number[]>;
  confidences: Record<number, Confidence>;
  checks: Record<number, CheckAnswerResponseDto>;
  reported: number[];
  /** Exam Questions whose latest selection the server has not confirmed. */
  unsaved: number[];
  result: SubmitResponse | null;
};

export function modeOf(target: AttemptTarget): Mode {
  return target.drillId == null ? 'exam' : 'practice';
}

export function sessionPath(target: AttemptTarget): string {
  return target.drillId == null
    ? `/quiz/${target.quizId}/session`
    : `/quiz/${target.quizId}/drill/${target.drillId}/session`;
}

const payloadKey = (target: AttemptTarget) =>
  target.drillId == null
    ? `attempt:${target.quizId}`
    : `attempt:${target.quizId}:${target.drillId}`;
const progressKey = (target: AttemptTarget) => `${payloadKey(target)}:progress`;
const emailKey = (quizId: number) => `attempt-email:${quizId}`;

const payloadSchema = z.object({
  mode: z.enum(['exam', 'practice']),
  detail: z.looseObject({ questions: z.array(z.looseObject({})).optional() }),
  email: z.string().nullable()
});

const progressSchema = z.object({
  submissionId: z.number().nullable(),
  currentIndex: z.number().int().min(0),
  selections: z.record(z.string(), z.array(z.number())),
  confidences: z.record(z.string(), z.enum(Confidence)),
  checks: z.record(
    z.string(),
    z.looseObject({
      isCorrect: z.boolean(),
      correctAnswerIds: z.array(z.number()),
      selectedAnswerIds: z.array(z.number())
    })
  ),
  reported: z.array(z.number()),
  unsaved: z.array(z.number()),
  // Only what the results views read; anything less is unreadable progress.
  result: z
    .looseObject({
      score: z.number(),
      scaledScore: z.number(),
      passed: z.boolean(),
      totalQuestions: z.number(),
      correctCount: z.number(),
      luckyGuessCount: z.number(),
      misconceptionCount: z.number(),
      domainBreakdown: z.array(z.looseObject({})),
      questions: z.array(z.looseObject({})),
      passingScore: z.number().nullish()
    })
    .nullable()
});

function read(key: string): unknown {
  try {
    const raw = sessionStorage.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Session storage is per tab, so an attempt in another tab never overwrites this one. */
export function writePayload(target: AttemptTarget, payload: StartPayload) {
  sessionStorage.setItem(payloadKey(target), JSON.stringify(payload));
  sessionStorage.removeItem(progressKey(target));
}

/** The stored start payload, or null when it is missing or unreadable. */
export function readPayload(target: AttemptTarget): StartPayload | null {
  const parsed = payloadSchema.safeParse(read(payloadKey(target)));
  if (!parsed.success || parsed.data.mode !== modeOf(target)) return null;
  return parsed.data as StartPayload;
}

export function writeProgress(target: AttemptTarget, progress: AttemptProgress) {
  sessionStorage.setItem(progressKey(target), JSON.stringify(progress));
}

/** Stored progress for this Submission, or null; unreadable progress is dropped, not fatal. */
export function readProgress(
  target: AttemptTarget,
  submissionId: number | null
): AttemptProgress | null {
  const parsed = progressSchema.safeParse(read(progressKey(target)));
  if (!parsed.success || parsed.data.submissionId !== submissionId) return null;
  return parsed.data as AttemptProgress;
}

export function rememberEmail(quizId: number, email: string | null) {
  if (email) sessionStorage.setItem(emailKey(quizId), email);
}

export function rememberedEmail(quizId: number): string {
  try {
    return sessionStorage.getItem(emailKey(quizId)) ?? '';
  } catch {
    return '';
  }
}
