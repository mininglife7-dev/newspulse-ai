import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="text-7xl font-black tracking-tight">
        <span className="gradient-text">404</span>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white">Page not found</h1>
        <p className="mt-2 max-w-md text-sm text-white/60">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-lg bg-gradient-to-br from-accent-500 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-accent-900/40 transition hover:from-accent-400 hover:to-indigo-500"
        >
          Start a new search
        </Link>
        <Link
          href="/history"
          className="rounded-lg border border-border bg-card px-5 py-2 text-sm text-white/80 transition hover:border-accent-500/60 hover:text-white"
        >
          View history
        </Link>
      </div>
    </div>
  );
}
