import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CornerDownLeft } from 'lucide-react';
import { AttemptFrame, AttemptQuestion, dockButton, focusRing, press } from '@/components/attempt-frame';
import { ConfidenceRating } from '@/components/confidence-rating';
import { confidenceHeight, ExamStrip, type StripCell } from '@/components/exam-strip';
import { ShortcutLegend } from '@/components/shortcut-legend';
import { useQuizKeyboard } from '@/hooks/use-quiz-keyboard';
import { useI18n } from '@/i18n/use-i18n';
import { needsReview } from '@/lib/confidence';
import { cue } from '@/lib/cue';
import { cn } from '@/lib/utils';
import type { Confidence, QuestionDto } from '@/http/generated/api.schemas';

type QuestionCardProps = {
  /** Zero-based index of the current question. */
  index: number;
  total: number;
  question: QuestionDto;
  /** Answer ids the user has currently selected for this question. */
  selectedIds: number[];
  onSelect: (answerId: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
  finishLabel: string;
  isSubmitting: boolean;
  /** Per Question, in order: has at least one selected answer. Feeds the Navigator. */
  answered?: boolean[];
  /** Per Question, in order: its Confidence, when rated. Feeds the Navigator. */
  confidences?: (Confidence | null | undefined)[];
  /** Navigator jump. Without it the strip only shows progress. */
  onJump?: (index: number) => void;
  /** The current Question's Confidence. */
  confidence?: Confidence | null;
  /** Rating is offered when this is passed; it stays optional for the visitor. */
  onRate?: (confidence: Confidence) => void;
  /** Where the leave control goes. */
  exitHref?: string;
  /** A short notice in the dock, such as answers still saving. */
  notice?: ReactNode;
};

/**
 * An Exam in progress, full screen. Correctness is deferred to Submit, so nothing here
 * says right or wrong: the strip is the Navigator, and the dock holds Confidence and
 * the way back and forward.
 */
export function QuestionCard({
  index,
  total,
  question,
  selectedIds,
  onSelect,
  onPrev,
  onNext,
  onFinish,
  finishLabel,
  isSubmitting,
  answered = [],
  confidences = [],
  onJump,
  confidence = null,
  onRate,
  exitHref = '/quiz',
  notice
}: QuestionCardProps) {
  const { t } = useI18n();
  const isFirst = index === 0;
  const isLast = index >= total - 1;
  const answers = question.answers ?? [];

  // Content slides in from the direction of travel.
  const [previous, setPrevious] = useState(index);
  const [direction, setDirection] = useState<1 | -1>(1);
  if (index !== previous) {
    setPrevious(index);
    setDirection(index > previous ? 1 : -1);
  }

  useEffect(() => {
    if (window.scrollY > 0) window.scrollTo({ top: 0 });
  }, [index]);

  const select = (answerId: number) => {
    cue('select');
    onSelect(answerId);
  };

  const { getOptionProps } = useQuizKeyboard({
    count: answers.length,
    selectionEnabled: true,
    onActivate: i => {
      const id = answers[i]?.id;
      if (id != null) select(id);
    },
    onPrimary: () => {
      if (isLast) {
        if (!isSubmitting) onFinish();
      } else {
        onNext();
      }
    },
    onNavigate: step => {
      if (step === -1 && !isFirst) onPrev();
      if (step === 1 && !isLast) onNext();
    },
    resetKey: question.id
  });

  // Height is Confidence; amber is the visitor's own "come back to this".
  const cells: StripCell[] = Array.from({ length: total }, (_, i) =>
    answered[i]
      ? { height: confidenceHeight(confidences[i]), tone: needsReview(confidences[i]) ? 'revisit' : 'answered' }
      : { height: 0, tone: 'empty' }
  );

  return (
    <AttemptFrame
      exitHref={exitHref}
      strip={
        <ExamStrip
          cells={cells}
          current={index}
          onJump={onJump}
          label={t.navigator.landmark}
          valueText={i => t.navigator.questionLabel(i + 1, answered[i] === true, needsReview(confidences[i]))}
          className='h-[3.25rem] flex-1 sm:h-[4.5rem]'
        />
      }
      aside={null}
      dock={
        <>
          <div className='min-w-0 flex-1 space-y-2'>
            {notice}
            {/* Always in place, so answering never moves the buttons under the thumb. */}
            {onRate && <ConfidenceRating value={confidence} onRate={onRate} disabled={selectedIds.length === 0} />}
          </div>
          <div className='flex gap-3'>
            <button
              type='button'
              onClick={onPrev}
              disabled={isFirst}
              aria-label={t.common.previous}
              aria-keyshortcuts='ArrowLeft'
              className={cn(dockButton, press, focusRing, 'flex w-14 items-center justify-center bg-white')}
            >
              <ArrowLeft className='size-6' strokeWidth={3} aria-hidden='true' />
            </button>
            {!isLast ? (
              <button type='button' onClick={onNext} aria-keyshortcuts='Enter ArrowRight' className={cn(dockButton, press, focusRing, 'flex-1 bg-primary px-10 text-white sm:min-w-52 sm:flex-none')}>
                {t.common.next}
              </button>
            ) : (
              <button type='button' onClick={onFinish} disabled={isSubmitting} aria-keyshortcuts='Enter' className={cn(dockButton, press, focusRing, 'flex-1 bg-primary px-10 text-white sm:min-w-52 sm:flex-none')}>
                {isSubmitting ? t.common.submitting : finishLabel}
              </button>
            )}
          </div>
        </>
      }
    >
      <AttemptQuestion
        index={index}
        total={total}
        question={question}
        direction={direction}
        selectedIds={selectedIds}
        onSelect={select}
        getOptionProps={getOptionProps}
        actions={
          // On the counter line, not beside the strip: there it took half the Navigator's
          // width on a phone. On the last Question the dock's own button finishes.
          !isLast && (
            <button type='button' onClick={onFinish} disabled={isSubmitting} aria-label={finishLabel} className={cn('h-11 cursor-pointer text-sm font-black underline decoration-2 underline-offset-4 disabled:opacity-40', focusRing)}>
              {t.question.finish}
            </button>
          )
        }
      />
      <ShortcutLegend
        className='mt-8'
        items={[
          { keys: [`1–${Math.min(answers.length, 9)}`], label: t.shortcuts.select },
          { keys: [<CornerDownLeft key='enter' className='size-3' />], label: isLast ? t.shortcuts.finish : t.shortcuts.next },
          { keys: [<ArrowLeft key='left' className='size-3' />, <ArrowRight key='right' className='size-3' />], label: t.shortcuts.navigate }
        ]}
      />
    </AttemptFrame>
  );
}
