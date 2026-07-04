import type { ReactNode } from 'react';
import { ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuizKeyboard } from '@/hooks/use-quiz-keyboard';
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
  /** Right-side badges (subquiz title, domain, …). */
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
  isLast
}: PracticeQuestionCardProps) {
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
    selectionEnabled: !isRevealed,
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
    <Card className='w-full border-4 border-black shadow-[8px_8px_0px_0px_#000]'>
      <CardHeader className='border-b-2 border-black pb-6'>
        <div className='flex justify-between items-center mb-4 flex-wrap gap-2'>
          <Badge variant='outline'>
            Question {index + 1} of {total}
          </Badge>
          {meta && <div className='flex gap-2 flex-wrap'>{meta}</div>}
        </div>
        <CardTitle className='text-xl md:text-2xl font-black text-black'>
          {question.text}
        </CardTitle>
        {isMultiResponse && (
          <p className='text-sm font-bold text-black/60 mt-2'>
            Select {selectCount} answers
          </p>
        )}
        <div className='w-full mt-6'>
          <Progress value={progress} />
        </div>
      </CardHeader>
      <CardContent className='py-6'>
        <div
          className='space-y-3'
          role={isMultiResponse ? 'group' : 'radiogroup'}
          aria-label={question.text}
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
            const isDisabled = isRevealed || (!isSelected && atCap);

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
                'bg-white hover:bg-background shadow-[4px_4px_0px_0px_#000] active:scale-[0.99]';
              boxClass = 'bg-white';
            }

            return (
              <div
                key={id}
                {...getOptionProps(answerIndex)}
                role={isMultiResponse ? 'checkbox' : 'radio'}
                aria-checked={isSelected}
                aria-disabled={isDisabled || undefined}
                className={`p-4 rounded-[5px] border-2 border-black ${optionClass} ${
                  isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                } flex items-start gap-3 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/40 focus-visible:ring-offset-2`}
                onClick={() => !isDisabled && id != null && onSelect(id)}
              >
                <div
                  className={`w-6 h-6 rounded-[5px] flex items-center justify-center border-2 border-black mt-0.5 shrink-0 ${boxClass}`}
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
                </div>
                <span className={`font-medium ${textClass}`}>{answer.text}</span>
              </div>
            );
          })}
        </div>

        {isRevealed && (
          <div className='mt-6 rounded-[5px] border-2 border-black bg-background overflow-hidden motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-200'>
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
                {reveal?.isCorrect ? 'Correct' : 'Not quite'}
              </p>
            </div>
            {reveal?.explanation && (
              <p className='px-4 py-3 text-sm text-black/80'>
                {reveal.explanation}
              </p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className='flex justify-end border-t-2 border-black pt-6'>
        {!isRevealed ? (
          <Button onClick={onCheck} disabled={!canCheck || isChecking}>
            {isChecking ? 'Checking...' : 'Check'}
          </Button>
        ) : (
          <Button onClick={onContinue} disabled={isFinishing}>
            {isFinishing
              ? 'Finishing...'
              : isLast
                ? 'Finish Practice'
                : 'Continue'}
            {!isFinishing && <ArrowRight className='ml-2 h-4 w-4' />}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
