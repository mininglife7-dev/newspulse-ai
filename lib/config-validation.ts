/**
 * Production configuration validation
 * Ensures all required environment variables are set
 */

export function getRequiredAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error(
      'NEXT_PUBLIC_APP_URL environment variable is required for production. ' +
      'Set it to your production domain (e.g., https://yourapp.vercel.app). ' +
      'Defaulting to localhost is not allowed in production.'
    );
  }

  // Validate it's a proper URL
  try {
    new URL(appUrl);
  } catch (e) {
    throw new Error(`NEXT_PUBLIC_APP_URL is not a valid URL: ${appUrl}`);
  }

  return appUrl;
}

export function getOptionalAppUrl(fallback?: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    if (fallback) return fallback;
    throw new Error(
      'NEXT_PUBLIC_APP_URL environment variable is required. ' +
      'Set it to your production domain.'
    );
  }

  return appUrl;
}

export function validateEnvironment(requiredVars: string[]): void {
  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Set them in your Vercel/deployment environment.'
    );
  }
}
