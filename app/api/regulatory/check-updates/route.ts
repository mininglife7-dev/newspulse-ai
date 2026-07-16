import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    const jurisdiction = req.nextUrl.searchParams.get('jurisdiction');

    if (!workspaceId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required query parameter: workspace_id',
        },
        { status: 400 }
      );
    }

    // Get current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to this workspace
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { ok: false, error: 'Access denied to this workspace' },
        { status: 403 }
      );
    }

    // Get workspace info to determine jurisdiction if not provided
    if (!jurisdiction) {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('country')
        .eq('id', workspaceId)
        .single();

      if (!workspace?.country) {
        return NextResponse.json({
          ok: true,
          updates: [],
          message: 'Workspace jurisdiction not configured',
        });
      }
    }

    // Fetch regulatory updates for the jurisdiction
    let query = supabase
      .from('regulatory_updates')
      .select(
        'id, title, description, jurisdiction, regulation_type, effective_date, impact_level, status, created_at'
      )
      .in('status', ['active', 'pending'])
      .order('effective_date', { ascending: true });

    if (jurisdiction) {
      query = query.eq('jurisdiction', jurisdiction);
    }

    const { data: updates, error } = await query;

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    // Categorize updates by impact
    const byImpact = {
      critical: updates?.filter((u) => u.impact_level === 'critical') || [],
      high: updates?.filter((u) => u.impact_level === 'high') || [],
      medium: updates?.filter((u) => u.impact_level === 'medium') || [],
      low: updates?.filter((u) => u.impact_level === 'low') || [],
    };

    return NextResponse.json({
      ok: true,
      updates: updates || [],
      by_impact: byImpact,
      critical_count: byImpact.critical.length,
      total_count: updates?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to check regulatory updates',
      },
      { status: 500 }
    );
  }
}
