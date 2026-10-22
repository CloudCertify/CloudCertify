import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { QuizDto } from '@/http/generated/api.schemas';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); }
}));
vi.mock('@/i18n/server', () => ({ getRequestLanguage: async () => 'pt-BR' }));
vi.mock('@/http/public-api.server', async importOriginal => ({
  ...await importOriginal<typeof import('@/http/public-api.server')>(),
  getPublicQuizzes: vi.fn(),
  getPublicQuiz: vi.fn()
}));
vi.mock('@/providers', () => ({ Providers: ({ children, initialLanguage }: { children: React.ReactNode; initialLanguage: string }) => <div data-language={initialLanguage}>{children}</div> }));
vi.mock('@/screens/home', () => ({ HomePage: ({ quizzes }: { quizzes: QuizDto[] }) => <main>{quizzes[0]?.title}</main> }));
vi.mock('@/screens/dashboard', () => ({ DashboardPage: ({ quizzes }: { quizzes: QuizDto[] }) => <main>{quizzes[0]?.title}</main> }));
vi.mock('@/screens/quiz-detail', () => ({ QuizDetailPage: ({ quiz }: { quiz: QuizDto }) => <main>{quiz.title}</main> }));

import RootLayout from './layout';
import Home, { generateMetadata as homeMetadata } from './page';
import Dashboard, { generateMetadata as dashboardMetadata } from './dashboard/page';
import Detail, { generateMetadata as detailMetadata } from './quiz/[id]/page';
import NotFound from './not-found';
import Prototype from './prototype/quiz-motion/page';
import sitemap from './sitemap';
import robots from './robots';
import { getPublicQuiz, getPublicQuizzes } from '@/http/public-api.server';
import { SITE_ORIGIN } from '@/seo/metadata';

const quiz: QuizDto = { id: 37, title: 'Certificação', description: 'Pratique aqui.' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPublicQuizzes).mockResolvedValue([quiz]);
  vi.mocked(getPublicQuiz).mockResolvedValue(quiz);
});

describe('public server routes', () => {
  it('sets the document and provider language from the request', async () => {
    const html = renderToStaticMarkup(await RootLayout({ children: <main>Content</main> }));
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('<div data-language="pt-BR"><main>Content</main></div>');
  });

  it('renders catalog screens and localized JSON-LD before hydration', async () => {
    for (const [page, metadata, path] of [
      [Home, homeMetadata, '/'],
      [Dashboard, dashboardMetadata, '/dashboard']
    ] as const) {
      const html = renderToStaticMarkup(await page());
      expect(html).toContain('<main>Certificação</main>');
      expect(html).toContain('application/ld+json');
      expect(html).toContain('"inLanguage":"pt-BR"');
      expect((await metadata()).alternates?.canonical).toBe(path);
    }
    expect(getPublicQuizzes).toHaveBeenCalledWith('pt-BR');
  });

  it('uses the request locale and detail for both metadata and the rendered screen', async () => {
    const props = { params: Promise.resolve({ id: '37' }) };
    const html = renderToStaticMarkup(await Detail(props));
    const metadata = await detailMetadata(props);
    expect(html).toContain('<main>Certificação</main>');
    expect(html).toContain('"inLanguage":"pt-BR"');
    expect(metadata.title).toBe('Certificação | CloudCertify');
    expect(metadata.alternates?.canonical).toBe('/quiz/37');
    expect(getPublicQuiz).toHaveBeenCalledWith('37', 'pt-BR');
  });

  it('does not recover from a missing detail or upstream failure with public content', async () => {
    const props = { params: Promise.resolve({ id: '37' }) };
    for (const error of ['NEXT_HTTP_ERROR_FALLBACK;404', 'HTTP 503']) {
      vi.mocked(getPublicQuiz).mockRejectedValue(new Error(error));
      await expect(Detail(props)).rejects.toThrow(error);
      await expect(detailMetadata(props)).rejects.toThrow(error);
    }
  });

  it('localizes the missing-page UI on the server', async () => {
    const html = renderToStaticMarkup(await NotFound());
    expect(html).toContain('Página não encontrada');
    expect(html).toContain('href="/dashboard"');
  });

  it('rejects the prototype outside development', async () => {
    // Vitest runs in test mode, which must not expose the development route.
    await expect(Prototype()).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});

describe('native crawler routes', () => {
  it('includes only public routes with real, unique positive integer catalog IDs', async () => {
    vi.mocked(getPublicQuizzes).mockResolvedValue([
      quiz, { id: 37 }, { id: 52, isAvailable: false }, {},
      { id: 0 }, { id: -1 }, { id: 1.5 }, { id: 2147483648 }
    ]);
    expect(await sitemap()).toEqual([
      { url: `${SITE_ORIGIN}/` },
      { url: `${SITE_ORIGIN}/dashboard` },
      { url: `${SITE_ORIGIN}/quiz/37` },
      { url: `${SITE_ORIGIN}/quiz/52` }
    ]);
    expect(getPublicQuizzes).toHaveBeenCalledWith('en-US');
  });

  it('does not publish invented catalog entries during an outage', async () => {
    vi.mocked(getPublicQuizzes).mockRejectedValue(new Error('HTTP 503'));
    await expect(sitemap()).rejects.toThrow('HTTP 503');
  });

  it('lets crawlers read utility noindex directives and advertises the native sitemap', () => {
    expect(robots()).toEqual({
      rules: { userAgent: '*', allow: '/' },
      sitemap: `${SITE_ORIGIN}/sitemap.xml`
    });
  });
});
