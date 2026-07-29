import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { Confidence } from '@/http/generated/api.schemas';
import { cn } from '@/lib/utils';

type ConfidenceBadgeProps = {
  /** The rating committed with the answer, or null/undefined when the question was unrated. */
  value: Confidence | null | undefined;
  className?: string;
};

/** Same traffic-light vocabulary as the in-attempt rating control, read-only. */
const STYLES: Record<Confidence, { icon: LucideIcon; fill: string }> = {
  guess: { icon: HelpCircle, fill: 'bg-destructive' },
  unsure: { icon: AlertTriangle, fill: 'bg-warning' },
  confident: { icon: CheckCircle2, fill: 'bg-success' }
};

/**
 * How sure the visitor was, shown in review beside the explanation, so "I was sure,
 * and I was wrong" is visible exactly where the correction is (ADR 0006).
 *
 * Renders nothing when unrated — rating is optional, and an absent rating is normal,
 * not a state to label.
 *
 * @example <ConfidenceBadge value={question.confidence} />
 */
export function ConfidenceBadge({ value, className }: ConfidenceBadgeProps) {
  const { t } = useI18n();

  if (!value) return null;

  const { icon: Icon, fill } = STYLES[value];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[5px] border-2 border-black px-2 py-0.5 text-xs font-bold text-black',
        fill,
        className
      )}
    >
      <Icon className='h-3.5 w-3.5' aria-hidden='true' />
      {t.review.ratedAs(t.confidence.options[value])}
    </span>
  );
}
