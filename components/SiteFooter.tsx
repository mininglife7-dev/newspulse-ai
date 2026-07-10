'use client';

import Link from 'next/link';
import { useI18n } from '@/components/i18n/I18nProvider';

/** Localized site footer with legal links. */
export default function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="mt-16 border-t border-border/60 py-6 text-center text-sm text-white/40">
      <p className="mb-3">
        {t('footer.builtWith')}{' '}
        <span className="text-accent-400">{t('common.appName')}</span>
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link href="/privacy" className="hover:text-white/60 transition">
          {t('footer.privacy')}
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms" className="hover:text-white/60 transition">
          {t('footer.terms')}
        </Link>
      </div>
    </footer>
  );
}
