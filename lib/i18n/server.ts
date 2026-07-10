import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isLocale, type Locale } from './config';
import { detectLocale } from './index';

/**
 * Resolve the active locale for a server component.
 *
 * Priority: the explicit choice persisted in the cookie, then the browser's
 * Accept-Language header, then the default. Resolving this server-side lets
 * pages render in the visitor's language on first paint — correct SEO and no
 * English→German flash for German visitors — instead of only swapping after
 * hydration.
 */
export function getServerLocale(): Locale {
  const cookieValue = cookies().get(LOCALE_STORAGE_KEY)?.value;
  if (isLocale(cookieValue)) return cookieValue;

  const acceptLanguage = headers().get('accept-language');
  if (acceptLanguage) return detectLocale(acceptLanguage);

  return DEFAULT_LOCALE;
}
