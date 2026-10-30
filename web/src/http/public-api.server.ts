import 'server-only';

import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { QuizDto } from './generated/api.schemas';
import type { Language } from '@/i18n/language';

export function isPublicQuizId(id: string): boolean {
  return /^[1-9]\d{0,9}$/.test(id) && Number(id) <= 2147483647;
}

async function publicFetch(path: string, language: Language): Promise<Response> {
  const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api-cloudcertify.snowye.dev';
  return fetch(`${base.replace(/\/$/, '')}${path}`, {
    headers: { Accept: 'application/json', 'Accept-Language': language },
    next: { revalidate: 300 },
    // Fail the render instead of holding it open while the API hangs.
    signal: AbortSignal.timeout(10_000)
  });
}

export const getPublicQuizzes = cache(async (language: Language): Promise<QuizDto[]> => {
  const response = await publicFetch('/quiz', language);
  if (!response.ok) throw new Error(`Public quiz catalog failed: HTTP ${response.status}`);
  return response.json();
});

export const getPublicQuiz = cache(async (id: string, language: Language): Promise<QuizDto> => {
  if (!isPublicQuizId(id)) notFound();
  const response = await publicFetch(`/quiz/${id}`, language);
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error(`Public quiz ${id} failed: HTTP ${response.status}`);
  return response.json();
});
