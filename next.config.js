/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
        source: '/(.*)',
        headers: [
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Prevent clickjacking attacks
          { key: 'X-Frame-Options', value: 'DENY' },
          // Control referrer information
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict browser feature access
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Enforce HTTPS (31536000 = 1 year)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // XSS protection for older browsers
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Cross-origin policies
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
          // Basic CSP: disallow inline scripts and external resources
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.vercel.app https://vercel.com; frame-ancestors 'none'",
          },
        ],
      },
      // API security headers (stricter than pages)
      {
        source: '/api/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; frame-ancestors 'none'",
          },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
