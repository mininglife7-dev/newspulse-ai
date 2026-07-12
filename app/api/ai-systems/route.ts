import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { SYSTEM_TYPES, SYSTEM_STATUSES } from '@/lib/ai-systems';

interface CreateAiSystemBody {
  name: string;
  description?: string;
  systemType?: string;
  vendor?: string;
  purpose?: string;
  status?: 'active' | 'pilot' | 'deprecated';
}

/**
 * Resolve the caller's active workspace (and company) or explain why not.
 * All queries run as the signed-in user, so RLS applies.
 */
async function resolveContext(supabase: Awaited<ReturnType<typeof createRouteClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 401 as const, error: 'Authentication required' };

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return {
      status: 409 as const,
      error: 'No workspace yet — complete company setup first',
    };
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('workspace_id', membership.workspace_id)
    .limit(1)
    .maybeSingle();

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
    companyId: (company?.id as string) ?? null,
  };
}

/** GET /api/ai-systems — list the caller's workspace AI-system inventory. */
export async function GET() {
  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  const { data, error } = await supabase
    .from('ai_systems')
    .select('id, name, description, system_type, vendor, purpose, status, created_at')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('AI systems list failed', 'AI_SYSTEMS_LIST_ERROR', error);
    return NextResponse.json(
      { ok: false, error: 'Could not load AI systems' },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, systems: data ?? [] });
}

/** POST /api/ai-systems — add a system to the workspace inventory. */
export async function POST(req: Request) {
  let body: CreateAiSystemBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json(
      { ok: false, error: 'name is required' },
      { status: 400 }
    );
  }
  if (body.systemType && !SYSTEM_TYPES.includes(body.systemType as any)) {
    return NextResponse.json(
      { ok: false, error: `systemType must be one of: ${SYSTEM_TYPES.join(', ')}` },
      { status: 400 }
    );
  }
  const status = body.status ?? 'active';
  if (!SYSTEM_STATUSES.includes(status as any)) {
    return NextResponse.json(
      { ok: false, error: 'status must be active, pilot or deprecated' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }
  if (!ctx.companyId) {
    return NextResponse.json(
      { ok: false, error: 'No company profile — complete company setup first' },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from('ai_systems')
    .insert({
      workspace_id: ctx.workspaceId,
      company_id: ctx.companyId,
      name,
      description: body.description?.trim() || null,
      system_type: body.systemType || null,
      vendor: body.vendor?.trim() || null,
      purpose: body.purpose?.trim() || null,
      status,
    })
    .select('id, name, system_type, vendor, purpose, status, created_at')
    .single();

  if (error || !data) {
    logger.error('AI system creation failed', 'AI_SYSTEMS_CREATE_ERROR', error);
    return NextResponse.json(
      { ok: false, error: 'Could not save the AI system' },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, system: data });
}
