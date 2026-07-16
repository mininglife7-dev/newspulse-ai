/**
 * Phase 2 Automation Status Endpoint
 *
 * GET /api/phase-2-status
 *
 * Returns current Phase 2 readiness status
 * - If Supabase secrets are set: verifies schema deployment
 * - If schema is deployed: indicates Phase 2 is ready to begin
 * - Continuously monitored by Governor Ω automation
 *
 * DNA-GOV-216: Autonomous execution without Founder intervention
 */

import { NextResponse } from 'next/server';
import { getPhase2HealthStatus } from '@/lib/phase-2-automation';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const status = await getPhase2HealthStatus(projectUrl, serviceRoleKey);

    return NextResponse.json(status, {
      status:
        status.status === 'ready' ? 200 : status.status === 'error' ? 500 : 202,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Phase-2-Status': status.status,
        'X-Check-Timestamp': new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        phase2: null,
        error: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/phase-2-status/trigger
 *
 * Manually trigger Phase 2 execution (for testing/debugging)
 * Requires authentication in production
 */
export async function POST(request: Request) {
  // In production, verify authentication/authorization
  // For now, allow for testing during Phase 1-2

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'verify-schema') {
      const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      const status = await getPhase2HealthStatus(projectUrl, serviceRoleKey);

      return NextResponse.json({
        action: 'verify-schema',
        result: status,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'begin-phase-2') {
      // This would trigger actual Phase 2 execution
      // Currently a placeholder for future automation

      return NextResponse.json(
        {
          action: 'begin-phase-2',
          status: 'not-implemented',
          message: 'Phase 2 automation trigger not yet implemented',
          docs: 'See PHASE-2-AUTOMATION.md for details',
        },
        { status: 501 }
      );
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Request processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 400 }
    );
  }
}
