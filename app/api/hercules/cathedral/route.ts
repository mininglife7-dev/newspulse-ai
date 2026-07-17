/**
 * HERCULES Cathedral Enterprise Registration API
 *
 * Endpoint for initializing and querying Cathedral/EURO AI as Enterprise 001.
 * ADMIN TOKEN REQUIRED: Pass Authorization: Bearer <token> header
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initializeCathedralEnterprise,
  getCathedralState,
} from '@/lib/cathedral-enterprise-init';
import { HerculesKernel } from '@/lib/hercules-kernel';
import { logger } from '@/lib/logger';
import { requireAdminToken, unauthorizedResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!requireAdminToken(request)) {
    return unauthorizedResponse();
  }
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'init') {
      // Register Cathedral as Enterprise 001
      const state = initializeCathedralEnterprise();
      return NextResponse.json(
        {
          success: true,
          message: 'Cathedral Enterprise 001 registered',
          enterprise: state.enterprise,
          objectives: state.objectives,
          launchGates: state.launchGates,
          risks: state.risks,
        },
        { status: 201 }
      );
    }

    if (action === 'status') {
      // Get current Cathedral state
      const state = getCathedralState();
      if (!state) {
        return NextResponse.json(
          { error: 'Cathedral not registered. Call ?action=init first' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        enterprise: state.enterprise,
        objectives: state.objectives,
        launchGates: state.launchGates,
        risks: state.risks,
      });
    }

    if (action === 'health') {
      // Get Cathedral's current health
      const kernel = HerculesKernel.getInstance();
      const enterprise = kernel.getEnterprise('cathedral-001');
      if (!enterprise) {
        return NextResponse.json(
          { error: 'Cathedral not registered' },
          { status: 404 }
        );
      }

      const health = kernel.calculateHealth('cathedral-001');
      return NextResponse.json({
        enterprise: enterprise.name,
        health,
      });
    }

    // Default: initialize if not present, return status
    let state = getCathedralState();
    if (!state) {
      state = initializeCathedralEnterprise();
    }

    return NextResponse.json({
      enterprise: state.enterprise,
      objectives: state.objectives.length,
      launchGates: state.launchGates,
      risks: state.risks,
    });
  } catch (error) {
    logger.error('Cathedral endpoint error', 'CATHEDRAL_ERROR', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
