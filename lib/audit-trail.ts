/**
 * DNA-GOV-015: Security Audit Trail
 *
 * Log all sensitive operations for compliance, incident investigation, and accountability.
 * Integrates with DNA-005 (Alert Hub) for Founder visibility and automated alerting.
 */

export type AuditAction =
  | 'deployment:start'
  | 'deployment:success'
  | 'deployment:failure'
  | 'rollback:initiated'
  | 'rollback:success'
  | 'rollback:failure'
  | 'patch:applied'
  | 'patch:failed'
  | 'vulnerability:detected'
  | 'incident:created'
  | 'incident:resolved'
  | 'cost:anomaly'
  | 'alert:escalated'
  | 'auth:login'
  | 'auth:logout'
  | 'env:changed'
  | 'secret:rotated';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  severity: AuditSeverity;
  actor: string; // 'governor-autonomous' or 'founder' or service name
  resource: string; // deployment ID, incident ID, etc.
  details: Record<string, any>;
  result: 'success' | 'failure' | 'pending';
  reason?: string;
  relatedAlertIds?: string[];
}

export interface AuditReport {
  timestamp: string;
  periodStart: string;
  periodEnd: string;
  totalEntries: number;
  byAction: Record<AuditAction, number>;
  bySeverity: Record<AuditSeverity, number>;
  criticalActions: AuditEntry[];
  entries: AuditEntry[];
}

// In-memory audit store (in production, would be persisted to database)
const auditLog: AuditEntry[] = [];

/**
 * Generate deterministic audit ID
 */
function generateAuditId(action: AuditAction, timestamp: string, resource: string): string {
  const content = `${action}:${resource}:${timestamp}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `audit-${Math.abs(hash).toString(36)}`;
}

/**
 * Record an audit entry
 */
export function recordAudit(params: {
  action: AuditAction;
  severity: AuditSeverity;
  actor: string;
  resource: string;
  details: Record<string, any>;
  result: 'success' | 'failure' | 'pending';
  reason?: string;
  relatedAlertIds?: string[];
}): AuditEntry {
  const timestamp = new Date().toISOString();
  const id = generateAuditId(params.action, timestamp, params.resource);

  const entry: AuditEntry = {
    id,
    timestamp,
    action: params.action,
    severity: params.severity,
    actor: params.actor,
    resource: params.resource,
    details: params.details,
    result: params.result,
    reason: params.reason,
    relatedAlertIds: params.relatedAlertIds,
  };

  auditLog.push(entry);

  // Log critical actions to console for immediate visibility
  if (params.severity === 'critical') {
    console.error(
      `[AUDIT] CRITICAL: ${params.action} on ${params.resource} by ${params.actor} - ${params.result}`,
      params.details
    );
  }

  return entry;
}

/**
 * Get audit entries for a time range
 */
export function getAuditEntries(options: {
  startTime?: Date;
  endTime?: Date;
  action?: AuditAction;
  severity?: AuditSeverity;
  actor?: string;
  resource?: string;
  limit?: number;
}): AuditEntry[] {
  let filtered = auditLog;

  if (options.startTime) {
    filtered = filtered.filter((e) => new Date(e.timestamp) >= options.startTime!);
  }
  if (options.endTime) {
    filtered = filtered.filter((e) => new Date(e.timestamp) <= options.endTime!);
  }
  if (options.action) {
    filtered = filtered.filter((e) => e.action === options.action);
  }
  if (options.severity) {
    filtered = filtered.filter((e) => e.severity === options.severity);
  }
  if (options.actor) {
    filtered = filtered.filter((e) => e.actor === options.actor);
  }
  if (options.resource) {
    filtered = filtered.filter((e) => e.resource === options.resource);
  }

  const limit = options.limit || 100;
  return filtered.slice(-limit).reverse(); // Most recent first
}

/**
 * Generate audit report for compliance/review
 */
export function generateAuditReport(options: {
  startTime?: Date;
  endTime?: Date;
}): AuditReport {
  const entries = getAuditEntries({
    startTime: options.startTime,
    endTime: options.endTime,
    limit: 10000,
  });

  const byAction: Record<string, number> = {};
  const bySeverity: Record<string, number> = { info: 0, warning: 0, critical: 0 };
  const criticalActions: AuditEntry[] = [];

  entries.forEach((entry) => {
    byAction[entry.action] = (byAction[entry.action] || 0) + 1;
    bySeverity[entry.severity]++;
    if (entry.severity === 'critical') {
      criticalActions.push(entry);
    }
  });

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  return {
    timestamp: now.toISOString(),
    periodStart: options.startTime?.toISOString() || startOfDay.toISOString(),
    periodEnd: options.endTime?.toISOString() || endOfDay.toISOString(),
    totalEntries: entries.length,
    byAction: byAction as Record<AuditAction, number>,
    bySeverity: bySeverity as Record<AuditSeverity, number>,
    criticalActions: criticalActions.slice(0, 10), // Most recent 10
    entries: entries.slice(0, 100), // Most recent 100
  };
}

/**
 * Format audit report for Founder display
 */
export function formatAuditReport(report: AuditReport): string {
  const lines = [
    '# Audit Trail Report',
    '',
    `**Period:** ${report.periodStart} to ${report.periodEnd}`,
    `**Total Entries:** ${report.totalEntries}`,
    '',
    '## Summary',
    `- Critical: ${report.bySeverity.critical}`,
    `- Warnings: ${report.bySeverity.warning}`,
    `- Info: ${report.bySeverity.info}`,
    '',
  ];

  if (report.criticalActions.length > 0) {
    lines.push('## Critical Actions');
    report.criticalActions.forEach((entry) => {
      lines.push(`- **${entry.action}** on ${entry.resource}`);
      lines.push(`  - Actor: ${entry.actor}`);
      lines.push(`  - Result: ${entry.result}`);
      if (entry.reason) {
        lines.push(`  - Reason: ${entry.reason}`);
      }
    });
    lines.push('');
  }

  lines.push('## Action Breakdown');
  Object.entries(report.byAction)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([action, count]) => {
      lines.push(`- ${action}: ${count}`);
    });

  return lines.join('\n');
}

/**
 * Rotate audit log (archive old entries, keep recent for compliance window)
 */
export function rotateAuditLog(keepDays: number = 90): number {
  const threshold = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  const initialLength = auditLog.length;

  const filtered = auditLog.filter((entry) => new Date(entry.timestamp).getTime() > threshold);

  auditLog.length = 0;
  auditLog.push(...filtered);

  return initialLength - auditLog.length;
}

/**
 * Reset audit log (testing/admin only)
 */
export function resetAuditLog(): void {
  auditLog.length = 0;
}

/**
 * Export audit entries for compliance export (JSON or CSV)
 */
export function exportAuditLog(format: 'json' | 'csv' = 'json'): string {
  if (format === 'json') {
    return JSON.stringify(auditLog, null, 2);
  }

  // CSV format
  const header = 'ID,Timestamp,Action,Severity,Actor,Resource,Result,Reason';
  const rows = auditLog.map(
    (e) =>
      `"${e.id}","${e.timestamp}","${e.action}","${e.severity}","${e.actor}","${e.resource}","${e.result}","${e.reason || ''}"`
  );

  return [header, ...rows].join('\n');
}
