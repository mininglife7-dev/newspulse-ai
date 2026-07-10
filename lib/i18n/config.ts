/**
 * i18n configuration — the single source of truth for supported locales.
 *
 * The app ships English and German. English is the default so that
 * server-rendered markup, SEO metadata, and the deterministic e2e suite all
 * have a stable baseline; German users are auto-detected from their browser
 * (see detectLocale) and can switch explicitly at any time.
 */
export const LOCALES = ['en', 'de'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Cookie + localStorage key the chosen locale is persisted under. */
export const LOCALE_STORAGE_KEY = 'governor.locale';

/** Human-readable names shown in the language switcher. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
