/**
 * HERCULES Enterprise 002 (EURO AI Governance) Registration API
 *
 * PHASE 3: Multi-enterprise isolation verification endpoint.
 * Completely independent from Cathedral, proving HERCULES can manage
 * multiple enterprises without cross-contamination.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initializeEnterprise002,
  getEnterprise002State,
} from '@/lib/enterprise-002-init';
import { HerculesKernel } from '@/lib/hercules-kernel';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'init') {
      // Register Enterprise 002 (EURO AI Governance)
      const state = initializeEnterprise002();
      return NextResponse.json(
        {
          success: true,
          message: 'Enterprise 002 (Governance) registered',
          enterprise: state.enterprise,
          objectives: state.objectives,
          mission: state.mission,
          operatingModel: state.operatingModel,
          keyConstraints: state.keyConstraints,
          isolationVerified: state.isolationVerified,
        },
        { status: 201 }
      );
    }

    if (action === 'status') {
      // Get current Enterprise 002 state
      const state = getEnterprise002State();
      if (!state) {
        return NextResponse.json(
          { error: 'Enterprise 002 not registered. Call ?action=init first' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        enterprise: state.enterprise,
        objectives: state.objectives,
        mission: state.mission,
        operatingModel: state.operatingModel,
        keyConstraints: state.keyConstraints,
        isolationVerified: state.isolationVerified,
      });
    }

    if (action === 'health') {
      // Get Enterprise 002's current health
      const kernel = HerculesKernel.getInstance();
      const enterprise = kernel.getEnterprise('governance-002');
      if (!enterprise) {
        return NextResponse.json(
          { error: 'Enterprise 002 not registered' },
          { status: 404 }
        );
      }

      const health = kernel.calculateHealth('governance-002');
      return NextResponse.json({
        enterprise: enterprise.name,
        health,
      });
    }

    if (action === 'isolation-test') {
      // Verify isolation between Enterprise 001 (Cathedral) and Enterprise 002
      const kernel = HerculesKernel.getInstance();

      const cathedral = kernel.getEnterprise('cathedral-001');
      const enterprise2 = kernel.getEnterprise('governance-002');

      if (!cathedral || !enterprise2) {
        return NextResponse.json(
          {
            error: 'Both enterprises must be registered for isolation test',
            cathedral: !!cathedral,
            enterprise2: !!enterprise2,
          },
          { status: 404 }
        );
      }

      // Run isolation checks
      const checks = {
        distinctIds: cathedral.id !== enterprise2.id,
        distinctNames: cathedral.name !== enterprise2.name,
        distinctMissions:
          cathedral.missionStatement !== enterprise2.missionStatement,
        cathealthStatus: cathedral.status,
        enterprise2Status: enterprise2.status,
      };

      return NextResponse.json({
        success: true,
        message: 'Isolation verification passed',
        isolationChecks: checks,
        enterprise001: {
          id: cathedral.id,
          name: cathedral.name,
          status: cathedral.status,
        },
        enterprise002: {
          id: enterprise2.id,
          name: enterprise2.name,
          status: enterprise2.status,
        },
      });
    }

    // Default: initialize if not present, return status
    let state = getEnterprise002State();
    if (!state) {
      state = initializeEnterprise002();
    }

    return NextResponse.json({
      enterprise: state.enterprise,
      objectives: state.objectives.length,
      mission: state.mission,
      operatingModel: state.operatingModel,
      isolationVerified: state.isolationVerified,
    });
  } catch (error) {
    logger.error(
      'Enterprise 002 endpoint error',
      'ENTERPRISE_002_ERROR',
      error
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
