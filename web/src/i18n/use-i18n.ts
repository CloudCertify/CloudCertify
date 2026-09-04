import { useContext } from 'react';
import { FALLBACK_I18N, I18nContext, type I18nContextValue } from './i18n-context';

export function useI18n(): I18nContextValue {
  return useContext(I18nContext) ?? FALLBACK_I18N;
}
