'use client';

import { useEffect } from 'react';

/**
 * Registers the PWA service worker for offline support and full installability.
 *
 * Safe by design: service workers only run in a secure context (HTTPS, or
 * localhost). Over a plain http:// LAN address (e.g. accessing the dev server
 * from an iPhone) `serviceWorker` is unavailable, so this silently no-ops —
 * "Add to Home Screen" still works via the manifest + apple-touch-icon, you
 * just don't get offline caching until the app is served over HTTPS.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failures are non-fatal — the app works without the SW.
      });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
