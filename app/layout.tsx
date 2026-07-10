import type { Metadata } from 'next';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://euro-ai.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'EURO AI — AI Governance Made Simple',
  description:
    'Transform AI governance from compliance checklist into strategic advantage. Meet EU AI Act obligations with confidence.',
  keywords: [
    'AI governance',
    'EU AI Act',
    'compliance',
    'risk management',
    'AI systems',
    'regulatory framework',
  ],
  authors: [{ name: 'EURO AI' }],
  openGraph: {
    title: 'EURO AI — AI Governance Made Simple',
    description:
      'Transform AI governance from compliance checklist into strategic advantage.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={cn(
          'min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white antialiased font-sans'
        )}
      >
        <header className="sticky top-0 z-40 border-b border-slate-800/50 bg-slate-950/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                <Shield className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <span className="text-lg font-bold tracking-tight">
                <span className="text-white">EURO</span>
                <span className="text-cyan-400"> AI</span>
              </span>
            </Link>
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
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <footer className="mt-20 border-t border-slate-800/50 py-8 text-center text-sm text-slate-400">
          <p>
            EURO AI · Making AI governance simple, beautiful, and trustworthy
          </p>
        </footer>
      </body>
    </html>
  );
}
