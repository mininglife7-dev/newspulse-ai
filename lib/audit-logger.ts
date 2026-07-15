/**
 * Audit Logging System
 * Tracks important operations for compliance and security monitoring
 * Designed to be lightweight and non-blocking
 */

export type AuditAction =
  | 'auth.signup'
  | 'auth.login'
  | 'auth.logout'
  | 'auth.password_reset'
  | 'workspace.create'
  | 'workspace.delete'
  | 'member.invite'
  | 'member.remove'
  | 'company.create'
  | 'company.update'
  | 'ai_system.create'
  | 'ai_system.delete'
  | 'assessment.create'
  | 'assessment.update'
  | 'assessment.finalize'
  | 'obligation.create'
  | 'obligation.update'
  | 'obligation.assign'
  | 'obligation.complete'
  | 'evidence.upload'
  | 'evidence.delete'
  | 'report.generate';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditLogEntry {
  timestamp: string;
  action: AuditAction;
  severity: AuditSeverity;
  userId?: string;
  workspaceId?: string;
  resourceId?: string;
  resourceType?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

// In-memory audit log (in production, write to database or external service)
const auditLog: AuditLogEntry[] = [];
const maxLogSize = 1000; // Keep last 1000 entries in memory

/**
 * Log an audit event
 */
export function logAudit(entry: Partial<AuditLogEntry>): void {
  const auditEntry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    action: entry.action || 'auth.login',
    severity: entry.severity || 'info',
    status: entry.status || 'success',
    ...entry,
  };

  auditLog.push(auditEntry);

  // Keep log size bounded
  if (auditLog.length > maxLogSize) {
    auditLog.shift();
  }

  // In production, also write to database or external audit service
  logToExternalService(auditEntry);
}

/**
 * Get audit logs (filtered)
 */
export function getAuditLogs(
  filters?: {
    userId?: string;
    workspaceId?: string;
    action?: AuditAction;
    severity?: AuditSeverity;
    limit?: number;
  }
): AuditLogEntry[] {
  let results = [...auditLog];

  if (filters?.userId) {
    results = results.filter((log) => log.userId === filters.userId);
  }

  if (filters?.workspaceId) {
    results = results.filter((log) => log.workspaceId === filters.workspaceId);
  }

  if (filters?.action) {
    results = results.filter((log) => log.action === filters.action);
  }

  if (filters?.severity) {
    results = results.filter((log) => log.severity === filters.severity);
  }

  // Return most recent first
  results.reverse();

  if (filters?.limit) {
    results = results.slice(0, filters.limit);
  }

  return results;
}

/**
 * Get audit statistics
 */
export function getAuditStats(): {
  totalEvents: number;
  successCount: number;
  failureCount: number;
  criticalCount: number;
  actions: Record<string, number>;
} {
  return {
    totalEvents: auditLog.length,
    successCount: auditLog.filter((log) => log.status === 'success').length,
    failureCount: auditLog.filter((log) => log.status === 'failure').length,
    criticalCount: auditLog.filter((log) => log.severity === 'critical').length,
    actions: auditLog.reduce(
      (acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
}

/**
 * Production audit service hook
 * Override this in production to log to Supabase or external service
 */
function logToExternalService(entry: AuditLogEntry): void {
  // TODO: In production, implement:
  // 1. Write to audit_logs table in Supabase
  // 2. Send to external SIEM service if configured
  // 3. Alert on critical events
  //
  // Example for Supabase:
  // const supabase = createAdminClient();
  // await supabase.from('audit_logs').insert(entry);

  // For now, just log critical events to console
  if (entry.severity === 'critical') {
    console.warn('[AUDIT CRITICAL]', {
      action: entry.action,
      userId: entry.userId,
      workspaceId: entry.workspaceId,
      timestamp: entry.timestamp,
    });
  }
}

/**
 * Helper: Log failed authentication attempt
 */
export function logFailedAuth(ipAddress: string, errorMessage: string): void {
  logAudit({
    action: 'auth.login',
    severity: 'warning',
    status: 'failure',
    ipAddress,
    errorMessage,
  });
}

/**
 * Helper: Log security-sensitive operation
 */
export function logSecurityEvent(
  action: AuditAction,
  userId: string,
  workspaceId: string,
  changes: Record<string, any>
): void {
  logAudit({
    action,
    severity: 'warning',
    status: 'success',
    userId,
    workspaceId,
    changes,
  });
}

/**
 * Helper: Log critical security incident
 */
export function logSecurityIncident(
  action: AuditAction,
  message: string,
  metadata: Record<string, any>
): void {
  logAudit({
    action,
    severity: 'critical',
    status: 'failure',
    errorMessage: message,
    metadata,
  });
}
