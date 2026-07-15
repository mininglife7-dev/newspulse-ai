import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import { validators, validate } from '@/lib/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { SYSTEM_TYPES, SYSTEM_STATUSES } from '@/lib/ai-systems';
import { resolveWorkspaceContext } from '@/lib/ai-systems-server';

interface CreateAiSystemBody {
  name: string;
  description?: string;
  systemType?: string;
  vendor?: string;
  purpose?: string;
  status?: 'active' | 'pilot' | 'deprecated';
}

/** GET /api/ai-systems — list the caller's workspace AI-system inventory or fetch a single system. */
export async function GET(request: NextRequest) {
  const systemId = request.nextUrl.searchParams.get('id');

  const supabase = await createRouteClient();
  const ctx = await resolveWorkspaceContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  let query = supabase
    .from('ai_systems')
    .select(
      'id, name, description, system_type, vendor, purpose, status, created_at'
    )
    .eq('workspace_id', ctx.workspaceId);

  if (systemId) {
    query = query.eq('id', systemId).limit(1);
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    logger.error('AI systems list failed', 'AI_SYSTEMS_LIST_ERROR', error);
    return NextResponse.json(
      { ok: false, error: 'Could not load AI systems' },
      { status: 500 }
    );
  }

  if (systemId && (!data || data.length === 0)) {
    return NextResponse.json(
      { ok: false, error: 'System not found' },
      { status: 404 }
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

  // Validate input using schema
  const validationResult = validate(body, {
    name: validators.string({ minLength: 1, maxLength: 255 }),
    description: validators.optional(validators.string({ maxLength: 2000 })),
    systemType: validators.optional(validators.enum(SYSTEM_TYPES)),
    vendor: validators.optional(validators.string({ maxLength: 255 })),
    purpose: validators.optional(validators.string({ maxLength: 1000 })),
    status: validators.optional(validators.enum(SYSTEM_STATUSES)),
  });

  if (!validationResult.ok) {
    return NextResponse.json(
      { ok: false, error: 'Invalid input', errors: validationResult.errors },
      { status: 400 }
    );
  }

  const validated = validationResult.value as Record<string, unknown>;
  const name = validated.name;
  const status = validated.status ?? 'active';

  const supabase = await createRouteClient();
  const ctx = await resolveWorkspaceContext(supabase);
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
      description: validated.description || null,
      system_type: validated.systemType || null,
      vendor: validated.vendor || null,
      purpose: validated.purpose || null,
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
