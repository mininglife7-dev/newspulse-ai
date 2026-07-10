'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  detectLocale,
  isLocale,
  translate,
  translatePlural,
  type Locale,
  type MessageKey,
  type TranslateParams,
} from '@/lib/i18n';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: TranslateParams) => string;
  tPlural: (base: string, count: number, params?: TranslateParams) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): Locale | null {
  try {
    const cookieMatch = document.cookie.match(
      new RegExp(`(?:^|; )${LOCALE_STORAGE_KEY}=([^;]+)`)
    );
    if (cookieMatch && isLocale(cookieMatch[1])) return cookieMatch[1];
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Private mode / disabled storage — fall through to detection.
  }
  return null;
}

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    // 1-year cookie so the server could honor the preference later too.
    document.cookie = `${LOCALE_STORAGE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Non-fatal: preference just won't persist across reloads.
  }
}

/**
 * Provides the active locale and translation helpers to the tree.
 *
 * SSR and the first client render both use DEFAULT_LOCALE (English) so markup
 * matches and hydration is clean. After mount we upgrade to the stored choice
 * or the browser's language, re-rendering once for German visitors.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const resolved =
      readStoredLocale() ?? detectLocale(navigator.language) ?? DEFAULT_LOCALE;
    if (resolved !== locale) setLocaleState(resolved);
    document.documentElement.lang = resolved;
    // Run once on mount; locale is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
      tPlural: (base, count, params) =>
        translatePlural(locale, base, count, params),
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
