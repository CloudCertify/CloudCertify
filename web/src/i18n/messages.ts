import type { Language } from './language';
import { en, type Messages } from './messages/en';
import { pt } from './messages/pt';

export const MESSAGES: Record<Language, Messages> = {
  'en-US': en,
  'pt-BR': pt
};
