import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { QuizDetailPage } from './quiz-detail';
import { AuthProvider } from '@/auth/context';
import { clearToken, setToken } from '@/auth/token';

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
  useGetQuizQuizId: () => ({
    data: {
      data: {
        id: 1,
        title: 'AWS Cloud Practitioner',
        isAvailable: true,
        drills: [
          {
            id: 2,
            title: 'Cloud Concepts',
            domain: 'Cloud Concepts',
            drawRule: 'drill_mix',
            slug: 'cloud-concepts',
            isAvailable: true
          }
        ]
      }
    },
    isLoading: false
  }),
  postQuizQuizIdStart: (...args: unknown[]) => postQuizQuizIdStart(...args),
  postQuizQuizIdDrillsDrillIdStart: (...args: unknown[]) =>
    postQuizQuizIdDrillsDrillIdStart(...args),
  useGetMe: () => ({ data: undefined }),
  getGetMeQueryKey: () => ['me']
}));

function makeJwt(payload: object): string {
  const b64 = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.sig`;
}

function renderPage() {
  const location = memoryLocation({ path: '/quiz/1', record: true });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <Router hook={location.hook}>
          <Route path='/quiz/:id' component={QuizDetailPage} />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
  return location;
}

describe('QuizDetailPage start flow', () => {
  beforeEach(() => {
    clearToken();
    postQuizQuizIdStart.mockClear();
    postQuizQuizIdDrillsDrillIdStart.mockClear();
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
    expect(location.history.at(-1)).toBe('/quiz/1/drill/2/session');
  });
});
