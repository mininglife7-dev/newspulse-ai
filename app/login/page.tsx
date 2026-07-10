'use client';

import { Suspense, useCallback, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogIn, UserPlus, Loader2, MailCheck } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const submit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);

      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        setError('Enter your email and password.');
        return;
      }
      if (mode === 'signup' && password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }

      setLoading(true);
      try {
        const supabase = createSupabaseBrowserClient();
        if (mode === 'signup') {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: trimmedEmail,
            password,
          });
          if (signUpError) throw signUpError;
          // If email confirmation is on, there is no active session yet.
          if (!data.session) {
            setCheckEmail(true);
            return;
          }
        } else {
          const { error: signInError } =
            await supabase.auth.signInWithPassword({
              email: trimmedEmail,
              password,
            });
          if (signInError) throw signInError;
        }
        // Full navigation so the server re-reads the refreshed session cookie.
        router.replace(redirectTo);
        router.refresh();
      } catch (err: any) {
        setError(
          friendlyAuthError(err?.message) ||
            'Something went wrong. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    },
    [email, password, mode, redirectTo, router]
  );

  if (checkEmail) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
        <MailCheck className="mx-auto h-10 w-10 text-emerald-400" />
        <h2 className="mt-3 text-lg font-semibold">Check your email</h2>
        <p className="mt-1 text-sm text-white/60">
          We sent a confirmation link to <strong>{email}</strong>. Click it to
          activate your account, then sign in.
        </p>
        <button
          onClick={() => {
            setCheckEmail(false);
            setMode('signin');
          }}
          className="mt-4 text-sm text-accent-300 hover:text-accent-200"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="mb-5 flex rounded-lg border border-border/60 p-1 text-sm">
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setError(null);
          }}
          className={`flex-1 rounded-md px-3 py-2 font-medium transition ${
            mode === 'signin'
              ? 'bg-accent-500/20 text-accent-200'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setError(null);
          }}
          className={`flex-1 rounded-md px-3 py-2 font-medium transition ${
            mode === 'signup'
              ? 'bg-accent-500/20 text-accent-200'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Create account
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-white/70">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-white outline-none transition focus:border-accent-500/60"
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-white/70">Password</span>
          <input
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-white outline-none transition focus:border-accent-500/60"
            placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
            required
          />
        </label>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-accent-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-accent-400 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === 'signup' ? (
            <UserPlus className="h-4 w-4" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          {mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

/** Map raw Supabase auth errors to calm, non-leaky messages. */
function friendlyAuthError(message?: string): string | null {
  if (!message) return null;
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials'))
    return 'Incorrect email or password.';
  if (m.includes('already registered') || m.includes('already exists'))
    return 'That email already has an account. Try signing in.';
  if (m.includes('email not confirmed'))
    return 'Please confirm your email first, then sign in.';
  if (m.includes('rate limit')) return 'Too many attempts. Please wait a moment.';
  return message;
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome to <span className="gradient-text">NewsPulse AI</span>
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Sign in to save your searches and see your own history.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="h-64 animate-pulse rounded-2xl border border-border/60 bg-card" />
        }
      >
        <LoginForm />
      </Suspense>
      <p className="mt-4 text-center text-xs text-white/40">
        You can also{' '}
        <Link href="/" className="text-accent-300 hover:text-accent-200">
          try a search without an account
        </Link>
        .
      </p>
    </div>
  );
}
