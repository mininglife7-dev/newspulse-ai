import { en, type Messages } from './messages/en';
import { de } from './messages/de';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isLocale, type Locale } from './config';

export { LOCALES, LOCALE_LABELS, LOCALE_STORAGE_KEY, DEFAULT_LOCALE, isLocale } from './config';
export type { Locale } from './config';

const CATALOGS: Record<Locale, Messages> = { en, de };

/** Union of every dotted message key, e.g. 'home.searchButton'. */
export type MessageKey = FlattenKeys<Messages>;

type FlattenKeys<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : FlattenKeys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Flatten a nested catalog into { 'a.b.c': 'value' } once, memoized per locale. */
const flatCache = new Map<Locale, Record<string, string>>();

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out[path] = value;
    } else if (value && typeof value === 'object') {
      Object.assign(out, flatten(value as Record<string, unknown>, path));
    }
  }
  return out;
}

function catalog(locale: Locale): Record<string, string> {
  let flat = flatCache.get(locale);
  if (!flat) {
    flat = flatten(CATALOGS[locale] as unknown as Record<string, unknown>);
    flatCache.set(locale, flat);
  }
  return flat;
}

export type TranslateParams = Record<string, string | number>;

/**
 * Translate a dotted key for a locale, interpolating {named} placeholders.
 * Falls back to the English string, then to the raw key, so a missing
 * translation degrades to something readable rather than blank UI.
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: TranslateParams
): string {
  const template = catalog(locale)[key] ?? catalog(DEFAULT_LOCALE)[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
}

/**
 * English and German both use a simple one/other plural split. Given a base
 * key, picks `${base}_one` when count === 1, otherwise `${base}_other`, and
 * always passes `count` through for interpolation.
 */
export function translatePlural(
  locale: Locale,
  base: string,
  count: number,
  params?: TranslateParams
): string {
  const suffix = count === 1 ? '_one' : '_other';
  return translate(locale, `${base}${suffix}` as MessageKey, { count, ...params });
}

/**
 * Resolve a preferred-language hint (navigator.language, an Accept-Language
 * value, or a stored choice) to a supported locale. Anything starting with
 * "de" maps to German; everything else falls back to the default.
 */
export function detectLocale(preferred?: string | null): Locale {
  if (!preferred) return DEFAULT_LOCALE;
  if (isLocale(preferred)) return preferred;
  const primary = preferred.toLowerCase().split(/[-_,;]/)[0]?.trim();
  if (primary && isLocale(primary)) return primary;
  return DEFAULT_LOCALE;
}

/**
 * Resolve the locale on the client WITHOUT depending on React context.
 *
 * The error boundary must render correctly even if the failure is anywhere
 * above it (including the i18n provider), so it can't call useI18n. This reads
 * the persisted cookie, then the browser language, guarded for SSR.
 */
export function resolveClientLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const cookieMatch = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_STORAGE_KEY}=([^;]+)`)
  );
  if (cookieMatch && isLocale(cookieMatch[1])) return cookieMatch[1];
  if (typeof navigator !== 'undefined') return detectLocale(navigator.language);
  return DEFAULT_LOCALE;
}
