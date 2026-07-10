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
import { getSafeErrorResponse } from '@/lib/error-handler';
import { cacheHeaders } from '@/lib/cache-control';
import type { DashboardResponse } from '@/types/governance';

export async function GET(): Promise<Response> {
  try {
    const state = buildDashboardState();

    const response: DashboardResponse = state;

    return Response.json(response, {
      status: 200,
      headers: {
        ...cacheHeaders.medium,
        'Content-Type': 'application/json',
      },
    });
  } catch (err: unknown) {
    const errorMessage = getSafeErrorResponse(
      'Failed to build dashboard state',
      err,
      'api/dashboard'
    );

    const response: DashboardResponse = {
      ok: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };

    return Response.json(response, {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
