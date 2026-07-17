import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import { logCreate, logUpdate, getClientIp } from '@/lib/audit-logger';
import { validators, validate } from '@/lib/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DPIARequest {
  systemId: string;
  description?: string;
  dataCategories?: string[];
  purposes?: string[];
  recipients?: string[];
  retentionPeriod?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  mitigations?: string[];
}

/**
 * POST /api/compliance/dpia — create or update Data Processing Impact Assessment
 *
 * GDPR Articles 35-36: Mandatory for high-risk AI systems.
 * Assessment includes risk level, data flow analysis, and mitigation measures.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const validationResult = validate(body, {
    systemId: validators.string({ minLength: 1 }),
    description: validators.optional(validators.string()),
    dataCategories: validators.optional(validators.array(validators.string())),
    purposes: validators.optional(validators.array(validators.string())),
    recipients: validators.optional(validators.array(validators.string())),
    retentionPeriod: validators.optional(validators.string()),
    riskLevel: validators.optional(
      validators.enum(['low', 'medium', 'high', 'critical'])
    ),
    mitigations: validators.optional(validators.array(validators.string())),
  });

  if (!validationResult.ok) {
    return NextResponse.json(
      { ok: false, error: 'Invalid input', errors: validationResult.errors },
      { status: 400 }
    );
  }

  const validated = validationResult.value as DPIARequest;
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Verify user has access to system's workspace
  const { data: system, error: systemError } = await supabase
    .from('ai_systems')
    .select('id, workspace_id')
    .eq('id', validated.systemId)
    .maybeSingle();

  if (systemError || !system) {
    logger.error(
      'AI system lookup failed',
      'DPIA_SYSTEM_LOOKUP_ERROR',
      systemError
    );
    return NextResponse.json(
      { ok: false, error: 'AI system not found' },
      { status: 404 }
    );
  }

  // Verify user has workspace access
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', system.workspace_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { ok: false, error: 'Access denied' },
      { status: 403 }
    );
  }

  try {
    // Check if DPIA already exists
    const { data: existing } = await supabase
      .from('dpia_assessments')
      .select('id')
      .eq('ai_system_id', validated.systemId)
      .maybeSingle();

    const dpiaData = {
      ai_system_id: validated.systemId,
      workspace_id: system.workspace_id,
      description: validated.description || null,
      data_categories: validated.dataCategories || [],
      purposes: validated.purposes || [],
      recipients: validated.recipients || [],
      retention_period: validated.retentionPeriod || null,
      risk_level: validated.riskLevel || 'medium',
      mitigations: validated.mitigations || [],
      status: 'draft' as const,
      assessed_at: new Date().toISOString(),
    };

    let result: Record<string, unknown>;
    const ipAddress: string | undefined = getClientIp(request);
    const userAgent: string | undefined =
      request.headers.get('user-agent') || undefined;

    if (existing) {
      // Update existing DPIA
      const { data, error } = await supabase
        .from('dpia_assessments')
        .update(dpiaData)
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) {
        logger.error('DPIA update failed', 'DPIA_UPDATE_ERROR', error);
        return NextResponse.json(
          { ok: false, error: 'Failed to update DPIA' },
          { status: 500 }
        );
      }

      result = data;

      // Log update (GDPR Article 30)
      await logUpdate(
        system.workspace_id,
        'dpia',
        existing.id,
        user.id,
        {
          riskLevel: validated.riskLevel,
          dataCategories: validated.dataCategories?.length || 0,
        },
        ipAddress,
        userAgent
      );
    } else {
      // Create new DPIA
      const { data, error } = await supabase
        .from('dpia_assessments')
        .insert(dpiaData)
        .select('*')
        .single();

      if (error) {
        logger.error('DPIA creation failed', 'DPIA_CREATE_ERROR', error);
        return NextResponse.json(
          { ok: false, error: 'Failed to create DPIA' },
          { status: 500 }
        );
      }

      result = data;

      // Log creation (GDPR Article 30)
      await logCreate(
        system.workspace_id,
        'dpia',
        result.id as string,
        user.id,
        {
          systemId: validated.systemId,
          riskLevel: validated.riskLevel,
          dataCategories: validated.dataCategories?.length || 0,
        },
        ipAddress,
        userAgent
      );
    }

    return NextResponse.json({
      ok: true,
      dpia: result,
      message: existing ? 'DPIA updated' : 'DPIA created',
    });
  } catch (err) {
    logger.error('DPIA processing failed', 'DPIA_ERROR', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to process DPIA' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/compliance/dpia — fetch DPIA for a system
 */
export async function GET(request: NextRequest) {
  const systemId = request.nextUrl.searchParams.get('systemId');

  if (!systemId) {
    return NextResponse.json(
      { ok: false, error: 'systemId parameter required' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { data: dpia, error } = await supabase
    .from('dpia_assessments')
    .select('*')
    .eq('ai_system_id', systemId)
    .maybeSingle();

  if (error) {
    logger.error('DPIA fetch failed', 'DPIA_FETCH_ERROR', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch DPIA' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    dpia: dpia || null,
  });
}
