import { NextResponse, NextRequest } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import { logDelete, logUpdate, getClientIp } from '@/lib/audit-logger';
import { validators, validate } from '@/lib/input-validation';
import { SYSTEM_TYPES, SYSTEM_STATUSES } from '@/lib/ai-systems';
import { resolveWorkspaceContext } from '@/lib/ai-systems-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UpdateAiSystemBody {
  name?: string;
  systemType?: string;
  vendor?: string;
  purpose?: string;
  status?: 'active' | 'pilot' | 'deprecated';
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** DELETE /api/ai-systems/:id — remove a system from the workspace inventory. */
export async function DELETE(req: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Missing id' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const ctx = await resolveWorkspaceContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  // Scope the delete to the caller's workspace; RLS enforces the same, so a
  // row belonging to another workspace simply matches nothing. `.select()`
  // returns the rows actually deleted, so we can tell "removed" apart from
  // "nothing matched" instead of reporting a false success.
  const { data, error } = await supabase
    .from('ai_systems')
    .delete()
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .select('id');

  if (error) {
    logger.error('AI system deletion failed', 'SYSTEM_DELETE_ERROR', error);
    return NextResponse.json(
      { ok: false, error: 'Could not delete the AI system' },
      { status: 500 }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'AI system not found' },
      { status: 404 }
    );
  }

  // Log deletion (GDPR Article 30)
  await logDelete(
    ctx.workspaceId,
    'ai_system',
    id,
    user.id,
    {},
    getClientIp(req as NextRequest),
    (req as NextRequest).headers.get('user-agent') || undefined
  );

  return NextResponse.json({ ok: true, deleted: id });
}

/** PATCH /api/ai-systems/:id — edit a system in the workspace inventory. */
export async function PATCH(req: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Missing id' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  let body: UpdateAiSystemBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const validationResult = validate(body, {
    name: validators.optional(validators.string({ minLength: 1 })),
    systemType: validators.optional(validators.string()),
    vendor: validators.optional(validators.string()),
    purpose: validators.optional(validators.string()),
    status: validators.optional(
      validators.enum(['active', 'pilot', 'deprecated'])
    ),
  });

  if (!validationResult.ok) {
    return NextResponse.json(
      { ok: false, error: 'Invalid input', errors: validationResult.errors },
      { status: 400 }
    );
  }

  const validated = validationResult.value as UpdateAiSystemBody;
  const updates: Record<string, string | null> = {};

  if (validated.name !== undefined) {
    const name = validated.name.trim();
    updates.name = name;
  }

  if (validated.systemType !== undefined) {
    if (
      validated.systemType &&
      !SYSTEM_TYPES.includes(validated.systemType as any)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: `systemType must be one of: ${SYSTEM_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }
    updates.system_type = (validated.systemType || null) as any;
  }

  if (validated.vendor !== undefined) {
    updates.vendor = validated.vendor.trim() || null;
  }

  if (validated.purpose !== undefined) {
    updates.purpose = validated.purpose.trim() || null;
  }

  if (validated.status !== undefined) {
    updates.status = validated.status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { ok: false, error: 'No fields to update' },
      { status: 400 }
    );
  }

  updates.updated_at = new Date().toISOString();

  const ctx = await resolveWorkspaceContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  // Scope to the caller's workspace (RLS enforces the same); `.select()` lets
  // us return 404 when nothing matched rather than a false success.
  const { data, error } = await supabase
    .from('ai_systems')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .select(
      'id, name, description, system_type, vendor, purpose, status, created_at'
    );

  if (error) {
    logger.error('AI system update failed', 'SYSTEM_UPDATE_ERROR', error);
    return NextResponse.json(
      { ok: false, error: 'Could not update the AI system' },
      { status: 500 }
    );
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'AI system not found' },
      { status: 404 }
    );
  }

  // Log update (GDPR Article 30)
  await logUpdate(
    ctx.workspaceId,
    'ai_system',
    id,
    user.id,
    updates,
    getClientIp(req as NextRequest),
    (req as NextRequest).headers.get('user-agent') || undefined
  );

  return NextResponse.json({ ok: true, system: data[0] });
}
