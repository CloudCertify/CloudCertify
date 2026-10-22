import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const origin = 'https://cloudcertify.test';
const source = readFileSync(resolve('public/service-worker.js'), 'utf8');

type LifetimeEvent = { waitUntil: (promise: Promise<unknown>) => void };
type NavigationEvent = {
  request: { url: string; mode: string; method: string; headers: Headers };
  preloadResponse: Promise<Response | undefined>;
  respondWith: (promise: Promise<Response>) => void;
};

function worker() {
  const handlers = new Map<string, (event: LifetimeEvent | NavigationEvent) => void>();
  const cache = {
    put: vi.fn().mockResolvedValue(undefined),
    match: vi.fn<() => Promise<Response | undefined>>().mockResolvedValue(new Response('<h1>Connection unavailable</h1>'))
  };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue(['cloudcertify-offline-v0', 'cloudcertify-offline-v1', 'other-app-cache']),
    delete: vi.fn().mockResolvedValue(true)
  };
  const fetch = vi.fn<(request: Request | NavigationEvent['request']) => Promise<Response>>().mockResolvedValue(new Response('<meta name="cloudcertify-offline" content="1" />', {
    headers: { 'Content-Type': 'text/html' }
  }));
  const skipWaiting = vi.fn();
  const claim = vi.fn();
  const enable = vi.fn().mockResolvedValue(undefined);
  const self = {
    location: { origin },
    registration: { navigationPreload: { enable } },
    clients: { claim },
    skipWaiting,
    addEventListener: (name: string, handler: (event: LifetimeEvent | NavigationEvent) => void) => {
      handlers.set(name, handler);
    }
  };
  // The browser resolves relative Request URLs against the worker's origin.
  class WorkerRequest extends Request {
    constructor(input: string, options?: RequestInit) {
      super(new URL(input, origin), options);
    }
  }
  runInNewContext(source, { self, caches, fetch, Request: WorkerRequest, Response, URL });

  const lifecycle = (name: 'install' | 'activate') => {
    const waitUntil = vi.fn<(promise: Promise<unknown>) => void>();
    handlers.get(name)?.({ waitUntil });
    return waitUntil.mock.calls[0][0];
  };
  const navigate = (path: string, overrides: Partial<NavigationEvent['request']> = {}, preload?: Response) => {
    const respondWith = vi.fn<(promise: Promise<Response>) => void>();
    handlers.get('fetch')?.({
      request: { url: new URL(path, origin).href, method: 'GET', mode: 'navigate', headers: new Headers(), ...overrides },
      preloadResponse: Promise.resolve(preload),
      respondWith
    });
    return respondWith;
  };
  return { lifecycle, navigate, cache, caches, fetch, skipWaiting, claim, enable, self };
}

describe('shipped service worker', () => {
  it('precaches only the offline document without credentials, and never forces activation', async () => {
    const sw = worker();
    await sw.lifecycle('install');
    const request = sw.fetch.mock.calls[0][0] as Request;
    expect(request.url).toBe(`${origin}/offline.html`);
    expect(request.cache).toBe('reload');
    expect(request.credentials).toBe('omit');
    expect(sw.fetch).toHaveBeenCalledOnce();
    expect(sw.cache.put).toHaveBeenCalledExactlyOnceWith('/offline.html', expect.any(Response));
    expect(sw.skipWaiting).not.toHaveBeenCalled();
    expect(sw.claim).not.toHaveBeenCalled();
  });

  it.each([
    new Response('missing', { status: 404 }),
    new Response('{}', { headers: { 'Content-Type': 'application/json' } }),
    new Response('<html>SPA rewrite</html>', { headers: { 'Content-Type': 'text/html' } }),
    Object.defineProperty(new Response('login', { headers: { 'Content-Type': 'text/html' } }), 'redirected', { value: true })
  ])('rejects an invalid offline document instead of installing it', async (response) => {
    const sw = worker();
    sw.fetch.mockResolvedValue(response);
    await expect(sw.lifecycle('install')).rejects.toThrow('Offline document unavailable');
    expect(sw.cache.put).not.toHaveBeenCalled();
  });

  it('cleans only obsolete offline caches and enables parallel navigation loading', async () => {
    const sw = worker();
    await sw.lifecycle('activate');
    expect(sw.caches.delete).toHaveBeenCalledExactlyOnceWith('cloudcertify-offline-v0');
    expect(sw.enable).toHaveBeenCalledOnce();
    expect(sw.skipWaiting).not.toHaveBeenCalled();
    expect(sw.claim).not.toHaveBeenCalled();
  });

  it('activates in browsers without navigation preload', async () => {
    const sw = worker();
    Reflect.deleteProperty(sw.self.registration, 'navigationPreload');
    await expect(sw.lifecycle('activate')).resolves.toBeUndefined();
  });

  it('does not fail activation when optional navigation preload fails', async () => {
    const sw = worker();
    sw.enable.mockRejectedValueOnce(new Error('preload unavailable'));
    await expect(sw.lifecycle('activate')).resolves.toBeUndefined();
  });

  it('keeps a network failure from replacing the current worker', async () => {
    const sw = worker();
    sw.fetch.mockRejectedValueOnce(new TypeError('offline'));
    await expect(sw.lifecycle('install')).rejects.toThrow('offline');
    expect(sw.cache.put).not.toHaveBeenCalled();
    expect(sw.skipWaiting).not.toHaveBeenCalled();
  });

  it.each(['/', '/quiz', '/quiz/1', '/quiz/1/session', '/quiz/1/drill/2/session', '/dashboard', '/progress/'])('serves an offline fallback for %s without caching the navigation', async (path) => {
    const sw = worker();
    sw.fetch.mockRejectedValue(new TypeError('offline'));
    const respondWith = sw.navigate(path);
    const response = await respondWith.mock.calls[0][0];
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.text()).toContain('Connection unavailable');
    expect(sw.cache.put).not.toHaveBeenCalled();
  });

  it('uses navigation preload without a second network request', async () => {
    const sw = worker();
    const preload = new Response('preloaded document');
    const response = await sw.navigate('/quiz', {}, preload).mock.calls[0][0];
    expect(response).toBe(preload);
    expect(sw.fetch).not.toHaveBeenCalled();
    expect(sw.caches.open).not.toHaveBeenCalled();
  });

  it.each([200, 401, 404, 500])('preserves online HTTP %s responses without caching or disguising errors', async (status) => {
    const sw = worker();
    const online = new Response('server document', { status });
    sw.fetch.mockResolvedValue(online);
    expect(await sw.navigate('/dashboard').mock.calls[0][0]).toBe(online);
    expect(sw.caches.open).not.toHaveBeenCalled();
    expect(sw.cache.put).not.toHaveBeenCalled();
  });

  it.each([
    ['/quiz/1/answer', {}],
    ['/me', {}],
    ['/api/quiz', {}],
    ['/auth/callback?token=secret', {}],
    ['/assets/app.js', {}],
    ['https://api.example.test/quiz', {}],
    ['/quiz', { mode: 'cors' }],
    ['/quiz', { method: 'POST' }],
    ['/quiz', { headers: new Headers({ Authorization: 'Bearer secret' }) }]
  ])('leaves private, API, asset, and non-GET requests to the browser: %s %j', (path, overrides) => {
    const sw = worker();
    expect(sw.navigate(path, overrides)).not.toHaveBeenCalled();
    expect(sw.fetch).not.toHaveBeenCalled();
    expect(sw.caches.open).not.toHaveBeenCalled();
  });

  it('returns a network error when the offline cache was evicted', async () => {
    const sw = worker();
    sw.fetch.mockRejectedValue(new TypeError('offline'));
    sw.cache.match.mockResolvedValue(undefined);
    const response = await sw.navigate('/').mock.calls[0][0];
    expect(response.type).toBe('error');
  });
});
