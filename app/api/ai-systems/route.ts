import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import { AiSystemCreateSchema } from '@/lib/validation';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
export async function GET(req: Request) {
  // Rate limit: 30 requests per minute per IP
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = rateLimit({ key: ip, endpoint: 'ai-systems' });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult),
      }
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

  const { data, error } = await supabase
    .from('ai_systems')
    .select('id, name, description, system_type, vendor, purpose, status, created_at')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[api/ai-systems] list failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not load AI systems' },
      { status: 500, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }
  return NextResponse.json(
    { ok: true, systems: data ?? [] },
    { headers: getRateLimitHeaders(rateLimitResult) }
  );
}

/** POST /api/ai-systems — add a system to the workspace inventory. */
export async function POST(req: Request) {
  // Rate limit: 30 requests per minute per IP
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = rateLimit({ key: ip, endpoint: 'ai-systems' });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  let validated;
  try {
    validated = AiSystemCreateSchema.parse(body);
  } catch (error) {
    let message = 'Validation failed';
    if (error instanceof z.ZodError && error.issues.length > 0) {
      const issue = error.issues[0];
      message = issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message;
    }
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  const name = validated.name;

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
      description: validated.description || null,
      system_type: validated.systemType || null,
      vendor: validated.vendor || null,
      purpose: validated.purpose || null,
      status: validated.status,
    })
    .select('id, name, system_type, vendor, purpose, status, created_at')
    .single();

  if (error || !data) {
    console.error('[api/ai-systems] insert failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Could not save the AI system' },
      { status: 500, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }
  return NextResponse.json(
    { ok: true, system: data },
    { headers: getRateLimitHeaders(rateLimitResult) }
  );
}
