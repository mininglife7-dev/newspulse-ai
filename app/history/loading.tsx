/**
 * Route-transition skeleton for /history — mirrors the destination layout
 * (header + action buttons + table rows). Without this, the root
 * loading.tsx would flash the search page's hero/search-bar shapes here.
 */
export default function HistoryLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-9 w-64 animate-pulse rounded-lg bg-card" />
          <div className="h-4 w-80 animate-pulse rounded bg-card" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-card" />
          <div className="h-9 w-32 animate-pulse rounded-lg bg-card" />
        </div>
      </header>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg border border-border/60 bg-card"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
