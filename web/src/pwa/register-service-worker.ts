/** Keep development uncached and defer the worker's download until page load. */
export function registerServiceWorker(): (() => void) | undefined {
  if (
    process.env.NODE_ENV !== 'production' ||
    typeof window === 'undefined' ||
    !window.isSecureContext ||
    !('serviceWorker' in navigator)
  ) {
    return;
  }

  const register = () => {
    void navigator.serviceWorker
      .register('/service-worker.js', { scope: '/', updateViaCache: 'none' })
      .catch((error: unknown) => {
        console.warn('CloudCertify offline support could not be registered.', error);
      });
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }
}
