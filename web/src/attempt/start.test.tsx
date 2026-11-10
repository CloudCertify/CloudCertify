import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/i18n/messages/en';
import { resetNavigation } from '@/test/navigation';
import { useStartAttempt } from './start';
import { readPayload, rememberedEmail } from './storage';

const toastError = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: { error: toastError } }));

const api = vi.hoisted(() => ({
  postQuizQuizIdStart: vi.fn(),
  postQuizQuizIdDrillsDrillIdStart: vi.fn()
}));
vi.mock('@/http/generated/api', () => api);

function axiosStatus(status: number) {
  return Object.assign(new Error('request failed'), {
    isAxiosError: true,
    response: { status }
  });
}

beforeEach(() => {
  toastError.mockReset();
  api.postQuizQuizIdStart.mockReset().mockResolvedValue({ data: { id: 1, submissionId: 50 } });
  api.postQuizQuizIdDrillsDrillIdStart
    .mockReset()
    .mockResolvedValue({ data: { id: 4, submissionId: 60 } });
});

describe('useStartAttempt', () => {
  it('starts an Exam for a visitor: stores it, remembers the email, opens the session', async () => {
    const location = resetNavigation('/quiz/1');
    const { result } = renderHook(() => useStartAttempt());
    await act(() => result.current.start({ quizId: 1 }, 'visitor@example.com'));
    expect(api.postQuizQuizIdStart).toHaveBeenCalledWith(1, { email: 'visitor@example.com' });
    expect(readPayload({ quizId: 1 })).toEqual({
      mode: 'exam',
      detail: { id: 1, submissionId: 50 },
      email: 'visitor@example.com'
    });
    expect(rememberedEmail(1)).toBe('visitor@example.com');
    expect(location.push).toHaveBeenCalledWith('/quiz/1/session');
  });

  it('starts a Drill for a signed-in User without an email', async () => {
    const location = resetNavigation('/progress');
    const { result } = renderHook(() => useStartAttempt());
    await act(() => result.current.start({ quizId: 1, drillId: 4 }, null));
    expect(api.postQuizQuizIdDrillsDrillIdStart).toHaveBeenCalledWith(1, 4, {});
    expect(readPayload({ quizId: 1, drillId: 4 })?.mode).toBe('practice');
    expect(location.push).toHaveBeenCalledWith('/quiz/1/drill/4/session');
  });

  it('remembers a Drill email for the Quiz page too', async () => {
    resetNavigation('/quiz/1');
    const { result } = renderHook(() => useStartAttempt());
    await act(() => result.current.start({ quizId: 1, drillId: 4 }, 'drill@example.com'));
    expect(rememberedEmail(1)).toBe('drill@example.com');
  });

  it('stays busy after a successful start and frees up after a failure', async () => {
    resetNavigation('/quiz/1');
    const { result } = renderHook(() => useStartAttempt());
    await act(() => result.current.start({ quizId: 1 }, null));
    expect(result.current.starting).toEqual({ quizId: 1 });
    api.postQuizQuizIdStart.mockRejectedValueOnce(new Error('offline'));
    await act(() => result.current.start({ quizId: 1 }, null));
    expect(result.current.starting).toBeNull();
  });

  it.each([
    [409, en.drill.nothingToReview],
    [401, en.drill.signInRequired],
    [500, en.attempt.startDrillError]
  ])('maps a %i Drill start failure to its message', async (status, message) => {
    resetNavigation('/quiz/1');
    api.postQuizQuizIdDrillsDrillIdStart.mockRejectedValueOnce(axiosStatus(status));
    const { result } = renderHook(() => useStartAttempt());
    await act(() => result.current.start({ quizId: 1, drillId: 6 }, null));
    expect(toastError).toHaveBeenCalledWith(message);
  });

  it('uses the Exam start message for any Exam failure', async () => {
    resetNavigation('/quiz/1');
    api.postQuizQuizIdStart.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useStartAttempt());
    await act(() => result.current.start({ quizId: 1 }, null));
    expect(toastError).toHaveBeenCalledWith(en.attempt.startExamError);
  });
});
