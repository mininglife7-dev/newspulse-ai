import { NextResponse } from 'next/server';
import { commandIncident, commandToAlert, type IncidentTrigger } from '@/lib/incident-commander';
import { recordAlert } from '@/lib/alert-hub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/incident
 *
 * DNA-GOV-014 endpoint: Incident Commander.
 *
 * Receives incident triggers from monitoring systems (DNA-001/002/004/008/011)
 * and makes autonomous remediation decisions:
 * - CRITICAL + low-impact candidate → auto-rollback
 * - CRITICAL + no safe candidate → manual review alert
 * - WARNING → manual review alert
 *
 * Request body:
 * {
 *   "type": "error_rate" | "latency" | "availability" | "cost_spike",
 *   "severity": "warning" | "critical",
 *   "metric": "P95 latency (ms)",
 *   "threshold": 2000,
 *   "current": 5500,
 *   "message": "P95 latency spiked to 5.5s (threshold: 2.0s)"
 * }
 *
 * Returns:
 * - 200 + incident command: Decision made, action taken/pending
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as IncidentTrigger;

    // Validate trigger
    const validTypes = ['error_rate', 'latency', 'availability', 'cost_spike'];
    const validSeverities = ['warning', 'critical'];

    if (!validTypes.includes(body.type) || !validSeverities.includes(body.severity)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid trigger',
          message: `type must be one of: ${validTypes.join(', ')}; severity must be one of: ${validSeverities.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (typeof body.current !== 'number' || typeof body.threshold !== 'number') {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid trigger',
          message: 'current and threshold must be numbers',
        },
        { status: 400 }
      );
    }

    // Process incident
    const command = await commandIncident(body);

    // Convert to alert and record
    const alert = commandToAlert(command);
    recordAlert(
      'incident',
      alert.severity as 'critical' | 'warning' | 'info',
      alert.title,
      alert.message
    );

    const status = command.decision === 'autorollback' ? 200 : 202; // 200 for executed, 202 for pending
    const statusText =
      command.decision === 'autorollback'
        ? 'Incident remediated'
        : 'Incident escalated to manual review';

    return NextResponse.json(
      {
        ok: command.status !== 'failed',
        timestamp: new Date().toISOString(),
        status: statusText,
        command: {
          id: command.id,
          decision: command.decision,
          status: command.status,
          reason: command.reason,
          target: command.rollbackTarget
            ? {
                commit: command.rollbackTarget.commit,
                message: command.rollbackTarget.message,
                age: command.rollbackTarget.duration,
              }
            : null,
        },
        alertRecorded: true,
      },
      { status }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[incident] POST failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Incident processing failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

/**
 * GET /api/incident
 *
 * Health check for incident commander
 */
export async function GET(req: Request) {
  return NextResponse.json(
    {
      ok: true,
      service: 'incident-commander',
      timestamp: new Date().toISOString(),
      status: 'ready',
    },
    { status: 200 }
  );
}
