import { useId, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
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
import type { QuestionDto } from '@/http/generated/api.schemas';
import './quiz-motion.css';

type QuestionCardProps = {
  /** Zero-based index of the current question. */
  index: number;
  total: number;
  question: QuestionDto;
  /** Right-side badges (quiz title, domain, …). */
  meta?: ReactNode;
  /** Answer ids the user has currently selected for this question. */
  selectedIds: number[];
  onSelect: (answerId: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
  finishLabel: string;
  isSubmitting: boolean;
  reducedMotion?: boolean;
};

export function QuestionCard({
  index,
  total,
  question,
  meta,
  selectedIds,
  onSelect,
  onPrev,
  onNext,
  onFinish,
  finishLabel,
  isSubmitting,
  reducedMotion = false
}: QuestionCardProps) {
  const { t } = useI18n();
  const questionLabelId = useId();
  const selectionHintId = useId();
  const cardRef = useQuestionMotion(index, question.id, reducedMotion);
  const progress = total > 0 ? ((index + 1) / total) * 100 : 0;
  const isFirst = index === 0;
  const isLast = index >= total - 1;
  const isMultiResponse = question.type === 'multiple_response';
  const selectCount = question.selectCount ?? 1;
  const answers = question.answers ?? [];

  const { getOptionProps } = useQuizKeyboard({
    containerRef: cardRef,
    count: answers.length,
    selectionEnabled: true,
    onActivate: i => {
      const id = answers[i]?.id;
      if (id != null) onSelect(id);
    },
    onPrimary: () => {
      if (isLast) {
        if (!isSubmitting) onFinish();
      } else {
        onNext();
      }
    },
    onNavigate: direction => {
      if (direction === -1 && !isFirst) onPrev();
      if (direction === 1 && !isLast) onNext();
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
            {t.question.selectAnswers(question.selectCount ?? 2)}
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
            const isSelected = answer.id != null && selectedIds.includes(answer.id);
            const atCap = isMultiResponse && selectedIds.length >= selectCount;
            const isDisabled = !isSelected && atCap;

            return (
              <div
                key={answer.id}
                {...getOptionProps(answerIndex)}
                role={isMultiResponse ? 'checkbox' : 'radio'}
                aria-checked={isSelected}
                aria-disabled={isDisabled || undefined}
                className={`quiz-option p-4 rounded-none border-2 border-black ${
                  isSelected
                    ? 'bg-primary shadow-none translate-x-[2px] translate-y-[2px]'
                    : 'bg-white hover:bg-background shadow-[4px_4px_0px_0px_#000]'
                } ${
                  isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                } flex items-start gap-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/40 focus-visible:ring-offset-2`}
                onClick={() => !isDisabled && answer.id != null && onSelect(answer.id)}
              >
                <div
                  className={`w-6 h-6 rounded-none flex items-center justify-center border-2 border-black mt-0.5 shrink-0 ${
                    isSelected ? 'bg-black text-white' : 'bg-white'
                  }`}
                >
                  {isSelected && (
                    <span data-quiz-check className='flex' aria-hidden='true'>
                      <CheckCircle className='h-4 w-4' />
                    </span>
                  )}
                </div>
                <span
                  className={`font-medium ${isSelected ? 'text-white' : 'text-black'}`}
                >
                  {answer.text}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className='flex flex-wrap gap-3 justify-between border-t-2 border-black pt-6'>
        <Button variant='outline' onClick={onPrev} disabled={isFirst}>
          <ArrowLeft aria-hidden='true' className='mr-2 h-4 w-4' />
          {t.common.previous}
        </Button>
        {!isLast ? (
          <Button onClick={onNext}>
            {t.common.next}
            <ArrowRight aria-hidden='true' className='ml-2 h-4 w-4' />
          </Button>
        ) : (
          <Button onClick={onFinish} disabled={isSubmitting}>
            {isSubmitting ? t.common.submitting : finishLabel}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
