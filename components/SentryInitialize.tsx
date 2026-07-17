'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { sentryConfig } from '@/sentry.config';

/**
 * Sentry Client Initialization
 *
 * This component initializes Sentry on the browser for error tracking,
 * performance monitoring, and session replay.
 */
export function SentryInitialize() {
  useEffect(() => {
    // Only initialize if DSN is configured (production/staging)
    if (!sentryConfig.dsn) {
      return;
    }

    // Initialize Sentry
    Sentry.init(sentryConfig);

    // Capture initial page performance
    Sentry.captureMessage('Page loaded', 'info');
  }, []);

  return null;
}
