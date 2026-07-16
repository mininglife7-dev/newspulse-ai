import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const VALID_EVENTS = [
  'obligation.created',
  'obligation.updated',
  'obligation.completed',
  'evidence.submitted',
  'evidence.reviewed',
  'remediation.started',
  'remediation.completed',
  'risk_assessment.completed',
  'ai_system.created',
  'ai_system.updated',
];

// GET /api/webhooks/subscriptions - List subscriptions for workspace
export async function GET(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, anonKey);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('Unauthorized webhook subscriptions request', { requestId });
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get workspace_id from query
    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: 'workspace_id required' },
        { status: 400 }
      );
    }

    // List subscriptions
    const { data: subscriptions, error: queryError } = await supabase
      .from('webhook_subscriptions')
      .select('id, url, events, is_active, created_at, last_triggered_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (queryError) {
      throw queryError;
    }

    logger.info('Webhook subscriptions listed', {
      requestId,
      workspaceId,
      count: subscriptions?.length || 0,
    });

    return NextResponse.json({
      ok: true,
      subscriptions,
    });
  } catch (error: any) {
    logger.error('Webhook subscriptions retrieval failed', {
      requestId,
      error: error.message,
    });

    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/webhooks/subscriptions - Create webhook subscription
export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, anonKey);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('Unauthorized webhook creation', { requestId });
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { workspace_id: workspaceId, url, events, secret } = body;

    // Validate required fields
    if (!workspaceId || !url || !events || !Array.isArray(events) || !secret) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Missing required fields: workspace_id, url, events (array), secret',
        },
        { status: 400 }
      );
    }

    // Validate events are from allowed list
    const invalidEvents = events.filter(
      (e: string) => !VALID_EVENTS.includes(e)
    );
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid events: ${invalidEvents.join(', ')}. Valid events: ${VALID_EVENTS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Create subscription
    const { data: subscription, error: createError } = await supabase
      .from('webhook_subscriptions')
      .insert({
        workspace_id: workspaceId,
        url,
        events,
        secret,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    logger.info('Webhook subscription created', {
      requestId,
      workspaceId,
      subscriptionId: subscription.id,
      events: events.length,
    });

    return NextResponse.json(
      {
        ok: true,
        subscription,
      },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error('Webhook subscription creation failed', {
      requestId,
      error: error.message,
    });

    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
