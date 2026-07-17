/**
 * Instrumentation: Sentry Initialization
 *
 * Automatically called by Next.js on server startup.
 * Must be in the root directory as instrumentation.ts
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only initialize Sentry if DSN is configured (production/staging)
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  // Server-side Sentry initialization
  if (process.env.NEXT_ENV === 'server') {
    const { sentryConfig } = await import('./sentry.config');

    const Sentry = await import('@sentry/nextjs');

    Sentry.init({
      ...sentryConfig,
      enabled: true,
    });
  }
}
