import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const request = vi.hoisted(() => ({
  cookie: vi.fn(),
  header: vi.fn()
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: request.cookie }),
  headers: async () => ({ get: request.header })
}));

import { getRequestLanguage, resolveRequestLanguage } from './server';

describe('request language', () => {
  beforeEach(() => vi.resetAllMocks());

  it.each([
    ['pt-BR', 'en-US', 'pt-BR'],
    ['en-US', 'pt-BR', 'en-US'],
    ['invalid', 'fr;q=1, pt;q=0.4, en;q=0.8', 'en-US'],
    [undefined, 'fr, en;q=0.2, pt-PT;q=0.9', 'pt-BR'],
    [undefined, 'pt;q=0, en;q=0.5', 'en-US'],
    [undefined, 'pt;q=invalid, en;q=0.1', 'en-US'],
    [undefined, 'pt;q=2, en;q=0.1', 'en-US'],
    [undefined, 'pt;q=0.8, en;q=0.8', 'pt-BR'],
    [undefined, 'de, *', 'en-US'],
    [undefined, null, 'en-US']
  ])('resolves cookie %s and header %s to %s', (cookie, header, expected) => {
    expect(resolveRequestLanguage(cookie, header)).toBe(expected);
  });

  it('reads the language cookie before consulting headers', async () => {
    request.cookie.mockReturnValue({ value: 'pt-BR' });
    expect(await getRequestLanguage()).toBe('pt-BR');
    expect(request.cookie).toHaveBeenCalledWith('cloudcertify-language');
    expect(request.header).not.toHaveBeenCalled();
  });

  it('keeps successive requests isolated', async () => {
    request.cookie.mockReturnValueOnce({ value: 'pt-BR' }).mockReturnValueOnce(undefined);
    request.header.mockReturnValue('en-US');
    expect(await getRequestLanguage()).toBe('pt-BR');
    expect(await getRequestLanguage()).toBe('en-US');
    expect(request.header).toHaveBeenCalledWith('accept-language');
  });
});
