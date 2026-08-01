import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { ReportQuestionControl } from './report-question-control';
import { en } from '@/i18n/messages/en';

const postReports = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock('@/http/generated/api', () => ({ postReports }));
vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: toastError }
}));

/** The Question as served, with the key the Check revealed: A is marked correct. */
const SUGGESTABLE = {
  text: 'Which service stores objects?',
  answers: [
    { id: 101, text: 'A', isCorrect: true },
    { id: 102, text: 'B', isCorrect: false }
  ]
};

/** Owns the session-wide reported set, like the Subquiz session page does. */
function Harness({ suggestable }: { suggestable?: typeof SUGGESTABLE }) {
  const [reported, setReported] = useState<number[]>([]);
  return (
    <ReportQuestionControl
      submissionId={7}
      questionId={42}
      reported={reported.includes(42)}
      onReported={id => setReported(current => [...current, id])}
      suggestable={suggestable}
    />
  );
}

const startEditing = () =>
  fireEvent.click(
    screen.getByRole('button', { name: en.report.suggest.trigger })
  );
const answerText = (index: number) =>
  screen.getByLabelText(en.report.suggest.answerLabel(index));

const openForm = () =>
  fireEvent.click(screen.getByRole('button', { name: en.report.trigger }));
const reason = (key: keyof typeof en.report.reasons) =>
  screen.getByLabelText(en.report.reasons[key]);
const submitButton = () =>
  screen.getByRole('button', { name: en.report.submit });

describe('ReportQuestionControl', () => {
  beforeEach(() => {
    postReports.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    postReports.mockResolvedValue({ data: {} });
  });

  it('requires at least one reason and allows several at once', () => {
    render(<Harness />);
    openForm();
    expect(submitButton()).toBeDisabled();

    fireEvent.click(reason('wrong_answer_key'));
    fireEvent.click(reason('outdated'));
    expect(reason('wrong_answer_key')).toBeChecked();
    expect(reason('outdated')).toBeChecked();
    expect(submitButton()).toBeEnabled();

    // Unchecking back to none disables submit again.
    fireEvent.click(reason('wrong_answer_key'));
    fireEvent.click(reason('outdated'));
    expect(submitButton()).toBeDisabled();
  });

  it('caps the optional comment at 200 characters', () => {
    render(<Harness />);
    openForm();
    const comment = screen.getByLabelText(en.report.commentLabel);
    expect(comment).toHaveAttribute('maxlength', '200');

    fireEvent.change(comment, { target: { value: 'x'.repeat(250) } });
    expect((comment as HTMLTextAreaElement).value).toHaveLength(200);
    expect(screen.getByText('200/200')).toBeInTheDocument();

    // Still optional: one reason alone is enough to submit.
    fireEvent.change(comment, { target: { value: '' } });
    fireEvent.click(reason('unclear_wording'));
    expect(submitButton()).toBeEnabled();
  });

  it('submits the report and marks the question as reported', async () => {
    render(<Harness />);
    openForm();
    fireEvent.click(reason('bad_explanation'));
    fireEvent.change(screen.getByLabelText(en.report.commentLabel), {
      target: { value: '  the explanation is circular  ' }
    });
    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(screen.getByText(en.report.reported)).toBeInTheDocument()
    );
    expect(postReports).toHaveBeenCalledWith({
      submissionId: 7,
      questionId: 42,
      reasons: ['bad_explanation'],
      comment: 'the explanation is circular',
      suggestion: null
    });
    expect(toastSuccess).toHaveBeenCalledWith(en.report.success);
    expect(
      screen.queryByRole('button', { name: en.report.trigger })
    ).not.toBeInTheDocument();
  });

  it('sends a null comment when none was typed', async () => {
    render(<Harness />);
    openForm();
    fireEvent.click(reason('outdated'));
    fireEvent.click(submitButton());

    await waitFor(() => expect(postReports).toHaveBeenCalled());
    expect(postReports.mock.calls[0][0].comment).toBeNull();
  });

  it('treats a 409 as already-reported, not as an error', async () => {
    postReports.mockRejectedValue({ response: { status: 409 } });
    render(<Harness />);
    openForm();
    fireEvent.click(reason('wrong_answer_key'));
    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(screen.getByText(en.report.reported)).toBeInTheDocument()
    );
    expect(toastSuccess).toHaveBeenCalledWith(en.report.success);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('keeps the form open and warns when the call fails', async () => {
    postReports.mockRejectedValue({ response: { status: 500 } });
    render(<Harness />);
    openForm();
    fireEvent.click(reason('wrong_answer_key'));
    fireEvent.click(submitButton());

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(en.report.error));
    expect(screen.queryByText(en.report.reported)).not.toBeInTheDocument();
    expect(reason('wrong_answer_key')).toBeChecked();
  });

  it('offers the editor only when the key is known', () => {
    render(<Harness />);
    openForm();
    expect(
      screen.queryByRole('button', { name: en.report.suggest.trigger })
    ).not.toBeInTheDocument();
  });

  it('sends only the fields the reporter actually changed', async () => {
    render(<Harness suggestable={SUGGESTABLE} />);
    openForm();
    startEditing();

    fireEvent.change(screen.getByLabelText(en.report.suggest.questionLabel), {
      target: { value: '  Which service stores objects durably?  ' }
    });
    // B becomes the key, A stops being it; B's wording is left alone.
    fireEvent.change(answerText(0), { target: { value: 'A' } });
    fireEvent.click(screen.getAllByLabelText(en.report.suggest.correct)[0]);
    fireEvent.click(screen.getAllByLabelText(en.report.suggest.correct)[1]);

    expect(screen.getByText(en.report.suggest.changes(3))).toBeInTheDocument();
    fireEvent.click(submitButton());

    await waitFor(() => expect(postReports).toHaveBeenCalled());
    expect(postReports.mock.calls[0][0].suggestion).toEqual({
      questionText: 'Which service stores objects durably?',
      answers: [
        { answerId: 101, text: undefined, isCorrect: false },
        { answerId: 102, text: undefined, isCorrect: true }
      ]
    });
  });

  it('takes the reasons from the edit, so an edit alone can be submitted', () => {
    render(<Harness suggestable={SUGGESTABLE} />);
    openForm();
    expect(submitButton()).toBeDisabled();
    startEditing();
    expect(screen.getByText(en.report.suggest.noChanges)).toBeInTheDocument();

    fireEvent.change(answerText(1), { target: { value: 'B, but clearer' } });

    // Rewording is an unclear-wording claim, and it cannot be unticked while
    // the edit stands.
    expect(reason('unclear_wording')).toBeChecked();
    expect(reason('unclear_wording')).toBeDisabled();
    expect(reason('wrong_answer_key')).not.toBeChecked();
    expect(submitButton()).toBeEnabled();

    fireEvent.click(screen.getAllByLabelText(en.report.suggest.correct)[0]);
    expect(reason('wrong_answer_key')).toBeChecked();
  });

  it('shows the reported state instead of the trigger when already reported', () => {
    render(
      <ReportQuestionControl
        submissionId={7}
        questionId={42}
        reported
        onReported={() => {}}
      />
    );
    expect(screen.getByText(en.report.reported)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: en.report.trigger })
    ).not.toBeInTheDocument();
  });
});
