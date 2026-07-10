import Link from 'next/link';
import { cookies } from 'next/headers';
import { LayoutDashboard } from 'lucide-react';
import { createRouteClient } from '@/lib/supabase-server';
import { SignOutButton } from './SignOutButton';

/**
 * Session-aware header navigation (server component).
 * Signed out: Sign In / Start Free. Signed in: Dashboard + Sign out.
 */
export async function HeaderNav() {
  let user: { email?: string } | null = null;

  // Only hit Supabase when a session cookie exists — anonymous visitors
  // (and builds without env) render the signed-out nav with zero network.
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore
    .getAll()
    .some((c) => c.name.startsWith('sb-'));
  if (hasSessionCookie) {
    try {
      const supabase = await createRouteClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      user = null;
    }
  }

  if (user) {
    return (
      <nav className="flex items-center gap-3 text-sm">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-white/70 transition hover:bg-slate-800/60 hover:text-white"
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
        <span className="hidden text-slate-500 sm:inline" title="Signed in">
          {user.email}
        </span>
        <SignOutButton />
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-6 text-sm">
      <Link
        href="/auth/signin"
        className="text-white/70 transition hover:text-white"
      >
        Sign In
      </Link>
      <Link
        href="/auth/signup"
        className="inline-flex items-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-4 py-2 font-medium text-white transition hover:shadow-lg hover:shadow-blue-500/40"
      >
        Start Free
      </Link>
    </nav>
  );
}
