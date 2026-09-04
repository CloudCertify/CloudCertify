import { createContext } from 'react';
import { DEFAULT_LANGUAGE, type Language } from './language';
import { en, type Messages } from './messages/en';
import { pt } from './messages/pt';

export const MESSAGES: Record<Language, Messages> = {
  'en-US': en,
  'pt-BR': pt
};

export type I18nContextValue = {
  language: Language;
  /** Persists the choice, retags requests, and refetches server content. */
  setLanguage: (language: Language) => void;
  /** Copy for the current language. */
  t: Messages;
};

/**
 * Rendering outside a provider (isolated component tests) falls back to EN-US
 * rather than throwing because copy should not crash a tree.
 */
export const FALLBACK_I18N: I18nContextValue = {
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: MESSAGES[DEFAULT_LANGUAGE]
};

export const I18nContext = createContext<I18nContextValue | null>(null);
