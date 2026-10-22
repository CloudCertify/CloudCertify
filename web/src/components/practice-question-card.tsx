import { useEffect, useId, useRef, type ReactNode } from 'react';
import { ArrowRight, CheckCircle, LoaderCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DifficultyBadge } from '@/components/difficulty-badge';
import { Progress } from '@/components/ui/progress';
import { useQuizKeyboard } from '@/hooks/use-quiz-keyboard';
import { useQuestionMotion } from '@/hooks/use-question-motion';
import { useI18n } from '@/i18n/use-i18n';
import type {
  CheckAnswerResponseDto,
  QuestionDto
} from '@/http/generated/api.schemas';
import './quiz-motion.css';

/**
 * Per-question state in the Check→Continue practice flow (issue #27 / ADR 0002):
 * `answering` — options selectable, Check enabled once the selection is valid;
 * `revealed` — options locked, correctness highlighted, explanation shown, Continue enabled.
 */
export type PracticePhase = 'answering' | 'revealed';

type PracticeQuestionCardProps = {
  /** Zero-based index of the current question. */
  index: number;
  total: number;
  question: QuestionDto;
  /** Right-side badges (drill title, domain, …). */
  meta?: ReactNode;
  /** Answer ids the user has currently selected for this question. */
  selectedIds: number[];
  onSelect: (answerId: number) => void;
  phase: PracticePhase;
  /** Reveal payload from the Check call; present only while `phase === 'revealed'`. */
  reveal: CheckAnswerResponseDto | null;
  onCheck: () => void;
  onContinue: () => void;
  /** Network in flight for the Check call. */
  isChecking: boolean;
  /** Network in flight for the finish call (last question's Continue). */
  isFinishing: boolean;
  /** True on the last question, so Continue finishes the drill. */
  isLast: boolean;
  /**
   * Report control for this Question. Rendered only in the revealed state — a
   * Report hangs off a Check (issue #41), so it must not be reachable before.
   */
  reportControl?: ReactNode;
  reducedMotion?: boolean;
};

export function PracticeQuestionCard({
  index,
  total,
  question,
  meta,
  selectedIds,
  onSelect,
  phase,
  reveal,
  onCheck,
  onContinue,
  isChecking,
  isFinishing,
  isLast,
  reportControl,
  reducedMotion = false
}: PracticeQuestionCardProps) {
  const { t } = useI18n();
  const questionLabelId = useId();
  const selectionHintId = useId();
  const feedbackRef = useRef<HTMLDivElement>(null);
  const cardRef = useQuestionMotion(index, question.id, reducedMotion);
  const progress = total > 0 ? ((index + 1) / total) * 100 : 0;
  const isMultiResponse = question.type === 'multiple_response';
  const selectCount = question.selectCount ?? 1;
  const isRevealed = phase === 'revealed';
  // Story #6: Check stays disabled until exactly the required number is picked.
  const canCheck = selectedIds.length === selectCount;

  const correctIds = reveal?.correctAnswerIds ?? [];
  const revealedSelectedIds = reveal?.selectedAnswerIds ?? [];
  const answers = question.answers ?? [];

  useEffect(() => {
    const feedback = feedbackRef.current;
    if (!isRevealed || !feedback) return;
    let cancelled = false;
    // Let the panel finish opening before measuring the space it needs.
    const opening = feedback.getAnimations?.() ?? [];
    void Promise.allSettled(opening.map(animation => animation.finished)).then(() => {
      if (cancelled) return;
      const bounds = feedback.getBoundingClientRect();
      const card = cardRef.current;
      if (bounds.bottom <= window.innerHeight - 24 || bounds.top < 24 || !card) return;
      const immediate = reducedMotion || card.dataset.quizInput === 'keyboard' ||
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      // Include Continue when it fits; long explanations start at their heading.
      window.scrollBy({
        top: Math.min(card.getBoundingClientRect().bottom - window.innerHeight + 24, bounds.top - 24),
        behavior: immediate ? 'instant' : 'smooth'
      });
    });
    return () => { cancelled = true; };
  }, [isRevealed, question.id, reducedMotion, cardRef]);

  const { getOptionProps } = useQuizKeyboard({
    containerRef: cardRef,
    count: answers.length,
    selectionEnabled: !isRevealed && !isChecking,
    onActivate: i => {
      const id = answers[i]?.id;
      if (id != null) onSelect(id);
    },
    onPrimary: () => {
      if (isRevealed) {
        if (!isFinishing) onContinue();
      } else if (canCheck && !isChecking) {
        onCheck();
      }
    },
    resetKey: question.id
  });

  return (
    <Card ref={cardRef} data-quiz-reduced={reducedMotion} className='quiz-motion w-full border-4 border-black shadow-[8px_8px_0px_0px_#000]'>
      <CardHeader className='border-b-2 border-black pb-6'>
        <div className='flex justify-between items-center mb-4 flex-wrap gap-2'>
          <Badge variant='outline'>{t.question.counter(index + 1, total)}</Badge>
          <div className='flex gap-2 flex-wrap'>
            {meta}
            <DifficultyBadge difficulty={question.difficulty} />
          </div>
        </div>
        <CardTitle id={questionLabelId} data-quiz-title data-quiz-content role='heading' aria-level={2} tabIndex={-1} className='text-xl md:text-2xl font-black text-black focus:outline-none'>
          {question.text}
        </CardTitle>
        {isMultiResponse && (
          <p id={selectionHintId} className='text-sm font-bold text-black/60 mt-2'>
            {t.question.selectAnswers(selectCount)}
          </p>
        )}
        <div className='w-full mt-6'>
          <Progress value={progress} aria-label={t.question.counter(index + 1, total)} />
        </div>
      </CardHeader>
      <CardContent data-quiz-content className='py-6'>
        <div
          className='space-y-3'
          role={isMultiResponse ? 'group' : 'radiogroup'}
          aria-labelledby={questionLabelId}
          aria-describedby={isMultiResponse ? selectionHintId : undefined}
        >
          {answers.map((answer, answerIndex) => {
            const id = answer.id;
            const isSelected = id != null && selectedIds.includes(id);

            // Reveal colouring: correct answers go green, wrong picks go red.
            const isCorrectAnswer = id != null && correctIds.includes(id);
            const isWrongPick =
              id != null &&
              revealedSelectedIds.includes(id) &&
              !isCorrectAnswer;

            const atCap = isMultiResponse && selectedIds.length >= selectCount;
            // While answering, an unpicked option at the cap is disabled; once
            // revealed, every option is locked.
            const isDisabled = isRevealed || isChecking || (!isSelected && atCap);

            // Light tinted reveal fills (consistent with QuestionReview) keep
            // the answer text on a near-cream wash so it stays legible — a full
            // saturated green/red fill muddies the text.
            let optionClass: string;
            let boxClass: string;
            // Default span colour is black; only the selected blue tile needs white.
            let textClass = 'text-black';
            if (isRevealed && isCorrectAnswer) {
              optionClass = 'bg-success/15 shadow-none';
              boxClass = 'bg-success text-black';
            } else if (isRevealed && isWrongPick) {
              optionClass = 'bg-destructive/15 shadow-none';
              boxClass = 'bg-destructive text-black';
            } else if (isRevealed) {
              optionClass = 'bg-white shadow-none opacity-55';
              boxClass = 'bg-white';
            } else if (isSelected) {
              optionClass =
                'bg-primary shadow-none';
              boxClass = 'bg-white text-primary';
              // Deep-blue tile: black text fails contrast, so go white.
              textClass = 'text-white';
            } else {
              optionClass =
                'bg-white hover:bg-background shadow-[4px_4px_0px_0px_#000]';
              boxClass = 'bg-white';
            }

            return (
              <div
                key={id}
                {...getOptionProps(answerIndex)}
                role={isMultiResponse ? 'checkbox' : 'radio'}
                aria-checked={isSelected}
                aria-disabled={isDisabled || undefined}
                aria-describedby={isRevealed && (isCorrectAnswer || isWrongPick) ? `${questionLabelId}-${id}-result` : undefined}
                className={`quiz-option p-4 rounded-none border-2 border-black ${optionClass} ${isSelected ? 'translate-x-[2px] translate-y-[2px]' : ''} ${
                  isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                } flex items-start gap-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/40 focus-visible:ring-offset-2`}
                onClick={() => !isDisabled && id != null && onSelect(id)}
              >
                <div
                  className={`w-6 h-6 rounded-none flex items-center justify-center border-2 border-black mt-0.5 shrink-0 ${boxClass}`}
                >
                  <span
                    key={`${isRevealed}-${isSelected}`}
                    data-quiz-check
                    className='flex'
                    aria-hidden='true'
                  >
                    {isRevealed ? (
                      isCorrectAnswer ? (
                        <CheckCircle className='h-4 w-4' />
                      ) : isWrongPick ? (
                        <XCircle className='h-4 w-4' />
                      ) : null
                    ) : (
                      isSelected && <CheckCircle className='h-4 w-4' />
                    )}
                  </span>
                </div>
                <span className={`font-medium ${textClass}`}>{answer.text}</span>
                {isRevealed && (isCorrectAnswer || isWrongPick) && (
                  <span id={`${questionLabelId}-${id}-result`} className='sr-only' aria-hidden='true'>
                    {isCorrectAnswer ? t.review.correctAnswer : t.common.incorrect}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div role='status' aria-atomic='true' className='sr-only'>
          {isRevealed && (reveal?.isCorrect ? t.common.correct : t.question.notQuite)}
        </div>
        {isRevealed && (
          <div ref={feedbackRef} className='quiz-explanation'>
            <div className='min-h-0 overflow-hidden'>
              <div className='mt-6 rounded-none border-2 border-black bg-background'>
                <div
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 border-black ${
                    reveal?.isCorrect ? 'bg-success' : 'bg-destructive'
                  }`}
                >
                  {reveal?.isCorrect ? (
                    <CheckCircle className='h-4 w-4 text-black' />
                  ) : (
                    <XCircle className='h-4 w-4 text-black' />
                  )}
                  <p className='text-sm font-black text-black'>
                    {reveal?.isCorrect ? t.common.correct : t.question.notQuite}
                  </p>
                </div>
                {reveal?.explanation && (
                  <p className='px-4 py-3 text-sm text-black/80'>
                    {reveal.explanation}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {isRevealed && reportControl && (
          <div className='mt-4 flex justify-end'>{reportControl}</div>
        )}
      </CardContent>
      <CardFooter className='flex flex-wrap gap-3 justify-end border-t-2 border-black pt-6'>
        {!isRevealed ? (
          <Button className='min-w-40' onClick={onCheck} disabled={!canCheck || isChecking} aria-busy={isChecking}>
            {isChecking && <LoaderCircle className='quiz-busy-indicator h-4 w-4' aria-hidden='true' />}
            <span key='check' className='quiz-cta inline-flex items-center'>
              {isChecking ? t.question.checking : t.question.check}
            </span>
          </Button>
        ) : (
          <Button className='min-w-40' onClick={onContinue} disabled={isFinishing} aria-busy={isFinishing}>
            {isFinishing && <LoaderCircle className='quiz-busy-indicator h-4 w-4' aria-hidden='true' />}
            <span key='continue' className='quiz-cta inline-flex items-center'>
              {isFinishing
                ? t.question.finishing
                : isLast
                  ? t.question.finishPractice
                  : t.question.continue}
              {!isFinishing && <ArrowRight aria-hidden='true' className='ml-2 h-4 w-4' />}
            </span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
