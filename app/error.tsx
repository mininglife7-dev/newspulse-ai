'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report error to Sentry with context
    Sentry.captureException(error, {
      tags: {
        component: 'error-boundary',
        error_type: 'global',
      },
      contexts: {
        react: {
          digest: error.digest,
        },
      },
    });

    // Log to console for local debugging
    console.error('[EURO AI error boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-950/40 text-red-300 ring-1 ring-inset ring-red-500/30">
        <AlertCircle className="h-7 w-7" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
        <p className="mt-2 max-w-md text-sm text-white/60">
          {error?.message ||
            'An unexpected error occurred while loading this page.'}
        </p>
        {error?.digest && (
          <p className="mt-2 text-xs text-white/30">
            Error ID: <code>{error.digest}</code>
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-gradient-to-br from-accent-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-accent-900/40 transition hover:from-accent-400 hover:to-indigo-500"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-white/80 transition hover:border-accent-500/60 hover:text-white"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
