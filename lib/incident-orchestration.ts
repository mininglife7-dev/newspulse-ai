import { DetectedIncident, IncidentSeverity } from './incident-detection';
import { RollbackDecisionEngine, RollbackDecision } from './rollback-decision-engine';
import { DeploymentVerificationReport } from './deployment-verification';

export type IncidentState =
  | 'detected'
  | 'analyzing'
  | 'escalated-to-founder'
  | 'auto-remediation-initiated'
  | 'remediation-in-progress'
  | 'remediation-complete'
  | 'remediation-failed'
  | 'verification-in-progress'
  | 'incident-resolved'
  | 'incident-unresolved';

export type OrchestrationAction =
  | 'notify-founder'
  | 'initiate-rollback'
  | 'execute-rollback'
  | 'verify-remediation'
  | 'scale-infrastructure'
  | 'throttle-traffic'
  | 'drain-queue'
  | 'none';

export interface OrchestrationDecision {
  incidentId: string;
  deploymentId: string;
  currentState: IncidentState;
  recommendedAction: OrchestrationAction;
  shouldEscalateToFounder: boolean;
  reason: string;
  evidence: string[];
  estimatedRecoveryTime: number; // seconds
  riskOfAction: 'low' | 'medium' | 'high';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  rollbackDecision?: RollbackDecision;
  timestamp: string;
  previousAttempts?: RemediationAttempt[];
}

export interface OrchestrationAuditEntry {
  timestamp: string;
  incidentId: string;
  deploymentId: string;
  action: OrchestrationAction;
  previousState: IncidentState;
  newState: IncidentState;
  reason: string;
  result?: {
    success: boolean;
    message: string;
    duration: number;
  };
}

export interface RemediationAttempt {
  action: OrchestrationAction;
  startedAt: string;
  completedAt?: string;
  success?: boolean;
  error?: string;
  duration?: number;
}

export interface IncidentOrchestrationContext {
  incident: DetectedIncident;
  verificationReport?: DeploymentVerificationReport;
  previousAttempts: RemediationAttempt[];
  deploymentHistory?: Array<{
    deploymentId: string;
    timestamp: string;
    status: string;
  }>;
  foundationMetrics?: {
    avgRecoveryTime: number;
    successRate: number;
    failurePatterns: string[];
  };
}

export class IncidentOrchestrator {
  private decisionEngine: RollbackDecisionEngine;
  private auditLog: OrchestrationAuditEntry[] = [];
  private incidentStates = new Map<string, IncidentState>();
  private remediationAttempts = new Map<string, RemediationAttempt[]>();
  private readonly maxRemediationAttempts = 3;
  private readonly remediationCooldown = 60000; // 60 seconds

  constructor() {
    this.decisionEngine = new RollbackDecisionEngine();
  }

  async orchestrateIncident(
    context: IncidentOrchestrationContext
  ): Promise<OrchestrationDecision> {
    const { incident } = context;
    const currentState: IncidentState = 'detected';
    this.incidentStates.set(incident.incidentId, currentState);

    const decision = await this.analyzeAndDecide(context);
    return decision;
  }

  private async analyzeAndDecide(
    context: IncidentOrchestrationContext
  ): Promise<OrchestrationDecision> {
    const { incident } = context;
    const evidence: string[] = [];

    // Classify severity and determine action
    let recommendedAction: OrchestrationAction = 'none';
    let shouldEscalateToFounder = false;
    let reason = '';

    if (incident.severity === 'critical') {
      evidence.push('Critical severity incident');

      if (incident.canAutoRemediate && incident.category === 'deployment-failure') {
        recommendedAction = 'initiate-rollback';
        reason = 'Critical deployment failure with auto-remediation available';
      } else if (incident.category === 'data-loss-risk') {
        recommendedAction = 'notify-founder';
        shouldEscalateToFounder = true;
        reason = 'Critical data loss risk requires founder intervention';
      } else if (incident.category === 'cascading-failure') {
        recommendedAction = 'notify-founder';
        shouldEscalateToFounder = true;
        reason = 'Cascading failure requires founder decision';
      } else if (incident.category === 'service-unavailable') {
        recommendedAction = 'initiate-rollback';
        reason = 'Critical service unavailability, initiating rollback';
      } else {
        recommendedAction = 'notify-founder';
        shouldEscalateToFounder = true;
        reason = 'Critical incident without clear auto-remediation path';
      }
    } else if (incident.severity === 'high') {
      evidence.push('High severity incident');

      if (
        incident.canAutoRemediate &&
        incident.category === 'deployment-failure'
      ) {
        recommendedAction = 'initiate-rollback';
        reason = 'High-severity deployment failure with rollback available';
      } else if (incident.category === 'performance-degradation') {
        recommendedAction = 'throttle-traffic';
        reason = 'Performance degradation, reducing traffic';
      } else {
        recommendedAction = 'verify-remediation';
        reason = 'High severity, verifying current deployment status';
      }
    } else if (incident.severity === 'medium') {
      evidence.push('Medium severity incident');

      if (incident.category === 'performance-degradation') {
        recommendedAction = 'scale-infrastructure';
        reason = 'Medium performance degradation, scaling infrastructure';
      } else {
        recommendedAction = 'verify-remediation';
        reason = 'Medium severity, monitoring for improvement';
      }
    } else {
      evidence.push('Low severity incident');
      recommendedAction = 'none';
      reason = 'Low severity incident, monitoring only';
    }

    // Check if we need to escalate due to repeated failures
    const storedAttempts = this.remediationAttempts.get(incident.deploymentId) || [];
    const allAttempts = [...storedAttempts, ...context.previousAttempts];
    const failedAttempts = allAttempts.filter((a) => !a.success);

    if (allAttempts.length >= this.maxRemediationAttempts && failedAttempts.length > 0) {
      shouldEscalateToFounder = true;
      reason = `Max remediation attempts (${this.maxRemediationAttempts}) reached`;
      recommendedAction = 'notify-founder';
      evidence.push('Remediation attempt limit exceeded');
    }

    // Estimate recovery time
    let estimatedRecoveryTime = 300; // 5 minutes default
    if (incident.severity === 'critical') {
      estimatedRecoveryTime = context.foundationMetrics?.avgRecoveryTime || 600;
    } else if (incident.severity === 'high') {
      estimatedRecoveryTime = Math.ceil(
        (context.foundationMetrics?.avgRecoveryTime || 300) * 1.5
      );
    }

    // Classify action risk
    let riskOfAction: 'low' | 'medium' | 'high' = 'low';
    if (recommendedAction === 'initiate-rollback') {
      riskOfAction = incident.severity === 'critical' ? 'medium' : 'low';
    } else if (recommendedAction === 'notify-founder') {
      riskOfAction = 'low'; // Notifying founder has low operational risk
    } else if (recommendedAction === 'throttle-traffic') {
      riskOfAction = 'medium';
    }

    const newState = this.deriveNewState(recommendedAction);
    this.incidentStates.set(incident.incidentId, newState);

    return {
      incidentId: incident.incidentId,
      deploymentId: incident.deploymentId,
      currentState: newState,
      recommendedAction,
      shouldEscalateToFounder,
      reason,
      evidence,
      estimatedRecoveryTime,
      riskOfAction,
      severity: incident.severity,
      previousAttempts: allAttempts,
      timestamp: new Date().toISOString(),
    };
  }

  async executeOrchestrationDecision(
    decision: OrchestrationDecision,
    context: IncidentOrchestrationContext
  ): Promise<{
    success: boolean;
    finalState: IncidentState;
    result?: any;
    error?: string;
  }> {
    const previousState = this.incidentStates.get(decision.incidentId) || 'detected';
    let newState: IncidentState = previousState;
    let success = false;
    let result: any;
    let error: string | undefined;

    const startedAt = new Date().toISOString();

    try {
      switch (decision.recommendedAction) {
        case 'notify-founder':
          success = await this.notifyFounder(decision, context);
          newState = 'escalated-to-founder';
          result = { notificationSent: success };
          break;

        case 'initiate-rollback':
          if (context.verificationReport) {
            success = true;
            newState = 'auto-remediation-initiated';
            result = { rollbackInitiated: true };
          } else {
            error = 'No verification report available for rollback decision';
            newState = 'incident-unresolved';
          }
          break;

        case 'execute-rollback':
          if (context.verificationReport) {
            result = await this.executeRollback(decision, context);
            success = result.success;
            newState = success ? 'remediation-complete' : 'remediation-failed';
          } else {
            error = 'Cannot execute rollback without verification report';
            newState = 'incident-unresolved';
          }
          break;

        case 'verify-remediation':
          success = await this.verifyRemediation(decision, context);
          newState = success ? 'incident-resolved' : 'incident-unresolved';
          result = { verified: success };
          break;

        case 'scale-infrastructure':
          success = true;
          newState = 'remediation-in-progress';
          result = { scalingInitiated: true };
          break;

        case 'throttle-traffic':
          success = true;
          newState = 'remediation-in-progress';
          result = { trafficThrottled: true };
          break;

        case 'drain-queue':
          success = true;
          newState = 'remediation-in-progress';
          result = { queueDrained: true };
          break;

        case 'none':
          success = true;
          newState = 'incident-resolved';
          result = { monitoring: true };
          break;
      }

      this.incidentStates.set(decision.incidentId, newState);

      // Record audit entry
      const completedAt = new Date().toISOString();
      const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();
      this.auditLog.push({
        timestamp: completedAt,
        incidentId: decision.incidentId,
        deploymentId: decision.deploymentId,
        action: decision.recommendedAction,
        previousState,
        newState,
        reason: decision.reason,
        result: {
          success,
          message: error || 'Action executed',
          duration,
        },
      });

      // Track remediation attempt
      if (decision.recommendedAction !== 'none' && decision.recommendedAction !== 'notify-founder') {
        if (!this.remediationAttempts.has(decision.deploymentId)) {
          this.remediationAttempts.set(decision.deploymentId, []);
        }
        this.remediationAttempts.get(decision.deploymentId)!.push({
          action: decision.recommendedAction,
          startedAt,
          completedAt,
          success,
          error,
          duration,
        });
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
      newState = 'incident-unresolved';
      success = false;

      this.auditLog.push({
        timestamp: new Date().toISOString(),
        incidentId: decision.incidentId,
        deploymentId: decision.deploymentId,
        action: decision.recommendedAction,
        previousState,
        newState,
        reason: `Error executing ${decision.recommendedAction}: ${error}`,
      });
    }

    return {
      success,
      finalState: newState,
      result,
      error,
    };
  }

  private async notifyFounder(
    decision: OrchestrationDecision,
    context: IncidentOrchestrationContext
  ): Promise<boolean> {
    // In a real system, this would integrate with the notification system
    // For now, we simulate it
    console.log(`FOUNDER NOTIFICATION: Incident ${decision.incidentId} requires attention`);
    console.log(`Reason: ${decision.reason}`);
    console.log(`Evidence: ${decision.evidence.join(', ')}`);
    return true;
  }

  private async executeRollback(
    decision: OrchestrationDecision,
    context: IncidentOrchestrationContext
  ): Promise<{ success: boolean; message: string }> {
    // This would normally call the rollback-decision-engine
    // For now, we simulate success
    return {
      success: true,
      message: 'Rollback executed successfully',
    };
  }

  private async verifyRemediation(
    decision: OrchestrationDecision,
    context: IncidentOrchestrationContext
  ): Promise<boolean> {
    // Verify that remediation action had desired effect
    if (!context.verificationReport) {
      return false;
    }

    // Simple heuristic: if current deployment passes most checks, consider remediation successful
    const passPercentage = context.verificationReport.passedChecks / context.verificationReport.checks.length;
    return passPercentage >= 0.8;
  }

  private deriveNewState(action: OrchestrationAction): IncidentState {
    const stateMap: Record<OrchestrationAction, IncidentState> = {
      'notify-founder': 'escalated-to-founder',
      'initiate-rollback': 'auto-remediation-initiated',
      'execute-rollback': 'remediation-in-progress',
      'verify-remediation': 'verification-in-progress',
      'scale-infrastructure': 'remediation-in-progress',
      'throttle-traffic': 'remediation-in-progress',
      'drain-queue': 'remediation-in-progress',
      'none': 'incident-resolved',
    };

    return stateMap[action];
  }

  getAuditLog(): OrchestrationAuditEntry[] {
    return [...this.auditLog];
  }

  getIncidentState(incidentId: string): IncidentState | undefined {
    return this.incidentStates.get(incidentId);
  }

  getRemediationAttempts(deploymentId: string): RemediationAttempt[] {
    return this.remediationAttempts.get(deploymentId) || [];
  }

  clearOldAuditEntries(maxAgeMinutes = 1440): void {
    const cutoff = Date.now() - maxAgeMinutes * 60 * 1000;
    this.auditLog = this.auditLog.filter(
      (entry) => new Date(entry.timestamp).getTime() > cutoff
    );
  }
}

export async function orchestrateIncidentResponse(
  context: IncidentOrchestrationContext
): Promise<OrchestrationDecision> {
  const orchestrator = new IncidentOrchestrator();
  return orchestrator.orchestrateIncident(context);
}
