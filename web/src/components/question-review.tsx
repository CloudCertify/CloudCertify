import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import * as Accordion from '@radix-ui/react-accordion';
import { focusRing } from '@/components/attempt-frame';
import { ConfidenceBadge } from '@/components/confidence-badge';
import { useI18n } from '@/i18n/use-i18n';
import { cn } from '@/lib/utils';
import type { QuizResultQuestionDto } from '@/http/generated/api.schemas';

type Filter = 'all' | 'wrong' | 'right';

type QuestionReviewProps = {
  questions: QuizResultQuestionDto[];
  /** Defaults to the localized "Question summary". */
  heading?: string;
  /**
   * Report control for a reviewed Question (issue #41). Omitted for full Quiz
   * results, where reporting is not offered yet.
   */
  renderReportControl?: (question: QuizResultQuestionDto) => ReactNode;
  /** Open this Question and bring it into view. A new object asks again. */
  target?: { index: number } | null;
  /** The Question now open, by index, or null. */
  onOpenChange?: (index: number | null) => void;
  className?: string;
};

/**
 * Every Question of a finished attempt, right or wrong at a glance: a numbered tile in
 * the verdict's colour, the same colours as the columns above it. Opening one shows what
 * the visitor picked, the right answer, how sure they were and the explanation. The
 * misses are one tap away.
 */
export function QuestionReview({ questions, heading, renderReportControl, target, onOpenChange, className }: QuestionReviewProps) {
  const { t } = useI18n();
  const headingId = useId();
  const list = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState('');
  const wrong = questions.filter(question => !question.isCorrect).length;
  const filters: { id: Filter; label: string; count: number; swatch: string }[] = [
    { id: 'all', label: t.review.all, count: questions.length, swatch: 'bg-white' },
    { id: 'wrong', label: t.review.wrong, count: wrong, swatch: 'bg-destructive' },
    { id: 'right', label: t.review.right, count: questions.length - wrong, swatch: 'bg-success' }
  ];

  const change = (value: string) => {
    setOpen(value);
    onOpenChange?.(value === '' ? null : Number(value));
  };

  useEffect(() => {
    if (target == null) return;
    setFilter('all');
    setOpen(String(target.index));
    // After the row has opened, so the browser scrolls to where it ends up.
    const frame = requestAnimationFrame(() => list.current?.querySelector(`[data-index="${target.index}"]`)?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <section aria-labelledby={headingId} className={cn('scroll-mt-20', className)}>
      <h2 id={headingId} className='text-xl font-black'>
        {heading ?? t.review.summaryHeading}
      </h2>
      <div className='mt-3 flex flex-wrap gap-2'>
        {filters.map(item => (
          <button
            key={item.id}
            type='button'
            aria-pressed={filter === item.id}
            disabled={item.count === 0}
            onClick={() => setFilter(item.id)}
            className={cn(
              'flex h-11 cursor-pointer items-center gap-2 border-2 border-black px-3 text-sm font-black disabled:cursor-default disabled:opacity-40',
              filter === item.id ? 'bg-black text-white' : 'bg-white',
              focusRing
            )}
          >
            <span className={cn('size-3 border-2', filter === item.id ? 'border-white' : 'border-black', item.swatch)} aria-hidden='true' />
            {item.label}
            <span className='tabular-nums'>{item.count}</span>
          </button>
        ))}
      </div>

      <Accordion.Root ref={list} type='single' collapsible value={open} onValueChange={change} className='mt-4 border-t-2 border-black'>
        {questions.map((question, index) => {
          // The verdict stamped when the answer was committed, the one the Score
          // counted. The per-Answer flags reflect today's key, which may have
          // changed since (ADR 0007).
          const { isCorrect } = question;
          if (filter !== 'all' && (filter === 'right') !== isCorrect) return null;

          return (
            <Accordion.Item key={question.id} value={String(index)} data-index={index} className='group scroll-mt-20 border-b-2 border-black'>
              <Accordion.Header>
                <Accordion.Trigger className={cn('flex w-full cursor-pointer items-center gap-3 py-3 text-left', focusRing)}>
                  <span className={cn('flex size-11 shrink-0 items-center justify-center border-2 border-black font-black tabular-nums', isCorrect ? 'bg-success' : 'bg-destructive')} aria-hidden='true'>
                    {index + 1}
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='sr-only'>{t.review.rowLabel(index + 1)} </span>
                    <span className='block font-bold leading-snug group-data-[state=closed]:line-clamp-2'>{question.text}</span>
                    <span className='mt-0.5 flex items-center gap-1 text-sm font-bold text-black/70'>
                      {isCorrect ? <Check className='size-4' strokeWidth={3} aria-hidden='true' /> : <X className='size-4' strokeWidth={3} aria-hidden='true' />}
                      {t.review.verdict(isCorrect)}
                    </span>
                  </span>
                  <ChevronDown className='size-5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180' strokeWidth={3} aria-hidden='true' />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className='overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down'>
                <div className='space-y-3 pb-5 sm:pl-14'>
                  <ul className='grid gap-2'>
                    {question.answers.map(answer => {
                      const wrongPick = answer.wasSelected && !answer.isCorrect;
                      return (
                        <li
                          key={answer.id}
                          className={cn(
                            'flex items-start gap-3 border-2 border-black p-3 font-semibold leading-snug',
                            answer.isCorrect ? 'bg-success' : wrongPick ? 'bg-destructive' : 'bg-white text-black/60'
                          )}
                        >
                          <span className='mt-0.5 flex size-5 shrink-0 items-center justify-center' aria-hidden='true'>
                            {answer.isCorrect ? <Check className='size-5' strokeWidth={3} /> : wrongPick ? <X className='size-5' strokeWidth={3} /> : null}
                          </span>
                          <span className='flex-1'>
                            {answer.text}
                            {answer.wasSelected && <span className='ml-2 text-sm font-black'>{t.review.yourAnswer}</span>}
                            {answer.isCorrect && <span className='ml-2 text-sm font-black'>{t.review.correctAnswer}</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {/* Beside the explanation on purpose: the rating and the correction
                      belong together (ADR 0006). Absent when the question was unrated. */}
                  <ConfidenceBadge value={question.confidence} />
                  {question.explanation && (
                    <div className='border-l-4 border-black pl-3'>
                      <p className='text-sm font-black'>{t.review.explanation}</p>
                      <p className='mt-1 max-w-[65ch] font-medium text-black/80'>{question.explanation}</p>
                    </div>
                  )}
                  {renderReportControl && <div className='flex justify-end'>{renderReportControl(question)}</div>}
                </div>
              </Accordion.Content>
            </Accordion.Item>
          );
        })}
      </Accordion.Root>
    </section>
  );
}
