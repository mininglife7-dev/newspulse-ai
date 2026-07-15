/**
 * Production Monitoring Module
 *
 * Tracks key incident response metrics for observability during pilot launch:
 * - Detection speed (MTTD)
 * - Recovery time (MTTR)
 * - Alert delivery rate
 * - False positive rate
 * - Orchestration success rate
 *
 * Used by production-wiring to populate metrics during incident handling.
 * Metrics are logged to Supabase for dashboarding and analysis.
 */

export interface MetricsSnapshot {
  timestamp: string;
  incidentCount: number;
  avgMTTD: number; // milliseconds
  avgMTTR: number; // milliseconds
  alertDeliveryRate: number; // 0-1
  falsePositiveRate: number; // 0-1
  orchestrationSuccessRate: number; // 0-1
  remediationAttempts: number;
  remediationSuccesses: number;
  gitHubIssuesCreated: number;
  slackAlertsDelivered: number;
  emailAlertsDelivered: number;
  lastIncidentAt: string | null;
}

export interface IncidentMetrics {
  incidentId: string;
  detectedAt: string;
  detectionDurationMs: number;
  orchestratedAt?: string;
  remediatedAt?: string;
  recoveredAt?: string;
  recoveryDurationMs?: number;
  alertsSent: number;
  gitHubIssueCreated: boolean;
  success: boolean;
  falsePositive: boolean;
}

/**
 * Production metrics tracker
 * Accumulates and reports on incident response performance
 */
export class ProductionMetrics {
  private incidents: Map<string, IncidentMetrics> = new Map();
  private startTime = Date.now();

  recordDetection(incidentId: string, detectedAt: string): void {
    const now = Date.now();
    const parsed = new Date(detectedAt).getTime();

    this.incidents.set(incidentId, {
      incidentId,
      detectedAt,
      detectionDurationMs: Math.max(0, now - parsed),
      alertsSent: 0,
      gitHubIssueCreated: false,
      success: false,
      falsePositive: false,
    });
  }

  recordOrchestration(incidentId: string, orchestratedAt: string): void {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      incident.orchestratedAt = orchestratedAt;
    }
  }

  recordRemediation(incidentId: string, remediatedAt: string): void {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      incident.remediatedAt = remediatedAt;
    }
  }

  recordRecovery(incidentId: string, recoveredAt: string): void {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      // Calculate recovery time from remediation, or from detection if remediation not recorded
      const remediationTime = incident.remediatedAt
        ? new Date(incident.remediatedAt).getTime()
        : new Date(incident.detectedAt).getTime();
      const recoveryTime = new Date(recoveredAt).getTime();

      incident.recoveredAt = recoveredAt;
      incident.recoveryDurationMs = Math.max(0, recoveryTime - remediationTime);
      incident.success = true;
    }
  }

  recordRecoveryFailure(incidentId: string): void {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      incident.success = false;
    }
  }

  recordAlertDelivery(incidentId: string): void {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      incident.alertsSent++;
    }
  }

  recordGitHubIssue(incidentId: string): void {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      incident.gitHubIssueCreated = true;
    }
  }

  recordFalsePositive(incidentId: string): void {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      incident.falsePositive = true;
    }
  }

  getSnapshot(): MetricsSnapshot {
    const incidents = Array.from(this.incidents.values());
    const resolvedIncidents = incidents.filter(i => i.success);
    const falsePositives = incidents.filter(i => i.falsePositive);
    const deliveredAlerts = incidents.reduce((sum, i) => sum + i.alertsSent, 0);
    const createdIssues = incidents.filter(i => i.gitHubIssueCreated).length;

    // Track remediation attempts separately from successes
    const remediationAttempts = incidents.filter(i => i.remediatedAt).length;
    const remediationSuccesses = resolvedIncidents.length;

    const avgMTTD = incidents.length > 0
      ? incidents.reduce((sum, i) => sum + i.detectionDurationMs, 0) / incidents.length
      : 0;

    const avgMTTR = resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((sum, i) => sum + (i.recoveryDurationMs || 0), 0) / resolvedIncidents.length
      : 0;

    const alertDeliveryRate = incidents.length > 0
      ? incidents.filter(i => i.alertsSent > 0).length / incidents.length
      : 0;

    const falsePositiveRate = incidents.length > 0
      ? falsePositives.length / incidents.length
      : 0;

    const orchestrationSuccessRate = incidents.length > 0
      ? resolvedIncidents.length / incidents.length
      : 0;

    const lastIncident = incidents
      .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
      .at(0);

    return {
      timestamp: new Date().toISOString(),
      incidentCount: incidents.length,
      avgMTTD,
      avgMTTR,
      alertDeliveryRate,
      falsePositiveRate,
      orchestrationSuccessRate,
      remediationAttempts,
      remediationSuccesses,
      gitHubIssuesCreated: createdIssues,
      slackAlertsDelivered: deliveredAlerts,
      emailAlertsDelivered: deliveredAlerts,
      lastIncidentAt: lastIncident?.detectedAt || null,
    };
  }

  getIncident(incidentId: string): IncidentMetrics | undefined {
    return this.incidents.get(incidentId);
  }

  getAllIncidents(): IncidentMetrics[] {
    return Array.from(this.incidents.values());
  }

  getIncidentsSince(minutesAgo: number): IncidentMetrics[] {
    const cutoff = Date.now() - minutesAgo * 60 * 1000;
    return Array.from(this.incidents.values()).filter(
      i => new Date(i.detectedAt).getTime() >= cutoff
    );
  }

  getSLACompliance(mttdTarget = 30000, mttrTarget = 120000): {
    mttdCompliant: boolean;
    mttrCompliant: boolean;
    overallCompliant: boolean;
  } {
    const snapshot = this.getSnapshot();
    return {
      mttdCompliant: snapshot.avgMTTD <= mttdTarget,
      mttrCompliant: snapshot.avgMTTR <= mttrTarget,
      overallCompliant: snapshot.avgMTTD <= mttdTarget && snapshot.avgMTTR <= mttrTarget,
    };
  }

  generateReport(): string {
    const snapshot = this.getSnapshot();
    const sla = this.getSLACompliance();

    return `PRODUCTION INCIDENT RESPONSE METRICS
    
Total Incidents: ${snapshot.incidentCount}
Success Rate: ${(snapshot.orchestrationSuccessRate * 100).toFixed(1)}%
MTTD: ${snapshot.avgMTTD.toFixed(0)}ms (target < 30000ms) ${sla.mttdCompliant ? '✓' : '✗'}
MTTR: ${snapshot.avgMTTR.toFixed(0)}ms (target < 120000ms) ${sla.mttrCompliant ? '✓' : '✗'}
Alert Delivery Rate: ${(snapshot.alertDeliveryRate * 100).toFixed(1)}%
False Positive Rate: ${(snapshot.falsePositiveRate * 100).toFixed(1)}%
GitHub Issues: ${snapshot.gitHubIssuesCreated}
Overall Compliant: ${sla.overallCompliant ? '✓ YES' : '✗ NO'}`;
  }

  toJSON(): {
    snapshot: MetricsSnapshot;
    incidents: IncidentMetrics[];
    sla: { mttdCompliant: boolean; mttrCompliant: boolean; overallCompliant: boolean };
  } {
    return {
      snapshot: this.getSnapshot(),
      incidents: this.getAllIncidents(),
      sla: this.getSLACompliance(),
    };
  }
}

let globalMetrics: ProductionMetrics | null = null;
let metricsInitialized = false;

export function getProductionMetrics(): ProductionMetrics {
  if (!globalMetrics && !metricsInitialized) {
    metricsInitialized = true;
    globalMetrics = new ProductionMetrics();
  }
  if (!globalMetrics) {
    globalMetrics = new ProductionMetrics();
  }
  return globalMetrics;
}

export function resetProductionMetrics(): void {
  globalMetrics = new ProductionMetrics();
}

/**
 * Production health check report
 */
export interface HealthCheckReport {
  ok: boolean;
  timestamp: string;
  checks: Record<string, { status: string; latency: number }>;
  summary: { healthy: number; degraded: number; critical: number };
  alerts: string[];
}

/**
 * Run production health checks
 * Validates all critical systems are operational
 */
export async function runProductionHealthChecks(baseUrl: string): Promise<HealthCheckReport> {
  const checks: Record<string, { status: string; latency: number }> = {};
  const alerts: string[] = [];
  let healthy = 0;
  let degraded = 0;
  let critical = 0;

  const checkEndpoint = async (name: string, url: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const start = Date.now();
      const response = await fetch(url, { signal: controller.signal });
      const latency = Date.now() - start;
      clearTimeout(timeoutId);

      if (response.ok) {
        checks[name] = { status: 'healthy', latency };
        healthy++;
      } else {
        checks[name] = { status: 'degraded', latency };
        degraded++;
        alerts.push(`${name} endpoint returned non-200 status`);
      }
    } catch (error) {
      checks[name] = { status: 'critical', latency: 5000 };
      critical++;
      alerts.push(`${name} check failed: ${String(error)}`);
    }
  };

  await checkEndpoint('health', `${baseUrl}/api/health`);
  await checkEndpoint('metrics', `${baseUrl}/api/metrics`);

  return {
    ok: critical === 0,
    timestamp: new Date().toISOString(),
    checks,
    summary: { healthy, degraded, critical },
    alerts,
  };
}
