import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { QuizDetailPage } from './quiz-detail';
import { AuthProvider } from '@/auth/context';
import { setToken } from '@/auth/token';

const postQuizQuizIdStart = vi.fn().mockResolvedValue({ data: { id: 1 } });

vi.mock('@/http/generated/api', () => ({
  useGetQuizQuizId: () => ({
    data: {
      data: {
        id: 1,
        title: 'AWS Cloud Practitioner',
        isAvailable: true,
        subQuizzes: []
      }
    },
    isLoading: false
  }),
  postQuizQuizIdStart: (...args: unknown[]) => postQuizQuizIdStart(...args),
  postQuizQuizIdSubquizzesSubquizIdStart: vi.fn(),
  useGetMe: () => ({ data: undefined }),
  getGetMeQueryKey: () => ['me']
}));

function makeJwt(payload: object): string {
  const b64 = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.sig`;
}

function renderPage() {
  const { hook } = memoryLocation({ path: '/quiz/1' });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <Router hook={hook}>
          <Route path='/quiz/:id' component={QuizDetailPage} />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('QuizDetailPage start flow', () => {
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
});
