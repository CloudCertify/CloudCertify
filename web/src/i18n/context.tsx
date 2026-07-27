import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { en, type Messages } from './messages/en';
import { pt } from './messages/pt';
import {
  DEFAULT_LANGUAGE,
  getCurrentLanguage,
  setCurrentLanguage,
  type Language
} from './language';
import { registerLanguageInterceptor } from './interceptor';

const MESSAGES: Record<Language, Messages> = {
  'en-US': en,
  'pt-BR': pt
};

type I18nContextValue = {
  language: Language;
  /** Persists the choice, retags requests, and refetches server content. */
  setLanguage: (language: Language) => void;
  /** Copy for the current language. */
  t: Messages;
};

/**
 * Rendering outside a provider (isolated component tests) falls back to EN-US
 * rather than throwing — copy is never load-bearing enough to crash a tree.
 */
const FALLBACK: I18nContextValue = {
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: MESSAGES[DEFAULT_LANGUAGE]
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => getCurrentLanguage());
  const queryClient = useQueryClient();

  useEffect(() => {
    registerLanguageInterceptor();
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback(
    (next: Language) => {
      if (next === language) return;
      setCurrentLanguage(next);
      setLanguageState(next);
      // Cached quiz content was fetched under the old Accept-Language.
      queryClient.invalidateQueries();
    },
    [language, queryClient]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t: MESSAGES[language] }),
    [language, setLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext) ?? FALLBACK;
}
