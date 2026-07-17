import { type NextRequest, NextResponse } from 'next/server';
import {
  initializeRealtimeSync,
  disconnectRealtimeSync,
  subscribeToTable,
  unsubscribeFromTable,
  detectConflict,
  resolveConflict,
  getSyncState,
  getActiveSubscriptions,
  getRecentEvents,
  getActiveConflicts,
  formatSyncStatus,
} from '@/lib/supabase-realtime-sync';
import { requireAdminToken, unauthorizedResponse } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  if (!requireAdminToken(request)) {
    return unauthorizedResponse();
  }
  const action = request.nextUrl.searchParams.get('action');
  const timestamp = new Date().toISOString();

  try {
    switch (action) {
      case 'health':
        return NextResponse.json(
          { ok: true, timestamp, payload: getSyncState() },
          { status: 200 }
        );

      case 'subscriptions':
        return NextResponse.json(
          { ok: true, timestamp, payload: getActiveSubscriptions() },
          { status: 200 }
        );

      case 'events': {
        const table = request.nextUrl.searchParams.get('table');
        const limit = parseInt(
          request.nextUrl.searchParams.get('limit') || '50',
          10
        );
        const events = getRecentEvents(table || undefined, limit);
        return NextResponse.json(
          { ok: true, timestamp, payload: events },
          { status: 200 }
        );
      }

      case 'conflicts':
        return NextResponse.json(
          { ok: true, timestamp, payload: getActiveConflicts() },
          { status: 200 }
        );

      case 'status':
        return NextResponse.json(
          { ok: true, timestamp, payload: { status: formatSyncStatus() } },
          { status: 200 }
        );

      default:
        return NextResponse.json(
          {
            ok: false,
            timestamp,
            error:
              'Invalid action. Valid actions: health, subscriptions, events, conflicts, status',
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
  if (!requireAdminToken(request)) {
    return unauthorizedResponse();
  }
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
      case 'init': {
        const status = initializeRealtimeSync();
        return NextResponse.json(
          { ok: true, timestamp, payload: { status } },
          { status: 200 }
        );
      }

      case 'disconnect': {
        disconnectRealtimeSync();
        return NextResponse.json(
          { ok: true, timestamp, payload: { status: 'disconnected' } },
          { status: 200 }
        );
      }

      case 'subscribe': {
        const table = cmd.table as unknown;
        const event = cmd.event as unknown;
        const filter = cmd.filter as unknown;

        if (typeof table !== 'string') {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing or invalid table field' },
            { status: 400 }
          );
        }

        const subscription = subscribeToTable(
          table,
          (typeof event === 'string' ? event : '*') as any,
          typeof filter === 'string' ? filter : undefined
        );
        return NextResponse.json(
          { ok: true, timestamp, payload: subscription },
          { status: 200 }
        );
      }

      case 'unsubscribe': {
        const subId = cmd.subscription_id as unknown;
        if (typeof subId !== 'string') {
          return NextResponse.json(
            {
              ok: false,
              timestamp,
              error: 'Missing or invalid subscription_id field',
            },
            { status: 400 }
          );
        }

        const result = unsubscribeFromTable(subId);
        if (!result) {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Subscription not found' },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { ok: true, timestamp, payload: { unsubscribed: true } },
          { status: 200 }
        );
      }

      case 'detect-conflict': {
        const table = cmd.table as unknown;
        const recordId = cmd.record_id as unknown;
        const localValue = cmd.local_value as unknown;
        const remoteValue = cmd.remote_value as unknown;
        const operation = cmd.operation as unknown;

        if (
          typeof table !== 'string' ||
          typeof recordId !== 'string' ||
          typeof localValue !== 'object' ||
          typeof remoteValue !== 'object' ||
          typeof operation !== 'string'
        ) {
          return NextResponse.json(
            {
              ok: false,
              timestamp,
              error:
                'Missing or invalid fields: table, record_id, local_value, remote_value, operation',
            },
            { status: 400 }
          );
        }

        const conflict = detectConflict(
          table,
          recordId,
          localValue as Record<string, unknown>,
          remoteValue as Record<string, unknown>,
          operation as any
        );
        return NextResponse.json(
          { ok: true, timestamp, payload: conflict },
          { status: 200 }
        );
      }

      case 'resolve-conflict': {
        const table = cmd.table as unknown;
        const recordId = cmd.record_id as unknown;
        const strategy = cmd.strategy as unknown;
        const mergedValue = cmd.merged_value as unknown;

        if (
          typeof table !== 'string' ||
          typeof recordId !== 'string' ||
          typeof strategy !== 'string'
        ) {
          return NextResponse.json(
            {
              ok: false,
              timestamp,
              error: 'Missing or invalid fields: table, record_id, strategy',
            },
            { status: 400 }
          );
        }

        const resolved = resolveConflict(
          table,
          recordId,
          strategy as any,
          typeof mergedValue === 'object'
            ? (mergedValue as Record<string, unknown>)
            : undefined
        );

        if (!resolved) {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Conflict not found' },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { ok: true, timestamp, payload: resolved },
          { status: 200 }
        );
      }

      default:
        return NextResponse.json(
          {
            ok: false,
            timestamp,
            error:
              'Invalid command. Valid commands: init, disconnect, subscribe, unsubscribe, detect-conflict, resolve-conflict',
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
