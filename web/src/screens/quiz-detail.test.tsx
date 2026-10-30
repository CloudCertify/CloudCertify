import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { resetNavigation } from '@/test/navigation';
import { QuizDetailPage } from './quiz-detail';
import { AuthProvider } from '@/auth/context';
import { clearToken, setToken } from '@/auth/token';
import { LanguageProvider } from '@/i18n/context';
import { en } from '@/i18n/messages/en';
import { pt } from '@/i18n/messages/pt';
import { setCurrentLanguage } from '@/i18n/language';

const toastError = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({
  toast: { error: toastError }
}));

const {
  postQuizQuizIdStart,
  postQuizQuizIdDrillsDrillIdStart
} = vi.hoisted(() => ({
  postQuizQuizIdStart: vi.fn().mockResolvedValue({ data: { id: 1 } }),
  postQuizQuizIdDrillsDrillIdStart: vi
    .fn()
    .mockResolvedValue({ data: { id: 2, title: 'Cloud Concepts', submissionId: 9 } })
}));

vi.mock('@/http/generated/api', () => ({
  postQuizQuizIdStart: (...args: unknown[]) => postQuizQuizIdStart(...args),
  postQuizQuizIdDrillsDrillIdStart: (...args: unknown[]) =>
    postQuizQuizIdDrillsDrillIdStart(...args),
  useGetMe: () => ({ data: undefined }),
  getGetMeQueryKey: () => ['me']
}));

const quiz = {
  id: 1,
  title: 'AWS Cloud Practitioner',
  isAvailable: true,
  drills: [{
    id: 2,
    title: 'Cloud Concepts',
    domain: 'Cloud Concepts',
    drawRule: 'drill_mix',
    slug: 'cloud-concepts',
    isAvailable: true
  }]
} satisfies import('@/http/generated/api.schemas').QuizDto;

function makeJwt(payload: object): string {
  const b64 = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.sig`;
}

function renderPage() {
  const location = resetNavigation('/quiz/1');
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LanguageProvider>
      <AuthProvider>
        <QuizDetailPage quiz={quiz} />
      </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
  return location;
}

describe('QuizDetailPage start flow', () => {
  beforeEach(() => {
    clearToken();
    setCurrentLanguage('en-US');
    toastError.mockReset();
    postQuizQuizIdStart.mockReset();
    postQuizQuizIdDrillsDrillIdStart.mockReset();
    postQuizQuizIdStart.mockResolvedValue({ data: { id: 1 } });
    postQuizQuizIdDrillsDrillIdStart.mockResolvedValue({
      data: { id: 2, title: 'Cloud Concepts', submissionId: 9 }
    });
  });

  it('restores a saved email after mounting', () => {
    sessionStorage.setItem('quiz-session-1', JSON.stringify({ email: 'saved@example.com' }));
    const html = renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <LanguageProvider>
          <AuthProvider><QuizDetailPage quiz={quiz} /></AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    );
    expect(html).not.toContain('saved@example.com');
    renderPage();
    expect(screen.getByLabelText(/your email/i)).toHaveValue('saved@example.com');
  });

  it.each(['exam', 'drill'] as const)('keeps %s focus through a failed start and blocks repeat starts', async mode => {
    let fail: (error: Error) => void = () => {};
    const request = mode === 'exam' ? postQuizQuizIdStart : postQuizQuizIdDrillsDrillIdStart;
    request.mockReturnValue(new Promise((_, reject) => { fail = reject; }));
    renderPage();
    fireEvent.change(screen.getByLabelText(/your email/i), { target: { value: 'visitor@example.com' } });
    const exam = screen.getByRole('button', { name: en.quizDetail.startExam });
    const drill = screen.getByRole('button', { name: en.quizDetail.practice });
    const start = mode === 'exam' ? exam : drill;
    start.focus();
    fireEvent.click(start);
    expect(start).not.toBeDisabled();
    expect(start).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(start);
    fireEvent.click(mode === 'exam' ? drill : exam);
    expect(postQuizQuizIdStart).toHaveBeenCalledTimes(mode === 'exam' ? 1 : 0);
    expect(postQuizQuizIdDrillsDrillIdStart).toHaveBeenCalledTimes(mode === 'drill' ? 1 : 0);
    fail(new Error('offline'));
    await waitFor(() => expect(toastError).toHaveBeenCalledOnce());
    expect(start).toHaveFocus();
    expect(start).not.toHaveAttribute('aria-disabled');
  });

  it('focuses invalid email and connects its error to the field', () => {
    renderPage();
    const input = screen.getByRole('textbox', { name: en.quizDetail.emailLabel });
    expect(input).toHaveAttribute('autocomplete', 'email');
    fireEvent.click(screen.getByRole('button', { name: en.quizDetail.startExam }));
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(en.quizDetail.emailInvalid);
    expect(postQuizQuizIdStart).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'visitor@example.com' } });
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('updates an existing validation error when the language changes', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: en.quizDetail.startExam }));
    fireEvent.click(screen.getByRole('button', { name: 'PT: Português' }));
    expect(screen.getByRole('textbox', { name: pt.quizDetail.emailLabel })).toHaveAccessibleDescription(pt.quizDetail.emailInvalid);
    expect(screen.getByRole('alert')).toHaveTextContent(pt.quizDetail.emailInvalid);
  });

  it('renders the email input for anonymous visitors and sends the email', async () => {
    renderPage();
    const input = screen.getByLabelText(/your email/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'visitor@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /start exam/i }));

    await waitFor(() => {
      expect(postQuizQuizIdStart).toHaveBeenCalledWith(1, {
        email: 'visitor@example.com'
      });
    });
  });

  it('hides the email input for logged-in Users and omits email from the request', async () => {
    setToken(makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    renderPage();

    expect(screen.queryByLabelText(/your email/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /start exam/i }));

    await waitFor(() => {
      expect(postQuizQuizIdStart).toHaveBeenCalledWith(1, {});
    });
  });

  it('starts a drill and opens the per-drill session route', async () => {
    const location = renderPage();
    const input = screen.getByLabelText(/your email/i);
    fireEvent.change(input, { target: { value: 'visitor@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /practice/i }));

    await waitFor(() => {
      expect(postQuizQuizIdDrillsDrillIdStart).toHaveBeenCalledWith(1, 2, {
        email: 'visitor@example.com'
      });
    });
    expect(location.history).toEqual(['/quiz/1', '/quiz/1/drill/2/session']);
    expect(location.push).toHaveBeenCalledWith('/quiz/1/drill/2/session');
    expect(location.replace).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem('drill-session-1-2')!)).toEqual({
      drillDetail: { id: 2, title: 'Cloud Concepts', submissionId: 9 },
      email: 'visitor@example.com'
    });
  });

  it.each(['exam', 'drill'] as const)('blocks repeat and sibling starts while %s navigation is pending', async mode => {
    const location = renderPage();
    location.push.mockImplementationOnce(() => new Promise<void>(() => {}));
    fireEvent.change(screen.getByLabelText(/your email/i), {
      target: { value: 'visitor@example.com' }
    });
    const exam = screen.getByRole('button', { name: en.quizDetail.startExam });
    const drill = screen.getByRole('button', { name: en.quizDetail.practice });
    const start = mode === 'exam' ? exam : drill;
    fireEvent.click(start);

    await waitFor(() => expect(location.push).toHaveBeenCalledOnce());
    expect(location.history).toEqual(['/quiz/1']);
    fireEvent.click(start);
    fireEvent.click(mode === 'exam' ? drill : exam);

    expect(start).toHaveAttribute('aria-disabled', 'true');
    expect(postQuizQuizIdStart).toHaveBeenCalledTimes(mode === 'exam' ? 1 : 0);
    expect(postQuizQuizIdDrillsDrillIdStart).toHaveBeenCalledTimes(mode === 'drill' ? 1 : 0);
    expect(location.push).toHaveBeenCalledOnce();
  });

  it.each(['exam', 'drill'] as const)('allows retry after a failed %s start', async mode => {
    const request = mode === 'exam' ? postQuizQuizIdStart : postQuizQuizIdDrillsDrillIdStart;
    request.mockRejectedValueOnce(new Error('request failed'));
    const location = renderPage();
    fireEvent.change(screen.getByLabelText(/your email/i), {
      target: { value: 'visitor@example.com' }
    });
    const start = screen.getByRole('button', {
      name: mode === 'exam' ? en.quizDetail.startExam : en.quizDetail.practice
    });
    fireEvent.click(start);
    await waitFor(() => expect(toastError).toHaveBeenCalledOnce());
    expect(start).toBeEnabled();
    fireEvent.click(start);
    await waitFor(() => expect(location.push).toHaveBeenCalledOnce());
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('says there is nothing to review when the start answers 409', async () => {
    postQuizQuizIdDrillsDrillIdStart.mockRejectedValue(axiosStatus(409));
    await startDrillAsVisitor();

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(en.drill.nothingToReview);
    });
  });

  it('asks the visitor to sign in when the start answers 401', async () => {
    postQuizQuizIdDrillsDrillIdStart.mockRejectedValue(axiosStatus(401));
    await startDrillAsVisitor();

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(en.drill.signInRequired);
    });
  });

  it('keeps the generic start error for any other failure', async () => {
    postQuizQuizIdDrillsDrillIdStart.mockRejectedValue(axiosStatus(500));
    await startDrillAsVisitor();

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(en.quizDetail.startPracticeError);
    });
  });
});

function axiosStatus(status: number) {
  return Object.assign(new Error('request failed'), {
    isAxiosError: true,
    response: { status }
  });
}

async function startDrillAsVisitor() {
  renderPage();
  fireEvent.change(screen.getByLabelText(/your email/i), {
    target: { value: 'visitor@example.com' }
  });
  fireEvent.click(screen.getByRole('button', { name: /practice/i }));
}
