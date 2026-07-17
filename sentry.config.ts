/**
 * Sentry Configuration
 *
 * Centralizes error tracking, performance monitoring, and session replay.
 * Initialized by instrumentation.ts on app startup.
 *
 * Environment: Production (only initialized if SENTRY_DSN is set)
 */

export const sentryConfig = {
  // Data source name from Sentry project settings
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment identifier for error grouping
  environment: process.env.NODE_ENV,

  // Release version for tracking deployments
  release: process.env.NEXT_PUBLIC_RELEASE_VERSION || 'unknown',

  // Tracing configuration for performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay sampling
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Configuration options
  integrations: [
    // Performance monitoring (automatically included)
  ],

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Default tags for all events
  defaultTags: {
    service: 'euro-ai',
    platform: 'vercel',
  },
};
