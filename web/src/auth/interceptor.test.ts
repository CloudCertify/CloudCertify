import { beforeAll, describe, expect, it } from 'vitest';
import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { registerAuthInterceptor } from './interceptor';
import { clearToken, setToken } from './token';

function makeJwt(payload: object): string {
  const b64 = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.sig`;
}

// Runs the registered request interceptors against a config, like axios does
// before dispatching, without any network involved.
async function runRequestInterceptors(): Promise<InternalAxiosRequestConfig> {
  let config = {
    headers: new axios.AxiosHeaders(),
    url: 'https://api.example/quiz'
  } as InternalAxiosRequestConfig;
  const handlers: Array<{
    fulfilled?: (c: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
  }> = [];
  (
    axios.interceptors.request as unknown as { forEach: (fn: (h: never) => void) => void }
  ).forEach(h => handlers.push(h as never));
  for (const h of handlers) {
    if (h.fulfilled) config = await h.fulfilled(config);
  }
  return config;
}

beforeAll(() => {
  registerAuthInterceptor();
});

describe('auth request interceptor', () => {
  it('attaches Bearer header when a valid token is stored', async () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    setToken(token);
    const config = await runRequestInterceptors();
    expect(config.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('sends no header when anonymous', async () => {
    clearToken();
    const config = await runRequestInterceptors();
    expect(config.headers.get('Authorization')).toBeFalsy();
  });

  it('sends no header and drops the token when expired', async () => {
    setToken(makeJwt({ exp: Math.floor(Date.now() / 1000) - 3600 }));
    const config = await runRequestInterceptors();
    expect(config.headers.get('Authorization')).toBeFalsy();
    expect(localStorage.getItem('cloudcertify:token')).toBeNull();
  });
});
