'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QuestionCard } from '@/components/question-card';
import { PracticeQuestionCard, type PracticePhase } from '@/components/practice-question-card';
import { ConfidenceRating } from '@/components/confidence-rating';
import { ConfirmFinishDialog } from '@/components/confirm-finish-dialog';
import { useI18n } from '@/i18n/use-i18n';
import type { Confidence, QuestionDto } from '@/http/generated/api.schemas';

// Development preview of the production components, with local sample answers.
const SAMPLES: { question: QuestionDto; correct: number[]; explanation: string }[] = [
  {
    question: { id: 1, type: 'multiple_choice', selectCount: 1, difficulty: 'medium', text: 'You need to run containers without managing servers or clusters. Which AWS service should you use?', answers: [{ id: 11, text: 'Amazon EC2 with an Auto Scaling group' }, { id: 12, text: 'AWS Fargate' }, { id: 13, text: 'Amazon EKS on self-managed nodes' }, { id: 14, text: 'Amazon Elastic Block Store' }] },
    correct: [12], explanation: 'AWS Fargate manages the compute for your containers. You define the application and its resource needs; AWS handles the underlying servers.'
  },
  {
    question: { id: 2, type: 'multiple_response', selectCount: 2, difficulty: 'medium', text: 'An application must stay available if one Availability Zone fails. Which TWO choices improve its resilience?', answers: [{ id: 21, text: 'Distribute application instances across multiple Availability Zones' }, { id: 22, text: 'Place all application instances in a single subnet' }, { id: 23, text: 'Use a load balancer to route traffic to healthy instances' }, { id: 24, text: 'Store all application state on one instance’s local disk' }] },
    correct: [21, 23], explanation: 'Multiple Availability Zones remove a single-zone dependency. A load balancer can direct requests to the healthy instances that remain.'
  },
  {
    question: { id: 3, type: 'multiple_choice', selectCount: 1, difficulty: 'easy', text: 'Which service would you use to store unstructured objects such as images, videos, and backups?', answers: [{ id: 31, text: 'Amazon RDS' }, { id: 32, text: 'Amazon S3' }, { id: 33, text: 'Amazon ElastiCache' }, { id: 34, text: 'Amazon Route 53' }] },
    correct: [32], explanation: 'Amazon S3 is object storage. It stores unstructured data such as images, video, documents, and backups.'
  }
];

export function QuizMotionPrototypePage() {
  const { t } = useI18n();
  const router = useRouter();
  const parameters = new URLSearchParams(useSearchParams());
  const exam = parameters.get('mode') === 'exam';
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [ratings, setRatings] = useState<Record<number, Confidence>>({});
  const [phase, setPhase] = useState<PracticePhase>('answering');
  const [finished, setFinished] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const sample = SAMPLES[index];
  const selectedIds = answers[index] ?? [];
  const correct = selectedIds.length === sample.correct.length && selectedIds.every(id => sample.correct.includes(id));

  function reset() { setIndex(0); setAnswers({}); setRatings({}); setPhase('answering'); setFinished(false); }
  function changeMode(nextExam: boolean) {
    parameters.set('mode', nextExam ? 'exam' : 'practice');
    router.replace(`/prototype/quiz-motion?${parameters}`);
    reset();
  }
  function select(id: number) {
    setAnswers(previous => {
      const current = previous[index] ?? [];
      const next = sample.question.type === 'multiple_response'
        ? current.includes(id) ? current.filter(value => value !== id) : current.length < (sample.question.selectCount ?? 2) ? [...current, id] : current
        : [id];
      return { ...previous, [index]: next };
    });
    setRatings(previous => { const next = { ...previous }; delete next[index]; return next; });
  }
  function advance() {
    if (index === SAMPLES.length - 1) setFinished(true);
    else { setIndex(value => value + 1); setPhase('answering'); }
  }
  const meta = <Badge>AWS Solutions Architect</Badge>;
  const common = { index, total: SAMPLES.length, question: sample.question, meta, selectedIds, onSelect: select };

  return (
    <div className='min-h-dvh bg-background'>
      <AppHeader languageLocked />
      <main id="main-content" tabIndex={-1} className='mx-auto max-w-4xl px-4 py-8 md:py-12'>
        <div className='mb-6 flex flex-wrap items-center justify-between gap-4'>
          <div><h1 className='text-xl font-black'>Quiz interaction preview</h1><p className='mt-1 text-sm text-black/60'>The existing quiz components, using sample questions.</p></div>
          <div className='flex flex-wrap gap-2' aria-label='Preview controls'>
            <Button size='sm' variant={exam ? 'outline' : 'default'} aria-pressed={!exam} onClick={() => changeMode(false)}>Practice</Button>
            <Button size='sm' variant={exam ? 'default' : 'outline'} aria-pressed={exam} onClick={() => changeMode(true)}>Exam</Button>
          </div>
        </div>
        <div className='space-y-5'>
          {finished ? (
            <div className='border-4 border-black bg-white p-8'>
              <h2 className='text-2xl font-black'>{exam ? t.results.quizTitle : 'Practice complete'}</h2>
              <p className='mt-3 mb-6'>{t.results.scoreLine(SAMPLES.filter((item, i) => answers[i]?.length === item.correct.length && answers[i].every(id => item.correct.includes(id))).length, SAMPLES.length)}</p>
              <Button onClick={reset}>{t.common.tryAgain}</Button>
            </div>
          ) : exam ? (
            <>
              <QuestionCard {...common} onPrev={() => setIndex(value => Math.max(0, value - 1))} onNext={() => setIndex(value => Math.min(SAMPLES.length - 1, value + 1))} onFinish={() => setConfirmOpen(true)} finishLabel={t.question.finishQuiz} isSubmitting={false} />
              {selectedIds.length > 0 && <ConfidenceRating value={ratings[index] ?? null} onRate={value => setRatings(previous => ({ ...previous, [index]: value }))} />}
            </>
          ) : (
            <PracticeQuestionCard {...common} phase={phase} reveal={phase === 'revealed' ? { isCorrect: correct, correctAnswerIds: sample.correct, selectedAnswerIds: selectedIds, explanation: sample.explanation } : null} onCheck={() => setPhase('revealed')} onContinue={advance} isChecking={false} isFinishing={false} isLast={index === SAMPLES.length - 1} />
          )}
        </div>
        <ConfirmFinishDialog open={confirmOpen} unansweredCount={SAMPLES.filter((_, i) => !answers[i]?.length).length} onCancel={() => setConfirmOpen(false)} onConfirm={() => { setConfirmOpen(false); setFinished(true); }} />
      </main>
    </div>
  );
}
