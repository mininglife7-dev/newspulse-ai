import { ExternalLink } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import type { NewsArticle } from '@/lib/supabase';

interface NewsCardProps {
  article: NewsArticle;
  index?: number;
}

export default function NewsCard({ article, index = 0 }: NewsCardProps) {
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
            title={date}
          >
            {formatRelativeDate(date)}
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

      {/* AI Summary */}
      <p className="text-sm leading-relaxed text-white/70">{ai_summary}</p>

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
          aria-label="Open article in new tab"
        >
          Read
          <ExternalLink className="h-3 w-3" strokeWidth={2.5} />
        </a>
      </footer>
    </article>
  );
}
