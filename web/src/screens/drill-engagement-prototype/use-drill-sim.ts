import { useState } from 'react';
import type { CheckAnswerResponseDto, QuestionDto } from '@/http/generated/api.schemas';
import { nextSelection, requiredCount } from '@/attempt/selection';
import { cue } from './feedback';
import { SAMPLES, type Sample } from './samples';

export type Outcome = 'correct' | 'wrong';

/** A combo starts paying (and is worth calling out) at this many in a row. */
export const COMBO_AT = 3;
export const PASS_AT = 70;

/**
 * PROTOTYPE stand-in for `useAttempt` on a Practice Drill: same Check -> Continue,
 * forward-only shape, graded locally from the samples. Adds what the real attempt
 * does not have yet: an in-drill streak, derivable client-side from Checks.
 */
export function useDrillSim() {
  const [index, setIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [reveal, setReveal] = useState<CheckAnswerResponseDto | null>(null);
  const [finished, setFinished] = useState(false);
  const [bestStreak, setBestStreak] = useState(0);

  const total = SAMPLES.length;
  const sample: Sample = SAMPLES[index];
  const question: QuestionDto = sample.question;
  const correctCount = outcomes.filter(outcome => outcome === 'correct').length;
  // Consecutive correct Checks ending at the latest one.
  let streak = 0;
  for (let i = outcomes.length - 1; i >= 0 && outcomes[i] === 'correct'; i--) streak++;
  const score = Math.round((correctCount / total) * 100);
  const phase: 'answering' | 'revealed' | 'finished' = finished ? 'finished' : reveal ? 'revealed' : 'answering';
  const canCheck = phase === 'answering' && selectedIds.length === requiredCount(question);
  const isLast = index === total - 1;

  function select(answerId: number) {
    if (phase !== 'answering') return;
    const next = nextSelection(question, selectedIds, answerId);
    if (next === selectedIds) return;
    setSelectedIds(next);
    cue('select');
  }

  function check() {
    if (!canCheck) return;
    const isCorrect = selectedIds.length === sample.correct.length && selectedIds.every(id => sample.correct.includes(id));
    const nextStreak = isCorrect ? streak + 1 : 0;
    setReveal({ isCorrect, correctAnswerIds: sample.correct, selectedAnswerIds: selectedIds, explanation: sample.explanation });
    setOutcomes(previous => [...previous, isCorrect ? 'correct' : 'wrong']);
    setBestStreak(value => Math.max(value, nextStreak));
    cue(!isCorrect ? 'wrong' : nextStreak >= COMBO_AT ? 'combo' : 'correct');
  }

  function proceed() {
    if (phase !== 'revealed') return;
    setReveal(null);
    setSelectedIds([]);
    if (isLast) {
      setFinished(true);
      cue('finish');
    } else {
      setIndex(value => value + 1);
    }
  }

  function restart() {
    setIndex(0);
    setSelectedIds([]);
    setOutcomes([]);
    setReveal(null);
    setFinished(false);
    setBestStreak(0);
  }

  /** Debug: answer the current question right or wrong without picking, for fast evaluation. */
  function debugAnswer(correct: boolean) {
    if (phase !== 'answering') return;
    const wrongId = (question.answers ?? []).map(answer => answer.id!).find(id => !sample.correct.includes(id))!;
    setSelectedIds(correct ? sample.correct : [wrongId, ...sample.correct].slice(0, sample.correct.length));
  }

  /** Debug: jump straight to the results screen with `correct` right answers. */
  function debugFinish(correct: number) {
    const all: Outcome[] = SAMPLES.map((_, i) => (i < correct ? 'correct' : 'wrong'));
    setOutcomes(all);
    setBestStreak(correct);
    setIndex(total - 1);
    setReveal(null);
    setSelectedIds([]);
    setFinished(true);
  }

  return {
    samples: SAMPLES, total, index, sample, question, selectedIds, phase, reveal, canCheck, isLast,
    /** One entry per checked question, in order. `outcomes.length` is how many are done. */
    outcomes, correctCount, streak, bestStreak,
    /** 0-100 percentage; a Drill passes at 70. Only meaningful once finished. */
    score, passed: score >= PASS_AT,
    select, check, proceed, restart, debugAnswer, debugFinish
  };
}

export type DrillSim = ReturnType<typeof useDrillSim>;
