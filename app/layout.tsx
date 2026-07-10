import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { HeaderNav } from '@/components/HeaderNav';
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
  // PWA: manifest is served by app/manifest.ts; these fields make iOS Safari
  // treat the app as an installable standalone Home Screen app.
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'EURO AI',
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
            <HeaderNav />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <ServiceWorkerRegister />
        <footer className="mt-20 border-t border-slate-800/50 py-8 text-center text-sm text-slate-400">
          <p>
            EURO AI · Making AI governance simple, beautiful, and trustworthy
          </p>
        </footer>
      </body>
    </html>
  );
}
