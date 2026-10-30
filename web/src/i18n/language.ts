/**
 * Language (CONTEXT.md): the locale a Submission is served in. The API fixes it
 * on the Submission from `Accept-Language` at attempt start, so the web app's
 * job is to (1) remember the visitor's choice and (2) send it on every request.
 */

export const LANGUAGES = ['en-US', 'pt-BR'] as const;

export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'en-US';

export const LANGUAGE_STORAGE_KEY = 'cloudcertify:language';
export const LANGUAGE_COOKIE_NAME = 'cloudcertify-language';

/**
 * Maps any BCP-47 tag onto a supported Language, or null when unsupported —
 * mirrors the API's LanguageResolver so both ends agree on what "pt" means.
 *
 * @example normalizeLanguage('pt') // 'pt-BR'
 */
export function normalizeLanguage(tag: string | null | undefined): Language | null {
  if (!tag) return null;
  const lower = tag.toLowerCase();
  if (lower === 'pt' || lower.startsWith('pt-')) return 'pt-BR';
  if (lower === 'en' || lower.startsWith('en-')) return 'en-US';
  return null;
}

/** Browser-only detection. Server callers must pass their request's language. */
export function detectLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const cookie = readLanguageCookie();
  if (cookie) return cookie;
  const stored = readStoredLanguage();
  if (stored) return stored;

  const preferences =
    typeof navigator === 'undefined'
      ? []
      : [...(navigator.languages ?? []), navigator.language];
  for (const preference of preferences) {
    const match = normalizeLanguage(preference);
    if (match) return match;
  }
  return DEFAULT_LANGUAGE;
}

export function readLanguageCookie(): Language | null {
  if (typeof document === 'undefined') return null;
  const value = document.cookie.split('; ').find(cookie =>
    cookie.startsWith(`${LANGUAGE_COOKIE_NAME}=`)
  )?.slice(LANGUAGE_COOKIE_NAME.length + 1);
  return LANGUAGES.find(language => language === value) ?? null;
}

export function readStoredLanguage(): Language | null {
  if (typeof window === 'undefined') return null;
  try {
    return normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return null; // storage unavailable (private mode) — fall through to navigator
  }
}

let current: Language | null = null;

/**
 * The language every outgoing request is tagged with. Kept module-level so the
 * axios interceptor can read it without a React context.
 */
export function getCurrentLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  current ??= detectLanguage();
  return current;
}

/** Persists the choice and makes it the language of all later requests. */
export function setCurrentLanguage(language: Language): void {
  if (typeof window === 'undefined') return;
  current = language;
  document.cookie = `${LANGUAGE_COOKIE_NAME}=${language}; Path=/; SameSite=Lax; Max-Age=31536000`;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    /* storage unavailable — the choice still holds for this session */
  }
}
