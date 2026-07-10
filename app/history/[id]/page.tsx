import Link from 'next/link';
import { notFound } from 'next/navigation';
import NewsCard from '@/components/NewsCard';
import LocalDateTime from '@/components/LocalDateTime';
import { SUMMARY_MODEL } from '@/lib/constants';
import { getSupabaseAdmin, type SearchHistoryRow } from '@/lib/supabase';
import { translate, translatePlural } from '@/lib/i18n';
import { getServerLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: { id: string };
}

/**
 * Returns the saved search, or null when it genuinely doesn't exist.
 * Database failures throw so the error boundary renders — a DB outage
 * must not be presented to the user as "Page not found".
 */
async function getSearchById(id: string): Promise<SearchHistoryRow | null> {
  const demoMode = process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1';
  if (demoMode) {
    // In demo mode, individual saved searches don't exist
    return null;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('news_searches')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      // 22P02 = malformed UUID — such an id can't exist, so it's a real 404.
      if (error.code === '22P02') return null;
      console.error('[history/[id]] supabase error:', error);
      throw new Error(`Failed to load saved search: ${error.message}`);
    }
    return (data as SearchHistoryRow) ?? null;
  } catch (err: any) {
    // If Supabase is not configured, return null (404)
    if (err?.message?.includes('NEXT_PUBLIC_SUPABASE_URL') || err?.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return null;
    }
    throw err;
  }
}

export default async function HistoryDetailPage({ params }: PageProps) {
  const entry = await getSearchById(params.id);
  if (!entry) notFound();

  const locale = getServerLocale();
  const articles = Array.isArray(entry.results) ? entry.results : [];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/history"
          className="inline-flex w-fit items-center gap-1 text-sm text-white/50 transition hover:text-accent-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          {translate(locale, 'detail.allSearches')}
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-accent-400">
              {translate(locale, 'detail.savedSearch')}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
              {entry.keyword}
            </h1>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-2 text-right">
            <p className="text-xs text-white/40">
              {translate(locale, 'detail.runOn')}
            </p>
            <p className="text-sm font-medium text-white/90">
              <LocalDateTime iso={entry.created_at} />
            </p>
          </div>
        </div>

        <p className="text-sm text-white/50">
          {translatePlural(locale, 'detail.articlesCaptured', articles.length, {
            model: SUMMARY_MODEL,
          })}
        </p>
      </header>

      {articles.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, i) => (
            <NewsCard
              key={(article.url || '') + i}
              article={article}
              index={i}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-white/40">
          {translate(locale, 'detail.noResultsSaved')}
        </div>
      )}

      <div className="flex justify-center pt-6">
        <Link
          href={`/?q=${encodeURIComponent(entry.keyword)}`}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-accent-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent-900/40 transition hover:from-accent-400 hover:to-indigo-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9" />
            <path d="M3 4v5h5" />
          </svg>
          {translate(locale, 'detail.rerun')}
        </Link>
      </div>
    </div>
  );
}
