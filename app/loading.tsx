export default function Loading() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col items-center gap-4 pt-6 text-center">
        <div className="h-6 w-48 animate-pulse rounded-full bg-card" />
        <div className="h-12 w-3/4 max-w-xl animate-pulse rounded-lg bg-card" />
        <div className="h-4 w-2/3 max-w-md animate-pulse rounded bg-card" />
      </section>

      <section className="mx-auto w-full max-w-2xl">
        <div className="h-14 animate-pulse rounded-2xl border border-border bg-card" />
      </section>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-52 animate-pulse rounded-xl border border-border/60 bg-card"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </section>
    </div>
  );
}
