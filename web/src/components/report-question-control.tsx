import { useState } from 'react';
import { AlertTriangle, Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/use-i18n';
import { postReports } from '@/http/generated/api';
import { ReportReason } from '@/http/generated/api.schemas';
import type { SuggestionDto } from '@/http/generated/api.schemas';
import { toast } from 'sonner';

/** Server caps the Report comment at 200 chars (issue #40); mirror it here. */
export const COMMENT_MAX_LENGTH = 200;

/** Server caps each suggested text (ADR 0009); mirror it here. */
export const SUGGESTION_MAX_LENGTH = 2000;

const REASONS: ReportReason[] = [
  ReportReason.wrong_answer_key,
  ReportReason.unclear_wording,
  ReportReason.bad_explanation,
  ReportReason.outdated
];

/**
 * The Question as it was served, plus the key the Check revealed. Only present
 * once correctness is known, which is exactly when a fix can be suggested.
 */
export type SuggestableQuestion = {
  text: string;
  answers: { id: number; text: string; isCorrect: boolean }[];
};

type Draft = {
  questionText: string;
  answers: { id: number; text: string; isCorrect: boolean }[];
};

type ReportQuestionControlProps = {
  submissionId: number;
  questionId: number;
  /** True once this Question was reported on this Submission (session-wide). */
  reported: boolean;
  /** Called on a filed Report, or on a 409 — both mean "already reported". */
  onReported: (questionId: number) => void;
  /** Omit to offer the plain claim-only Report. */
  suggestable?: SuggestableQuestion;
};

/**
 * Files a Report against a defective Question (issue #41). Rendered only after
 * a Question has been Checked, on both post-Check feedback and the results
 * review list — one Report per (Submission, Question), so a 409 from the API is
 * the same outcome as a fresh file and is shown as success, not as an error.
 *
 * A reporter can go further and propose the fix (ADR 0009): the form flips into
 * an editor over the question and its answers, and only the fields they
 * actually changed are sent. Editing is opt-in so the one-click path stays one
 * click.
 */
export function ReportQuestionControl({
  submissionId,
  questionId,
  reported,
  onReported,
  suggestable
}: ReportQuestionControlProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [reasons, setReasons] = useState<ReportReason[]>([]);
  const [comment, setComment] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (reported) {
    return (
      <p className='flex items-center gap-2 text-sm font-bold text-black/60'>
        <Check className='h-4 w-4' />
        {t.report.reported}
      </p>
    );
  }

  const suggestion = suggestable && draft ? buildPatch(suggestable, draft) : null;
  // What the reporter edited already says why they are reporting, so those
  // reasons come along without them having to also tick a box.
  const inferred = inferReasons(suggestion);
  const effectiveReasons = [
    ...reasons,
    ...inferred.filter(reason => !reasons.includes(reason))
  ];
  const changeCount = countChanges(suggestion);

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
    setDraft(null);
  };

  const startEditing = () => {
    if (!suggestable) return;
    setDraft({
      questionText: suggestable.text,
      answers: suggestable.answers.map(answer => ({ ...answer }))
    });
  };

  const editAnswer = (id: number, change: Partial<Draft['answers'][number]>) =>
    setDraft(current =>
      current === null
        ? current
        : {
            ...current,
            answers: current.answers.map(answer =>
              answer.id === id ? { ...answer, ...change } : answer
            )
          }
    );

  const handleSubmit = async () => {
    if (effectiveReasons.length === 0) return;
    setIsSubmitting(true);
    try {
      await postReports({
        submissionId,
        questionId,
        reasons: effectiveReasons,
        comment: comment.trim() ? comment.trim() : null,
        suggestion
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
    <div className='w-full rounded-none border-2 border-black bg-white p-4 space-y-3'>
      <div>
        <p className='font-black text-black'>{t.report.title}</p>
        <p className='text-sm text-black/60 font-medium'>
          {t.report.reasonsHint}
        </p>
      </div>

      <div className='space-y-2' role='group' aria-label={t.report.title}>
        {REASONS.map(reason => {
          const isInferred = inferred.includes(reason);
          return (
            <label
              key={reason}
              className='flex items-center gap-2 text-sm font-medium text-black cursor-pointer'
            >
              <input
                type='checkbox'
                className='h-4 w-4 accent-primary'
                checked={effectiveReasons.includes(reason)}
                // An edit is the claim: unticking it while the edit stands
                // would file a report the suggestion contradicts.
                disabled={isInferred}
                onChange={() => toggleReason(reason)}
              />
              {t.report.reasons[reason]}
            </label>
          );
        })}
      </div>

      {suggestable && draft === null && (
        <Button type='button' variant='outline' size='sm' onClick={startEditing}>
          <Pencil className='mr-2 h-4 w-4' />
          {t.report.suggest.trigger}
        </Button>
      )}

      {suggestable && draft !== null && (
        <div className='space-y-3 rounded-none border-2 border-black/20 p-3'>
          <div>
            <p className='font-black text-black'>{t.report.suggest.title}</p>
            <p className='text-sm text-black/60 font-medium'>
              {t.report.suggest.hint}
            </p>
          </div>

          <div className='space-y-1'>
            <label
              htmlFor={`suggest-question-${questionId}`}
              className='block text-sm font-bold text-black'
            >
              {t.report.suggest.questionLabel}
            </label>
            <textarea
              id={`suggest-question-${questionId}`}
              value={draft.questionText}
              maxLength={SUGGESTION_MAX_LENGTH}
              onChange={e =>
                setDraft({ ...draft, questionText: e.target.value })
              }
              rows={3}
              className='w-full rounded-none border-2 border-black bg-white p-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40'
            />
          </div>

          <div className='space-y-2'>
            {draft.answers.map((answer, index) => (
              <div key={answer.id} className='space-y-1'>
                <label
                  htmlFor={`suggest-answer-${answer.id}`}
                  className='block text-sm font-bold text-black'
                >
                  {t.report.suggest.answerLabel(index)}
                </label>
                <div className='flex items-center gap-2'>
                  <input
                    id={`suggest-answer-${answer.id}`}
                    type='text'
                    value={answer.text}
                    maxLength={SUGGESTION_MAX_LENGTH}
                    onChange={e =>
                      editAnswer(answer.id, { text: e.target.value })
                    }
                    className='flex-1 rounded-none border-2 border-black bg-white p-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40'
                  />
                  <label className='flex items-center gap-1 text-xs font-bold text-black cursor-pointer whitespace-nowrap'>
                    <input
                      type='checkbox'
                      className='h-4 w-4 accent-primary'
                      checked={answer.isCorrect}
                      onChange={e =>
                        editAnswer(answer.id, { isCorrect: e.target.checked })
                      }
                    />
                    {t.report.suggest.correct}
                  </label>
                </div>
              </div>
            ))}
          </div>

          <p className='text-sm font-bold text-black/60'>
            {changeCount === 0
              ? t.report.suggest.noChanges
              : t.report.suggest.changes(changeCount)}
          </p>
        </div>
      )}

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
          className='w-full rounded-none border-2 border-black bg-white p-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40'
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
          disabled={effectiveReasons.length === 0 || isSubmitting}
        >
          {isSubmitting ? t.report.submitting : t.report.submit}
        </Button>
      </div>
    </div>
  );
}

/**
 * Reduces the edited draft to the sparse patch the API stores: fields left as
 * served are dropped, so a Report never carries a copy of content nobody
 * touched (ADR 0005/0009). Null when nothing was actually changed.
 */
function buildPatch(
  served: SuggestableQuestion,
  draft: Draft
): SuggestionDto | null {
  const questionText = draft.questionText.trim();
  const answers = draft.answers.flatMap(answer => {
    const original = served.answers.find(a => a.id === answer.id);
    if (!original) return [];
    const text = answer.text.trim();
    const changedText = text && text !== original.text ? text : undefined;
    const changedKey =
      answer.isCorrect !== original.isCorrect ? answer.isCorrect : undefined;
    return changedText === undefined && changedKey === undefined
      ? []
      : [{ answerId: answer.id, text: changedText, isCorrect: changedKey }];
  });

  const changedQuestionText =
    questionText && questionText !== served.text ? questionText : undefined;

  return changedQuestionText === undefined && answers.length === 0
    ? null
    : { questionText: changedQuestionText, answers };
}

/** A suggested key is a wrong-key claim; rewritten text is an unclear-wording one. */
function inferReasons(suggestion: SuggestionDto | null): ReportReason[] {
  if (!suggestion) return [];
  const answers = suggestion.answers ?? [];
  const inferred: ReportReason[] = [];
  if (answers.some(answer => answer.isCorrect !== undefined)) {
    inferred.push(ReportReason.wrong_answer_key);
  }
  if (
    suggestion.questionText !== undefined ||
    answers.some(answer => answer.text !== undefined)
  ) {
    inferred.push(ReportReason.unclear_wording);
  }
  return inferred;
}

function countChanges(suggestion: SuggestionDto | null): number {
  if (!suggestion) return 0;
  return (
    (suggestion.questionText === undefined ? 0 : 1) +
    (suggestion.answers ?? []).reduce(
      (total, answer) =>
        total +
        (answer.text === undefined ? 0 : 1) +
        (answer.isCorrect === undefined ? 0 : 1),
      0
    )
  );
}

function isConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { response?: { status?: number } }).response?.status === 409
  );
}
