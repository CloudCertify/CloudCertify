'use client';

import axios from 'axios';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  postQuizQuizIdDrillsDrillIdStart,
  postQuizQuizIdStart
} from '@/http/generated/api';
import type { Messages } from '@/i18n/messages/en';
import { useI18n } from '@/i18n/use-i18n';
import {
  rememberEmail,
  sessionPath,
  writePayload,
  type AttemptTarget,
  type StartPayload
} from './storage';

export type { AttemptTarget } from './storage';

/**
 * Starts a new Submission for an Exam (no Drill) or a Drill, stores its start
 * payload for the session route and remembers the visitor's email. Logged-in
 * Users pass no email: their Bearer token identifies them.
 */
export async function startAttempt(
  target: AttemptTarget,
  email: string | null
): Promise<StartPayload> {
  const body = email ? { email } : {};
  const payload: StartPayload =
    target.drillId == null
      ? { mode: 'exam', detail: (await postQuizQuizIdStart(target.quizId, body)).data, email }
      : {
          mode: 'practice',
          detail: (await postQuizQuizIdDrillsDrillIdStart(target.quizId, target.drillId, body)).data,
          email
        };
  writePayload(target, payload);
  rememberEmail(target.quizId, email);
  return payload;
}

/** Start-failure copy. 409 is an empty Mistakes union; 401 is an unsigned Mistakes start. */
export function startErrorMessage(
  target: AttemptTarget,
  error: unknown,
  t: Messages
): string {
  if (target.drillId == null) return t.attempt.startExamError;
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  if (status === 409) return t.drill.nothingToReview;
  if (status === 401) return t.drill.signInRequired;
  return t.attempt.startDrillError;
}

/**
 * Start from a page (Quiz page, Progress page): starts, then opens the session
 * route. A successful start stays busy until navigation unmounts the page.
 */
export function useStartAttempt() {
  const router = useRouter();
  const { t } = useI18n();
  const [starting, setStarting] = useState<AttemptTarget | null>(null);

  const start = async (target: AttemptTarget, email: string | null) => {
    setStarting(target);
    try {
      await startAttempt(target, email);
      router.push(sessionPath(target));
      return true;
    } catch (error) {
      toast.error(startErrorMessage(target, error, t));
      setStarting(null);
      return false;
    }
  };

  return { starting, start };
}
