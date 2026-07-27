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

/** Owns the session-wide reported set, like the Subquiz session page does. */
function Harness() {
  const [reported, setReported] = useState<number[]>([]);
  return (
    <ReportQuestionControl
      submissionId={7}
      questionId={42}
      reported={reported.includes(42)}
      onReported={id => setReported(current => [...current, id])}
    />
  );
}

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
      comment: 'the explanation is circular'
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
