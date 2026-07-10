'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DEFAULT_LOCALE,
  resolveClientLocale,
  translate,
  type Locale,
} from '@/lib/i18n';

export default function NotFound() {
  // Localize on the client so this page (which is part of every route's tree)
  // never calls cookies()/headers() server-side — doing so would force all
  // routes to dynamic rendering and forfeit static generation. Starts at the
  // default locale to match SSR, then upgrades after mount.
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  useEffect(() => {
    setLocale(resolveClientLocale());
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="text-7xl font-black tracking-tight">
        <span className="gradient-text">404</span>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white">
          {translate(locale, 'notFound.title')}
        </h1>
        <p className="mt-2 max-w-md text-sm text-white/60">
          {translate(locale, 'notFound.body')}
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-lg bg-gradient-to-br from-accent-500 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-accent-900/40 transition hover:from-accent-400 hover:to-indigo-500"
        >
          {translate(locale, 'notFound.startSearch')}
        </Link>
        <Link
          href="/history"
          className="rounded-lg border border-border bg-card px-5 py-2 text-sm text-white/80 transition hover:border-accent-500/60 hover:text-white"
        >
          {translate(locale, 'notFound.viewHistory')}
        </Link>
      </div>
    </div>
  );
}
