import type { MetadataRoute } from 'next';

// PWA Web App Manifest — served by Next.js at /manifest.webmanifest and
// linked automatically into <head>. This is what makes the app installable
// on the iPhone Home Screen (Safari → Share → Add to Home Screen).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EURO AI',
    short_name: 'EURO AI',
    description: 'AI Governance Made Simple — EU AI Act compliance with confidence.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0f',
    theme_color: '#0a0a0f',
    icons: [
      {
        src: '/icon-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
