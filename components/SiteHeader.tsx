'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Search, History as HistoryIcon, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n/I18nProvider';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';

/**
 * Localized, keyboard-accessible site header. The active route is marked with
 * aria-current so screen readers announce the current page.
 */
export default function SiteHeader() {
  const { t } = useI18n();
  const pathname = usePathname();

  const links = [
    { href: '/', label: t('common.search'), Icon: Search },
    { href: '/history', label: t('common.history'), Icon: HistoryIcon },
    { href: '/dashboard', label: t('common.dashboard'), Icon: BarChart3 },
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2" aria-label={t('common.appName')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-indigo-600 glow">
            <Zap className="h-4 w-4 text-white" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            <span className="gradient-text">NewsPulse</span>
            <span className="text-white/90"> {t('nav.brandSuffix')}</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm" aria-label={t('common.appName')}>
          {links.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-2 transition hover:bg-card hover:text-white',
                isActive(href) ? 'bg-card text-white' : 'text-white/70'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
