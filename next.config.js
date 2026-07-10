/** @type {import('next').NextConfig} */

// Baseline security headers applied to every route.
//
// The CSP is deliberately a SAFE SUBSET: it omits script-src/style-src/default-src
// (which would need nonces to avoid breaking Next's hydration runtime) and only
// sets navigation/embedding directives that cannot break script or style loading:
//   - frame-ancestors 'none' : anti-clickjacking (modern equivalent of XFO)
//   - base-uri 'self'        : blocks <base> tag injection
//   - form-action 'self'     : forms can only post back to this origin
//   - object-src 'none'      : no <object>/<embed> plugins
// A full nonce-based script-src CSP is tracked as a follow-up.
const CSP = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // don't advertise the framework via X-Powered-By
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
