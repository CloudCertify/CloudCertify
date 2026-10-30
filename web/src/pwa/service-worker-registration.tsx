'use client';

import { useEffect } from 'react';

/** Offline fallback only. `navigator.serviceWorker` exists only in secure contexts. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }, []);
  return null;
}
