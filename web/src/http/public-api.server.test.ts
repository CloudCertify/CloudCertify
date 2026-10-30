import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); }
}));

import { getPublicQuiz, getPublicQuizzes } from './public-api.server';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('API_URL', '');
  vi.stubEnv('NEXT_PUBLIC_API_URL', '');
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('anonymous public API', () => {
  it('fetches catalog and detail with explicit locale and native caching only', async () => {
    fetchMock.mockResolvedValueOnce(Response.json([{ id: 7 }]))
      .mockResolvedValueOnce(Response.json({ id: 7, title: 'Português' }));
    expect(await getPublicQuizzes('en-US')).toEqual([{ id: 7 }]);
    expect(await getPublicQuiz('7', 'pt-BR')).toEqual({ id: 7, title: 'Português' });
    const options = (language: string) => ({
      headers: { Accept: 'application/json', 'Accept-Language': language },
      next: { revalidate: 300 }, signal: expect.any(AbortSignal)
    });
    expect(fetchMock.mock.calls).toEqual([
      ['https://api-cloudcertify.snowye.dev/quiz', options('en-US')],
      ['https://api-cloudcertify.snowye.dev/quiz/7', options('pt-BR')]
    ]);
  });

  it('prefers the server API URL and falls back to the public API URL', async () => {
    fetchMock.mockImplementation(async () => Response.json([]));
    vi.stubEnv('API_URL', 'https://server.example/api/');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://public.example');
    await getPublicQuizzes('en-US');
    expect(fetchMock.mock.calls[0][0]).toBe('https://server.example/api/quiz');
    vi.stubEnv('API_URL', '');
    await getPublicQuizzes('en-US');
    expect(fetchMock.mock.calls[1][0]).toBe('https://public.example/quiz');
  });

  it.each(['0', '-1', '1.5', '1e2', '01', 'abc', '2147483648', '9007199254740992'])('rejects invalid ID %s without fetching', async id => {
    await expect(getPublicQuiz(id, 'en-US')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a missing detail to Next notFound', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(getPublicQuiz('7', 'en-US')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });

  it('propagates upstream and network errors instead of treating them as missing quizzes', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    await expect(getPublicQuiz('7', 'en-US')).rejects.toThrow('HTTP 503');
    await expect(getPublicQuizzes('en-US')).rejects.toThrow('HTTP 503');
    fetchMock.mockRejectedValue(new Error('network unavailable'));
    await expect(getPublicQuiz('7', 'en-US')).rejects.toThrow('network unavailable');
  });
});
