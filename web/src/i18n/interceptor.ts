import { apiClient } from '@/http/axios-instance';
import { getCurrentLanguage } from './language';

let registered = false;

/**
 * Tags every request with the chosen `Accept-Language`. The API resolves it
 * once, at attempt start, and fixes it on the Submission — so this header is
 * what decides the Language of a whole Quiz/Subquiz attempt (ADR 0004).
 */
export function registerLanguageInterceptor(): void {
  if (registered) return;
  registered = true;

  apiClient.interceptors.request.use(config => {
    config.headers.set('Accept-Language', getCurrentLanguage());
    return config;
  });
}
