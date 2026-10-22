import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from './register-service-worker';

describe('production service worker registration', () => {
  const register = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    register.mockClear();
    vi.stubEnv('PROD', true);
    vi.stubGlobal('isSecureContext', true);
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
    vi.stubGlobal('navigator', { serviceWorker: { register } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('waits for page load, registers once, and bypasses the worker HTTP cache', () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    registerServiceWorker();
    expect(register).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('load'));
    window.dispatchEvent(new Event('load'));
    expect(register).toHaveBeenCalledExactlyOnceWith('/service-worker.js', {
      scope: '/',
      updateViaCache: 'none'
    });
  });

  it('registers if page load already finished', () => {
    registerServiceWorker();
    expect(register).toHaveBeenCalledOnce();
  });

  it('leaves development uncached', () => {
    vi.stubEnv('PROD', false);
    registerServiceWorker();
    expect(register).not.toHaveBeenCalled();
  });

  it('does nothing in insecure or unsupported browsers', () => {
    vi.stubGlobal('isSecureContext', false);
    registerServiceWorker();
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('navigator', {});
    expect(() => registerServiceWorker()).not.toThrow();
    expect(register).not.toHaveBeenCalled();
  });

  it('handles registration failure without throwing into the app', async () => {
    const error = new Error('storage blocked');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    register.mockRejectedValueOnce(error);
    registerServiceWorker();
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith(
      'CloudCertify offline support could not be registered.', error
    ));
  });
});
