/**
 * DNA-GOV-015: SLA Violation Alerting
 *
 * Monitors production SLA compliance and records alerts when critical endpoints
 * violate performance targets. Integrates with alert-hub to surface issues to Founder.
 *
 * Triggered by: /api/metrics/sla-check endpoint
 * Outputs to: alert-hub for centralized visibility
 */

import { recordAlert } from './alert-hub';

export interface SLAViolationAlert {
  endpoint: string;
  violations: string[];
  p95Actual: number;
  p95Target: number;
  p99Actual: number;
  p99Target: number;
  requestCount: number;
  severity: 'warning' | 'critical';
}

/**
 * Process SLA check results and record violations as alerts
 * Called from /api/metrics/sla-check when violations detected
 */
export function processSLAViolations(
  allPassed: boolean,
  totalViolating: number,
  violations: Array<{
    endpoint: string;
    violations: string[];
    metrics: { p95: number; p99: number; count: number };
    sla: { p95MaxMs: number; p99MaxMs: number };
  }>
): void {
  // Only alert if violations exist
  if (!violations || violations.length === 0) {
    return;
  }

  // Determine overall severity: critical if ≥2 endpoints or high-value endpoint fails
  const criticalEndpoints = [
    'GET /api/dashboard',
    'GET /api/health',
    'POST /api/workspace',
  ];
  const hasHighValueViolation = violations.some((v) =>
    criticalEndpoints.includes(v.endpoint)
  );
  const severity = violations.length >= 2 || hasHighValueViolation ? 'critical' : 'warning';

  // Record alert for violation event
  recordAlert(
    'production-health',
    severity,
    `SLA Violations Detected (${violations.length} endpoint${violations.length !== 1 ? 's' : ''})`,
    `${totalViolating} endpoints are violating SLA targets:\n${violations
      .map(
        (v) =>
          `• ${v.endpoint}: ${v.violations.join('; ')}`
      )
      .join('\n')}`,
    `Check /api/metrics/sla-check for details. Consider scaling or investigating root cause.`
  );

  // Record per-endpoint details for high-severity violations
  violations.forEach((violation) => {
    if (severity === 'critical') {
      recordAlert(
        'production-health',
        'critical',
        `${violation.endpoint}: P95=${violation.metrics.p95}ms (target ${violation.sla.p95MaxMs}ms)`,
        `Endpoint is failing SLA targets. ${violation.metrics.count} requests measured.`,
        `Review request logs and database performance for this endpoint.`
      );
    }
  });
}

/**
 * Get severity classification for a single endpoint violation
 */
export function getSeverity(
  p95: number,
  p95Target: number,
  p99: number,
  p99Target: number
): 'warning' | 'critical' {
  const p95Ratio = p95 / p95Target;
  const p99Ratio = p99 / p99Target;
  const maxRatio = Math.max(p95Ratio, p99Ratio);

  // Critical if exceeding target by >50%
  // Warning if exceeding target by >10%
  return maxRatio > 1.5 ? 'critical' : 'warning';
}

/**
 * Format SLA violation message for human readability
 */
export function formatSLAViolation(violation: {
  endpoint: string;
  violations: string[];
  metrics: { p95: number; p99: number; count: number };
  sla: { p95MaxMs: number; p99MaxMs: number };
}): string {
  return `${violation.endpoint}: ${violation.metrics.count} requests | P95: ${Math.round(violation.metrics.p95)}ms (target ${violation.sla.p95MaxMs}ms) | P99: ${Math.round(violation.metrics.p99)}ms (target ${violation.sla.p99MaxMs}ms)`;
}
