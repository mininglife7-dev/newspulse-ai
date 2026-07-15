import { DeploymentVerificationReport } from './deployment-verification';

export type IncidentCategory =
  | 'deployment-failure'
  | 'performance-degradation'
  | 'service-unavailable'
  | 'data-loss-risk'
  | 'security-breach'
  | 'infrastructure-failure'
  | 'cascading-failure';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IncidentSignal {
  type: string;
  value: number | boolean | string;
  threshold?: number;
  timestamp: string;
  component: string;
  category: IncidentCategory;
}

export interface DetectedIncident {
  incidentId: string;
  deploymentId: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  signals: IncidentSignal[];
  detectedAt: string;
  description: string;
  affectedServices: string[];
  estimatedUserImpact: number; // 0-1 scale
  previousIncidents?: string[]; // related incident IDs
  canAutoRemediate: boolean;
  requiresFounderNotification: boolean;
}

export interface IncidentDetectionContext {
  verificationReport?: DeploymentVerificationReport;
  errorRate?: number;
  latency?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  databaseLatency?: number;
  failedChecksDetails?: Array<{
    checkType: string;
    error: string;
    timestamp: string;
  }>;
  recentErrors?: Array<{
    message: string;
    count: number;
    category: string;
  }>;
}

export class IncidentDetector {
  private detectedIncidents = new Map<string, DetectedIncident>();
  private incidentHistory = new Map<string, DetectedIncident[]>();

  async detectIncidents(
    deploymentId: string,
    context: IncidentDetectionContext
  ): Promise<DetectedIncident[]> {
    const incidents: DetectedIncident[] = [];

    // Analyze verification report
    if (context.verificationReport) {
      const verificationIncidents = this.analyzeVerificationReport(
        deploymentId,
        context.verificationReport
      );
      incidents.push(...verificationIncidents);
    }

    // Analyze metrics
    const metricIncidents = this.analyzeMetrics(deploymentId, context);
    incidents.push(...metricIncidents);

    // Analyze error patterns
    const errorIncidents = this.analyzeErrorPatterns(deploymentId, context);
    incidents.push(...errorIncidents);

    // Correlate incidents
    this.correlateIncidents(incidents, deploymentId);

    // Store detected incidents
    incidents.forEach((incident) => {
      this.detectedIncidents.set(incident.incidentId, incident);
      if (!this.incidentHistory.has(deploymentId)) {
        this.incidentHistory.set(deploymentId, []);
      }
      this.incidentHistory.get(deploymentId)!.push(incident);
    });

    return incidents;
  }

  private analyzeVerificationReport(
    deploymentId: string,
    report: DeploymentVerificationReport
  ): DetectedIncident[] {
    const incidents: DetectedIncident[] = [];

    // Classify based on decision
    if (report.decision === 'ROLLBACK' || report.decision === 'ESCALATE') {
      const failedChecks = report.checks.filter((c) => c.result === 'fail');
      const severity = report.decision === 'ESCALATE' ? 'critical' : 'high';

      const signals: IncidentSignal[] = failedChecks.map((check) => ({
        type: check.type,
        value: check.result,
        timestamp: check.timestamp,
        component: check.name,
        category: this.categorizeCheckType(check.type),
      }));

      const category = this.mapChecksToCategoryPrimary(failedChecks);

      incidents.push({
        incidentId: `inc-${deploymentId}-${Date.now()}`,
        deploymentId,
        category,
        severity,
        signals,
        detectedAt: new Date().toISOString(),
        description: `Deployment verification failed: ${report.failedChecks} checks failed out of ${report.checks.length}`,
        affectedServices: failedChecks.map((c) => c.type),
        estimatedUserImpact: this.estimateUserImpact(report),
        canAutoRemediate: report.canRollback,
        requiresFounderNotification: severity === 'critical',
      });
    } else if (
      report.decision === 'HOLD' &&
      report.degradedChecks > 0
    ) {
      const degradedChecks = report.checks.filter((c) => c.result === 'degraded');

      const signals: IncidentSignal[] = degradedChecks.map((check) => ({
        type: check.type,
        value: check.result,
        threshold: 1,
        timestamp: check.timestamp,
        component: check.name,
        category: this.categorizeCheckType(check.type),
      }));

      incidents.push({
        incidentId: `inc-${deploymentId}-${Date.now()}-degraded`,
        deploymentId,
        category: 'performance-degradation',
        severity: 'medium',
        signals,
        detectedAt: new Date().toISOString(),
        description: `Deployment degraded: ${report.degradedChecks} checks degraded`,
        affectedServices: degradedChecks.map((c) => c.type),
        estimatedUserImpact: 0.3,
        canAutoRemediate: false,
        requiresFounderNotification: false,
      });
    }

    return incidents;
  }

  private analyzeMetrics(
    deploymentId: string,
    context: IncidentDetectionContext
  ): DetectedIncident[] {
    const incidents: DetectedIncident[] = [];
    const signals: IncidentSignal[] = [];

    // Check error rate
    if (context.errorRate !== undefined && context.errorRate > 0.1) {
      signals.push({
        type: 'error-rate',
        value: context.errorRate,
        threshold: 0.05,
        timestamp: new Date().toISOString(),
        component: 'api-gateway',
        category: 'service-unavailable',
      });
    }

    // Check latency
    if (context.latency !== undefined && context.latency > 10000) {
      signals.push({
        type: 'latency',
        value: context.latency,
        threshold: 5000,
        timestamp: new Date().toISOString(),
        component: 'api-gateway',
        category: 'performance-degradation',
      });
    }

    // Check resource usage
    if (context.memoryUsage !== undefined && context.memoryUsage > 0.95) {
      signals.push({
        type: 'memory-usage',
        value: context.memoryUsage,
        threshold: 0.9,
        timestamp: new Date().toISOString(),
        component: 'compute',
        category: 'infrastructure-failure',
      });
    }

    if (context.cpuUsage !== undefined && context.cpuUsage > 0.9) {
      signals.push({
        type: 'cpu-usage',
        value: context.cpuUsage,
        threshold: 0.8,
        timestamp: new Date().toISOString(),
        component: 'compute',
        category: 'infrastructure-failure',
      });
    }

    // Check database latency
    if (context.databaseLatency !== undefined && context.databaseLatency > 5000) {
      signals.push({
        type: 'database-latency',
        value: context.databaseLatency,
        threshold: 1000,
        timestamp: new Date().toISOString(),
        component: 'database',
        category: 'performance-degradation',
      });
    }

    if (signals.length > 0) {
      const primarySignal = signals[0];
      const severity = this.classifySeverity(signals);

      incidents.push({
        incidentId: `inc-${deploymentId}-metrics-${Date.now()}`,
        deploymentId,
        category: primarySignal.category,
        severity,
        signals,
        detectedAt: new Date().toISOString(),
        description: `Performance degradation detected: ${signals.map((s) => s.type).join(', ')}`,
        affectedServices: signals.map((s) => s.component),
        estimatedUserImpact: severity === 'critical' ? 0.9 : severity === 'high' ? 0.6 : 0.2,
        canAutoRemediate: false,
        requiresFounderNotification: severity === 'critical',
      });
    }

    return incidents;
  }

  private analyzeErrorPatterns(
    deploymentId: string,
    context: IncidentDetectionContext
  ): DetectedIncident[] {
    const incidents: DetectedIncident[] = [];

    if (!context.recentErrors || context.recentErrors.length === 0) {
      return incidents;
    }

    // Detect cascading failures
    const errorCategories = new Set(context.recentErrors.map((e) => e.category));
    if (errorCategories.size >= 3) {
      const signals: IncidentSignal[] = context.recentErrors.map((error) => ({
        type: error.category,
        value: error.count,
        timestamp: new Date().toISOString(),
        component: error.category,
        category: 'cascading-failure',
      }));

      incidents.push({
        incidentId: `inc-${deploymentId}-cascade-${Date.now()}`,
        deploymentId,
        category: 'cascading-failure',
        severity: 'critical',
        signals,
        detectedAt: new Date().toISOString(),
        description: 'Cascading failure detected across multiple components',
        affectedServices: Array.from(errorCategories),
        estimatedUserImpact: 0.95,
        canAutoRemediate: false,
        requiresFounderNotification: true,
      });
    }

    // Detect data loss risk
    const hasDataErrors = context.recentErrors.some(
      (e) => e.category.toLowerCase().includes('database') ||
             e.category.toLowerCase().includes('storage')
    );
    const highErrorCount = context.recentErrors.some((e) => e.count > 100);

    if (hasDataErrors && highErrorCount) {
      const signals: IncidentSignal[] = context.recentErrors
        .filter((e) => e.category.toLowerCase().includes('database'))
        .map((error) => ({
          type: error.category,
          value: error.count,
          timestamp: new Date().toISOString(),
          component: 'database',
          category: 'data-loss-risk',
        }));

      incidents.push({
        incidentId: `inc-${deploymentId}-data-loss-${Date.now()}`,
        deploymentId,
        category: 'data-loss-risk',
        severity: 'critical',
        signals,
        detectedAt: new Date().toISOString(),
        description: 'Potential data loss risk detected',
        affectedServices: ['database', 'storage'],
        estimatedUserImpact: 1.0,
        canAutoRemediate: false,
        requiresFounderNotification: true,
      });
    }

    return incidents;
  }

  private categorizeCheckType(checkType: string): IncidentCategory {
    if (checkType.includes('database')) return 'data-loss-risk';
    if (checkType.includes('latency') || checkType.includes('performance')) {
      return 'performance-degradation';
    }
    if (checkType.includes('api') || checkType.includes('health')) {
      return 'service-unavailable';
    }
    if (checkType.includes('build')) return 'deployment-failure';
    return 'service-unavailable';
  }

  private mapChecksToCategoryPrimary(
    failedChecks: Array<{ type: string }>
  ): IncidentCategory {
    // Prioritize by severity
    if (failedChecks.some((c) => c.type.includes('database'))) {
      return 'data-loss-risk';
    }
    if (failedChecks.some((c) => c.type.includes('build'))) {
      return 'deployment-failure';
    }
    if (failedChecks.some((c) => c.type.includes('api'))) {
      return 'service-unavailable';
    }
    return 'service-unavailable';
  }

  private estimateUserImpact(report: DeploymentVerificationReport): number {
    const passPercentage = report.passedChecks / report.checks.length;
    if (passPercentage === 1) return 0;
    if (passPercentage >= 0.8) return 0.1;
    if (passPercentage >= 0.6) return 0.4;
    if (passPercentage >= 0.4) return 0.7;
    return 0.95;
  }

  private classifySeverity(signals: IncidentSignal[]): IncidentSeverity {
    const criticalCount = signals.filter((s) => {
      if (typeof s.value === 'number' && s.threshold) {
        return s.value > s.threshold * 1.5;
      }
      return false;
    }).length;

    const elevatedCount = signals.filter((s) => {
      if (typeof s.value === 'number' && s.threshold) {
        return s.value > s.threshold;
      }
      return false;
    }).length;

    if (criticalCount >= 2) return 'critical';
    if (criticalCount === 1) return 'high';
    if (elevatedCount >= 2) return 'high';
    if (elevatedCount >= 1) return 'medium';
    return 'medium';
  }

  private correlateIncidents(
    incidents: DetectedIncident[],
    deploymentId: string
  ): void {
    const recentIncidents = this.incidentHistory
      .get(deploymentId)
      ?.filter((inc) => {
        const incTime = new Date(inc.detectedAt).getTime();
        const now = Date.now();
        return now - incTime < 30 * 60 * 1000; // 30 minutes
      }) || [];

    incidents.forEach((incident) => {
      incident.previousIncidents = recentIncidents
        .filter((ri) => ri.category === incident.category)
        .map((ri) => ri.incidentId);
    });
  }

  getIncident(incidentId: string): DetectedIncident | undefined {
    return this.detectedIncidents.get(incidentId);
  }

  getIncidentHistory(deploymentId: string): DetectedIncident[] {
    return this.incidentHistory.get(deploymentId) || [];
  }

  clearOldIncidents(maxAgeMinutes = 60): void {
    const cutoff = maxAgeMinutes === 0 ? Date.now() + 1000 : Date.now() - maxAgeMinutes * 60 * 1000;
    const idsToDelete: string[] = [];

    this.detectedIncidents.forEach((incident, id) => {
      if (new Date(incident.detectedAt).getTime() <= cutoff) {
        idsToDelete.push(id);
      }
    });

    idsToDelete.forEach((id) => this.detectedIncidents.delete(id));

    // Also clean up history entries
    this.incidentHistory.forEach((incidents, deployId) => {
      const filtered = incidents.filter(
        (inc) => new Date(inc.detectedAt).getTime() > cutoff
      );
      if (filtered.length === 0) {
        this.incidentHistory.delete(deployId);
      } else {
        this.incidentHistory.set(deployId, filtered);
      }
    });
  }
}

export async function detectIncidentsFromDeployment(
  deploymentId: string,
  report: DeploymentVerificationReport
): Promise<DetectedIncident[]> {
  const detector = new IncidentDetector();
  return detector.detectIncidents(deploymentId, { verificationReport: report });
}
