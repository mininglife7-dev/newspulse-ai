import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

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
      logger.warn('Unauthorized email preferences request', { requestId });
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

    // Get email preferences
    const { data: preferences, error: queryError } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (queryError && queryError.code !== 'PGRST116') {
      throw queryError;
    }

    // Return defaults if no preferences exist
    const defaultPreferences = {
      deadline_reminders: true,
      obligation_updates: true,
      weekly_digest: true,
      team_invitations: true,
      unsubscribe_all: false,
    };

    logger.info('Email preferences retrieved', {
      requestId,
      userId: user.id,
      workspaceId,
    });

    return NextResponse.json({
      ok: true,
      preferences: preferences || defaultPreferences,
    });
  } catch (error: any) {
    logger.error('Email preferences retrieval failed', {
      requestId,
      error: error.message,
    });

    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
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
      logger.warn('Unauthorized email preferences update', { requestId });
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      workspace_id: workspaceId,
      deadline_reminders,
      obligation_updates,
      weekly_digest,
      team_invitations,
      unsubscribe_all,
    } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: 'workspace_id required' },
        { status: 400 }
      );
    }

    // Upsert email preferences
    const { data: preferences, error: upsertError } = await supabase
      .from('email_preferences')
      .upsert({
        user_id: user.id,
        workspace_id: workspaceId,
        deadline_reminders:
          deadline_reminders !== undefined ? deadline_reminders : true,
        obligation_updates:
          obligation_updates !== undefined ? obligation_updates : true,
        weekly_digest: weekly_digest !== undefined ? weekly_digest : true,
        team_invitations:
          team_invitations !== undefined ? team_invitations : true,
        unsubscribe_all:
          unsubscribe_all !== undefined ? unsubscribe_all : false,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (upsertError) {
      throw upsertError;
    }

    logger.info('Email preferences updated', {
      requestId,
      userId: user.id,
      workspaceId,
    });

    return NextResponse.json({
      ok: true,
      preferences,
    });
  } catch (error: any) {
    logger.error('Email preferences update failed', {
      requestId,
      error: error.message,
    });

    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
