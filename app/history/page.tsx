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
  ExternalLink,
  Loader2,
} from 'lucide-react';
import NewsCard from '@/components/NewsCard';
import EmptyState from '@/components/EmptyState';
import { cn, formatAbsoluteDate } from '@/lib/utils';
import type { SearchHistoryRow } from '@/lib/supabase';

/** localStorage key for the admin token used to authorize destructive actions. */
const ADMIN_TOKEN_KEY = 'newspulse_admin_token';

export default function HistoryPage() {
  const [history, setHistory] = useState<SearchHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Read a stored admin token, or prompt for one. Returns null if the user
  // cancels. Shared by "Clear all" and per-row delete.
  const acquireAdminToken = useCallback((purpose: string): string | null => {
    let token = '';
    try {
      token = window.localStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
    } catch {
      /* localStorage unavailable — fall through to prompt */
    }
    if (!token) {
      const entered = window.prompt(
        `${purpose} is an admin action. Enter the admin token:`
      );
      if (entered == null) return null;
      token = entered.trim();
      if (!token) return null;
      try {
        window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
      } catch {
        /* ignore persistence failure */
      }
    }
    return token;
  }, []);

  // Translate an auth failure into a user-facing message (and forget a bad
  // token so the next attempt re-prompts). Returns null if not an auth error.
  const adminAuthError = useCallback(
    (status: number, json: any): string | null => {
      if (status === 401) {
        try {
          window.localStorage.removeItem(ADMIN_TOKEN_KEY);
        } catch {
          /* ignore */
        }
        return 'Admin token was rejected. Try the action again to re-enter it.';
      }
      if (status === 503) {
        return json?.error || 'Admin actions are disabled on this deployment.';
      }
      return null;
    },
    []
  );

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

  const handleClearAll = useCallback(async () => {
    if (history.length === 0) return;
    const token = acquireAdminToken('Clearing all history');
    if (!token) return;

    if (
      !confirm(
        `Delete all ${history.length} saved searches? This can't be undone.`
      )
    ) {
      return;
    }

    setClearing(true);
    setError(null);
    try {
      const res = await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'x-admin-token': token },
      });
      const json = await res.json().catch(() => ({}));

      const authErr = adminAuthError(res.status, json);
      if (authErr) throw new Error(authErr);
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || `Delete failed (${res.status})`);
      }

      setHistory([]);
      setExpanded(new Set());
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to clear history.');
    } finally {
      setClearing(false);
    }
  }, [history.length, acquireAdminToken, adminAuthError]);

  const handleDeleteOne = useCallback(
    async (id: string, keyword: string) => {
      const token = acquireAdminToken('Deleting a saved search');
      if (!token) return;
      if (
        !confirm(`Delete the saved search “${keyword}”? This can't be undone.`)
      ) {
        return;
      }

      setDeletingId(id);
      setError(null);
      try {
        const res = await fetch(`/api/history/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { 'x-admin-token': token },
        });
        const json = await res.json().catch(() => ({}));

        const authErr = adminAuthError(res.status, json);
        if (authErr) throw new Error(authErr);
        if (!res.ok || !json.ok) {
          throw new Error(json?.error || `Delete failed (${res.status})`);
        }

        setHistory((prev) => prev.filter((r) => r.id !== id));
        setExpanded((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } catch (err: any) {
        console.error(err);
        setError(err?.message || 'Failed to delete search.');
      } finally {
        setDeletingId(null);
      }
    },
    [acquireAdminToken, adminAuthError]
  );

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
            <RotateCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={handleClearAll}
            disabled={clearing || loading || history.length === 0}
            title="Admin action — requires the admin token"
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
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div role="status" aria-live="polite" className="space-y-2">
          <span className="sr-only">Loading search history…</span>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
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
                    onDelete={() => handleDeleteOne(entry.id, entry.keyword)}
                    isDeleting={deletingId === entry.id}
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
  isDeleting,
}: {
  entry: SearchHistoryRow;
  isOpen: boolean;
  onToggle: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const articles = Array.isArray(entry.results) ? entry.results : [];

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
        <td className="px-4 py-3 font-medium text-white">{entry.keyword}</td>
        <td className="px-4 py-3 text-white/60">
          {formatAbsoluteDate(entry.created_at)}
        </td>
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center justify-center rounded-full bg-accent-900/40 px-2.5 py-0.5 text-xs font-medium text-accent-300 ring-1 ring-inset ring-accent-500/20">
            {entry.result_count}
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
              <ExternalLink className="h-3 w-3" />
              Re-run
            </Link>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              title="Delete this search (admin action)"
              aria-label={`Delete saved search: ${entry.keyword}`}
              className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-950/20 px-2.5 py-1 text-xs text-red-300 transition hover:border-red-400 hover:bg-red-950/50 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? (
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
                  <NewsCard key={(a.url || '') + i} article={a} index={i} />
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
