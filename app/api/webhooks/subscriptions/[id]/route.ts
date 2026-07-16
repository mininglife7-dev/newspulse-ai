import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// DELETE /api/webhooks/subscriptions/[id] - Delete webhook subscription
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { id } = params;

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
      logger.warn('Unauthorized webhook deletion', { requestId, id });
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete subscription
    const { error: deleteError } = await supabase
      .from('webhook_subscriptions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    logger.info('Webhook subscription deleted', {
      requestId,
      subscriptionId: id,
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error: any) {
    logger.error('Webhook subscription deletion failed', {
      requestId,
      id,
      error: error.message,
    });

    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/webhooks/subscriptions/[id] - Update webhook subscription
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { id } = params;

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
      logger.warn('Unauthorized webhook update', { requestId, id });
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { is_active, events } = body;

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    if (events !== undefined) {
      if (!Array.isArray(events)) {
        return NextResponse.json(
          { ok: false, error: 'events must be an array' },
          { status: 400 }
        );
      }
      updateData.events = events;
    }

    // Update subscription
    const { data: subscription, error: updateError } = await supabase
      .from('webhook_subscriptions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    logger.info('Webhook subscription updated', {
      requestId,
      subscriptionId: id,
    });

    return NextResponse.json({
      ok: true,
      subscription,
    });
  } catch (error: any) {
    logger.error('Webhook subscription update failed', {
      requestId,
      id,
      error: error.message,
    });

    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
