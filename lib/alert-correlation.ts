/**
 * DNS-022: Alert Correlation
 *
 * Reduce alert fatigue by correlating related alerts and suppressing redundant signals.
 * Enables intelligent alert grouping: multiple low-level alerts that represent the
 * same root issue get correlated into a single high-value alert, reducing noise and
 * improving incident responder focus.
 */

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertSource = 'uptime-monitor' | 'performance-monitor' | 'error-tracking' | 'security-scan' | 'cost-monitor' | 'custom';

export interface Alert {
  id: string;
  timestamp: string;
  source: AlertSource;
  severity: AlertSeverity;
  title: string;
  description: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  suppressed: boolean;
  correlatedAlerts: string[];
}

export interface AlertPattern {
  id: string;
  name: string;
  description: string;
  alertSources: AlertSource[];
  tagPatterns: string[];
  timeWindowSeconds: number;
  minMatchCount: number;
  rootCause: string;
  suggestedAction: string;
  enabled: boolean;
}

export interface CorrelatedAlertGroup {
  id: string;
  timestamp: string;
  pattern: AlertPattern;
  alerts: Alert[];
  correlationScore: number; // 0-100
  rootCauseEstimate: string;
  suggestedActions: string[];
  actionTaken?: string;
}

// In-memory stores
const alertStore = new Map<string, Alert>();
const alertPatterns: AlertPattern[] = [];
const correlatedGroups: CorrelatedAlertGroup[] = [];
const suppressionRules = new Map<string, boolean>(); // patternId -> enabled

// Initialize default alert correlation patterns
const defaultPatterns: AlertPattern[] = [
  {
    id: 'pattern-database-cascade',
    name: 'Database Connection Pool Exhaustion Cascade',
    description: 'Detects when database connection exhaustion leads to cascading failures',
    alertSources: ['performance-monitor', 'error-tracking', 'uptime-monitor'],
    tagPatterns: ['database', 'connection', 'pool', 'timeout', 'unavailable'],
    timeWindowSeconds: 300,
    minMatchCount: 2,
    rootCause: 'Database connection pool exhaustion',
    suggestedAction: 'Scale database connections, review active queries, kill long-running transactions',
    enabled: true,
  },
  {
    id: 'pattern-memory-leak',
    name: 'Memory Leak Cascade',
    description: 'Detects progressive memory exhaustion leading to process crashes',
    alertSources: ['performance-monitor', 'error-tracking', 'uptime-monitor'],
    tagPatterns: ['memory', 'heap', 'oom', 'crash', 'restart'],
    timeWindowSeconds: 600,
    minMatchCount: 3,
    rootCause: 'Memory leak in application',
    suggestedAction: 'Review recent code changes, enable heap dump analysis, consider process restart',
    enabled: true,
  },
  {
    id: 'pattern-upstream-failure',
    name: 'External Dependency Failure Cascade',
    description: 'Detects cascading failures from external service unavailability',
    alertSources: ['error-tracking', 'uptime-monitor'],
    tagPatterns: ['external', 'dependency', 'timeout', 'unavailable', 'api-error'],
    timeWindowSeconds: 300,
    minMatchCount: 2,
    rootCause: 'External service unavailable or degraded',
    suggestedAction: 'Check external service status, implement circuit breaker, enable fallback',
    enabled: true,
  },
  {
    id: 'pattern-disk-pressure',
    name: 'Disk Pressure Cascade',
    description: 'Detects storage issues leading to service degradation',
    alertSources: ['performance-monitor', 'error-tracking'],
    tagPatterns: ['disk', 'storage', 'inode', 'space', 'write-failed'],
    timeWindowSeconds: 300,
    minMatchCount: 2,
    rootCause: 'Disk space or inode exhaustion',
    suggestedAction: 'Clean up old logs/data, increase disk allocation, archive data',
    enabled: true,
  },
  {
    id: 'pattern-rate-limit',
    name: 'Rate Limit Cascade',
    description: 'Detects when rate limiting affects downstream services',
    alertSources: ['error-tracking', 'uptime-monitor'],
    tagPatterns: ['rate-limit', 'throttle', 'too-many-requests', 'quota'],
    timeWindowSeconds: 180,
    minMatchCount: 2,
    rootCause: 'Rate limiting triggered by traffic surge',
    suggestedAction: 'Implement backoff retry logic, increase rate limits, enable caching',
    enabled: true,
  },
];

for (const pattern of defaultPatterns) {
  alertPatterns.push(pattern);
  suppressionRules.set(pattern.id, true);
}

/**
 * Record incoming alert
 */
export function recordAlert(
  source: AlertSource,
  severity: AlertSeverity,
  title: string,
  description: string,
  tags: string[],
  metadata?: Record<string, unknown>
): Alert {
  const alert: Alert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    source,
    severity,
    title,
    description,
    tags,
    metadata,
    suppressed: false,
    correlatedAlerts: [],
  };

  alertStore.set(alert.id, alert);
  return alert;
}

/**
 * Correlate alerts based on patterns
 */
export function correlateAlerts(): CorrelatedAlertGroup[] {
  const newGroups: CorrelatedAlertGroup[] = [];
  const now = Date.now();
  const processedAlerts = new Set<string>();

  for (const pattern of alertPatterns.filter((p) => p.enabled)) {
    if (!suppressionRules.get(pattern.id)) continue;

    // Get alerts matching this pattern within time window
    const matchingAlerts: Alert[] = [];

    for (const [, alert] of alertStore) {
      if (processedAlerts.has(alert.id)) continue;

      const alertTime = new Date(alert.timestamp).getTime();
      const timeDiff = now - alertTime;

      // Check if within time window
      if (timeDiff > pattern.timeWindowSeconds * 1000) continue;

      // Check if from matching source
      if (!pattern.alertSources.includes(alert.source)) continue;

      // Check if tags match pattern
      const tagMatch = pattern.tagPatterns.some((tp) => alert.tags.some((at) => at.toLowerCase().includes(tp.toLowerCase())));

      if (tagMatch) {
        matchingAlerts.push(alert);
      }
    }

    // If enough alerts match, create correlation group
    if (matchingAlerts.length >= pattern.minMatchCount) {
      // Calculate correlation score based on match quality
      const scoreFactors = [
        matchingAlerts.length / pattern.minMatchCount, // More alerts = higher score
        matchingAlerts.filter((a) => a.severity === 'critical').length / Math.max(1, matchingAlerts.length), // Critical alerts boost score
        matchingAlerts.filter((a) => pattern.alertSources.includes(a.source)).length / matchingAlerts.length, // Source match
      ];

      const correlationScore = Math.min(100, Math.round((scoreFactors.reduce((a, b) => a + b, 0) / scoreFactors.length) * 100));

      const group: CorrelatedAlertGroup = {
        id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date().toISOString(),
        pattern,
        alerts: matchingAlerts,
        correlationScore,
        rootCauseEstimate: pattern.rootCause,
        suggestedActions: [pattern.suggestedAction],
      };

      // Suppress original alerts
      for (const alert of matchingAlerts) {
        alert.suppressed = true;
        alert.correlatedAlerts.push(group.id);
        processedAlerts.add(alert.id);
      }

      newGroups.push(group);
      correlatedGroups.push(group);
    }
  }

  return newGroups;
}

/**
 * Get non-suppressed alerts
 */
export function getNonSuppressedAlerts(): Alert[] {
  return Array.from(alertStore.values())
    .filter((a) => !a.suppressed)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Get correlated alert groups
 */
export function getCorrelatedGroups(hours: number = 24): CorrelatedAlertGroup[] {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return correlatedGroups
    .filter((g) => new Date(g.timestamp) > cutoff)
    .sort((a, b) => b.correlationScore - a.correlationScore);
}

/**
 * Record action taken on correlated alert group
 */
export function recordGroupAction(groupId: string, action: string): CorrelatedAlertGroup | undefined {
  const group = correlatedGroups.find((g) => g.id === groupId);
  if (group) {
    group.actionTaken = action;
  }
  return group;
}

/**
 * Update alert pattern enablement
 */
export function updatePatternSuppression(patternId: string, enabled: boolean): void {
  suppressionRules.set(patternId, enabled);
}

/**
 * Get alert correlation metrics
 */
export function getCorrelationMetrics(hours: number = 24): {
  totalAlerts: number;
  suppressedAlerts: number;
  correlatedGroups: number;
  averageGroupSize: number;
  averageCorrelationScore: number;
  alertReductionPercent: number;
} {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const recentAlerts = Array.from(alertStore.values()).filter((a) => new Date(a.timestamp) > cutoff);
  const suppressedCount = recentAlerts.filter((a) => a.suppressed).length;
  const recentGroups = correlatedGroups.filter((g) => new Date(g.timestamp) > cutoff);

  const avgGroupSize = recentGroups.length > 0 ? recentGroups.reduce((sum, g) => sum + g.alerts.length, 0) / recentGroups.length : 0;

  const avgScore =
    recentGroups.length > 0 ? recentGroups.reduce((sum, g) => sum + g.correlationScore, 0) / recentGroups.length : 0;

  const alertReduction = recentAlerts.length > 0 ? Math.round((suppressedCount / recentAlerts.length) * 100) : 0;

  return {
    totalAlerts: recentAlerts.length,
    suppressedAlerts: suppressedCount,
    correlatedGroups: recentGroups.length,
    averageGroupSize: Math.round(avgGroupSize * 10) / 10,
    averageCorrelationScore: Math.round(avgScore),
    alertReductionPercent: alertReduction,
  };
}

/**
 * Reset alert store (testing/admin only)
 */
export function resetAlertStore(): void {
  alertStore.clear();
  correlatedGroups.length = 0;
  suppressionRules.clear();

  for (const pattern of defaultPatterns) {
    suppressionRules.set(pattern.id, true);
  }
}

/**
 * Get alert pattern by ID
 */
export function getAlertPattern(patternId: string): AlertPattern | undefined {
  return alertPatterns.find((p) => p.id === patternId);
}

/**
 * Get all alert patterns
 */
export function getAllAlertPatterns(): AlertPattern[] {
  return alertPatterns;
}
