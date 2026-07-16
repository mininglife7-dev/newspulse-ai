/**
 * Phase 2 Data Population API
 *
 * GET /api/phase-2-data-population — Check population status
 * POST /api/phase-2-data-population — Trigger population
 *
 * DNA-GOV-216: Autonomous execution without Founder intervention
 */

import { NextResponse } from 'next/server';
import {
  getPopulationStatus,
  orchestrateDataPopulation,
  populateTestData,
} from '@/lib/phase-2-data-population';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for population

/**
 * GET /api/phase-2-data-population
 * Check current test data population status
 */
export async function GET(request: Request) {
  try {
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!projectUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Supabase credentials not configured',
        },
        { status: 503 }
      );
    }

    const populationStatus = await getPopulationStatus(
      projectUrl,
      serviceRoleKey
    );

    return NextResponse.json(
      {
        status: populationStatus.status,
        organizationsLoaded: populationStatus.organizationsLoaded,
        usersLoaded: populationStatus.usersLoaded,
        systemsLoaded: populationStatus.systemsLoaded,
        timestamp: populationStatus.timestamp,
        message:
          populationStatus.status === 'completed'
            ? `Test data loaded: ${populationStatus.organizationsLoaded} organizations`
            : 'Test data not yet populated',
      },
      {
        status: populationStatus.status === 'completed' ? 200 : 202,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Population-Status': populationStatus.status,
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/phase-2-data-population
 * Trigger test data population
 *
 * Body: {
 *   "action": "check" | "populate" | "dry-run"
 * }
 */
export async function POST(request: Request) {
  try {
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!projectUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error: 'Supabase credentials not configured',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'check') {
      const status = await getPopulationStatus(projectUrl, serviceRoleKey);
      return NextResponse.json({
        action: 'check',
        populationStatus: status,
      });
    }

    if (action === 'populate') {
      console.log('[PHASE-2-DATA-POPULATION] Triggered via API');
      const result = await orchestrateDataPopulation(
        projectUrl,
        serviceRoleKey
      );

      return NextResponse.json(
        {
          action: 'populate',
          success: result.success,
          message: result.message,
          populationStatus: result.status,
        },
        { status: result.success ? 200 : 400 }
      );
    }

    if (action === 'dry-run') {
      const status = await populateTestData(projectUrl, serviceRoleKey, true);
      return NextResponse.json({
        action: 'dry-run',
        message: `Would populate ${status.organizationsLoaded} organizations`,
        populationStatus: status,
      });
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
