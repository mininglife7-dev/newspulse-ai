import { NextRequest, NextResponse } from 'next/server';
import { ProductionWiring } from '@/lib/production-wiring';
import { ErrorMetrics, ErrorPattern } from '@/lib/error-tracking';

export const dynamic = 'force-dynamic';

interface ProductionWiringRequest {
  deploymentId: string;
  errorMetrics: {
    totalErrors: number;
    errorRate: number;
    errorsByCategory?: Record<string, number>;
    errorsBySeverity?: Record<string, number>;
  };
  errorPatterns: Array<{
    fingerprint: string;
    category: string;
    message: string;
    severity: string;
    occurrenceCount: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: ProductionWiringRequest = await request.json();
    const { deploymentId, errorMetrics, errorPatterns } = body;

    if (!deploymentId || !errorMetrics || !errorPatterns) {
      return NextResponse.json(
        { error: 'deploymentId, errorMetrics, and errorPatterns required' },
        { status: 400 }
      );
    }

    // Create production wiring instance
    const wiring = new ProductionWiring({
      enableAutoRemediation: true,
      enableAlertingFounder: true,
      enableMetricsTracking: true,
    });

    // Convert request data to proper types
    const metrics: ErrorMetrics = {
      timestamp: new Date().toISOString(),
      totalErrors: errorMetrics.totalErrors,
      criticalErrors: 0,
      errorsByCategory: errorMetrics.errorsByCategory as Record<string, number>,
      errorsBySeverity: errorMetrics.errorsBySeverity as Record<string, number>,
      errorsByService: {},
      uniquePatterns: errorPatterns.length,
      errorRate: errorMetrics.errorRate,
      topPatterns: [],
      newPatternsLastHour: [],
      resolvedPatterns: [],
    };

    const patterns: ErrorPattern[] = errorPatterns.map((p) => ({
      fingerprint: p.fingerprint,
      category: p.category as any,
      message: p.message,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      occurrenceCount: p.occurrenceCount,
      severity: p.severity as any,
      affectedServices: new Set(),
    }));

    // Process errors into incidents
    const incidents = await wiring.processErrorsIntoIncidents(deploymentId, metrics, patterns);

    // Orchestrate response for each incident
    const orchestrations = await Promise.all(
      incidents.map((incident) =>
        wiring.orchestrateAndExecute(deploymentId, incident, metrics)
      )
    );

    // Collect results
    const allAlerts = orchestrations.flatMap((orch) => orch.alerts);
    const executedRemediation = orchestrations.filter((orch) => orch.executed);

    return NextResponse.json(
      {
        deploymentId,
        incidentsDetected: incidents.length,
        incidents: incidents.map((inc) => ({
          id: inc.incidentId,
          category: inc.category,
          severity: inc.severity,
          description: inc.description,
        })),
        orchestrations: orchestrations.map((orch) => ({
          incidentId: orch.decision.incidentId,
          decision: orch.decision.recommendedAction,
          executed: orch.executed,
          shouldEscalate: orch.decision.shouldEscalateToFounder,
          alerts: orch.alerts.length,
          recoveryTime: orch.feedback?.recoveryTime,
        })),
        remediationExecuted: executedRemediation.length,
        alertsGenerated: allAlerts.length,
        successRate: wiring.getRemediationSuccessRate(deploymentId),
        averageRecoveryTime: wiring.getAverageRecoveryTime(deploymentId),
      },
      {
        status: 200,
        headers: {
          'X-Incidents-Detected': incidents.length.toString(),
          'X-Alerts-Generated': allAlerts.length.toString(),
          'X-Remediation-Executed': executedRemediation.length.toString(),
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const deploymentId = request.nextUrl.searchParams.get('deploymentId');
    const alertId = request.nextUrl.searchParams.get('alertId');

    if (!deploymentId) {
      return NextResponse.json(
        { error: 'deploymentId required' },
        { status: 400 }
      );
    }

    const wiring = new ProductionWiring();

    if (alertId) {
      // Acknowledge alert
      const acknowledged = wiring.acknowledgeAlert(alertId);
      return NextResponse.json(
        {
          alertId,
          acknowledged,
        },
        { status: 200 }
      );
    }

    // Get wiring status for deployment
    return NextResponse.json(
      {
        deploymentId,
        remediationHistory: wiring.getRemediationHistory(deploymentId),
        successRate: wiring.getRemediationSuccessRate(deploymentId),
        averageRecoveryTime: wiring.getAverageRecoveryTime(deploymentId),
        config: wiring.getConfig(),
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      deploymentId,
      enableAutoRemediation,
      enableAlertingFounder,
      remediationCooldown,
      alertThresholds,
    } = body;

    if (!deploymentId) {
      return NextResponse.json(
        { error: 'deploymentId required' },
        { status: 400 }
      );
    }

    const wiring = new ProductionWiring();
    wiring.updateConfig({
      enableAutoRemediation,
      enableAlertingFounder,
      remediationCooldown,
      alertThresholds,
    });

    return NextResponse.json(
      {
        deploymentId,
        config: wiring.getConfig(),
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
