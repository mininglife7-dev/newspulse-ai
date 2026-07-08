import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { Zap, Search, History as HistoryIcon, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://newspulse-ai.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'NewsPulse AI — AI-Powered News Intelligence',
  description:
    'Search. Scrape. Summarize. Real-time AI summaries of news from across the web, with saved search history.',
  keywords: [
    'news',
    'AI',
    'scraper',
    'summarizer',
    'Firecrawl',
    'OpenAI',
    'Supabase',
  ],
  authors: [{ name: 'NewsPulse AI' }],
  openGraph: {
    title: 'NewsPulse AI',
    description: 'AI-Powered News Intelligence — Search. Scrape. Summarize.',
    type: 'website',
  },
  // PWA: manifest is served by app/manifest.ts; these fields make iOS Safari
  // treat the app as an installable standalone Home Screen app named "Governor".
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Governor',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
          'min-h-screen bg-background text-white antialiased font-sans'
        )}
      >
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-indigo-600 glow">
                <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold tracking-tight">
                <span className="gradient-text">NewsPulse</span>
                <span className="text-white/90"> AI</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-white/70 transition hover:bg-card hover:text-white"
              >
                <Search className="h-4 w-4" />
                Search
              </Link>
              <Link
                href="/history"
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-white/70 transition hover:bg-card hover:text-white"
              >
                <HistoryIcon className="h-4 w-4" />
                History
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-white/70 transition hover:bg-card hover:text-white"
              >
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <ServiceWorkerRegister />
        <footer className="mt-16 border-t border-border/60 py-6 text-center text-sm text-white/40">
          <p>
            Built with Next.js · Firecrawl · OpenAI · Supabase ·{' '}
            <span className="text-accent-400">NewsPulse AI</span>
          </p>
        </footer>
      </body>
    </html>
  );
}
