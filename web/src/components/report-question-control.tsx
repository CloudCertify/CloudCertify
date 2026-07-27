import { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/context';
import { postReports } from '@/http/generated/api';
import { ReportReason } from '@/http/generated/api.schemas';
import { toast } from 'sonner';

/** Server caps the Report comment at 200 chars (issue #40); mirror it here. */
export const COMMENT_MAX_LENGTH = 200;

const REASONS: ReportReason[] = [
  ReportReason.wrong_answer_key,
  ReportReason.unclear_wording,
  ReportReason.bad_explanation,
  ReportReason.outdated
];

type ReportQuestionControlProps = {
  submissionId: number;
  questionId: number;
  /** True once this Question was reported on this Submission (session-wide). */
  reported: boolean;
  /** Called on a filed Report, or on a 409 — both mean "already reported". */
  onReported: (questionId: number) => void;
};

/**
 * Files a Report against a defective Question (issue #41). Rendered only after
 * a Question has been Checked, on both post-Check feedback and the results
 * review list — one Report per (Submission, Question), so a 409 from the API is
 * the same outcome as a fresh file and is shown as success, not as an error.
 */
export function ReportQuestionControl({
  submissionId,
  questionId,
  reported,
  onReported
}: ReportQuestionControlProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [reasons, setReasons] = useState<ReportReason[]>([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (reported) {
    return (
      <p className='flex items-center gap-2 text-sm font-bold text-black/60'>
        <Check className='h-4 w-4' />
        {t.report.reported}
      </p>
    );
  }

  const toggleReason = (reason: ReportReason) =>
    setReasons(current =>
      current.includes(reason)
        ? current.filter(r => r !== reason)
        : [...current, reason]
    );

  const close = () => {
    setIsOpen(false);
    setReasons([]);
    setComment('');
  };

  const handleSubmit = async () => {
    if (reasons.length === 0) return;
    setIsSubmitting(true);
    try {
      await postReports({
        submissionId,
        questionId,
        reasons,
        comment: comment.trim() ? comment.trim() : null
      });
      onReported(questionId);
      toast.success(t.report.success);
      close();
    } catch (error) {
      // 409 means this Submission already reported this Question — the user's
      // intent is satisfied either way, so surface it as already-reported.
      if (isConflict(error)) {
        onReported(questionId);
        toast.success(t.report.success);
        close();
        return;
      }
      toast.error(t.report.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => setIsOpen(true)}
      >
        <AlertTriangle className='mr-2 h-4 w-4' />
        {t.report.trigger}
      </Button>
    );
  }

  return (
    <div className='w-full rounded-[5px] border-2 border-black bg-white p-4 space-y-3'>
      <div>
        <p className='font-black text-black'>{t.report.title}</p>
        <p className='text-sm text-black/60 font-medium'>
          {t.report.reasonsHint}
        </p>
      </div>

      <div className='space-y-2' role='group' aria-label={t.report.title}>
        {REASONS.map(reason => {
          const checked = reasons.includes(reason);
          return (
            <label
              key={reason}
              className='flex items-center gap-2 text-sm font-medium text-black cursor-pointer'
            >
              <input
                type='checkbox'
                className='h-4 w-4 accent-primary'
                checked={checked}
                onChange={() => toggleReason(reason)}
              />
              {t.report.reasons[reason]}
            </label>
          );
        })}
      </div>

      <div className='space-y-1'>
        <label
          htmlFor={`report-comment-${questionId}`}
          className='block text-sm font-bold text-black'
        >
          {t.report.commentLabel}
        </label>
        <textarea
          id={`report-comment-${questionId}`}
          value={comment}
          maxLength={COMMENT_MAX_LENGTH}
          onChange={e => setComment(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
          placeholder={t.report.commentPlaceholder}
          rows={3}
          className='w-full rounded-[5px] border-2 border-black bg-white p-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40'
        />
        <p className='text-right text-xs font-bold text-black/50'>
          {t.report.commentCounter(comment.length, COMMENT_MAX_LENGTH)}
        </p>
      </div>

      <div className='flex justify-end gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={close}
          disabled={isSubmitting}
        >
          {t.report.cancel}
        </Button>
        <Button
          type='button'
          size='sm'
          onClick={handleSubmit}
          disabled={reasons.length === 0 || isSubmitting}
        >
          {isSubmitting ? t.report.submitting : t.report.submit}
        </Button>
      </div>
    </div>
  );
}

function isConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { response?: { status?: number } }).response?.status === 409
  );
}
