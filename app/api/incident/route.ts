import { NextRequest, NextResponse } from 'next/server';
import {
  commandIncident,
  commandToAlert,
  type IncidentTrigger,
} from '@/lib/incident-commander';
import { recordAlert } from '@/lib/alert-hub';
import { requireAdminToken, unauthorizedResponse } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { validators, validate } from '@/lib/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/incident
 *
 * DNA-GOV-014 endpoint: Incident Commander.
 * REQUIRES: ADMIN_TOKEN authentication (Bearer token in Authorization header)
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
 * - 401: Missing or invalid authentication token
 */
export async function POST(req: NextRequest) {
  // Require authentication for incident commands
  if (!requireAdminToken(req)) {
    return unauthorizedResponse();
  }

  try {
    const body = (await req.json()) as IncidentTrigger;

    // Validate trigger using schema
    const validationResult = validate(body, {
      type: validators.enum([
        'error_rate',
        'latency',
        'availability',
        'cost_spike',
      ] as const),
      severity: validators.enum(['warning', 'critical'] as const),
      metric: validators.string({ maxLength: 255 }),
      threshold: validators.number({ min: 0 }),
      current: validators.number({ min: 0 }),
      message: validators.string({ maxLength: 1000 }),
    });

    if (!validationResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid trigger',
          errors: validationResult.errors,
        },
        { status: 400 }
      );
    }

    // Process incident with validated data
    const validated = validationResult.value as IncidentTrigger;
    const command = await commandIncident(validated);

    // Convert to alert and record. recordAlert takes the alert fields
    // positionally (same as every other DNA source), so unpack the alert.
    const alert = commandToAlert(command);
    recordAlert(
      'incident-commander',
      alert.severity as 'critical' | 'warning' | 'info',
      alert.title,
      alert.message,
      command.decision === 'autorollback'
        ? 'Auto-rollback completed'
        : 'Escalate to manual incident review'
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
    logger.error('Incident processing failed', 'INCIDENT_ERROR', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Incident processing failed',
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
