import type { ReactNode } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { useQuizKeyboard } from '@/hooks/use-quiz-keyboard';
import type { QuestionDto } from '@/http/generated/api.schemas';

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
  isSubmitting
}: QuestionCardProps) {
  const progress = total > 0 ? ((index + 1) / total) * 100 : 0;
  const isFirst = index === 0;
  const isLast = index >= total - 1;
  const isMultiResponse = question.type === 'multiple_response';
  const selectCount = question.selectCount ?? 1;
  const answers = question.answers ?? [];

  const { getOptionProps } = useQuizKeyboard({
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
            Select {question.selectCount ?? 2} answers
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
                className={`p-4 rounded-[5px] border-2 border-black ${
                  isSelected
                    ? 'bg-primary shadow-none translate-x-[2px] translate-y-[2px]'
                    : 'bg-white hover:bg-background shadow-[4px_4px_0px_0px_#000]'
                } ${
                  isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                } flex items-start gap-3 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/40 focus-visible:ring-offset-2`}
                onClick={() => !isDisabled && answer.id != null && onSelect(answer.id)}
              >
                <div
                  className={`w-6 h-6 rounded-[5px] flex items-center justify-center border-2 border-black mt-0.5 shrink-0 ${
                    isSelected ? 'bg-black text-white' : 'bg-white'
                  }`}
                >
                  {isSelected && <CheckCircle className='h-4 w-4' />}
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
      <CardFooter className='flex justify-between border-t-2 border-black pt-6'>
        <Button variant='outline' onClick={onPrev} disabled={isFirst}>
          <ArrowLeft className='mr-2 h-4 w-4' />
          Previous
        </Button>
        {!isLast ? (
          <Button onClick={onNext}>
            Next
            <ArrowRight className='ml-2 h-4 w-4' />
          </Button>
        ) : (
          <Button onClick={onFinish} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : finishLabel}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
