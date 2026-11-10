'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  postQuizQuizIdAnswer,
  postQuizQuizIdDrillsDrillIdCheck,
  postQuizQuizIdDrillsDrillIdFinish,
  postQuizQuizIdSubmit
} from '@/http/generated/api';
import type { Confidence } from '@/http/generated/api.schemas';
import { useI18n } from '@/i18n/use-i18n';
import { createCommitQueue, type CommitQueue } from './commit-queue';
import {
  attemptReducer,
  canCheck,
  currentQuestionOf,
  initialAttemptState,
  isLastQuestion,
  phaseOf,
  progressOf,
  questionsOf,
  rulesOf,
  selectionOf,
  type AttemptAction,
  type AttemptState
} from './reducer';
import { startAttempt, startErrorMessage } from './start';
import { readPayload, readProgress, writeProgress, type AttemptTarget } from './storage';

/**
 * One attempt's whole life for both Modes: load or resume, select, Check or
 * commit, rate Confidence, move, Submit, results and Try Again. Screens render
 * from what this returns and never re-encode the Mode rules.
 */
export function useAttempt({ quizId, drillId }: AttemptTarget) {
  const target = useMemo(() => ({ quizId, drillId }), [quizId, drillId]);
  const router = useRouter();
  const { t } = useI18n();
  const copy = useRef(t);
  copy.current = t;

  const [state, setState] = useState<AttemptState>(initialAttemptState);
  const stateRef = useRef(state);
  const queueRef = useRef<CommitQueue | null>(null);

  const apply = useCallback((action: AttemptAction) => {
    const next = attemptReducer(stateRef.current, action);
    if (next !== stateRef.current) {
      stateRef.current = next;
      setState(next);
    }
    return next;
  }, []);

  // A fresh queue per Submission; late answers from an older one are dropped.
  const begin = useCallback(
    (next: AttemptState) => {
      queueRef.current?.dispose();
      const submissionId = next.payload?.detail.submissionId;
      if (!rulesOf(next).commitsSelections || next.status !== 'active') {
        queueRef.current = null;
        return;
      }
      const queue = createCommitQueue(
        commit => postQuizQuizIdAnswer(target.quizId, { submissionId, ...commit }),
        (questionId, status) => {
          apply({ type: 'commit', questionId, status });
          if (status === 'failed') toast.error(copy.current.results.answerError);
        }
      );
      queueRef.current = queue;
      // Resume: anything the server never confirmed before the reload goes again.
      for (const questionId of Object.keys(next.commits).map(Number)) {
        queue.push({
          questionId,
          answerIds: selectionOf(next, questionId),
          confidence: next.confidences[questionId] ?? null
        });
      }
    },
    [apply, target]
  );

  useEffect(() => {
    const payload = readPayload(target);
    if (!payload) {
      router.push(`/quiz/${target.quizId}`);
      return;
    }
    const progress = readProgress(target, payload.detail.submissionId ?? null);
    begin(apply({ type: 'loaded', payload, progress }));
    return () => queueRef.current?.dispose();
  }, [target, router, apply, begin]);

  useEffect(() => {
    if (state.payload) writeProgress(target, progressOf(state));
  }, [state, target]);

  const commitCurrent = (before: AttemptState, after: AttemptState) => {
    const questionId = currentQuestionOf(after)?.id;
    if (after === before || questionId == null) return;
    queueRef.current?.push({
      questionId,
      answerIds: selectionOf(after, questionId),
      confidence: after.confidences[questionId] ?? null
    });
  };

  const select = (answerId: number) => {
    const before = stateRef.current;
    commitCurrent(before, apply({ type: 'selected', answerId }));
  };

  // Rating rides along with the answer it describes; the latest commit wins (ADR 0006).
  const rate = (confidence: Confidence) => {
    const before = stateRef.current;
    commitCurrent(before, apply({ type: 'rated', confidence }));
  };

  const goTo = (index: number) => apply({ type: 'moved', index });

  const check = async () => {
    const before = stateRef.current;
    const started = apply({ type: 'checkStarted' });
    const questionId = currentQuestionOf(started)?.id;
    if (started === before || questionId == null || drillId == null) return;
    try {
      const res = await postQuizQuizIdDrillsDrillIdCheck(quizId, drillId, {
        submissionId: started.payload?.detail.submissionId,
        questionId,
        answerIds: selectionOf(started, questionId)
      });
      if (stateRef.current.payload === started.payload) {
        apply({ type: 'checked', questionId, check: res.data });
      }
    } catch {
      // The Question stays answering, so the Check can be retried.
      apply({ type: 'checkFailed' });
      toast.error(t.results.checkError);
    }
  };

  const finish = async () => {
    const before = stateRef.current;
    const started = apply({ type: 'submitStarted' });
    if (started === before) return;
    const queue = queueRef.current;
    if (queue) {
      // Submit grades what the server holds, so it waits for every queued answer.
      await queue.settled();
      if (queue.failed().length > 0) {
        apply({ type: 'submitStopped' });
        toast.error(t.attempt.unsavedAnswers);
        queue.retryFailed();
        return;
      }
    }
    const submissionId = started.payload?.detail.submissionId;
    // Mode decides the endpoint (ADR 0010); the Drill only names the Practice route.
    const practice = started.payload?.mode === 'practice' && drillId != null;
    try {
      // No answers in the body: the server grades its Recorded Answers (ADR 0006).
      const res = practice
        ? await postQuizQuizIdDrillsDrillIdFinish(quizId, drillId, { submissionId })
        : await postQuizQuizIdSubmit(quizId, { submissionId });
      if (stateRef.current.payload === started.payload) {
        apply({ type: 'finished', result: res.data });
      }
    } catch {
      apply({ type: 'submitStopped' });
      toast.error(practice ? t.results.finishError : t.results.submitError);
    }
  };

  // Practice: advance past a Checked Question; the last Continue finishes.
  const proceed = () => {
    const current = stateRef.current;
    if (phaseOf(current, currentQuestionOf(current)?.id) !== 'checked') return;
    if (isLastQuestion(current)) void finish();
    else apply({ type: 'continued' });
  };

  const requestSubmit = () => apply({ type: 'submitRequested' });
  const cancelSubmit = () => apply({ type: 'submitCancelled' });
  const confirmSubmit = () => {
    if (stateRef.current.confirmingSubmit) void finish();
  };

  const restart = async () => {
    const before = stateRef.current;
    const started = apply({ type: 'restartStarted' });
    if (started === before || !started.payload) return;
    try {
      const payload = await startAttempt(target, started.payload.email);
      begin(apply({ type: 'loaded', payload, progress: null }));
    } catch (error) {
      apply({ type: 'restartStopped' });
      toast.error(startErrorMessage(target, error, t));
    }
  };

  const markReported = (questionId: number) => apply({ type: 'reported', questionId });

  const questions = questionsOf(state);
  const currentQuestion = currentQuestionOf(state);
  const answered = questions.map(q => selectionOf(state, q.id).length > 0);
  const checkResponse =
    currentQuestion?.id == null ? null : state.checks[currentQuestion.id] ?? null;

  return {
    status: state.status,
    mode: state.payload?.mode ?? null,
    rules: rulesOf(state),
    payload: state.payload,
    questions,
    currentIndex: state.currentIndex,
    currentQuestion,
    isLast: isLastQuestion(state),
    selectedIds: selectionOf(state, currentQuestion?.id),
    confidences: state.confidences,
    confidence:
      currentQuestion?.id == null ? null : state.confidences[currentQuestion.id] ?? null,
    phase: phaseOf(state, currentQuestion?.id),
    checkResponse,
    canCheck: canCheck(state),
    answered,
    unansweredCount: answered.filter(a => !a).length,
    unsavedCount: Object.keys(state.commits).length,
    confirmingSubmit: state.confirmingSubmit,
    submitting: state.submitting,
    restarting: state.restarting,
    result: state.result,
    reported: state.reported,
    select,
    rate,
    goTo,
    check,
    proceed,
    requestSubmit,
    cancelSubmit,
    confirmSubmit,
    restart,
    markReported
  };
}

export type Attempt = ReturnType<typeof useAttempt>;
