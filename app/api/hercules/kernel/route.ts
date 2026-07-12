/**
 * HERCULES Kernel API
 *
 * Exposes the unified kernel service for enterprise management,
 * mission tracking, task queue, and system status.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  HerculesKernel,
  type Enterprise,
  type Mission,
  type Task,
} from '@/lib/hercules-kernel';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const kernel = HerculesKernel.getInstance();

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (!action) {
      return NextResponse.json({
        status: 'operational',
        kernel: kernel.getSystemStatus(),
      });
    }

    if (action === 'status') {
      return NextResponse.json({
        status: 'operational',
        kernel: kernel.getSystemStatus(),
      });
    }

    if (action === 'enterprises') {
      return NextResponse.json({
        enterprises: kernel.getAllEnterprises(),
      });
    }

    if (action === 'health') {
      const enterpriseId = searchParams.get('enterpriseId') || '';
      if (!enterpriseId) {
        return NextResponse.json(
          { error: 'enterpriseId query parameter required' },
          { status: 400 }
        );
      }

      const health = kernel.getHealth(enterpriseId);
      return NextResponse.json({
        enterpriseId,
        health: health || kernel.calculateHealth(enterpriseId),
      });
    }

    if (action === 'audit') {
      const enterpriseId = searchParams.get('enterpriseId') || undefined;
      const limit = parseInt(searchParams.get('limit') || '100');

      return NextResponse.json({
        auditLog: kernel.getAuditLog(enterpriseId, limit),
      });
    }

    if (action === 'heartbeat') {
      return NextResponse.json({
        lastHeartbeat: kernel.getLastHeartbeat(),
        systemStatus: kernel.getSystemStatus(),
      });
    }

    // Default: return system status
    return NextResponse.json({
      status: 'operational',
      kernel: kernel.getSystemStatus(),
    });
  } catch (error) {
    logger.error('HERCULES kernel GET request failed', 'KERNEL_GET_ERROR', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const kernel = HerculesKernel.getInstance();

  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'register-enterprise') {
      const { id, name, missionStatement, objectives } = body;

      const enterprise = kernel.registerEnterprise({
        id,
        name,
        missionStatement,
        objectives: objectives || [],
        status: 'ACTIVE',
      });

      return NextResponse.json(
        {
          success: true,
          enterprise,
        },
        { status: 201 }
      );
    }

    if (action === 'create-mission') {
      const { enterpriseId, title, description, objectives } = body;

      const mission = kernel.createMission(enterpriseId, {
        title,
        description,
        status: 'QUEUED',
        objectives: objectives || [],
        missionStatement: title,
      } as any);

      return NextResponse.json(
        {
          success: true,
          mission,
        },
        { status: 201 }
      );
    }

    if (action === 'create-task') {
      const {
        enterpriseId,
        title,
        description,
        priority,
        authorityRequired,
      } = body;

      const task = kernel.createTask(enterpriseId, {
        title,
        description,
        priority: priority || 3,
        authorityRequired: authorityRequired || 'B_GUARDRAILS',
        preconditions: body.preconditions || [],
        postconditions: body.postconditions || [],
        evidence: [],
        state: 'QUEUED',
        maxRetries: 3,
        dependsOn: body.dependsOn || [],
      });

      return NextResponse.json(
        {
          success: true,
          task,
        },
        { status: 201 }
      );
    }

    if (action === 'start-task') {
      const { taskId } = body;
      kernel.startTask(taskId);

      return NextResponse.json({
        success: true,
        message: 'Task started',
      });
    }

    if (action === 'complete-task') {
      const { taskId, evidence } = body;
      kernel.completeTask(taskId, evidence || []);

      return NextResponse.json({
        success: true,
        message: 'Task completed',
      });
    }

    if (action === 'fail-task') {
      const { taskId, reason } = body;
      kernel.failTask(taskId, reason || 'Unknown failure');

      return NextResponse.json({
        success: true,
        message: 'Task failed and handled',
      });
    }

    if (action === 'emit-event') {
      const { enterpriseId, type, source, severity, payload, tags } = body;
      const event = kernel.emitEvent(
        enterpriseId,
        type,
        source,
        severity,
        payload,
        tags
      );

      return NextResponse.json(
        {
          success: true,
          event,
        },
        { status: 201 }
      );
    }

    if (action === 'heartbeat') {
      kernel.heartbeat();
      return NextResponse.json({
        success: true,
        lastHeartbeat: kernel.getLastHeartbeat(),
      });
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('HERCULES kernel POST request failed', 'KERNEL_POST_ERROR', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
