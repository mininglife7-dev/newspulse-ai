import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isLocale, type Locale } from './config';

/**
 * Resolve the active locale for a server component from the persisted cookie.
 *
 * The client provider writes the visitor's choice to a cookie, so server-
 * rendered pages (e.g. /history/[id]) can render in the correct language on
 * first paint instead of flashing English then swapping. Falls back to the
 * default locale when no valid cookie is present.
 */
export function getServerLocale(): Locale {
  const value = cookies().get(LOCALE_STORAGE_KEY)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
