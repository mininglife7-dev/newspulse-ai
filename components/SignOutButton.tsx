'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { signOut } from '@/lib/auth';

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      await signOut();
    } catch (err) {
      console.error('[signout]', err);
    }
    // Full navigation so the server re-renders the header without a session.
    window.location.href = '/';
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white/70 transition hover:border-slate-500 hover:text-white disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
