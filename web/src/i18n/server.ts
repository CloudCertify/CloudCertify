import 'server-only';

import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_NAME,
  LANGUAGES,
  normalizeLanguage,
  type Language
} from './language';

export function resolveRequestLanguage(cookie?: string, acceptLanguage?: string | null): Language {
  const saved = LANGUAGES.find(language => language === cookie);
  if (saved) return saved;

  const preferences = (acceptLanguage ?? '').split(',').map(preference => {
    const [tag, ...parameters] = preference.trim().split(';');
    const quality = parameters.find(parameter => parameter.trim().startsWith('q='));
    const value = quality?.trim().slice(2);
    const weight = value === undefined ? 1 : /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(value) ? Number(value) : 0;
    return { language: normalizeLanguage(tag.trim()), weight };
  });

  return preferences.sort((a, b) => b.weight - a.weight)
    .find(preference => preference.language && preference.weight > 0)?.language ?? DEFAULT_LANGUAGE;
}

export const getRequestLanguage = cache(async (): Promise<Language> => {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value;
  if (LANGUAGES.some(language => language === cookie)) {
    return resolveRequestLanguage(cookie);
  }
  return resolveRequestLanguage(cookie, (await headers()).get('accept-language'));
});
