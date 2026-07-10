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
          className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-5 py-2 text-sm font-semibold text-white transition hover:shadow-lg hover:shadow-blue-500/40"
        >
          Back to home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-2 text-sm text-white/80 transition hover:border-cyan-500/60 hover:text-white"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
