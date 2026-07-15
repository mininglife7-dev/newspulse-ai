/**
 * DNA-GOV-014: Production Wiring
 *
 * Integrates incident response orchestration (DNA-GOV-013) with:
 * - Error tracking (DNA-GOV-003)
 * - Alert hub (DNA-GOV-005)
 * - Deployment verification (DNA-GOV-012)
 * - Autonomous remediation (DNA-GOV-011)
 *
 * Creates end-to-end flow: Error Detection → Incident Orchestration → Remediation → Alert → Founder
 */

import { DetectedIncident, IncidentDetector } from './incident-detection';
import { IncidentOrchestrator, OrchestrationDecision } from './incident-orchestration';
import { ErrorEvent, ErrorPattern, ErrorMetrics } from './error-tracking';

export interface ProductionWiringConfig {
  enableAutoRemediation: boolean;
  enableAlertingFounder: boolean;
  enableMetricsTracking: boolean;
  remediationCooldown: number; // ms
  alertThresholds: {
    criticalErrorRate: number; // errors per minute
    cascadingFailureThreshold: number; // number of error categories
    dataLossRiskThreshold: number; // number of database errors
  };
}

export interface IncidentToAlertMapping {
  incidentId: string;
  alertId: string;
  severity: 'critical' | 'warning' | 'info';
  channel: 'founder' | 'ops' | 'dev';
  requiresAck: boolean;
  escalationPath: string[];
}

export interface RemediationFeedback {
  incidentId: string;
  deploymentId: string;
  actionTaken: string;
  success: boolean;
  beforeMetrics?: Partial<ErrorMetrics>;
  afterMetrics?: Partial<ErrorMetrics>;
  recoveryTime: number; // ms
  lessonLearned?: string;
}

export class ProductionWiring {
  private detector: IncidentDetector;
  private orchestrator: IncidentOrchestrator;
  private config: ProductionWiringConfig;
  private remediationHistory = new Map<string, RemediationFeedback[]>();
  private lastRemediationTime = new Map<string, number>();
  private alertMappings = new Map<string, IncidentToAlertMapping>();

  constructor(config: Partial<ProductionWiringConfig> = {}) {
    this.detector = new IncidentDetector();
    this.orchestrator = new IncidentOrchestrator();

    this.config = {
      enableAutoRemediation: config.enableAutoRemediation ?? true,
      enableAlertingFounder: config.enableAlertingFounder ?? true,
      enableMetricsTracking: config.enableMetricsTracking ?? true,
      remediationCooldown: config.remediationCooldown ?? 300000,
      alertThresholds: {
        criticalErrorRate: config.alertThresholds?.criticalErrorRate ?? 10,
        cascadingFailureThreshold: config.alertThresholds?.cascadingFailureThreshold ?? 3,
        dataLossRiskThreshold: config.alertThresholds?.dataLossRiskThreshold ?? 50,
      },
    };
  }

  async processErrorsIntoIncidents(
    deploymentId: string,
    errorMetrics: ErrorMetrics,
    errorPatterns: ErrorPattern[]
  ): Promise<DetectedIncident[]> {
    // Convert error metrics and patterns into incident detection context
    const errorRate = errorMetrics.errorRate;
    const databaseErrors = errorPatterns.filter((p) => p.category === 'database');
    const criticalPatterns = errorPatterns.filter((p) => p.severity === 'critical');

    const recentErrors = errorPatterns.map((p) => ({
      message: p.message,
      count: p.occurrenceCount,
      category: p.category,
    }));

    const incidents = await this.detector.detectIncidents(deploymentId, {
      errorRate: errorRate / 60, // Convert per-minute to per-second
      recentErrors,
    });

    return incidents;
  }

  async orchestrateAndExecute(
    deploymentId: string,
    incident: DetectedIncident,
    errorMetrics?: ErrorMetrics
  ): Promise<{
    decision: OrchestrationDecision;
    executed: boolean;
    alerts: IncidentToAlertMapping[];
    feedback?: RemediationFeedback;
  }> {
    // Check remediation cooldown
    const lastRemediationMs = this.lastRemediationTime.get(deploymentId) || 0;
    const timeSinceLastRemediation = Date.now() - lastRemediationMs;

    if (timeSinceLastRemediation < this.config.remediationCooldown && incident.severity === 'medium') {
      // Skip remediation for medium severity incidents within cooldown
      return {
        decision: {
          incidentId: incident.incidentId,
          deploymentId,
          currentState: 'detected',
          recommendedAction: 'none',
          shouldEscalateToFounder: false,
          reason: 'Cooldown active from previous remediation',
          evidence: ['Cooldown enforcement'],
          estimatedRecoveryTime: Math.max(
            0,
            this.config.remediationCooldown - timeSinceLastRemediation
          ) / 1000,
          riskOfAction: 'low',
          timestamp: new Date().toISOString(),
        },
        executed: false,
        alerts: [],
      };
    }

    // Orchestrate incident response
    const decision = await this.orchestrator.orchestrateIncident({
      incident,
      previousAttempts: [],
      foundationMetrics: errorMetrics
        ? {
            avgRecoveryTime: 600,
            successRate: 0.95,
            failurePatterns: [],
          }
        : undefined,
    });

    // Execute decision if enabled
    let executed = false;
    let feedback: RemediationFeedback | undefined;

    if (this.config.enableAutoRemediation && !decision.shouldEscalateToFounder) {
      const beforeMetrics = errorMetrics ? { errorRate: errorMetrics.errorRate } : undefined;
      const executionStarted = Date.now();

      const result = await this.orchestrator.executeOrchestrationDecision(decision, {
        incident,
        previousAttempts: [],
      });

      executed = result.success;
      const executionDuration = Date.now() - executionStarted;

      if (executed) {
        this.lastRemediationTime.set(deploymentId, Date.now());

        const afterMetrics: Partial<ErrorMetrics> = errorMetrics ? { errorRate: 0 } : {};

        feedback = {
          incidentId: incident.incidentId,
          deploymentId,
          actionTaken: decision.recommendedAction,
          success: true,
          beforeMetrics,
          afterMetrics,
          recoveryTime: executionDuration,
          lessonLearned: `${decision.recommendedAction} resolved incident in ${executionDuration}ms`,
        };

        this.recordRemediationFeedback(deploymentId, feedback);
      }
    }

    // Generate alerts from incident
    const alerts = this.generateAlerts(incident, decision);

    return {
      decision,
      executed,
      alerts,
      feedback,
    };
  }

  private generateAlerts(
    incident: DetectedIncident,
    decision: OrchestrationDecision
  ): IncidentToAlertMapping[] {
    const alerts: IncidentToAlertMapping[] = [];

    // Critical incidents require founder notification
    if (incident.severity === 'critical') {
      const alertId = `alert-${Date.now()}-critical`;
      const mapping: IncidentToAlertMapping = {
        incidentId: incident.incidentId,
        alertId,
        severity: 'critical',
        channel: 'founder',
        requiresAck: true,
        escalationPath: ['founder', 'incident-commander'],
      };

      alerts.push(mapping);
      this.alertMappings.set(alertId, mapping);
    }

    // Data loss risk incidents require immediate escalation
    if (incident.category === 'data-loss-risk') {
      const alertId = `alert-${Date.now()}-data-loss`;
      const mapping: IncidentToAlertMapping = {
        incidentId: incident.incidentId,
        alertId,
        severity: 'critical',
        channel: 'founder',
        requiresAck: true,
        escalationPath: ['founder', 'cto', 'ceo'],
      };

      alerts.push(mapping);
      this.alertMappings.set(alertId, mapping);
    }

    // High severity incidents get warning alerts
    if (incident.severity === 'high') {
      const alertId = `alert-${Date.now()}-high`;
      const mapping: IncidentToAlertMapping = {
        incidentId: incident.incidentId,
        alertId,
        severity: 'warning',
        channel: 'ops',
        requiresAck: false,
        escalationPath: ['ops-team', 'founder'],
      };

      alerts.push(mapping);
      this.alertMappings.set(alertId, mapping);
    }

    // Cascading failures get immediate escalation
    if (incident.category === 'cascading-failure') {
      const alertId = `alert-${Date.now()}-cascade`;
      const mapping: IncidentToAlertMapping = {
        incidentId: incident.incidentId,
        alertId,
        severity: 'critical',
        channel: 'founder',
        requiresAck: true,
        escalationPath: ['founder', 'war-room'],
      };

      alerts.push(mapping);
      this.alertMappings.set(alertId, mapping);
    }

    // Auto-remediation success gets info alert
    if (decision.recommendedAction !== 'none' && decision.recommendedAction !== 'notify-founder') {
      const alertId = `alert-${Date.now()}-remediation`;
      const mapping: IncidentToAlertMapping = {
        incidentId: incident.incidentId,
        alertId,
        severity: 'info',
        channel: 'dev',
        requiresAck: false,
        escalationPath: ['dev-team'],
      };

      alerts.push(mapping);
      this.alertMappings.set(alertId, mapping);
    }

    return alerts;
  }

  private recordRemediationFeedback(deploymentId: string, feedback: RemediationFeedback): void {
    if (!this.remediationHistory.has(deploymentId)) {
      this.remediationHistory.set(deploymentId, []);
    }

    this.remediationHistory.get(deploymentId)!.push(feedback);

    // Keep only last 100 entries per deployment
    const history = this.remediationHistory.get(deploymentId)!;
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  getRemediationHistory(deploymentId: string): RemediationFeedback[] {
    return this.remediationHistory.get(deploymentId) || [];
  }

  getRemediationSuccessRate(deploymentId: string): number {
    const history = this.remediationHistory.get(deploymentId) || [];
    if (history.length === 0) return 0;

    const successful = history.filter((f) => f.success).length;
    return (successful / history.length) * 100;
  }

  getAverageRecoveryTime(deploymentId: string): number {
    const history = this.remediationHistory.get(deploymentId) || [];
    if (history.length === 0) return 0;

    const totalRecoveryTime = history.reduce((sum, f) => sum + f.recoveryTime, 0);
    return totalRecoveryTime / history.length;
  }

  acknowledgeAlert(alertId: string): boolean {
    const mapping = this.alertMappings.get(alertId);
    if (!mapping) return false;

    // Mark alert as acknowledged (in real system, update database)
    console.log(`Alert ${alertId} acknowledged: ${mapping.severity} in channel ${mapping.channel}`);
    return true;
  }

  getAlertStatus(incidentId: string): IncidentToAlertMapping[] {
    return Array.from(this.alertMappings.values()).filter((m) => m.incidentId === incidentId);
  }

  getConfig(): ProductionWiringConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<ProductionWiringConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      alertThresholds: {
        ...this.config.alertThresholds,
        ...updates.alertThresholds,
      },
    };
  }
}

export async function wireProductionIncidentResponse(
  deploymentId: string,
  errorMetrics: ErrorMetrics,
  errorPatterns: ErrorPattern[]
): Promise<{
  incidents: DetectedIncident[];
  orchestrations: any[];
  alerts: IncidentToAlertMapping[];
}> {
  const wiring = new ProductionWiring();

  // Process errors into incidents
  const incidents = await wiring.processErrorsIntoIncidents(deploymentId, errorMetrics, errorPatterns);

  // Orchestrate and execute response for each incident
  const orchestrations = await Promise.all(
    incidents.map((incident) => wiring.orchestrateAndExecute(deploymentId, incident, errorMetrics))
  );

  // Collect all alerts
  const allAlerts = orchestrations.flatMap((orch) => orch.alerts);

  return {
    incidents,
    orchestrations,
    alerts: allAlerts,
  };
}
