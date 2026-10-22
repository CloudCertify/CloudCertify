import { readFileSync } from 'node:fs';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import type { QuizDto } from '@/http/generated/api.schemas';
import { FALLBACK_I18N, I18nContext, MESSAGES } from '@/i18n/i18n-context';
import type { Language } from '@/i18n/language';
import { applyPageMetadata, getPageMetadata, SITE_ORIGIN } from './metadata';
import { PageMetadata } from './page-metadata';

const { useQuiz } = vi.hoisted(() => ({
  useQuiz: vi.fn<() => {
    data?: { data: QuizDto };
    isError: boolean;
    isSuccess: boolean;
  }>()
}));

vi.mock('@/http/generated/api', () => ({ useGetQuizQuizId: useQuiz }));

const shell = readFileSync('index.html', 'utf8');
const meta = (key: string) =>
  document.head.querySelector(`meta[name="${key}"], meta[property="${key}"]`)
    ?.getAttribute('content');
const canonical = () =>
  document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');
const schema = () =>
  JSON.parse(document.getElementById('page-structured-data')?.textContent ?? 'null') as {
    '@type': string;
    name: string;
    description: string;
    url: string;
    inLanguage: string;
  } | null;

beforeEach(() => {
  document.head.innerHTML = new DOMParser().parseFromString(shell, 'text/html').head.innerHTML;
  useQuiz.mockReset();
  useQuiz.mockReturnValue({ isError: false, isSuccess: false });
});

describe('route metadata', () => {
  it.each(['/', '/dashboard', '/dashboard/', '/quiz/1', '/quiz/1/'])(
    'keeps public route %s indexable, including while a quiz loads', path => {
      expect(getPageMetadata(path, 'en-US').robots).toBe('index, follow');
    }
  );

  it.each([
    '/quiz', '/quiz/1/session', '/quiz/1/drill/2/session', '/progress',
    '/auth/callback', '/missing', '/quiz/unknown', '/quiz/0', '/quiz/-1',
    '/quiz/1.5', '/quiz/2147483648', '/quiz/9007199254740993'
  ])('excludes utility, missing, or invalid route %s', path => {
    const metadata = getPageMetadata(path, 'en-US');
    expect(metadata.robots).toBe('noindex, follow');
    expect(metadata.canonical).toBeUndefined();
    expect(metadata.structuredData).toBeUndefined();
  });

  it('does not invent quiz facts or a canonical while data is pending', () => {
    const metadata = getPageMetadata('/quiz/1', 'en-US');
    expect(metadata.canonical).toBeUndefined();
    expect(metadata.structuredData).toBeUndefined();
  });

  it('describes a public quiz using its visible title and description', () => {
    const quiz = { title: 'AWS Cloud Practitioner', description: 'Practice CLF-C02.' };
    const metadata = getPageMetadata('/quiz/1/', 'en-US', quiz);
    expect(metadata.title).toBe('AWS Cloud Practitioner | CloudCertify');
    expect(metadata.description).toBe(quiz.description);
    expect(metadata.canonical).toBe(`${SITE_ORIGIN}/quiz/1`);
    expect(metadata.structuredData).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: quiz.title,
      description: quiz.description,
      url: `${SITE_ORIGIN}/quiz/1`,
      inLanguage: 'en-US'
    });
  });

  it('uses the visible localized exam summary when a quiz has no description', () => {
    expect(getPageMetadata('/quiz/1', 'pt-BR', { title: 'AWS' }).description)
      .toBe(MESSAGES['pt-BR'].quizDetail.fullExamBody);
  });

  it('removes canonical and schema for a failed quiz even with cached data', () => {
    const metadata = getPageMetadata('/quiz/1', 'en-US', { title: 'AWS' }, true);
    expect(metadata.robots).toBe('noindex, follow');
    expect(metadata.canonical).toBeUndefined();
    expect(metadata.structuredData).toBeUndefined();
  });

  it('writes API text as JSON, without creating executable markup', () => {
    const title = '</script><script>alert(1)</script>';
    applyPageMetadata(getPageMetadata('/quiz/1', 'en-US', { title }));
    expect(schema()?.name).toBe(title);
    expect(document.getElementById('page-structured-data')?.textContent).not.toContain('<');
    expect(document.head.querySelectorAll('script')).toHaveLength(1);
  });
});

describe('metadata lifecycle', () => {
  it('updates one set of tags on navigation and language changes, then removes public schema', () => {
    const location = memoryLocation({ path: '/' });
    function tree(language: Language) {
      return (
        <I18nContext.Provider value={{ ...FALLBACK_I18N, language, t: MESSAGES[language] }}>
          <Router hook={location.hook}><PageMetadata /></Router>
        </I18nContext.Provider>
      );
    }
    const view = render(tree('en-US'));
    expect(canonical()).toBe(`${SITE_ORIGIN}/`);
    expect(schema()?.name).toBe('CloudCertify');
    expect(schema()?.['@type']).toBe('WebSite');

    view.rerender(tree('pt-BR'));
    expect(document.title).toContain('certificações em nuvem');
    expect(meta('og:locale')).toBe('pt_BR');
    expect(meta('og:title')).toBe(document.title);
    expect(meta('twitter:description')).toBe(meta('description'));
    expect(schema()?.inLanguage).toBe('pt-BR');
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('link[hreflang]')).toHaveLength(0);

    act(() => location.navigate('/dashboard'));
    expect(document.title).toBe('Painel | CloudCertify');
    expect(canonical()).toBe(`${SITE_ORIGIN}/dashboard`);
    expect(schema()?.['@type']).toBe('CollectionPage');

    act(() => location.navigate('/quiz/1/session'));
    expect(meta('robots')).toBe('noindex, follow');
    expect(canonical()).toBeUndefined();
    expect(meta('og:url')).toBeUndefined();
    expect(schema()).toBeNull();
    expect(useQuiz).toHaveBeenLastCalledWith(0, { query: { enabled: false } });

    act(() => location.navigate('/'));
    expect(meta('robots')).toBe('index, follow');
    expect(canonical()).toBe(`${SITE_ORIGIN}/`);
    expect(document.head.querySelectorAll('#page-structured-data')).toHaveLength(1);
  });

  it('publishes loaded quiz metadata and noindexes a missing response', () => {
    const location = memoryLocation({ path: '/quiz/7' });
    useQuiz.mockReturnValue({ data: { data: { title: 'SAA-C03' } }, isError: false, isSuccess: true });
    const tree = <Router hook={location.hook}><PageMetadata /></Router>;
    const view = render(tree);
    expect(useQuiz).toHaveBeenCalledWith(7, { query: { enabled: true } });
    expect(document.title).toBe('SAA-C03 | CloudCertify');
    expect(canonical()).toBe(`${SITE_ORIGIN}/quiz/7`);

    useQuiz.mockReturnValue({ data: { data: {} }, isError: false, isSuccess: true });
    view.rerender(<Router hook={location.hook}><PageMetadata /></Router>);
    expect(meta('robots')).toBe('noindex, follow');
    expect(canonical()).toBeUndefined();
    expect(schema()).toBeNull();
  });
});

describe('static crawl assets', () => {
  it('keeps fallback social metadata consistent without canonicalizing every SPA route to home', () => {
    const home = getPageMetadata('/', 'en-US');
    expect(document.title).toBe(home.title);
    expect(meta('description')).toBe(home.description);
    expect(meta('og:title')).toBe(home.title);
    expect(meta('twitter:description')).toBe(home.description);
    expect(canonical()).toBeUndefined();
    expect(meta('robots')).toBeUndefined();
  });

  it('advertises only stable public canonical URLs and allows crawlers to read noindex', () => {
    const robots = readFileSync('public/robots.txt', 'utf8');
    const sitemap = readFileSync('public/sitemap.xml', 'utf8');
    expect(robots).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
    expect(robots).not.toMatch(/^Disallow:/m);
    const xml = new DOMParser().parseFromString(sitemap, 'application/xml');
    expect(xml.querySelector('parsererror')).toBeNull();
    const urls = [...xml.querySelectorAll('loc')].map(tag => tag.textContent);
    expect(urls).toEqual([`${SITE_ORIGIN}/`, `${SITE_ORIGIN}/dashboard`]);
    for (const url of urls) {
      const metadata = getPageMetadata(new URL(url ?? '').pathname, 'en-US');
      expect(metadata.robots).toBe('index, follow');
      expect(metadata.canonical).toBe(url);
    }
  });
});
