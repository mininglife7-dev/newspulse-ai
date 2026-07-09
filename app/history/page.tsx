'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  RotateCw,
  History as HistoryIcon,
  Search as SearchIcon,
  Loader2,
} from 'lucide-react';
import NewsCard from '@/components/NewsCard';
import EmptyState from '@/components/EmptyState';
import { cn, formatAbsoluteDate } from '@/lib/utils';
import type { SearchHistoryRow } from '@/lib/supabase';

export default function HistoryPage() {
  const [history, setHistory] = useState<SearchHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/history?limit=100', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Failed (${res.status})`);
      }
      setHistory((json.history ?? []) as SearchHistoryRow[]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDeleteOne = useCallback(async (id: string) => {
    const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.error || `Delete failed (${res.status})`);
    }
    setHistory((prev) => prev.filter((entry) => entry.id !== id));
    setExpanded((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleClearAll = useCallback(async () => {
    if (
      !confirm(
        `Delete all ${history.length} saved searches? This can't be undone.`
      )
    ) {
      return;
    }
    setClearing(true);
    try {
      const res = await fetch('/api/history', { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Delete failed (${res.status})`);
      }
      setHistory([]);
      setExpanded(new Set());
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Failed to clear history.');
    } finally {
      setClearing(false);
    }
  }, [history.length]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <HistoryIcon className="h-7 w-7 text-accent-400" />
            <span className="gradient-text">Search History</span>
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Every search you've run on NewsPulse AI, stored in Supabase.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-white/80 transition hover:border-accent-500/60 hover:text-white disabled:opacity-50"
          >
            <RotateCw
              className={cn('h-4 w-4', loading && 'animate-spin')}
            />
            Refresh
          </button>
          <button
            onClick={handleClearAll}
            disabled={clearing || loading || history.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-300 transition hover:border-red-400 hover:bg-red-950/60 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {clearing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Clear History
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg border border-border/60 bg-card"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && history.length === 0 && (
        <EmptyState
          icon={<SearchIcon className="h-6 w-6" />}
          title="No searches yet"
          description="Run your first search and it will show up here."
          ctaLabel="Start searching"
          ctaHref="/"
        />
      )}

      {/* Table */}
      {!loading && history.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-card/60 text-left text-xs uppercase tracking-wider text-white/50">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="px-4 py-3 font-medium">Keyword</th>
                <th className="px-4 py-3 font-medium">Date Searched</th>
                <th className="px-4 py-3 font-medium text-center">
                  Articles Found
                </th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => {
                const isOpen = expanded.has(entry.id);
                return (
                  <Row
                    key={entry.id}
                    entry={entry}
                    isOpen={isOpen}
                    onToggle={() => toggle(entry.id)}
                    onDelete={handleDeleteOne}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------

function Row({
  entry,
  isOpen,
  onToggle,
  onDelete,
}: {
  entry: SearchHistoryRow;
  isOpen: boolean;
  onToggle: () => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const articles = Array.isArray(entry.results) ? entry.results : [];

  const handleDelete = async () => {
    if (!confirm(`Delete the saved search "${entry.keyword}"?`)) return;
    setDeleting(true);
    try {
      await onDelete(entry.id);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Failed to delete search.');
      setDeleting(false);
    }
  };

  return (
    <>
      <tr
        className={cn(
          'border-b border-border/40 transition-colors',
          isOpen ? 'bg-card/70' : 'hover:bg-card/50'
        )}
      >
        <td className="w-10 px-4 py-3">
          <button
            onClick={onToggle}
            aria-label={isOpen ? 'Collapse' : 'Expand'}
            className="flex h-6 w-6 items-center justify-center rounded text-white/50 transition hover:bg-card hover:text-accent-300"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="px-4 py-3 font-medium">
          <Link
            href={`/history/${entry.id}`}
            className="text-white transition hover:text-accent-300"
            title="Open this saved search"
          >
            {entry.keyword}
          </Link>
        </td>
        <td className="px-4 py-3 text-white/60">
          {formatAbsoluteDate(entry.created_at)}
        </td>
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center justify-center rounded-full bg-accent-900/40 px-2.5 py-0.5 text-xs font-medium text-accent-300 ring-1 ring-inset ring-accent-500/20">
            {articles.length}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={onToggle}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-white/80 transition hover:border-accent-500/60 hover:text-accent-300"
            >
              {isOpen ? 'Hide' : 'View Results'}
            </button>
            <Link
              href={`/?q=${encodeURIComponent(entry.keyword)}`}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-white/80 transition hover:border-accent-500/60 hover:text-accent-300"
              title="Re-run this search"
            >
              <RotateCw className="h-3 w-3" />
              Re-run
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              aria-label={`Delete saved search "${entry.keyword}"`}
              title="Delete this saved search"
              className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-950/30 px-2.5 py-1 text-xs text-red-300 transition hover:border-red-400 hover:bg-red-950/60 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              Delete
            </button>
          </div>
        </td>
      </tr>

      {isOpen && (
        <tr className="border-b border-border/40 bg-background/40">
          <td colSpan={5} className="px-4 py-5">
            {articles.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((a, i) => (
                  <NewsCard
                    key={(a.url || '') + i}
                    article={a}
                    index={i}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-white/40">
                No saved results for this search.
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
