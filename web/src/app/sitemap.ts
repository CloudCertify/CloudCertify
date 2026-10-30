import type { MetadataRoute } from 'next';
import { getPublicQuizzes } from '@/http/public-api.server';
import { DEFAULT_LANGUAGE } from '@/i18n/language';
import { SITE_ORIGIN } from '@/seo/metadata';

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // An API outage must not fail `next build`; revalidation restores the catalog.
  const quizzes = await getPublicQuizzes(DEFAULT_LANGUAGE).catch(() => []);
  return ['/', '/dashboard', ...quizzes.map(quiz => `/quiz/${quiz.id}`)]
    .map(path => ({ url: new URL(path, SITE_ORIGIN).href }));
}
