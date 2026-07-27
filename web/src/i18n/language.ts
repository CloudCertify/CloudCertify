/**
 * Language (CONTEXT.md): the locale a Submission is served in. The API fixes it
 * on the Submission from `Accept-Language` at attempt start, so the web app's
 * job is to (1) remember the visitor's choice and (2) send it on every request.
 */

export const LANGUAGES = ['en-US', 'pt-BR'] as const;

export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'en-US';

export const LANGUAGE_STORAGE_KEY = 'cloudcertify:language';

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

/** Stored choice first, then the browser's preferences, then EN-US. */
export function detectLanguage(): Language {
  const stored = normalizeLanguage(readStored());
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

function readStored(): string | null {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY);
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
  current ??= detectLanguage();
  return current;
}

/** Persists the choice and makes it the language of all later requests. */
export function setCurrentLanguage(language: Language): void {
  current = language;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    /* storage unavailable — the choice still holds for this session */
  }
}
