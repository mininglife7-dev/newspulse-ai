'use client';

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type FormEvent,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { Search as SearchIcon, ArrowRight, Sparkles } from 'lucide-react';
import NewsCard from '@/components/NewsCard';
import type { NewsArticle } from '@/lib/supabase';

const SUGGESTIONS = [
  'Artificial Intelligence',
  'Tesla',
  'Bitcoin',
  'Climate change',
  'NASA',
];

export default function HomePage() {
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<NewsArticle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const autoRanRef = useRef(false);

  const runSearch = useCallback(async (q: string) => {
    if (!q) {
      setError('Please enter a keyword to search.');
      return;
    }
    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: q }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Search failed (${res.status})`);
      }
      setResults(json.results as NewsArticle[]);
      if ((json.results as NewsArticle[]).length === 0) {
        setError('No results found. Try a different keyword.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run if URL has ?q=...
  useEffect(() => {
    if (autoRanRef.current) return;
    const q = searchParams.get('q');
    if (q && q.trim()) {
      autoRanRef.current = true;
      setKeyword(q);
      runSearch(q.trim());
    }
  }, [searchParams, runSearch]);

  const handleSearch = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      await runSearch(keyword.trim());
    },
    [keyword, runSearch]
  );

  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="flex flex-col items-center gap-4 pt-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent-500/30 bg-accent-900/20 px-3 py-1 text-xs font-medium text-accent-300">
          <Sparkles className="h-3.5 w-3.5" />
          AI-Powered News Intelligence
        </span>
        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Search. Scrape.{' '}
          <span className="gradient-text">Summarize.</span>
        </h1>
        <p className="max-w-xl text-base text-white/60">
          NewsPulse AI scrapes the latest articles from across the web and
          generates concise, neutral summaries — so you can stay informed in
          seconds.
        </p>
      </section>

      {/* Search Form */}
      <section className="mx-auto w-full max-w-2xl">
        <form
          onSubmit={handleSearch}
          className="group relative flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg shadow-black/20 ring-1 ring-inset ring-white/5 transition focus-within:border-accent-500/60 focus-within:ring-accent-500/30"
        >
          <span className="pl-3 text-white/40">
            <SearchIcon className="h-5 w-5" />
          </span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder='Try "AI regulation", "SpaceX", "climate summit"…'
            className="flex-1 bg-transparent px-2 py-3 text-base text-white placeholder-white/30 outline-none"
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !keyword.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-accent-500 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-accent-900/40 transition hover:from-accent-400 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="spinner" />
                Searching…
              </>
            ) : (
              <>
                Search
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </>
            )}
          </button>
        </form>

        {/* Suggestions */}
        {!searched && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-white/50">
            <span>Suggestions:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setKeyword(s)}
                className="rounded-full border border-border bg-card px-3 py-1 text-white/70 transition hover:border-accent-500/60 hover:text-accent-300"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
      </section>

      {/* Loading skeleton */}
      {loading && (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-xl border border-border/60 bg-card"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </section>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white/90">
              {results.length} result{results.length === 1 ? '' : 's'} for{' '}
              <span className="text-accent-300">"{keyword}"</span>
            </h2>
            <span className="text-xs text-white/40">
              Summaries by gpt-4o-mini
            </span>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((article, i) => (
              <NewsCard key={article.url + i} article={article} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
