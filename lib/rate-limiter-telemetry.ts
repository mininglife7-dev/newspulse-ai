/**
 * Rate Limiter Telemetry (DNA-GOV-027)
 *
 * Tracks rate limiting metrics for operational insight:
 * - Violations per IP/client
 * - Pattern detection (bursty vs. sustained)
 * - Potential abuse/attack identification
 * - Integration with alert-hub for abuse alerts
 */

import { recordAlert } from './alert-hub';

export interface RateLimitTelemetry {
  totalViolations: number;
  violationsByClient: Map<string, number>;
  uniqueClientsLimited: number;
  lastViolation: string | null;
  burstDetected: Map<string, boolean>;
}

// Telemetry store
const telemetry: RateLimitTelemetry = {
  totalViolations: 0,
  violationsByClient: new Map(),
  uniqueClientsLimited: 0,
  lastViolation: null,
  burstDetected: new Map(),
};

// Thresholds for burst detection and alerting
const BURST_THRESHOLD = 5; // violations within window
const BURST_WINDOW_MS = 60 * 1000; // 1 minute
const ABUSE_THRESHOLD = 20; // violations per client before alert

/**
 * Record a rate limit violation
 */
export function recordRateLimitViolation(clientId: string): void {
  telemetry.totalViolations++;
  telemetry.lastViolation = new Date().toISOString();

  const current = telemetry.violationsByClient.get(clientId) || 0;
  const updated = current + 1;
  telemetry.violationsByClient.set(clientId, updated);

  if (current === 0) {
    telemetry.uniqueClientsLimited++;
  }

  // Check for burst behavior
  if (updated >= BURST_THRESHOLD && !telemetry.burstDetected.get(clientId)) {
    telemetry.burstDetected.set(clientId, true);
    recordAlert(
      'production-health',
      'warning',
      `Rate limit burst detected: ${clientId}`,
      `Client has been rate-limited ${updated} times in the last ${BURST_WINDOW_MS / 1000}s. This may indicate a legitimate spike or potential abuse.`,
      `Monitor client activity. Consider temporary allowlisting if legitimate. Block if malicious.`
    );
  }

  // Check for abuse pattern
  if (updated >= ABUSE_THRESHOLD) {
    recordAlert(
      'production-health',
      'critical',
      `Rate limit abuse: ${clientId}`,
      `Client has been rate-limited ${updated} times. This indicates sustained abusive behavior.`,
      `Block client immediately if not whitelisted. Investigate for attack patterns.`
    );
  }
}

/**
 * Get current telemetry snapshot
 */
export function getTelemetry(): RateLimitTelemetry {
  return {
    ...telemetry,
    violationsByClient: new Map(telemetry.violationsByClient),
    burstDetected: new Map(telemetry.burstDetected),
  };
}

/**
 * Get top N clients by violation count
 */
export function getTopViolators(limit: number = 10): Array<[string, number]> {
  return Array.from(telemetry.violationsByClient.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

/**
 * Reset telemetry (for testing or periodic rollover)
 */
export function resetTelemetry(): void {
  telemetry.totalViolations = 0;
  telemetry.violationsByClient.clear();
  telemetry.uniqueClientsLimited = 0;
  telemetry.lastViolation = null;
  telemetry.burstDetected.clear();
}

/**
 * Check if client should be blocked (abuse pattern detected)
 */
export function shouldBlockClient(clientId: string): boolean {
  const violations = telemetry.violationsByClient.get(clientId) || 0;
  return violations >= ABUSE_THRESHOLD;
}
