import { useRef, type ReactNode } from 'react';
import { ArrowRight, CheckCircle, LoaderCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
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
import { Pop } from '@/components/pop';
import { spring, useQuestionMotion } from '@/hooks/use-question-motion';
import { useI18n } from '@/i18n/use-i18n';
import type {
  CheckAnswerResponseDto,
  QuestionDto
} from '@/http/generated/api.schemas';

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
  reportControl
}: PracticeQuestionCardProps) {
  const { t } = useI18n();
  const { ref, reduce, enter } = useQuestionMotion(index);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const progress = total > 0 ? ((index + 1) / total) * 100 : 0;
  const isMultiResponse = question.type === 'multiple_response';
  const selectCount = question.selectCount ?? 1;
  const isRevealed = phase === 'revealed';
  // Story #6: Check stays disabled until exactly the required number is picked.
  const canCheck = selectedIds.length === selectCount;

  const correctIds = reveal?.correctAnswerIds ?? [];
  const revealedSelectedIds = reveal?.selectedAnswerIds ?? [];
  const answers = question.answers ?? [];

  const { getOptionProps } = useQuizKeyboard({
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
    // Full-bleed on mobile: cancels the page's px-4 so the card gets the whole screen width.
    <Card ref={ref} className='-mx-4 border-y-4 border-x-0 border-black shadow-none sm:mx-0 sm:w-full sm:border-x-4 sm:shadow-[8px_8px_0px_0px_#000]'>
      <CardHeader className='border-b-2 border-black px-4 pb-6 sm:px-6'>
        <div className='flex justify-between items-center mb-4 flex-wrap gap-2'>
          <Badge variant='outline'>{t.question.counter(index + 1, total)}</Badge>
          <div className='flex gap-2 flex-wrap'>
            {meta}
            <DifficultyBadge difficulty={question.difficulty} />
          </div>
        </div>
        <motion.div key={question.id} {...enter()}>
          <CardTitle className='text-xl md:text-2xl font-black text-black'>
            {question.text}
          </CardTitle>
        </motion.div>
        {isMultiResponse && (
          <p className='text-sm font-bold text-black/60 mt-2'>
            {t.question.selectAnswers(selectCount)}
          </p>
        )}
        <div className='w-full mt-6'>
          <Progress value={progress} />
        </div>
      </CardHeader>
      <CardContent className='px-4 py-6 sm:px-6'>
        <motion.div
          key={question.id}
          {...enter(0.05)}
          className='space-y-3'
          role={isMultiResponse ? 'group' : 'radiogroup'}
          aria-label={question.text ?? undefined}
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
                'bg-primary shadow-none translate-x-[2px] translate-y-[2px]';
              boxClass = 'bg-white text-primary';
              // Deep-blue tile: black text fails contrast, so go white.
              textClass = 'text-white';
            } else {
              optionClass =
                'bg-white hover:bg-background shadow-[4px_4px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none';
              boxClass = 'bg-white';
            }

            return (
              <motion.div
                key={id}
                {...getOptionProps(answerIndex)}
                // Wrong picks shake; correct answers give a small nod.
                animate={
                  reduce || !isRevealed
                    ? undefined
                    : isWrongPick
                      ? { x: [0, -6, 5, -3, 2, 0] }
                      : isCorrectAnswer
                        ? { scale: [1, 1.015, 1] }
                        : undefined
                }
                transition={{ duration: 0.4, ease: 'easeOut' }}
                role={isMultiResponse ? 'checkbox' : 'radio'}
                aria-checked={isSelected}
                aria-disabled={isDisabled || undefined}
                className={`p-4 rounded-none border-2 border-black ${optionClass} ${
                  isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                } flex items-start gap-3 transition-[translate,box-shadow,background-color,opacity] duration-150 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/40 focus-visible:ring-offset-2`}
                onClick={() => !isDisabled && id != null && onSelect(id)}
              >
                <div
                  className={`w-6 h-6 rounded-none flex items-center justify-center border-2 border-black mt-0.5 shrink-0 ${boxClass}`}
                >
                  {isRevealed ? (
                    isCorrectAnswer ? (
                      <Pop key='correct'><CheckCircle className='h-4 w-4' /></Pop>
                    ) : isWrongPick ? (
                      <Pop key='wrong'><XCircle className='h-4 w-4' /></Pop>
                    ) : null
                  ) : (
                    isSelected && <Pop key='selected'><CheckCircle className='h-4 w-4' /></Pop>
                  )}
                </div>
                <span className={`font-medium ${textClass}`}>{answer.text}</span>
              </motion.div>
            );
          })}
        </motion.div>

        {isRevealed && (
          <motion.div
            ref={feedbackRef}
            className='overflow-hidden'
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={spring}
            // On phones the explanation opens below the fold; follow it.
            onAnimationComplete={() =>
              feedbackRef.current?.scrollIntoView?.({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
            }
          >
            <div className='mt-6 rounded-none border-2 border-black bg-background'>
              <div
                className={`flex items-center gap-2 px-4 py-2 border-b-2 border-black ${
                  reveal?.isCorrect ? 'bg-success' : 'bg-destructive'
                }`}
              >
                <Pop>
                  {reveal?.isCorrect ? (
                    <CheckCircle className='h-4 w-4 text-black' />
                  ) : (
                    <XCircle className='h-4 w-4 text-black' />
                  )}
                </Pop>
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
          </motion.div>
        )}

        {isRevealed && reportControl && (
          <div className='mt-4 flex justify-end'>{reportControl}</div>
        )}
      </CardContent>
      <CardFooter className='flex justify-end border-t-2 border-black px-4 pt-6 sm:px-6'>
        {!isRevealed ? (
          // Busy stays focusable (aria-disabled): disabling the focused button drops focus to <body>.
          <Button
            onClick={() => !isChecking && onCheck()}
            disabled={!canCheck}
            aria-disabled={isChecking || undefined}
            aria-busy={isChecking}
          >
            {isChecking && <LoaderCircle className='h-4 w-4 animate-spin' aria-hidden='true' />}
            {isChecking ? t.question.checking : t.question.check}
          </Button>
        ) : (
          <Button
            onClick={() => !isFinishing && onContinue()}
            aria-disabled={isFinishing || undefined}
            aria-busy={isFinishing}
          >
            {isFinishing && <LoaderCircle className='h-4 w-4 animate-spin' aria-hidden='true' />}
            <motion.span
              key='continue'
              className='inline-flex items-center'
              initial={reduce ? false : { y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={spring}
            >
              {isFinishing
                ? t.question.finishing
                : isLast
                  ? t.question.finishPractice
                  : t.question.continue}
              {!isFinishing && <ArrowRight className='ml-2 h-4 w-4' />}
            </motion.span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
