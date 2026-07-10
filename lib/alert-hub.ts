/**
 * DNA-GOV-005: Founder Alert Hub
 *
 * Centralize all alerts from DNA-GOV-001, 002, 003, 004, 008 into a single unified interface.
 * Critical for Founder time: currently alerts scatter across logs; Founder must manually search.
 * This DNA creates a single source of truth for all system health.
 *
 * Aggregates:
 * - DNA-GOV-001: External blocker alerts (GitHub Actions, Supabase)
 * - DNA-GOV-002: Production health alerts (connectivity, latency)
 * - DNA-GOV-003: Deployment verification alerts (code not live)
 * - DNA-GOV-004: Error rate alerts (runtime failures)
 * - DNA-GOV-008: Security vulnerability alerts (new CVEs, npm advisories)
 */

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertSource =
  | 'blocking-conditions' // DNA-GOV-001
  | 'production-health' // DNA-GOV-002
  | 'deployment' // DNA-GOV-003
  | 'error-rate' // DNA-GOV-004
  | 'security' // DNA-GOV-008
  | 'performance'; // DNA-GOV-009

export interface Alert {
  id: string; // UUID for deduplication
  severity: AlertSeverity;
  source: AlertSource;
  title: string;
  description: string;
  recommendation?: string;
  timestamp: string;
  resolved?: boolean;
}

export interface AlertHubReport {
  timestamp: string;
  alertCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  alerts: Alert[];
  summary: string;
}

// In-memory alert store (could be enhanced to persist to database)
const alertStore = new Map<string, Alert>();

/**
 * Generate deterministic alert ID from source and content
 */
function generateAlertId(source: AlertSource, title: string, timestamp: string): string {
  // Simple hash of source + title for deduplication
  const content = `${source}:${title}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `${source}-${Math.abs(hash)}`;
}

/**
 * Record an alert from any DNA
 */
export function recordAlert(
  source: AlertSource,
  severity: AlertSeverity,
  title: string,
  description: string,
  recommendation?: string
): Alert {
  const timestamp = new Date().toISOString();
  const id = generateAlertId(source, title, timestamp);

  // Don't create duplicate alerts (same source + title)
  if (alertStore.has(id) && !alertStore.get(id)!.resolved) {
    const existing = alertStore.get(id)!;
    // Update timestamp if alert is recurring
    existing.timestamp = timestamp;
    return existing;
  }

  const alert: Alert = {
    id,
    severity,
    source,
    title,
    description,
    recommendation,
    timestamp,
  };

  alertStore.set(id, alert);
  return alert;
}

/**
 * Resolve an alert (mark as handled)
 */
export function resolveAlert(alertId: string): void {
  const alert = alertStore.get(alertId);
  if (alert) {
    alert.resolved = true;
  }
}

/**
 * Get all active alerts
 */
export function getActiveAlerts(): Alert[] {
  return Array.from(alertStore.values())
    .filter((a) => !a.resolved)
    .sort((a, b) => {
      // Sort by severity (critical first), then by timestamp (newest first)
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
}

/**
 * Get alert hub report
 */
export function getAlertHubReport(): AlertHubReport {
  const activeAlerts = getActiveAlerts();
  const criticalCount = activeAlerts.filter((a) => a.severity === 'critical').length;
  const warningCount = activeAlerts.filter((a) => a.severity === 'warning').length;
  const infoCount = activeAlerts.filter((a) => a.severity === 'info').length;

  let summary = '';
  if (criticalCount > 0) {
    summary = `🔴 ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} require immediate action`;
  } else if (warningCount > 0) {
    summary = `⚠️ ${warningCount} warning${warningCount > 1 ? 's' : ''} to review`;
  } else if (infoCount > 0) {
    summary = `ℹ️ ${infoCount} informational alert${infoCount > 1 ? 's' : ''}`;
  } else {
    summary = '✅ All systems nominal';
  }

  return {
    timestamp: new Date().toISOString(),
    alertCount: activeAlerts.length,
    criticalCount,
    warningCount,
    infoCount,
    alerts: activeAlerts,
    summary,
  };
}

/**
 * Clear resolved alerts older than threshold
 */
export function cleanupResolvedAlerts(olderThanMinutes: number = 60): number {
  const threshold = Date.now() - olderThanMinutes * 60 * 1000;
  let cleaned = 0;

  for (const [id, alert] of alertStore) {
    if (alert.resolved && new Date(alert.timestamp).getTime() < threshold) {
      alertStore.delete(id);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Reset alert store (testing/manual reset)
 */
export function resetAlertHub(): void {
  alertStore.clear();
}

/**
 * Bridge DNA-GOV-009 performance regressions into Alert Hub
 *
 * Called by /api/alerts to check for performance regressions and record them as alerts
 */
export function recordPerformanceAlerts(performanceReport: {
  regressionsFound: number;
  regressions: Array<{
    metric: string;
    severity: 'critical' | 'warning' | 'info';
    changePercent: number;
    baseline: number;
    current: number;
  }>;
  improvements: Array<{
    metric: string;
    changePercent: number;
  }>;
}): void {
  if (performanceReport.regressionsFound === 0) {
    // No regressions, no alerts needed
    return;
  }

  // Record critical performance regressions
  const criticalRegressions = performanceReport.regressions.filter((r) => r.severity === 'critical');
  for (const regression of criticalRegressions) {
    recordAlert(
      'performance',
      'critical',
      `Performance regression: ${regression.metric}`,
      `${regression.metric} degraded ${regression.changePercent}% (${regression.baseline}ms → ${regression.current}ms)`,
      'Review recent commits to identify performance regression. Consider reverting high-impact changes.'
    );
  }

  // Record warning-level performance regressions
  const warningRegressions = performanceReport.regressions.filter((r) => r.severity === 'warning');
  if (warningRegressions.length > 0) {
    recordAlert(
      'performance',
      'warning',
      `Performance warnings: ${warningRegressions.length} metrics degraded`,
      `${warningRegressions.map((r) => `${r.metric} (${r.changePercent}%)`).join(', ')}`,
      'Monitor performance trends. Optimize if degradation continues.'
    );
  }

  // Record improvements (info level)
  if (performanceReport.improvements.length > 0) {
    recordAlert(
      'performance',
      'info',
      `Performance improvements: ${performanceReport.improvements.length} metrics better`,
      `${performanceReport.improvements.map((i) => `${i.metric} (-${i.changePercent}%)`).join(', ')}`,
      undefined
    );
  }
}

/**
 * Format alert hub report for Founder display
 */
export function formatAlertHubReport(report: AlertHubReport): string {
  const lines = [report.summary];

  if (report.alerts.length > 0) {
    lines.push('');
    lines.push('Active alerts:');

    report.alerts.forEach((alert) => {
      const severityIcon =
        alert.severity === 'critical'
          ? '🔴'
          : alert.severity === 'warning'
            ? '⚠️'
            : 'ℹ️';

      lines.push(`${severityIcon} [${alert.source}] ${alert.title}`);
      lines.push(`   ${alert.description}`);

      if (alert.recommendation) {
        lines.push(`   → ${alert.recommendation}`);
      }
    });
  }

  return lines.join('\n');
}
