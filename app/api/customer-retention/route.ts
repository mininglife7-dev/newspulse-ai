import { type NextRequest, NextResponse } from 'next/server';
import {
  updateCustomerMetrics,
  calculateHealthScore,
  calculateRiskScore,
  segmentCustomer,
  generateTriggers,
  getCustomerHealth,
  calculateRetentionMetrics,
  getCustomersBySegment,
  getHighRiskCustomers,
  formatRetentionStatus,
} from '@/lib/customer-retention';

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');
  const timestamp = new Date().toISOString();

  try {
    switch (action) {
      case 'health':
        return NextResponse.json(
          { ok: true, timestamp, payload: formatRetentionStatus() },
          { status: 200 }
        );

      case 'metrics':
        return NextResponse.json(
          { ok: true, timestamp, payload: calculateRetentionMetrics() },
          { status: 200 }
        );

      case 'status':
        return NextResponse.json(
          { ok: true, timestamp, payload: { status: formatRetentionStatus() } },
          { status: 200 }
        );

      case 'customer-health': {
        const userId = request.nextUrl.searchParams.get('userId');
        if (typeof userId !== 'string') {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing userId parameter' },
            { status: 400 }
          );
        }
        const health = getCustomerHealth(userId);
        return NextResponse.json(
          { ok: true, timestamp, payload: health },
          { status: 200 }
        );
      }

      case 'segment': {
        const userId = request.nextUrl.searchParams.get('userId');
        if (typeof userId !== 'string') {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing userId parameter' },
            { status: 400 }
          );
        }
        const segment = segmentCustomer(userId);
        return NextResponse.json(
          { ok: true, timestamp, payload: segment },
          { status: 200 }
        );
      }

      case 'risk': {
        const userId = request.nextUrl.searchParams.get('userId');
        if (typeof userId !== 'string') {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing userId parameter' },
            { status: 400 }
          );
        }
        const risk = calculateRiskScore(userId);
        return NextResponse.json(
          { ok: true, timestamp, payload: risk },
          { status: 200 }
        );
      }

      case 'health-score': {
        const userId = request.nextUrl.searchParams.get('userId');
        if (typeof userId !== 'string') {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing userId parameter' },
            { status: 400 }
          );
        }
        const health = calculateHealthScore(userId);
        return NextResponse.json(
          { ok: true, timestamp, payload: health },
          { status: 200 }
        );
      }

      case 'triggers': {
        const userId = request.nextUrl.searchParams.get('userId');
        if (typeof userId !== 'string') {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing userId parameter' },
            { status: 400 }
          );
        }
        const triggers = generateTriggers(userId);
        return NextResponse.json(
          { ok: true, timestamp, payload: triggers },
          { status: 200 }
        );
      }

      case 'high-risk': {
        const limit = request.nextUrl.searchParams.get('limit');
        const limitNum = limit ? parseInt(limit) : 50;
        const highRisk = getHighRiskCustomers(limitNum);
        return NextResponse.json(
          { ok: true, timestamp, payload: highRisk },
          { status: 200 }
        );
      }

      case 'segment-members': {
        const segmentName = request.nextUrl.searchParams.get('segment');
        if (!segmentName || !['champions', 'loyal-customers', 'at-risk', 'churn-warning', 'dormant', 'new-users', 'power-users', 'casual-users'].includes(segmentName)) {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Invalid segment parameter' },
            { status: 400 }
          );
        }
        const members = getCustomersBySegment(segmentName as any);
        return NextResponse.json(
          { ok: true, timestamp, payload: members },
          { status: 200 }
        );
      }

      default:
        return NextResponse.json(
          {
            ok: false,
            timestamp,
            error: 'Invalid action. Valid actions: health, metrics, status, customer-health, segment, risk, health-score, triggers, high-risk, segment-members',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        timestamp,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();

  try {
    const body = (await request.json()) as unknown;
    if (typeof body !== 'object' || body === null || !('command' in body)) {
      return NextResponse.json(
        { ok: false, timestamp, error: 'Missing command field' },
        { status: 400 }
      );
    }

    const cmd = body as Record<string, unknown>;
    const command = cmd.command as string;

    switch (command) {
      case 'update-metrics': {
        const userId = cmd.user_id as unknown;
        const metrics = cmd.metrics as unknown;

        if (typeof userId !== 'string' || typeof metrics !== 'object' || !metrics) {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing or invalid user_id and metrics fields' },
            { status: 400 }
          );
        }

        const updated = updateCustomerMetrics(userId, metrics as any);
        return NextResponse.json(
          { ok: true, timestamp, payload: updated },
          { status: 200 }
        );
      }

      case 'calculate-health': {
        const userId = cmd.user_id as unknown;

        if (typeof userId !== 'string') {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing or invalid user_id field' },
            { status: 400 }
          );
        }

        const health = calculateHealthScore(userId);
        return NextResponse.json(
          { ok: true, timestamp, payload: health },
          { status: 200 }
        );
      }

      case 'calculate-risk': {
        const userId = cmd.user_id as unknown;

        if (typeof userId !== 'string') {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing or invalid user_id field' },
            { status: 400 }
          );
        }

        const risk = calculateRiskScore(userId);
        return NextResponse.json(
          { ok: true, timestamp, payload: risk },
          { status: 200 }
        );
      }

      case 'segment': {
        const userId = cmd.user_id as unknown;

        if (typeof userId !== 'string') {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing or invalid user_id field' },
            { status: 400 }
          );
        }

        const segment = segmentCustomer(userId);
        return NextResponse.json(
          { ok: true, timestamp, payload: segment },
          { status: 200 }
        );
      }

      case 'generate-triggers': {
        const userId = cmd.user_id as unknown;

        if (typeof userId !== 'string') {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing or invalid user_id field' },
            { status: 400 }
          );
        }

        const triggers = generateTriggers(userId);
        return NextResponse.json(
          { ok: true, timestamp, payload: triggers },
          { status: 200 }
        );
      }

      default:
        return NextResponse.json(
          {
            ok: false,
            timestamp,
            error: 'Invalid command. Valid commands: update-metrics, calculate-health, calculate-risk, segment, generate-triggers',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        timestamp,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
