import { vi } from 'vitest';

export const navigation = {
  pathname: '/',
  params: {} as Record<string, string>,
  searchParams: new URLSearchParams(),
  history: ['/'],
  push: vi.fn((href: string) => {
    navigation.history.push(href);
  }),
  replace: vi.fn((href: string) => {
    navigation.history.splice(-1, 1, href);
  }),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn()
};

export function resetNavigation(path = '/', params: Record<string, string> = {}) {
  const url = new URL(path, 'https://cloudcertify.test');
  navigation.pathname = url.pathname;
  navigation.searchParams = url.searchParams;
  navigation.params = params;
  navigation.history = [path];
  navigation.push.mockClear();
  navigation.replace.mockClear();
  navigation.refresh.mockClear();
  navigation.back.mockClear();
  navigation.forward.mockClear();
  navigation.prefetch.mockClear();
  return navigation;
}
