import { requireAdminToken, unauthorizedResponse } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import {
  verifyDeployment,
  DeploymentVerificationReport,
} from '@/lib/deployment-verification';
import {
  RollbackDecisionEngine,
  executeRollback,
} from '@/lib/rollback-decision-engine';

export const dynamic = 'force-dynamic';

// Global rollback decision engine instance
const rollbackEngine = new RollbackDecisionEngine();

export async function GET(request: NextRequest) {
  if (!requireAdminToken(request)) {
    return unauthorizedResponse();
  }
  try {
    const deploymentId =
      request.nextUrl.searchParams.get('deploymentId') || 'current';

    // Verify current deployment
    const report = await verifyDeployment(deploymentId);

    const statusCode =
      report.overallHealth === 'healthy'
        ? 200
        : report.overallHealth === 'degraded'
          ? 206
          : 503;

    return NextResponse.json(
      {
        status: report.overallHealth,
        deploymentId: report.deploymentId,
        timestamp: report.timestamp,
        passedChecks: report.passedChecks,
        failedChecks: report.failedChecks,
        degradedChecks: report.degradedChecks,
        totalChecks: report.checks.length,
        decision: report.decision,
        canRollback: report.canRollback,
        recommendedAction: report.recommendedAction,
        checks: report.checks,
        evidence: report.evidence,
      },
      {
        status: statusCode,
        headers: {
          'X-Overall-Health': report.overallHealth,
          'X-Passed-Checks': String(report.passedChecks),
          'X-Failed-Checks': String(report.failedChecks),
          'X-Decision': report.decision,
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error during deployment verification';
    return NextResponse.json(
      {
        status: 'error',
        error: message,
      },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!requireAdminToken(request)) {
    return unauthorizedResponse();
  }
  try {
    const body = await request.json();
    const { deploymentId, previousDeploymentId, metrics, decidedDecision } =
      body;

    if (!deploymentId) {
      return NextResponse.json(
        { error: 'Invalid request: deploymentId required' },
        { status: 400 }
      );
    }

    // Verify deployment
    const report = await verifyDeployment(deploymentId, metrics);

    // Make rollback decision
    const decision = await rollbackEngine.makeDecision({
      deploymentId,
      previousDeploymentId: previousDeploymentId || 'previous',
      verificationReport: report,
      previousAttempts: [],
      relatedIncidents: [],
    });

    // Log decision
    if (decidedDecision) {
      const attempt = {
        timestamp: new Date().toISOString(),
        deploymentId,
        reason: `Verification decision: ${decision.decision}`,
        result: null as any,
        duration: Date.now(),
      };
      rollbackEngine.recordRollbackAttempt(deploymentId, attempt);
    }

    const statusCode =
      report.overallHealth === 'healthy'
        ? 200
        : report.overallHealth === 'degraded'
          ? 206
          : 503;

    return NextResponse.json(
      {
        status:
          statusCode === 200
            ? 'healthy'
            : statusCode === 206
              ? 'degraded'
              : 'critical',
        deploymentId,
        verificationReport: {
          passedChecks: report.passedChecks,
          failedChecks: report.failedChecks,
          degradedChecks: report.degradedChecks,
          overallHealth: report.overallHealth,
          decision: report.decision,
        },
        rollbackDecision: {
          decision: decision.decision,
          confidence: decision.confidence,
          riskLevel: decision.riskLevel,
          estimatedOutageMinutes: decision.estimatedOutageMinutes,
          recommendedAction: decision.recommendedAction,
          evidence: decision.evidence,
        },
      },
      {
        status: 201,
        headers: {
          'X-Deployment-ID': deploymentId,
          'X-Overall-Health': report.overallHealth,
          'X-Rollback-Decision': decision.decision,
          'X-Risk-Level': decision.riskLevel,
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error processing deployment verification';
    return NextResponse.json(
      {
        status: 'error',
        error: message,
      },
      { status: 503 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!requireAdminToken(request)) {
    return unauthorizedResponse();
  }
  try {
    const body = await request.json();
    const {
      deploymentId,
      previousDeploymentId,
      reason,
      evidence,
      attempts,
      maxAttempts,
    } = body;

    if (!deploymentId || !previousDeploymentId) {
      return NextResponse.json(
        {
          error:
            'Invalid request: deploymentId and previousDeploymentId required',
        },
        { status: 400 }
      );
    }

    // Execute rollback
    const result = await executeRollback({
      deploymentId,
      previousDeploymentId,
      reason: reason || 'Automatic rollback',
      evidence: evidence || [],
      timestamp: new Date().toISOString(),
      attempts: attempts || 1,
      maxAttempts: maxAttempts || 3,
    });

    if (result.success) {
      rollbackEngine.recordSuccessfulRollback(previousDeploymentId);
    } else {
      const attempt = {
        timestamp: new Date().toISOString(),
        deploymentId,
        reason: reason || 'Rollback failed',
        result: null as any,
        duration: Date.now(),
      };
      rollbackEngine.recordRollbackAttempt(deploymentId, attempt);
    }

    const statusCode = result.success ? 200 : 503;

    return NextResponse.json(
      {
        status: result.success ? 'rolled-back' : 'rollback-failed',
        deploymentId: result.currentDeploymentId,
        previousDeploymentId: result.previousDeploymentId,
        success: result.success,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        beforeState: result.beforeState,
        afterState: result.afterState,
        recoveryProof: result.recoveryProof,
        auditLog: result.auditLog,
        error: result.error,
      },
      {
        status: statusCode,
        headers: {
          'X-Rollback-Success': result.success ? 'true' : 'false',
          'X-Previous-Deployment': result.previousDeploymentId,
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error executing rollback';
    return NextResponse.json(
      {
        status: 'error',
        error: message,
      },
      { status: 503 }
    );
  }
}
