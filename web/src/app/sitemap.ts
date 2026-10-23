import type { MetadataRoute } from 'next';
import { getPublicQuizzes, isPublicQuizId } from '@/http/public-api.server';
import { DEFAULT_LANGUAGE } from '@/i18n/language';
import { SITE_ORIGIN } from '@/seo/metadata';

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const quizzes = await getPublicQuizzes(DEFAULT_LANGUAGE);
  const ids = new Set(quizzes.flatMap(quiz =>
    typeof quiz.id === 'number' && isPublicQuizId(String(quiz.id)) ? [quiz.id] : []
  ));
  return ['/', '/dashboard', ...Array.from(ids, id => `/quiz/${id}`)]
    .map(path => ({ url: new URL(path, SITE_ORIGIN).href }));
}
