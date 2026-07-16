/**
 * GET /api/dashboard
 *
 * Returns the canonical governance dashboard state — single source of truth
 * for all launch readiness, mission progress, health, and blocker metrics.
 *
 * Frontend reads from this endpoint; never hardcodes metrics.
 * Inconsistencies are detected and reported in the response.
 */

import { buildDashboardState } from '@/lib/governance-state';
import type { DashboardResponse } from '@/types/governance';
import { logger } from '@/lib/logger';

export async function GET(): Promise<Response> {
  try {
    const state = buildDashboardState();

    const response: DashboardResponse = state;

    return Response.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
        'Content-Type': 'application/json',
      },
    });
  } catch (err: any) {
    logger.error('Dashboard state build failed', 'DASHBOARD_BUILD_ERROR', err);

    const response: DashboardResponse = {
      ok: false,
      error: 'Failed to build dashboard state',
      timestamp: new Date().toISOString(),
    };

    return Response.json(response, {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
