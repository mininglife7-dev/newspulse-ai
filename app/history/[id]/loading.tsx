/**
 * Route-transition skeleton for /history/[id] — mirrors the destination
 * layout (back link, title block, date chip, article card grid).
 */
export default function HistoryDetailLoading() {
  return (
    <div className="flex flex-col gap-8" role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      <header className="flex flex-col gap-3">
        <div className="h-4 w-28 animate-pulse rounded bg-card" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="h-3 w-24 animate-pulse rounded bg-card" />
            <div className="h-9 w-72 animate-pulse rounded-lg bg-card" />
          </div>
          <div className="h-14 w-44 animate-pulse rounded-lg border border-border bg-card" />
        </div>
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-card" />
      </header>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-52 animate-pulse rounded-xl border border-border/60 bg-card"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
