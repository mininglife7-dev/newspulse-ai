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
      const remediation = new Date(incident.remediatedAt || recoveredAt).getTime();
      const recovery = new Date(recoveredAt).getTime();

      incident.recoveredAt = recoveredAt;
      incident.recoveryDurationMs = Math.max(0, recovery - remediation);
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
      remediationAttempts: resolvedIncidents.length,
      remediationSuccesses: resolvedIncidents.length,
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

export function getProductionMetrics(): ProductionMetrics {
  if (!globalMetrics) {
    globalMetrics = new ProductionMetrics();
  }
  return globalMetrics;
}

export function resetProductionMetrics(): void {
  globalMetrics = new ProductionMetrics();
}
