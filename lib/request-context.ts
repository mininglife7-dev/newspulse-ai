import { randomUUID } from 'crypto';

/**
 * Generate a fresh, unique request ID.
 *
 * Pure by design — no module-level state. A shared mutable singleton would let
 * concurrent requests in the same serverless instance overwrite each other's
 * IDs (and read back the wrong one), so each call simply returns a new UUID
 * that the caller holds in a local variable for the lifetime of the request.
 */
export function generateRequestId(): string {
  return randomUUID();
}
