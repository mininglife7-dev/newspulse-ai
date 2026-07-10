'use client';

import { ExternalLink } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import { useI18n } from '@/components/i18n/I18nProvider';
import type { NewsArticle } from '@/lib/supabase';

interface NewsCardProps {
  article: NewsArticle;
  index?: number;
}

export default function NewsCard({ article, index = 0 }: NewsCardProps) {
  const { t, locale } = useI18n();
  const { title, url, source, date, ai_summary } = article;

  return (
    <article
      className="group flex h-full flex-col gap-3 rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-500/60 hover:bg-cardHover hover:shadow-lg hover:shadow-accent-900/30 animate-fade-in"
      style={{ animationDelay: `${Math.min(index * 60, 600)}ms` }}
    >
      {/* Source + Date */}
      <header className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-900/30 px-2.5 py-1 font-medium text-accent-300 ring-1 ring-inset ring-accent-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
          {source}
        </span>
        {date && (
          <time
            dateTime={date}
            className="text-white/40 tabular-nums"
            title={new Date(date).toLocaleString(locale)}
          >
            {formatRelativeDate(date, locale)}
          </time>
        )}
      </header>

      {/* Title (clickable link) */}
      <h3 className="text-base font-semibold leading-snug">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white transition-colors hover:text-accent-300 group-hover:text-accent-200"
        >
          {title}
        </a>
      </h3>

      {/* AI Summary — explicitly labelled as machine-generated (transparency) */}
      <div className="flex flex-col gap-1">
        <span className="inline-flex w-fit items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/40 ring-1 ring-inset ring-white/10">
          {t('card.aiSummary')}
        </span>
        <p className="text-sm leading-relaxed text-white/70">{ai_summary}</p>
      </div>

      {/* Footer / URL */}
      <footer className="mt-auto flex items-center justify-between border-t border-border/60 pt-3 text-xs">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="max-w-[80%] truncate text-white/40 transition-colors hover:text-accent-300"
          title={url}
        >
          {url}
        </a>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-accent-600/20 px-2 py-1 font-medium text-accent-300 ring-1 ring-inset ring-accent-500/30 transition hover:bg-accent-600/40 hover:text-white"
          aria-label={t('card.openInNewTab')}
        >
          {t('card.read')}
          <ExternalLink className="h-3 w-3" strokeWidth={2.5} />
        </a>
      </footer>
    </article>
  );
}
