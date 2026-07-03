import { describe, expect, it } from 'vitest';
import {
  API_BASE_URL,
  buildLoginUrl,
  clearToken,
  getToken,
  getValidToken,
  isTokenExpired,
  parseTokenFromFragment,
  sanitizeReturnTo,
  setToken
} from './token';

function makeJwt(payload: object): string {
  const b64 = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.signature`;
}

const futureExp = Math.floor(Date.now() / 1000) + 3600;
const pastExp = Math.floor(Date.now() / 1000) - 3600;

describe('token storage', () => {
  it('stores, reads and clears the token', () => {
    setToken('abc');
    expect(getToken()).toBe('abc');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it('accepts a token expiring in the future', () => {
    expect(isTokenExpired(makeJwt({ exp: futureExp }))).toBe(false);
  });

  it('rejects an expired token', () => {
    expect(isTokenExpired(makeJwt({ exp: pastExp }))).toBe(true);
  });

  it('rejects a token without exp', () => {
    expect(isTokenExpired(makeJwt({ sub: '1' }))).toBe(true);
  });

  it('rejects malformed tokens', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(true);
    expect(isTokenExpired('a.%%%.c')).toBe(true);
  });
});

describe('getValidToken', () => {
  it('returns a stored valid token', () => {
    const token = makeJwt({ exp: futureExp });
    setToken(token);
    expect(getValidToken()).toBe(token);
  });

  it('drops and clears an expired stored token', () => {
    setToken(makeJwt({ exp: pastExp }));
    expect(getValidToken()).toBeNull();
    expect(getToken()).toBeNull();
  });
});

describe('buildLoginUrl', () => {
  it('builds the provider login URL with returnTo', () => {
    const url = buildLoginUrl('google', 'https://app.example/auth/callback');
    expect(url).toBe(
      `${API_BASE_URL}/auth/google/login?returnTo=${encodeURIComponent(
        'https://app.example/auth/callback'
      )}`
    );
  });

  it('omits returnTo when absent', () => {
    expect(buildLoginUrl('github')).toBe(`${API_BASE_URL}/auth/github/login`);
  });
});

describe('parseTokenFromFragment', () => {
  it('parses a valid fragment', () => {
    expect(parseTokenFromFragment('#token=abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('returns null for a missing token', () => {
    expect(parseTokenFromFragment('')).toBeNull();
    expect(parseTokenFromFragment('#other=1')).toBeNull();
    expect(parseTokenFromFragment('#token=')).toBeNull();
  });
});

describe('sanitizeReturnTo', () => {
  it('accepts same-origin relative paths', () => {
    expect(sanitizeReturnTo('/quiz/3')).toBe('/quiz/3');
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(sanitizeReturnTo('https://evil.example')).toBeNull();
    expect(sanitizeReturnTo('//evil.example')).toBeNull();
    expect(sanitizeReturnTo(null)).toBeNull();
  });
});
