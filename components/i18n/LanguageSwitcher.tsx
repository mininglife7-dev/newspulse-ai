'use client';

import { Languages } from 'lucide-react';
import { useI18n } from './I18nProvider';
import { LOCALES, LOCALE_LABELS } from '@/lib/i18n';

/**
 * Compact EN/DE segmented toggle for the header. Uses real buttons with
 * aria-pressed so it is keyboard- and screen-reader-accessible.
 */
export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className="ml-1 inline-flex items-center gap-0.5 rounded-md border border-border bg-card/60 p-0.5"
      role="group"
      aria-label={t('common.language')}
    >
      <Languages
        className="mx-1 h-3.5 w-3.5 text-white/40"
        aria-hidden="true"
      />
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            aria-label={LOCALE_LABELS[code]}
            className={
              active
                ? 'rounded px-2 py-1 text-xs font-semibold uppercase text-white bg-accent-600/40 ring-1 ring-inset ring-accent-500/40'
                : 'rounded px-2 py-1 text-xs font-medium uppercase text-white/50 transition hover:text-white'
            }
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
