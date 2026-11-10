import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetNavigation } from '@/test/navigation';
import type {
  DrillDetailDto,
  QuestionDto,
  QuizDetailDto,
  SubmitQuizResponseDto
} from '@/http/generated/api.schemas';
import { en } from '@/i18n/messages/en';
import { startAttempt, type AttemptTarget } from './start';
import { useAttempt } from './use-attempt';

const toastError = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: { error: toastError } }));

const api = vi.hoisted(() => ({
  postQuizQuizIdStart: vi.fn(),
  postQuizQuizIdAnswer: vi.fn(),
  postQuizQuizIdSubmit: vi.fn(),
  postQuizQuizIdDrillsDrillIdStart: vi.fn(),
  postQuizQuizIdDrillsDrillIdCheck: vi.fn(),
  postQuizQuizIdDrillsDrillIdFinish: vi.fn()
}));
vi.mock('@/http/generated/api', () => api);

const single = (id: number): QuestionDto => ({
  id,
  type: 'multiple_choice',
  selectCount: 1,
  text: `Question ${id}`,
  answers: [{ id: id * 10 + 1 }, { id: id * 10 + 2 }, { id: id * 10 + 3 }]
});
const multi = (id: number): QuestionDto => ({
  ...single(id),
  type: 'multiple_response',
  selectCount: 2
});

const exam: AttemptTarget = { quizId: 1 };
const drill: AttemptTarget = { quizId: 1, drillId: 4 };
const examDetail: QuizDetailDto = {
  id: 1,
  title: 'Exam',
  submissionId: 50,
  questions: [single(1), multi(2), single(3)]
};
const drillDetail: DrillDetailDto = {
  id: 4,
  title: 'Drill',
  submissionId: 60,
  questions: [multi(1), single(2)]
};
const result: SubmitQuizResponseDto = {
  score: 67,
  totalQuestions: 3,
  correctCount: 2,
  scaledScore: 720,
  passed: true,
  luckyGuessCount: 0,
  misconceptionCount: 0,
  domainBreakdown: [],
  questions: []
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function started(target: AttemptTarget, detail = target.drillId == null ? examDetail : drillDetail) {
  api.postQuizQuizIdStart.mockResolvedValueOnce({ data: detail });
  api.postQuizQuizIdDrillsDrillIdStart.mockResolvedValueOnce({ data: detail });
  await startAttempt(target, 'visitor@example.com');
}

async function mount(target: AttemptTarget) {
  const hook = renderHook(() => useAttempt(target));
  await waitFor(() => expect(hook.result.current.status).not.toBe('loading'));
  return hook;
}

/** A reload: the page goes away and comes back with only the tab's storage. */
async function reload(hook: { unmount: () => void }, target: AttemptTarget) {
  hook.unmount();
  return mount(target);
}

beforeEach(() => {
  Object.values(api).forEach(fn => fn.mockReset());
  toastError.mockReset();
  api.postQuizQuizIdAnswer.mockResolvedValue({ data: undefined });
  api.postQuizQuizIdSubmit.mockResolvedValue({ data: result });
  api.postQuizQuizIdDrillsDrillIdFinish.mockResolvedValue({ data: result });
  resetNavigation('/quiz/1/session');
});

describe('loading an attempt', () => {
  it('drops stored progress whose result cannot be shown', async () => {
    await started(exam);
    const hook = await mount(exam);
    act(() => hook.result.current.select(11));
    await waitFor(() => expect(hook.result.current.unsavedCount).toBe(0));
    hook.unmount();
    const key = Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i)!).find(k => k.endsWith(':progress'))!;
    const progress = JSON.parse(sessionStorage.getItem(key)!);
    sessionStorage.setItem(key, JSON.stringify({ ...progress, result: { passed: true } }));
    const { result: attempt } = await mount(exam);
    expect(attempt.current.status).toBe('active');
    expect(attempt.current.selectedIds).toEqual([]);
  });

  it('sends the visitor back to the Quiz page when nothing was started', async () => {
    const location = resetNavigation('/quiz/1/session');
    renderHook(() => useAttempt(exam));
    await waitFor(() => expect(location.push).toHaveBeenCalledWith('/quiz/1'));
  });

  it('sends the visitor back when the stored attempt cannot be read', async () => {
    const location = resetNavigation('/quiz/1/session');
    await started(exam);
    for (let i = 0; i < sessionStorage.length; i++) {
      sessionStorage.setItem(sessionStorage.key(i)!, '{not json');
    }
    renderHook(() => useAttempt(exam));
    await waitFor(() => expect(location.push).toHaveBeenCalledWith('/quiz/1'));
  });

  it('opens a started Exam on its first Question', async () => {
    await started(exam);
    const { result: attempt } = await mount(exam);
    expect(attempt.current.status).toBe('active');
    expect(attempt.current.mode).toBe('exam');
    expect(attempt.current.currentIndex).toBe(0);
    expect(attempt.current.currentQuestion?.id).toBe(1);
    expect(attempt.current.unansweredCount).toBe(3);
  });

  it('shows an empty state for an attempt with no Questions', async () => {
    await started(drill, { ...drillDetail, questions: [] });
    const { result: attempt } = await mount(drill);
    expect(attempt.current.status).toBe('empty');
    expect(attempt.current.currentQuestion).toBeNull();
  });
});

describe('Exam', () => {
  const committed = () =>
    api.postQuizQuizIdAnswer.mock.calls.map(([, body]) => body);

  it('commits every selection as a Recorded Answer', async () => {
    await started(exam);
    const { result: attempt } = await mount(exam);
    act(() => attempt.current.select(12));
    await waitFor(() => expect(attempt.current.unsavedCount).toBe(0));
    expect(committed()).toEqual([
      { submissionId: 50, questionId: 1, answerIds: [12], confidence: null }
    ]);
    expect(attempt.current.selectedIds).toEqual([12]);
    expect(attempt.current.unansweredCount).toBe(2);
  });

  it('commits quick re-picks in order, the latest replacing any queued older one', async () => {
    const first = deferred<unknown>();
    api.postQuizQuizIdAnswer.mockReturnValueOnce(first.promise);
    await started(exam);
    const { result: attempt } = await mount(exam);
    act(() => attempt.current.select(11));
    act(() => attempt.current.select(12));
    act(() => attempt.current.select(13));
    // One in flight per Question: nothing else goes out until the first settles.
    expect(committed()).toHaveLength(1);
    await act(async () => first.resolve({ data: undefined }));
    await waitFor(() => expect(attempt.current.unsavedCount).toBe(0));
    expect(committed().map(body => body.answerIds)).toEqual([[11], [13]]);
  });

  it('clears Confidence on an answer change and keeps it on a no-op re-pick', async () => {
    await started(exam);
    const { result: attempt } = await mount(exam);
    act(() => attempt.current.select(11));
    act(() => attempt.current.rate('confident'));
    act(() => attempt.current.select(11));
    expect(attempt.current.confidence).toBe('confident');
    act(() => attempt.current.select(12));
    expect(attempt.current.confidence).toBeNull();
    await waitFor(() => expect(attempt.current.unsavedCount).toBe(0));
    expect(committed().at(-1)).toMatchObject({ answerIds: [12], confidence: null });
  });

  it('caps a multiple-response selection at the required count', async () => {
    await started(exam);
    const { result: attempt } = await mount(exam);
    act(() => attempt.current.goTo(1));
    act(() => attempt.current.select(21));
    act(() => attempt.current.select(22));
    act(() => attempt.current.select(23));
    expect(attempt.current.selectedIds).toEqual([21, 22]);
    act(() => attempt.current.select(21));
    expect(attempt.current.selectedIds).toEqual([22]);
  });

  it('lets the Navigator jump to any Question', async () => {
    await started(exam);
    const { result: attempt } = await mount(exam);
    act(() => attempt.current.goTo(2));
    expect(attempt.current.currentQuestion?.id).toBe(3);
    act(() => attempt.current.goTo(0));
    expect(attempt.current.currentIndex).toBe(0);
  });

  it('confirms before Submit and waits for pending commits', async () => {
    const pending = deferred<unknown>();
    api.postQuizQuizIdAnswer.mockReturnValueOnce(pending.promise);
    await started(exam);
    const { result: attempt } = await mount(exam);
    act(() => attempt.current.select(11));
    act(() => attempt.current.requestSubmit());
    expect(attempt.current.confirmingSubmit).toBe(true);
    act(() => attempt.current.confirmSubmit());
    expect(attempt.current.submitting).toBe(true);
    await act(async () => {});
    expect(api.postQuizQuizIdSubmit).not.toHaveBeenCalled();
    await act(async () => pending.resolve({ data: undefined }));
    await waitFor(() => expect(attempt.current.status).toBe('finished'));
    expect(api.postQuizQuizIdSubmit).toHaveBeenCalledWith(1, { submissionId: 50 });
    expect(attempt.current.result).toEqual(result);
  });

  it('freezes answers and Confidence once Submit is under way', async () => {
    const pending = deferred<unknown>();
    api.postQuizQuizIdAnswer.mockReturnValueOnce(pending.promise);
    await started(exam);
    const { result: attempt } = await mount(exam);
    act(() => attempt.current.select(11));
    act(() => attempt.current.requestSubmit());
    act(() => attempt.current.confirmSubmit());
    act(() => attempt.current.select(12));
    act(() => attempt.current.rate('guess'));
    expect(attempt.current.selectedIds).toEqual([11]);
    expect(attempt.current.confidence).toBeNull();
    await act(async () => pending.resolve({ data: undefined }));
    await waitFor(() => expect(attempt.current.status).toBe('finished'));
    expect(committed().map(body => body.answerIds)).toEqual([[11]]);
  });

  it('blocks Submit after a failed commit, tells the visitor, and retries it', async () => {
    api.postQuizQuizIdAnswer.mockRejectedValueOnce(new Error('offline'));
    await started(exam);
    const { result: attempt } = await mount(exam);
    act(() => attempt.current.select(11));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(en.results.answerError));
    act(() => attempt.current.requestSubmit());
    act(() => attempt.current.confirmSubmit());
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(en.attempt.unsavedAnswers));
    expect(api.postQuizQuizIdSubmit).not.toHaveBeenCalled();
    expect(attempt.current.submitting).toBe(false);
    await waitFor(() => expect(attempt.current.unsavedCount).toBe(0));
    expect(committed().map(body => body.answerIds)).toEqual([[11], [11]]);
    act(() => attempt.current.requestSubmit());
    act(() => attempt.current.confirmSubmit());
    await waitFor(() => expect(attempt.current.status).toBe('finished'));
  });

  it('keeps the attempt intact and retryable after a failed Submit', async () => {
    api.postQuizQuizIdSubmit.mockRejectedValueOnce(new Error('offline'));
    await started(exam);
    const { result: attempt } = await mount(exam);
    act(() => attempt.current.select(11));
    act(() => attempt.current.requestSubmit());
    act(() => attempt.current.confirmSubmit());
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(en.results.submitError));
    expect(attempt.current.status).toBe('active');
    expect(attempt.current.selectedIds).toEqual([11]);
    act(() => attempt.current.requestSubmit());
    act(() => attempt.current.confirmSubmit());
    await waitFor(() => expect(attempt.current.status).toBe('finished'));
  });

  it('restores selections, Confidence and the current Question after a reload', async () => {
    await started(exam);
    const hook = await mount(exam);
    act(() => hook.result.current.select(12));
    act(() => hook.result.current.rate('guess'));
    act(() => hook.result.current.goTo(2));
    await waitFor(() => expect(hook.result.current.unsavedCount).toBe(0));
    const { result: attempt } = await reload(hook, exam);
    expect(attempt.current.currentIndex).toBe(2);
    expect(attempt.current.answered).toEqual([true, false, false]);
    expect(attempt.current.unansweredCount).toBe(2);
    expect(attempt.current.confidences).toEqual({ 1: 'guess' });
  });

  it('sends again, after a reload, an answer the server never confirmed', async () => {
    api.postQuizQuizIdAnswer.mockReturnValueOnce(new Promise(() => {}));
    await started(exam);
    const hook = await mount(exam);
    act(() => hook.result.current.select(13));
    const { result: attempt } = await reload(hook, exam);
    await waitFor(() => expect(attempt.current.unsavedCount).toBe(0));
    expect(committed().map(body => body.answerIds)).toEqual([[13], [13]]);
  });
});

describe('Practice', () => {
  const check = { isCorrect: true, correctAnswerIds: [11, 12], selectedAnswerIds: [11, 12] };

  async function checkedFirst() {
    api.postQuizQuizIdDrillsDrillIdCheck.mockResolvedValueOnce({ data: check });
    await started(drill);
    const hook = await mount(drill);
    act(() => hook.result.current.select(11));
    act(() => hook.result.current.select(12));
    await act(() => hook.result.current.check());
    return hook;
  }

  it('enables Check only once the required number of answers is picked', async () => {
    await started(drill);
    const { result: attempt } = await mount(drill);
    expect(attempt.current.rules.navigator).toBe(false);
    act(() => attempt.current.select(11));
    expect(attempt.current.canCheck).toBe(false);
    act(() => attempt.current.select(12));
    expect(attempt.current.canCheck).toBe(true);
  });

  it('reveals a Checked Question and locks its answers', async () => {
    const { result: attempt } = await checkedFirst();
    expect(api.postQuizQuizIdDrillsDrillIdCheck).toHaveBeenCalledWith(1, 4, {
      submissionId: 60,
      questionId: 1,
      answerIds: [11, 12]
    });
    expect(attempt.current.phase).toBe('checked');
    expect(attempt.current.checkResponse).toEqual(check);
    act(() => attempt.current.select(13));
    expect(attempt.current.selectedIds).toEqual([11, 12]);
  });

  it('stays forward-only: no Navigator, no Confidence, no commits', async () => {
    const { result: attempt } = await checkedFirst();
    act(() => attempt.current.goTo(1));
    expect(attempt.current.currentIndex).toBe(0);
    act(() => attempt.current.rate('confident'));
    expect(attempt.current.confidence).toBeNull();
    act(() => attempt.current.proceed());
    expect(attempt.current.currentIndex).toBe(1);
    act(() => attempt.current.goTo(0));
    expect(attempt.current.currentIndex).toBe(1);
    expect(api.postQuizQuizIdAnswer).not.toHaveBeenCalled();
  });

  it('leaves a failed Check retryable', async () => {
    api.postQuizQuizIdDrillsDrillIdCheck.mockRejectedValueOnce(new Error('offline'));
    await started(drill);
    const { result: attempt } = await mount(drill);
    act(() => attempt.current.select(11));
    act(() => attempt.current.select(12));
    await act(() => attempt.current.check());
    expect(toastError).toHaveBeenCalledWith(en.results.checkError);
    expect(attempt.current.phase).toBe('answering');
    expect(attempt.current.canCheck).toBe(true);
  });

  it('finishes on the last Continue', async () => {
    const hook = await checkedFirst();
    act(() => hook.result.current.proceed());
    api.postQuizQuizIdDrillsDrillIdCheck.mockResolvedValueOnce({
      data: { isCorrect: false, correctAnswerIds: [21], selectedAnswerIds: [22] }
    });
    act(() => hook.result.current.select(22));
    await act(() => hook.result.current.check());
    expect(hook.result.current.isLast).toBe(true);
    act(() => hook.result.current.proceed());
    await waitFor(() => expect(hook.result.current.status).toBe('finished'));
    expect(api.postQuizQuizIdDrillsDrillIdFinish).toHaveBeenCalledWith(1, 4, { submissionId: 60 });
    expect(hook.result.current.result).toEqual(result);
  });

  it('comes back Checked on the same Question after a reload, never asking for a second Check', async () => {
    const hook = await checkedFirst();
    const reloaded = await reload(hook, drill);
    const attempt = reloaded.result;
    expect(attempt.current.currentIndex).toBe(0);
    expect(attempt.current.phase).toBe('checked');
    expect(attempt.current.canCheck).toBe(false);
    act(() => attempt.current.proceed());
    expect(attempt.current.currentIndex).toBe(1);
    const { result: again } = await reload(reloaded, drill);
    expect(again.current.currentIndex).toBe(1);
  });
});

describe('Try Again', () => {
  it('starts a fresh Submission with nothing left over, Reports included', async () => {
    api.postQuizQuizIdDrillsDrillIdCheck.mockResolvedValue({
      data: { isCorrect: true, correctAnswerIds: [21], selectedAnswerIds: [21] }
    });
    await started(drill, { ...drillDetail, questions: [single(2)] });
    const { result: attempt } = await mount(drill);
    act(() => attempt.current.select(21));
    await act(() => attempt.current.check());
    act(() => attempt.current.markReported(2));
    act(() => attempt.current.proceed());
    await waitFor(() => expect(attempt.current.status).toBe('finished'));

    api.postQuizQuizIdDrillsDrillIdStart.mockResolvedValueOnce({
      data: { ...drillDetail, submissionId: 61, questions: [single(2)] }
    });
    await act(() => attempt.current.restart());
    expect(api.postQuizQuizIdDrillsDrillIdStart).toHaveBeenLastCalledWith(1, 4, {
      email: 'visitor@example.com'
    });
    expect(attempt.current.status).toBe('active');
    expect(attempt.current.payload?.detail.submissionId).toBe(61);
    expect(attempt.current.selectedIds).toEqual([]);
    expect(attempt.current.phase).toBe('answering');
    expect(attempt.current.reported).toEqual([]);
    expect(attempt.current.result).toBeNull();
  });

  it('keeps the results when the restart fails', async () => {
    await started(exam);
    const { result: attempt } = await mount(exam);
    act(() => attempt.current.requestSubmit());
    act(() => attempt.current.confirmSubmit());
    await waitFor(() => expect(attempt.current.status).toBe('finished'));
    api.postQuizQuizIdStart.mockRejectedValueOnce(new Error('offline'));
    await act(() => attempt.current.restart());
    expect(toastError).toHaveBeenCalledWith(en.attempt.startExamError);
    expect(attempt.current.status).toBe('finished');
    expect(attempt.current.restarting).toBe(false);
  });

  it('shows the results again after a reload', async () => {
    await started(exam);
    const hook = await mount(exam);
    act(() => hook.result.current.requestSubmit());
    act(() => hook.result.current.confirmSubmit());
    await waitFor(() => expect(hook.result.current.status).toBe('finished'));
    const { result: attempt } = await reload(hook, exam);
    expect(attempt.current.status).toBe('finished');
    expect(attempt.current.result).toEqual(result);
  });
});
