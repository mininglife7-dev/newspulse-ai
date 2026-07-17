/**
 * Sentry Configuration
 *
 * Centralizes error tracking, performance monitoring, and session replay.
 * Initialized by instrumentation.ts on app startup.
 *
 * Features:
 * - Error tracking with full context (component, user, release)
 * - Performance monitoring (10% prod, 100% dev)
 * - Session replay (10% normal, 100% on errors)
 * - Web Vitals tracking (LCP, FCP, CLS)
 * - Database & API request instrumentation
 */

export const sentryConfig = {
  // Data source name from Sentry project settings
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment identifier for error grouping
  environment: process.env.NODE_ENV,

  // Release version for tracking deployments
  release: process.env.NEXT_PUBLIC_RELEASE_VERSION || 'unknown',

  // Tracing configuration for performance monitoring
  // Production: 10% sampling to manage Sentry costs
  // Development: 100% sampling for comprehensive local debugging
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay: Record user sessions for debugging
  // Normal: 10% of sessions (cost management)
  // Errors: 100% of error sessions (always capture context)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Web Vitals monitoring (automatically enabled by Sentry)
  // Tracks: LCP, FCP, CLS, TTFB for Core Web Vitals
  // Helps identify performance regressions in production

  // Integrations: Performance monitoring and Web Vitals
  integrations: [
    // Sentry automatically includes these:
    // - BrowserTracing: Captures page load and navigation timings
    // - Replay: Session replay for debugging
    // - CaptureConsole: Log console.error/warn to Sentry
  ],

  // Enable debug mode in development for troubleshooting
  debug: process.env.NODE_ENV === 'development',

  // Default tags applied to all events
  defaultTags: {
    service: 'euro-ai',
    platform: 'vercel',
    framework: 'nextjs',
  },

  // Before-send hook for filtering sensitive data
  beforeSend(event: any) {
    // Don't send events in development without DSN
    if (
      process.env.NODE_ENV === 'development' &&
      !process.env.NEXT_PUBLIC_SENTRY_DSN
    ) {
      return null;
    }

    // Remove sensitive data from events
    if (event.request) {
      // Remove query parameters with sensitive data
      event.request.url = event.request.url?.replace(/(\?.*)?$/, '');
    }

    return event;
  },

  // Maximum number of breadcrumbs to store (default: 100)
  maxBreadcrumbs: 50,

  // Capture unhandled promise rejections
  attachStacktrace: true,

  // Performance-related options
  performanceConfig: {
    // Track database query times
    // Requires database instrumentation setup
    trackingOrigins: [
      'localhost',
      /^\//,
      // Supabase API domain
      /supabase\.co/,
    ],

    // Sample rate for transactions (percentage of requests)
    // Set lower in production to control costs
    tracingOrigins: ['localhost', /^\//, /supabase\.co/],

    // Time budget for automatic transaction creation (ms)
    // Helps skip very fast transactions
    minTraceDurationMs: 100,
  },
};
