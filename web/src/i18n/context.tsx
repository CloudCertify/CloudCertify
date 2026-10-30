'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { I18nContext, type I18nContextValue } from './i18n-context';
import { MESSAGES } from './messages';
import './interceptor';
import {
  DEFAULT_LANGUAGE,
  readLanguageCookie,
  readStoredLanguage,
  setCurrentLanguage,
  type Language
} from './language';

export function LanguageProvider({
  children,
  initialLanguage = DEFAULT_LANGUAGE
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState(initialLanguage);
  const initialized = useRef(false);
  const serverLanguage = useRef(initialLanguage);
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    // The server cannot see the legacy localStorage choice. Migrate it only
    // after hydration, and never override a validated cookie with it.
    const restored = !readLanguageCookie() ? readStoredLanguage() : null;
    const next = restored ?? initialLanguage;
    setCurrentLanguage(next);
    if (next !== initialLanguage) {
      setLanguageState(next);
      void queryClient.invalidateQueries();
      router.refresh();
    }
  }, [initialLanguage, queryClient, router]);

  useEffect(() => {
    if (serverLanguage.current === initialLanguage) return;
    serverLanguage.current = initialLanguage;
    setCurrentLanguage(initialLanguage);
    setLanguageState(initialLanguage);
    void queryClient.invalidateQueries();
  }, [initialLanguage, queryClient]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback(
    (next: Language) => {
      if (next === language) return;
      setCurrentLanguage(next);
      setLanguageState(next);
      // Cached quiz content was fetched under the old Accept-Language.
      void queryClient.invalidateQueries();
      router.refresh();
    },
    [language, queryClient, router]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t: MESSAGES[language] }),
    [language, setLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
