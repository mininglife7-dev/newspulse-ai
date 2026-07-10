import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { I18nProvider } from '@/components/i18n/I18nProvider';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <I18nProvider>
          <SiteHeader />
          <main id="main-content" className="mx-auto max-w-6xl px-6 py-10">
            {children}
          </main>
          <ServiceWorkerRegister />
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
