import { NextRequest, NextResponse } from 'next/server';
import { IncidentDetector } from '@/lib/incident-detection';
import { IncidentOrchestrator } from '@/lib/incident-orchestration';
import { verifyDeployment } from '@/lib/deployment-verification';
import { withLogging } from '@/lib/middleware-logging';

export const dynamic = 'force-dynamic';

interface IncidentResponseRequest {
  deploymentId: string;
  trigger: 'deployment-verification' | 'metrics' | 'error-pattern' | 'manual';
  verificationReport?: any;
  metrics?: {
    errorRate?: number;
    latency?: number;
    memoryUsage?: number;
    cpuUsage?: number;
    databaseLatency?: number;
  };
  recentErrors?: Array<{
    message: string;
    count: number;
    category: string;
  }>;
}

interface IncidentResponseResult {
  incidentDetected: boolean;
  incidentId?: string;
  incidents?: Array<{
    incidentId: string;
    category: string;
    severity: string;
    description: string;
  }>;
  orchestrationDecision?: {
    recommendedAction: string;
    shouldEscalateToFounder: boolean;
    reason: string;
    estimatedRecoveryTime: number;
  };
  executionResult?: {
    success: boolean;
    finalState: string;
    error?: string;
  };
  auditLog?: Array<{
    timestamp: string;
    action: string;
    previousState: string;
    newState: string;
    reason: string;
  }>;
}

export async function POST(request: NextRequest) {
  return withLogging(
    request,
    async () => {
      try {
        const body: IncidentResponseRequest = await request.json();
        const { deploymentId, trigger, verificationReport, metrics, recentErrors } = body;

        if (!deploymentId) {
          return NextResponse.json(
            { error: 'deploymentId required' },
            { status: 400 }
          );
        }

        // Detect incidents
        const detector = new IncidentDetector();
        const incidents = await detector.detectIncidents(deploymentId, {
          verificationReport,
          errorRate: metrics?.errorRate,
          latency: metrics?.latency,
          memoryUsage: metrics?.memoryUsage,
          cpuUsage: metrics?.cpuUsage,
          databaseLatency: metrics?.databaseLatency,
          recentErrors,
        });

        const result: IncidentResponseResult = {
          incidentDetected: incidents.length > 0,
          incidents: incidents.map((inc) => ({
            incidentId: inc.incidentId,
            category: inc.category,
            severity: inc.severity,
            description: inc.description,
          })),
        };

        if (incidents.length > 0) {
          // Get verification report if not provided
          let report = verificationReport;
          if (!report) {
            try {
              report = await verifyDeployment(deploymentId);
            } catch (e) {
              // If verification fails, continue with orchestration anyway
              console.error('Failed to verify deployment:', e);
            }
          }

          // Orchestrate response for highest severity incident
          const primaryIncident = incidents.sort(
            (a, b) => {
              const severityMap = { critical: 3, high: 2, medium: 1, low: 0 };
              return severityMap[b.severity as keyof typeof severityMap] -
                     severityMap[a.severity as keyof typeof severityMap];
            }
          )[0];

          const orchestrator = new IncidentOrchestrator();
          const decision = await orchestrator.orchestrateIncident({
            incident: primaryIncident,
            verificationReport: report,
            previousAttempts: [],
          });

          result.incidentId = primaryIncident.incidentId;
          result.orchestrationDecision = {
            recommendedAction: decision.recommendedAction,
            shouldEscalateToFounder: decision.shouldEscalateToFounder,
            reason: decision.reason,
            estimatedRecoveryTime: decision.estimatedRecoveryTime,
          };

          // Execute decision if not escalating to founder
          if (!decision.shouldEscalateToFounder) {
            const executionResult = await orchestrator.executeOrchestrationDecision(decision, {
              incident: primaryIncident,
              verificationReport: report,
              previousAttempts: [],
            });

            result.executionResult = {
              success: executionResult.success,
              finalState: executionResult.finalState,
              error: executionResult.error,
            };
          }

          result.auditLog = orchestrator
            .getAuditLog()
            .filter((entry) => entry.incidentId === primaryIncident.incidentId)
            .map((entry) => ({
              timestamp: entry.timestamp,
              action: entry.action,
              previousState: entry.previousState,
              newState: entry.newState,
              reason: entry.reason,
            }));
        }

        const statusCode = result.incidentDetected ? 207 : 200;
        const headers: Record<string, string> = {
          'X-Incidents-Detected': result.incidentDetected ? 'true' : 'false',
          'X-Incident-Count': (incidents.length).toString(),
        };

        if (result.incidentId) {
          headers['X-Primary-Incident'] = result.incidentId;
          headers['X-Escalated-To-Founder'] = result.orchestrationDecision?.shouldEscalateToFounder ? 'true' : 'false';
        }

        return NextResponse.json(result, { status: statusCode, headers });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
          {
            error: message,
            incidentDetected: false,
          },
          { status: 500 }
        );
      }
    },
    {
      endpoint: '/api/incident-response',
      method: 'POST',
    }
  );
}

export async function GET(request: NextRequest) {
  return withLogging(
    request,
    async () => {
      try {
        const deploymentId = request.nextUrl.searchParams.get('deploymentId');
        const incidentId = request.nextUrl.searchParams.get('incidentId');

        if (!deploymentId && !incidentId) {
          return NextResponse.json(
            { error: 'deploymentId or incidentId required' },
            { status: 400 }
          );
        }

        // Get current verification status
        const report = await verifyDeployment(deploymentId || 'current');

        // Check for incidents
        const detector = new IncidentDetector();
        const incidents = await detector.detectIncidents(
          deploymentId || 'current',
          { verificationReport: report }
        );

        return NextResponse.json(
          {
            deploymentId: deploymentId || 'current',
            incidentsDetected: incidents.length,
            incidents: incidents.map((inc) => ({
              incidentId: inc.incidentId,
              category: inc.category,
              severity: inc.severity,
              description: inc.description,
              canAutoRemediate: inc.canAutoRemediate,
              requiresFounderNotification: inc.requiresFounderNotification,
            })),
            verificationStatus: {
              passedChecks: report.passedChecks,
              failedChecks: report.failedChecks,
              degradedChecks: report.degradedChecks,
              overallHealth: report.overallHealth,
              decision: report.decision,
            },
          },
          {
            status: 200,
            headers: {
              'X-Incidents-Detected': (incidents.length).toString(),
              'X-Overall-Health': report.overallHealth,
            },
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
          { error: message, incidentsDetected: 0 },
          { status: 500 }
        );
      }
    },
    {
      endpoint: '/api/incident-response',
      method: 'GET',
    }
  );
}
