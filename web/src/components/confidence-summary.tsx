import { AlertTriangle, HelpCircle } from 'lucide-react';
import { useI18n } from '@/i18n/use-i18n';
import { cn } from '@/lib/utils';
import type { QuizResultQuestionDto } from '@/http/generated/api.schemas';

type ConfidenceSummaryProps = {
  /** Rated `Guess` and answered correctly — counted by the server from Recorded Answers. */
  luckyGuessCount: number;
  /** Rated `Confident` and answered incorrectly — counted by the server from Recorded Answers. */
  misconceptionCount: number;
  /** The graded questions, used only to tell "nothing rated" from "rated, and zero". */
  questions: QuizResultQuestionDto[];
  /** Which of the two is singled out on the results strip. */
  spot?: ConfidenceFinding | null;
  /** With this the two findings become toggles that single their Questions out. */
  onSpot?: (finding: ConfidenceFinding | null) => void;
};

export type ConfidenceFinding = 'lucky' | 'misconception';

/** Which finding a graded Question is, read from its own Confidence and verdict. */
export function findingOf(question: QuizResultQuestionDto): ConfidenceFinding | null {
  if (question.confidence === 'guess' && question.isCorrect) return 'lucky';
  if (question.confidence === 'confident' && !question.isCorrect) return 'misconception';
  return null;
}

/**
 * The two things a raw score cannot say: a lucky guess and a misconception (ADR 0006).
 *
 * Rating is optional, so an attempt where nothing was rated gets no section at all —
 * two zeroes would read as a verdict on an attempt that never gave one. Once anything
 * is rated, a zero is real news ("no misconceptions") and stays on screen.
 *
 * @example <ConfidenceSummary luckyGuessCount={2} misconceptionCount={1} questions={qs} />
 */
export function ConfidenceSummary({
  luckyGuessCount,
  misconceptionCount,
  questions,
  spot = null,
  onSpot
}: ConfidenceSummaryProps) {
  const { t } = useI18n();

  if (!questions.some(q => q.confidence)) return null;

  const stats = [
    {
      key: 'lucky' as const,
      icon: HelpCircle,
      fill: 'bg-warning',
      count: luckyGuessCount,
      label: t.results.luckyGuesses,
      hint: t.results.luckyGuessesHint
    },
    {
      key: 'misconception' as const,
      icon: AlertTriangle,
      fill: 'bg-destructive',
      count: misconceptionCount,
      label: t.results.misconceptions,
      hint: t.results.misconceptionsHint
    }
  ];

  return (
    <div className='space-y-3 text-black'>
      <h3 className='text-xl font-black text-black'>{t.results.confidenceHeading}</h3>
      <div className='grid gap-3 sm:grid-cols-2'>
        {stats.map(({ key, icon: Icon, fill, count, label, hint }) => {
          const Tile = onSpot ? 'button' : 'div';
          const pressed = spot === key;
          return (
            <Tile
              key={key}
              {...(onSpot && { type: 'button' as const, 'aria-pressed': pressed, onClick: () => onSpot(pressed ? null : key) })}
              className={cn(
                'flex items-start gap-3 rounded-none border-2 border-black p-3 text-left',
                onSpot && 'cursor-pointer transition-[translate,box-shadow,background-color] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/40 focus-visible:ring-offset-2',
                onSpot && (pressed ? 'translate-x-1 translate-y-1 bg-black text-white' : 'bg-white shadow-[4px_4px_0px_0px_#000]')
              )}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-none border-2 border-black ${fill}`}
              >
                <Icon className='h-5 w-5 text-black' aria-hidden='true' />
              </div>
              <div>
                <p className='text-2xl font-black leading-none'>
                  {count} <span className='text-base font-bold'>{label}</span>
                </p>
                <p className='mt-1 text-sm font-medium opacity-70'>{hint}</p>
              </div>
            </Tile>
          );
        })}
      </div>
    </div>
  );
}
