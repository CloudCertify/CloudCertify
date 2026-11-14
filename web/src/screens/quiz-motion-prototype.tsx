'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { QuestionCard } from '@/components/question-card';
import { PracticeQuestionCard } from '@/components/practice-question-card';
import { ConfirmFinishDialog } from '@/components/confirm-finish-dialog';
import { useI18n } from '@/i18n/use-i18n';
import type { Confidence, QuizResultQuestionDto } from '@/http/generated/api.schemas';
import { nextSelection, requiredCount } from '@/attempt/selection';
import { sessionPath, writePayload, writeProgress, type AttemptTarget } from '@/attempt/storage';
import { SAMPLES, type Sample } from './quiz-motion-samples';

// Development preview of the production attempt components, graded locally from
// sample questions: 15 for a Drill, 65 for an Exam (the samples, cycled with fresh ids).
// Finishing hands the locally graded result to the real session route, so the real
// results screens show it. No API call is made; Try Again there would make one.
function questionsFor(exam: boolean): Sample[] {
  return Array.from({ length: exam ? 65 : SAMPLES.length }, (_, i) => {
    const source = SAMPLES[i % SAMPLES.length];
    const shift = (i + 1) * 10 - source.question.id! * 10;
    return {
      ...source,
      question: { ...source.question, id: i + 1, answers: source.question.answers!.map(answer => ({ ...answer, id: answer.id! + shift })) },
      correct: source.correct.map(id => id + shift)
    };
  });
}

export function QuizMotionPrototypePage() {
  const exam = useSearchParams().get('mode') === 'exam';
  // Keyed by Mode: a Drill and an Exam share nothing, however the Mode was switched.
  return <Preview key={String(exam)} exam={exam} />;
}

function Preview({ exam }: { exam: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const samples = questionsFor(exam);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [ratings, setRatings] = useState<Record<number, Confidence>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const sample = samples[index];
  const selectedIds = answers[index] ?? [];
  const isRight = (i: number) => {
    const picked = answers[i] ?? [];
    return picked.length === samples[i].correct.length && picked.every(id => samples[i].correct.includes(id));
  };


  /** Store this attempt as finished, the way the attempt module would, and open its results. */
  function finish() {
    const target: AttemptTarget = exam ? { quizId: 0 } : { quizId: 0, drillId: 0 };
    const questions: QuizResultQuestionDto[] = samples.map((item, i) => ({
      id: item.question.id!,
      text: item.question.text ?? '',
      type: item.question.type!,
      domain: item.domain,
      explanation: item.explanation,
      confidence: exam ? ratings[i] ?? null : null,
      isCorrect: isRight(i),
      answers: item.question.answers!.map(answer => ({ id: answer.id!, text: answer.text, isCorrect: item.correct.includes(answer.id!), wasSelected: (answers[i] ?? []).includes(answer.id!) }))
    }));
    const correctCount = questions.filter(item => item.isCorrect).length;
    const score = Math.round((correctCount / questions.length) * 100);
    const scaledScore = 100 + Math.round((correctCount / questions.length) * 900);
    const domains = [...new Set(samples.map(item => item.domain))];
    const detail = { id: 0, title: exam ? 'AWS Cloud Practitioner' : 'Exam mix', questions: samples.map(item => item.question) };
    writePayload(target, exam ? { mode: 'exam', detail, email: null } : { mode: 'practice', detail: { ...detail, domain: null, drawRule: 'drill_mix', composition: { missed: 3, due: 2, unseen: 10, mastered: 0 } }, email: null });
    writeProgress(target, {
      submissionId: null,
      currentIndex: samples.length - 1,
      selections: {},
      confidences: {},
      checks: {},
      reported: [],
      unsaved: [],
      result: {
        score,
        scaledScore,
        passed: exam ? scaledScore >= 700 : score >= 70,
        passingScore: exam ? 700 : 70,
        totalQuestions: questions.length,
        correctCount,
        luckyGuessCount: questions.filter(item => item.confidence === 'guess' && item.isCorrect).length,
        misconceptionCount: questions.filter(item => item.confidence === 'confident' && !item.isCorrect).length,
        domainBreakdown: domains.map(domain => {
          const inDomain = questions.filter(item => item.domain === domain);
          return { domain, total: inDomain.length, correct: inDomain.filter(item => item.isCorrect).length, weight: inDomain.length / questions.length };
        }),
        questions
      }
    });
    router.push(sessionPath(target));
  }
  const changeMode = (nextExam: boolean) => router.replace(`/prototype/quiz-motion?mode=${nextExam ? 'exam' : 'practice'}`);
  function select(id: number) {
    setAnswers(previous => ({ ...previous, [index]: nextSelection(sample.question, previous[index] ?? [], id) }));
    setRatings(previous => { const next = { ...previous }; delete next[index]; return next; });
  }
  const common = { index, total: samples.length, question: sample.question, selectedIds, onSelect: select, exitHref: '/quiz' };
  const modes = (
    <div className='fixed right-2 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-2' aria-label='Preview controls'>
      <Button size='sm' variant={exam ? 'outline' : 'default'} aria-pressed={!exam} onClick={() => changeMode(false)}>Practice</Button>
      <Button size='sm' variant={exam ? 'default' : 'outline'} aria-pressed={exam} onClick={() => changeMode(true)}>Exam</Button>
    </div>
  );

  return (
    <>
      {exam ? (
        <QuestionCard
          {...common}
          onPrev={() => setIndex(value => Math.max(0, value - 1))}
          onNext={() => setIndex(value => Math.min(samples.length - 1, value + 1))}
          onFinish={() => setConfirmOpen(true)}
          finishLabel={t.question.finishQuiz}
          isSubmitting={false}
          answered={samples.map((_, i) => (answers[i]?.length ?? 0) > 0)}
          confidences={samples.map((_, i) => ratings[i])}
          onJump={setIndex}
          confidence={ratings[index] ?? null}
          onRate={value => setRatings(previous => ({ ...previous, [index]: value }))}
        />
      ) : (
        <PracticeQuestionCard
          {...common}
          phase={index in checked ? 'revealed' : 'answering'}
          reveal={index in checked ? { isCorrect: checked[index], correctAnswerIds: sample.correct, selectedAnswerIds: selectedIds, explanation: sample.explanation } : null}
          onCheck={() => setChecked(previous => ({ ...previous, [index]: isRight(index) }))}
          onContinue={() => (index === samples.length - 1 ? finish() : setIndex(value => value + 1))}
          canCheck={selectedIds.length === requiredCount(sample.question)}
          isChecking={false}
          isFinishing={false}
          isLast={index === samples.length - 1}
          outcomes={samples.map((_, i) => checked[i] ?? null)}
        />
      )}
      <ConfirmFinishDialog open={confirmOpen} unansweredCount={samples.filter((_, i) => !answers[i]?.length).length} onCancel={() => setConfirmOpen(false)} onConfirm={() => { setConfirmOpen(false); finish(); }} />
      {modes}
    </>
  );
}
