import { beforeAll, describe, expect, it } from 'vitest';
import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '@/http/axios-instance';
import { registerLanguageInterceptor } from './interceptor';
import { setCurrentLanguage } from './language';

async function runRequestInterceptors(): Promise<InternalAxiosRequestConfig> {
  let config = {
    headers: new axios.AxiosHeaders(),
    url: 'https://api.example/quiz'
  } as InternalAxiosRequestConfig;
  const handlers: Array<{
    fulfilled?: (c: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
  }> = [];
  (
    apiClient.interceptors.request as unknown as {
      forEach: (fn: (h: never) => void) => void;
    }
  ).forEach(h => handlers.push(h as never));
  for (const h of handlers) {
    if (h.fulfilled) config = await h.fulfilled(config);
  }
  return config;
}

beforeAll(() => {
  registerLanguageInterceptor();
});

describe('language request interceptor', () => {
  it('tags requests with the chosen language', async () => {
    setCurrentLanguage('pt-BR');
    const config = await runRequestInterceptors();
    expect(config.headers.get('Accept-Language')).toBe('pt-BR');
  });

  it('follows a later switch back to en-US', async () => {
    setCurrentLanguage('en-US');
    const config = await runRequestInterceptors();
    expect(config.headers.get('Accept-Language')).toBe('en-US');
  });
});
