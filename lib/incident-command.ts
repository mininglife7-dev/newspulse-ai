/**
 * DNS-017: Incident Command & War Room
 *
 * Centralize incident tracking and coordination across all autonomous systems.
 * Bridge detection (DNS-001-004, 008-009) with remediation (DNS-011-012) and audit (DNS-015).
 * Provides Founder visibility into active incidents and resolution timeline.
 */

export type IncidentSeverity = 'info' | 'warning' | 'critical';

export type IncidentStatus = 'open' | 'investigating' | 'remediating' | 'mitigated' | 'resolved' | 'escalated';

export type IncidentCategory =
  | 'deployment'
  | 'database'
  | 'api'
  | 'security'
  | 'performance'
  | 'infrastructure'
  | 'external-dependency'
  | 'customer-impact';

export interface IncidentAction {
  timestamp: string;
  actor: string; // 'governor-autonomous' or 'founder'
  action: string; // e.g., 'rollback-initiated', 'scale-up-initiated', 'notification-sent'
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  result?: string;
  error?: string;
}

export interface IncidentEntry {
  id: string;
  timestamp: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  title: string;
  description: string;
  status: IncidentStatus;
  detectedBy: string; // DNA system that detected this (e.g., 'DNA-012')
  affectedServices: string[];
  affectedUsers: number;
  customerImpact: string;
  rootCause?: string;
  actions: IncidentAction[];
  relatedAlertIds: string[];
  autoRecoveryAttempted: boolean;
  resolvedAt?: string;
  resolution?: string;
  postMortemLink?: string;
}

export interface IncidentStats {
  timestamp: string;
  totalIncidents: number;
  openIncidents: number;
  investigatingIncidents: number;
  remediatingIncidents: number;
  escalatedIncidents: number;
  resolvedIncidents: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  autoResolvedCount: number;
  averageResolutionTime: number; // minutes
  meanTimeToDetection: number; // minutes
  meanTimeToResponse: number; // minutes
}

export interface IncidentReport {
  timestamp: string;
  statistics: IncidentStats;
  activeIncidents: IncidentEntry[];
  recentlyResolved: IncidentEntry[];
  escalatedIncidents: IncidentEntry[];
  timeline: IncidentAction[];
}

// In-memory incident store
const incidentMap = new Map<string, IncidentEntry>();
const incidentHistory: IncidentEntry[] = [];

/**
 * Generate deterministic incident ID
 */
function generateIncidentId(category: IncidentCategory, title: string, timestamp: string): string {
  const content = `${category}:${title}:${timestamp}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `incident-${Math.abs(hash).toString(36)}`;
}

/**
 * Create a new incident
 */
export function createIncident(params: {
  category: IncidentCategory;
  severity: IncidentSeverity;
  title: string;
  description: string;
  detectedBy: string;
  affectedServices: string[];
  affectedUsers: number;
  customerImpact: string;
  relatedAlertIds?: string[];
}): IncidentEntry {
  const timestamp = new Date().toISOString();
  const id = generateIncidentId(params.category, params.title, timestamp);

  // Check if similar incident already exists
  const existing = Array.from(incidentMap.values()).find(
    (inc) =>
      inc.category === params.category &&
      inc.title === params.title &&
      inc.status !== 'resolved' &&
      inc.status !== 'escalated'
  );

  if (existing) {
    // Update existing incident with new affected users
    existing.affectedUsers += params.affectedUsers;
    existing.relatedAlertIds = [...new Set([...existing.relatedAlertIds, ...(params.relatedAlertIds || [])])];
    return existing;
  }

  const incident: IncidentEntry = {
    id,
    timestamp,
    category: params.category,
    severity: params.severity,
    title: params.title,
    description: params.description,
    status: 'open',
    detectedBy: params.detectedBy,
    affectedServices: params.affectedServices,
    affectedUsers: params.affectedUsers,
    customerImpact: params.customerImpact,
    actions: [],
    relatedAlertIds: params.relatedAlertIds || [],
    autoRecoveryAttempted: false,
  };

  incidentMap.set(id, incident);

  // Log to console for immediate visibility
  if (params.severity === 'critical') {
    console.error(
      `[INCIDENT-COMMAND] CRITICAL INCIDENT: ${params.title} (${id}) - ${params.affectedUsers} users affected`
    );
  }

  return incident;
}

/**
 * Log an action taken on an incident
 */
export function recordIncidentAction(
  incidentId: string,
  action: Omit<IncidentAction, 'timestamp'>
): IncidentEntry | undefined {
  const incident = incidentMap.get(incidentId);
  if (!incident) return undefined;

  const actionEntry: IncidentAction = {
    ...action,
    timestamp: new Date().toISOString(),
  };

  incident.actions.push(actionEntry);

  // Update incident status based on action
  if (action.action.includes('rollback') || action.action.includes('failover')) {
    if (incident.status === 'open') {
      incident.status = 'remediating';
    }
  }

  if (action.action.includes('investigation')) {
    if (incident.status === 'open') {
      incident.status = 'investigating';
    }
  }

  return incident;
}

/**
 * Mark incident as auto-recovery attempted
 */
export function markAutoRecoveryAttempted(incidentId: string): IncidentEntry | undefined {
  const incident = incidentMap.get(incidentId);
  if (!incident) return undefined;

  incident.autoRecoveryAttempted = true;

  recordIncidentAction(incidentId, {
    actor: 'governor-autonomous',
    action: 'auto-recovery-initiated',
    status: 'in-progress',
  });

  return incident;
}

/**
 * Escalate incident to Founder
 */
export function escalateIncident(incidentId: string, reason: string): IncidentEntry | undefined {
  const incident = incidentMap.get(incidentId);
  if (!incident) return undefined;

  incident.status = 'escalated';

  recordIncidentAction(incidentId, {
    actor: 'governor-autonomous',
    action: 'escalation-triggered',
    status: 'completed',
    result: reason,
  });

  console.error(`[INCIDENT-COMMAND] ESCALATION: ${incident.title} (${incidentId}) - ${reason}`);

  return incident;
}

/**
 * Resolve incident
 */
export function resolveIncident(incidentId: string, resolution: string): IncidentEntry | undefined {
  const incident = incidentMap.get(incidentId);
  if (!incident) return undefined;

  const resolvedAt = new Date().toISOString();
  incident.status = 'resolved';
  incident.resolvedAt = resolvedAt;
  incident.resolution = resolution;

  recordIncidentAction(incidentId, {
    actor: 'governor-autonomous',
    action: 'incident-resolved',
    status: 'completed',
    result: resolution,
  });

  incidentHistory.push(incident);
  incidentMap.delete(incidentId);

  return incident;
}

/**
 * Get incident by ID
 */
export function getIncident(incidentId: string): IncidentEntry | undefined {
  return incidentMap.get(incidentId);
}

/**
 * Get all active incidents
 */
export function getActiveIncidents(): IncidentEntry[] {
  return Array.from(incidentMap.values()).sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

/**
 * Get incidents by status
 */
export function getIncidentsByStatus(status: IncidentStatus): IncidentEntry[] {
  return Array.from(incidentMap.values())
    .filter((inc) => inc.status === status)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Generate incident statistics
 */
export function generateIncidentStats(): IncidentStats {
  const activeIncidents = getActiveIncidents();
  const criticalCount = activeIncidents.filter((i) => i.severity === 'critical').length;
  const warningCount = activeIncidents.filter((i) => i.severity === 'warning').length;
  const infoCount = activeIncidents.filter((i) => i.severity === 'info').length;

  const openIncidents = getIncidentsByStatus('open').length;
  const investigatingIncidents = getIncidentsByStatus('investigating').length;
  const remediatingIncidents = getIncidentsByStatus('remediating').length;
  const escalatedIncidents = getIncidentsByStatus('escalated').length;

  // Calculate averages from history
  let totalResolutionTime = 0;
  let resolvedCount = 0;

  for (const incident of incidentHistory) {
    if (incident.resolvedAt) {
      const createdTime = new Date(incident.timestamp).getTime();
      const resolvedTime = new Date(incident.resolvedAt).getTime();
      totalResolutionTime += (resolvedTime - createdTime) / (1000 * 60); // minutes
      resolvedCount++;
    }
  }

  const averageResolutionTime = resolvedCount > 0 ? Math.round(totalResolutionTime / resolvedCount) : 0;
  const autoResolvedCount = incidentHistory.filter(
    (i) => i.status === 'resolved' && i.autoRecoveryAttempted
  ).length;

  return {
    timestamp: new Date().toISOString(),
    totalIncidents: activeIncidents.length + incidentHistory.length,
    openIncidents,
    investigatingIncidents,
    remediatingIncidents,
    escalatedIncidents,
    resolvedIncidents: incidentHistory.length,
    criticalCount,
    warningCount,
    infoCount,
    autoResolvedCount,
    averageResolutionTime,
    meanTimeToDetection: 5, // TODO: calculate from incident data
    meanTimeToResponse: 2, // TODO: calculate from incident data
  };
}

/**
 * Generate incident report
 */
export function generateIncidentReport(): IncidentReport {
  const statistics = generateIncidentStats();
  const activeIncidents = getActiveIncidents();
  const escalatedIncidents = getIncidentsByStatus('escalated');
  const recentlyResolved = incidentHistory.slice(-5).reverse();

  // Collect all actions from active incidents
  const timeline: IncidentAction[] = [];
  for (const incident of activeIncidents) {
    timeline.push(...incident.actions);
  }
  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    timestamp: new Date().toISOString(),
    statistics,
    activeIncidents,
    escalatedIncidents,
    recentlyResolved,
    timeline: timeline.slice(0, 50), // Most recent 50 actions
  };
}

/**
 * Format incident report for Founder display
 */
export function formatIncidentReport(report: IncidentReport): string {
  const lines = [
    '# Incident Command Center Report',
    '',
    `**Timestamp:** ${report.timestamp}`,
    '',
    '## Summary',
    `- **Total Incidents:** ${report.statistics.totalIncidents}`,
    `- **Active:** ${report.statistics.openIncidents} open, ${report.statistics.investigatingIncidents} investigating, ${report.statistics.remediatingIncidents} remediating`,
    `- **Critical:** ${report.statistics.criticalCount} | **Warning:** ${report.statistics.warningCount} | **Info:** ${report.statistics.infoCount}`,
    `- **Resolved:** ${report.statistics.resolvedIncidents} (${report.statistics.autoResolvedCount} auto-resolved)`,
    `- **Avg Resolution Time:** ${report.statistics.averageResolutionTime} min`,
    '',
  ];

  if (report.escalatedIncidents.length > 0) {
    lines.push('## Escalated Incidents (Require Founder Action)');
    report.escalatedIncidents.forEach((inc) => {
      lines.push(`- **${inc.title}** (${inc.id})`);
      lines.push(`  - Severity: ${inc.severity.toUpperCase()}`);
      lines.push(`  - Category: ${inc.category}`);
      lines.push(`  - Affected Users: ${inc.affectedUsers.toLocaleString()}`);
      lines.push(`  - Detected by: ${inc.detectedBy}`);
    });
    lines.push('');
  }

  if (report.activeIncidents.length > 0) {
    lines.push('## Active Incidents');
    report.activeIncidents.forEach((inc) => {
      const statusIcon =
        inc.status === 'remediating'
          ? '🔄'
          : inc.status === 'investigating'
            ? '🔍'
            : inc.status === 'open'
              ? '🟠'
              : '❌';
      lines.push(`${statusIcon} **${inc.title}** (${inc.status})`);
      lines.push(`   - Category: ${inc.category} | Severity: ${inc.severity}`);
      lines.push(`   - Affected: ${inc.affectedUsers.toLocaleString()} users`);
      lines.push(`   - Actions taken: ${inc.actions.length}`);
    });
    lines.push('');
  }

  if (report.recentlyResolved.length > 0) {
    lines.push('## Recently Resolved');
    report.recentlyResolved.forEach((inc) => {
      lines.push(`✅ **${inc.title}** - ${inc.resolution}`);
    });
  }

  return lines.join('\n');
}

/**
 * Reset incident store (testing/admin only)
 */
export function resetIncidentCommand(): void {
  incidentMap.clear();
  incidentHistory.length = 0;
}
