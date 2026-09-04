import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { I18nContext, MESSAGES, type I18nContextValue } from './i18n-context';
import { registerLanguageInterceptor } from './interceptor';
import {
  getCurrentLanguage,
  setCurrentLanguage,
  type Language
} from './language';

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
