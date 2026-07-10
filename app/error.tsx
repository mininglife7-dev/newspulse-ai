'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import {
  DEFAULT_LOCALE,
  resolveClientLocale,
  translate,
  type Locale,
} from '@/lib/i18n';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Start at the default locale (matches SSR) and upgrade after mount, so the
  // boundary never depends on the i18n provider — which may be part of what
  // failed — yet still localizes for German visitors.
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    console.error('[NewsPulse error boundary]', error);
    setLocale(resolveClientLocale());
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-950/40 text-red-300 ring-1 ring-inset ring-red-500/30">
        <AlertCircle className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white">
          {translate(locale, 'error.title')}
        </h1>
        <p className="mt-2 max-w-md text-sm text-white/60">
          {error?.message || translate(locale, 'error.body')}
        </p>
        {error?.digest && (
          <p className="mt-2 text-xs text-white/30">
            {translate(locale, 'error.errorId')} <code>{error.digest}</code>
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-gradient-to-br from-accent-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-accent-900/40 transition hover:from-accent-400 hover:to-indigo-500"
        >
          {translate(locale, 'error.tryAgain')}
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-white/80 transition hover:border-accent-500/60 hover:text-white"
        >
          {translate(locale, 'error.backHome')}
        </Link>
      </div>
    </div>
  );
}
