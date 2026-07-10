/**
 * Safe error handling for API responses.
 * Ensures error details are logged server-side but not exposed to clients.
 */

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

/**
 * Log error for internal debugging without exposing details to client.
 */
export function logError(context: string, error: unknown): void {
  const message = getErrorMessage(error);
  console.error(`[${context}] ${message}`);
  if (error instanceof Error && error.stack) {
    console.error(`[${context}] Stack:`, error.stack);
  }
}

/**
 * Get a safe error message for client response.
 * Never expose error.message or stack traces to clients.
 */
export function getSafeErrorResponse(
  defaultMessage: string,
  error?: unknown,
  context?: string
): string {
  if (context && error) {
    logError(context, error);
  }
  return defaultMessage;
}
