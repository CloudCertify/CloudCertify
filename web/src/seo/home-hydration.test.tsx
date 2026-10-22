import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosAdapter } from 'axios';
import { App } from '@/App';
import { apiClient } from '@/http/axios-instance';
import { setCurrentLanguage } from '@/i18n/language';
import { en } from '@/i18n/messages/en';
import { HomeHydration } from './home-hydration';
import { renderHome } from './render-home';

const originalAdapter = apiClient.defaults.adapter;
const request = vi.fn<AxiosAdapter>(async config => ({
  data: [], status: 200, statusText: 'OK', headers: {}, config
}));
let root: Root | undefined;

beforeEach(() => {
  request.mockClear();
  apiClient.defaults.adapter = request;
  setCurrentLanguage('en-US');
  window.history.replaceState(null, '', '/');
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false, addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}
  })));
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

afterEach(async () => {
  if (root) await act(async () => { root?.unmount(); });
  root = undefined;
  document.body.innerHTML = '';
  apiClient.defaults.adapter = originalAdapter;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('public home prerender', () => {
  it('renders existing copy, visible headings, real counts and links without requests or catalog facts', () => {
    const storageRead = vi.spyOn(Storage.prototype, 'getItem');
    const { body, head } = renderHome();
    const document = new DOMParser().parseFromString(`<html><head>${head}</head><body>${body}</body></html>`, 'text/html');
    const heading = document.querySelector('h1');
    expect(heading?.textContent).toContain(en.home.heroTitleLead);
    expect(document.body.textContent).toContain(en.home.heroSubtitle);
    expect(document.body.textContent).toContain(en.home.features[0].body);
    expect(document.body.textContent).toContain('500+');
    expect(document.querySelector('a[href="/dashboard"]')).not.toBeNull();
    expect(document.querySelector('a[href^="/quiz/"]')).toBeNull();
    for (let element: HTMLElement | null = heading; element; element = element.parentElement) {
      expect(element.style.opacity).not.toBe('0');
    }
    expect(JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}'))
      .toMatchObject({ '@type': 'WebSite', name: 'CloudCertify' });
    expect(request).not.toHaveBeenCalled();
    expect(storageRead).not.toHaveBeenCalled();
  });

  it('hydrates the build snapshot before applying Portuguese, then supports language switching', async () => {
    const { body, head, year } = renderHome();
    document.head.innerHTML = head;
    document.body.innerHTML = `<div id="root">${body}</div>`;
    // The snapshot remains deterministic even if preferences differ from build.
    setCurrentLanguage('pt-BR');
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 0));
    const recover = vi.fn();
    await act(async () => {
      root = hydrateRoot(document.getElementById('root')!,
        <HomeHydration year={year}><App /></HomeHydration>, { onRecoverableError: recover });
    });
    await waitFor(() => { expect(document.documentElement.lang).toBe('pt-BR'); });
    expect(screen.getByRole('button', { name: 'PT: Português' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.title).toContain('certificações em nuvem');
    fireEvent.click(screen.getByRole('button', { name: 'EN: English' }));
    await waitFor(() => { expect(document.documentElement.lang).toBe('en-US'); });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(en.home.heroTitleLead);
    for (let element: HTMLElement | null = screen.getByRole('heading', { level: 1 }); element; element = element.parentElement) {
      expect(element.style.opacity).not.toBe('0');
    }
    expect(document.body.textContent).toContain('500+');
    expect(recover).not.toHaveBeenCalled();
    await waitFor(() => { expect(request).toHaveBeenCalled(); });
    expect(request.mock.calls.every(([config]) => config.url === '/quiz')).toBe(true);
  });
});
