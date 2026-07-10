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
import { useI18n } from '@/components/i18n/I18nProvider';
import { cn, formatAbsoluteDate } from '@/lib/utils';
import type { SearchHistoryRow } from '@/lib/supabase';

export default function HistoryPage() {
  const { t } = useI18n();
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
        throw new Error(json.error || t('history.failed', { status: res.status }));
      }
      setHistory((json.history ?? []) as SearchHistoryRow[]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || t('history.failedLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

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

  // Deployments can protect destructive endpoints with ADMIN_TOKEN; when the
  // server answers 401, ask once for the token and retry with it.
  const deleteWithAuth = useCallback(async (url: string) => {
    const stored = sessionStorage.getItem('newspulse_admin_token');
    const headers: HeadersInit = stored
      ? { Authorization: `Bearer ${stored}` }
      : {};
    let res = await fetch(url, { method: 'DELETE', headers });
    if (res.status === 401) {
      const entered = prompt(t('history.adminTokenPrompt'));
      if (entered) {
        sessionStorage.setItem('newspulse_admin_token', entered);
        res = await fetch(url, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${entered}` },
        });
      }
    }
    return res;
  }, [t]);

  const handleDeleteOne = useCallback(
    async (id: string) => {
      const res = await deleteWithAuth(`/api/history/${id}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(
          json.error || t('history.deleteFailed', { status: res.status })
        );
      }
      setHistory((prev) => prev.filter((entry) => entry.id !== id));
      setExpanded((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [deleteWithAuth, t]
  );

  const handleClearAll = useCallback(async () => {
    if (!confirm(t('history.confirmClearAll', { count: history.length }))) {
      return;
    }
    setClearing(true);
    try {
      const res = await deleteWithAuth('/api/history');
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(
          json.error || t('history.deleteFailed', { status: res.status })
        );
      }
      setHistory([]);
      setExpanded(new Set());
    } catch (err: any) {
      console.error(err);
      alert(err?.message || t('history.failedClear'));
    } finally {
      setClearing(false);
    }
  }, [history.length, deleteWithAuth, t]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <HistoryIcon className="h-7 w-7 text-accent-400" aria-hidden="true" />
            <span className="gradient-text">{t('history.title')}</span>
          </h1>
          <p className="mt-1 text-sm text-white/50">{t('history.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            title={t('history.refreshTitle')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-white/80 transition hover:border-accent-500/60 hover:text-white disabled:cursor-wait disabled:opacity-70"
          >
            <RotateCw
              className={cn('h-4 w-4', loading && 'animate-spin')}
              aria-hidden="true"
            />
            {t('history.refresh')}
          </button>
          <button
            onClick={handleClearAll}
            disabled={clearing || loading || history.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-300 transition hover:border-red-400 hover:bg-red-950/60 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {clearing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            )}
            {t('history.clear')}
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300"
        >
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
          title={t('history.emptyTitle')}
          description={t('history.emptyDescription')}
          ctaLabel={t('history.emptyCta')}
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
                <th className="px-4 py-3 font-medium">{t('history.colKeyword')}</th>
                <th className="px-4 py-3 font-medium">{t('history.colDate')}</th>
                <th className="px-4 py-3 font-medium text-center">
                  {t('history.colArticles')}
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  {t('history.colActions')}
                </th>
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
  const { t, locale } = useI18n();
  const [deleting, setDeleting] = useState(false);
  const articles = Array.isArray(entry.results) ? entry.results : [];

  const handleDelete = async () => {
    if (!confirm(t('history.confirmDeleteOne', { keyword: entry.keyword })))
      return;
    setDeleting(true);
    try {
      await onDelete(entry.id);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || t('history.failedDelete'));
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
            aria-expanded={isOpen}
            aria-label={isOpen ? t('history.collapse') : t('history.expand')}
            className="flex h-6 w-6 items-center justify-center rounded text-white/50 transition hover:bg-card hover:text-accent-300"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </td>
        <td className="px-4 py-3 font-medium">
          <Link
            href={`/history/${entry.id}`}
            className="text-white transition hover:text-accent-300"
            title={t('history.openSavedSearch')}
          >
            {entry.keyword}
          </Link>
        </td>
        <td className="px-4 py-3 text-white/60">
          {formatAbsoluteDate(entry.created_at, locale)}
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
              aria-expanded={isOpen}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-white/80 transition hover:border-accent-500/60 hover:text-accent-300"
            >
              {isOpen ? t('history.hide') : t('history.viewResults')}
            </button>
            <Link
              href={`/?q=${encodeURIComponent(entry.keyword)}`}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-white/80 transition hover:border-accent-500/60 hover:text-accent-300"
              title={t('history.rerunTitle')}
            >
              <RotateCw className="h-3 w-3" aria-hidden="true" />
              {t('history.rerun')}
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              aria-label={t('history.deleteAria', { keyword: entry.keyword })}
              title={t('history.deleteTitle')}
              className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-950/30 px-2.5 py-1 text-xs text-red-300 transition hover:border-red-400 hover:bg-red-950/60 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              )}
              {t('history.delete')}
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
                {t('history.noSavedResults')}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
