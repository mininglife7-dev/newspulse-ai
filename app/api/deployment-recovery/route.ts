import { NextResponse } from 'next/server';
import { verifyDeployment } from '@/lib/deployment-verification';
import { RollbackDecisionEngine } from '@/lib/rollback-decision-engine';
import { recordDeploymentAlert } from '@/lib/alert-hub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/deployment-recovery
 *
 * DNA-GOV-012 endpoint: Deployment Recovery and Health Monitoring.
 *
 * Returns current deployment status and recovery readiness:
 * - Deployment health check results
 * - Error rate analysis
 * - Rollback availability and previous state
 * - Recovery decision confidence
 *
 * Used by: GitHub Actions workflow, monitoring dashboard
 */
export async function GET(req: Request) {
  try {
    const deploymentId = new URL(req.url).searchParams.get('deploymentId') || 'current';

    // Get deployment health
    const report = await verifyDeployment(deploymentId);

    // Check if rollback is available and needed
    const engine = new RollbackDecisionEngine();
    const isHealthy = report.overallHealth === 'healthy';
    const isDegraded = report.overallHealth === 'degraded';

    return NextResponse.json(
      {
        ok: isHealthy,
        timestamp: new Date().toISOString(),
        deploymentId,
        health: {
          status: report.overallHealth,
          passedChecks: report.passedChecks,
          failedChecks: report.failedChecks,
          degradedChecks: report.degradedChecks,
          totalChecks: report.checks.length,
        },
        recovery: {
          canRollback: report.canRollback,
          rollbackAvailable: report.canRollback,
          recommendedAction: report.recommendedAction,
          decision: report.decision,
          riskLevel: isDegraded ? 'medium' : isHealthy ? 'low' : 'critical',
        },
        checks: report.checks.map((check: any) => ({
          name: check.name,
          status: check.status || 'unknown',
          message: check.message || '',
        })),
      },
      {
        status: isHealthy ? 200 : isDegraded ? 206 : 503,
        headers: {
          'X-Deployment-Health': report.overallHealth,
          'X-Passed-Checks': String(report.passedChecks),
          'X-Failed-Checks': String(report.failedChecks),
          'X-Can-Rollback': String(report.canRollback),
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[deployment-recovery] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Deployment recovery check failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

/**
 * POST /api/deployment-recovery
 *
 * Orchestrate deployment recovery: verify deployment, detect incidents,
 * and execute rollback if needed.
 *
 * Request body:
 * {
 *   deploymentId: string;
 *   errorRate?: number; // 0-1
 *   latency?: number; // ms
 *   reason?: string;
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { deploymentId = 'current', errorRate, latency, reason } = body;

    // Verify deployment
    const report = await verifyDeployment(deploymentId);

    // Determine if recovery is needed based on health
    const needsRecovery =
      report.overallHealth === 'critical' ||
      (errorRate !== undefined && errorRate > 0.05) ||
      (latency !== undefined && latency > 5000);

    // Make recovery decision
    const engine = new RollbackDecisionEngine();
    let recoveryDecision: any = null;

    if (needsRecovery && report.canRollback) {
      recoveryDecision = await engine.makeDecision({
        deploymentId,
        previousDeploymentId: 'previous',
        verificationReport: report,
        previousAttempts: [],
        relatedIncidents: [],
      });
    }

    // Record to Alert Hub
    if (needsRecovery) {
      recordDeploymentAlert({
        deploymentId,
        severity: report.overallHealth === 'critical' ? 'critical' : 'warning',
        reason: reason || 'Deployment health degradation',
        errorRate,
        latency,
        decision: recoveryDecision?.decision || 'manual-review-required',
        canAutoRecover: report.canRollback,
      });
    }

    return NextResponse.json(
      {
        ok: !needsRecovery,
        timestamp: new Date().toISOString(),
        deploymentId,
        healthStatus: report.overallHealth,
        recoveryNeeded: needsRecovery,
        metrics: {
          errorRate: errorRate || null,
          latency: latency || null,
        },
        decision: recoveryDecision || {
          decision: 'none',
          reason: 'Deployment is healthy',
          confidence: 1.0,
        },
        recommendation:
          recoveryDecision?.decision === 'rollback'
            ? 'Execute rollback immediately'
            : recoveryDecision?.decision === 'partial-remediation'
              ? 'Apply targeted remediation'
              : 'Continue monitoring',
      },
      {
        status: needsRecovery && !report.canRollback ? 503 : needsRecovery ? 206 : 200,
        headers: {
          'X-Recovery-Needed': String(needsRecovery),
          'X-Can-Recover': String(report.canRollback),
          'X-Health-Status': report.overallHealth,
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[deployment-recovery] Orchestration failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Deployment recovery orchestration failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
