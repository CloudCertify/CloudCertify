import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

type FetchEvent = { request: { mode: string }; respondWith: (response: Promise<Response>) => void };

it('serves the cached offline page only for failed navigations', async () => {
  const handlers = new Map<string, (event: FetchEvent) => void>();
  const offline = new Response('offline page');
  runInNewContext(readFileSync(resolve('public/service-worker.js'), 'utf8'), {
    self: { addEventListener: (name: string, handler: (event: FetchEvent) => void) => handlers.set(name, handler) },
    caches: { match: vi.fn().mockResolvedValue(offline) },
    fetch: vi.fn().mockRejectedValue(new TypeError('offline')),
    Response
  });
  const dispatch = (mode: string) => {
    const respondWith = vi.fn<FetchEvent['respondWith']>();
    handlers.get('fetch')?.({ request: { mode }, respondWith });
    return respondWith;
  };

  expect(dispatch('cors')).not.toHaveBeenCalled();
  expect(await dispatch('navigate').mock.calls[0][0]).toBe(offline);
});
