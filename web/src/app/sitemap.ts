import type { MetadataRoute } from 'next';
import { getPublicQuizzes } from '@/http/public-api.server';
import { DEFAULT_LANGUAGE } from '@/i18n/language';
import { SITE_ORIGIN } from '@/seo/metadata';

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const quizzes = await getPublicQuizzes(DEFAULT_LANGUAGE);
  return ['/', '/dashboard', ...quizzes.map(quiz => `/quiz/${quiz.id}`)]
    .map(path => ({ url: new URL(path, SITE_ORIGIN).href }));
}
