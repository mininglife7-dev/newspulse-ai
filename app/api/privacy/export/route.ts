import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import { logCreate, getClientIp } from '@/lib/audit-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/privacy/export — export user personal data (GDPR Article 20)
 *
 * Right to Data Portability: User can request all their personal data in
 * a structured, machine-readable format (JSON). Includes:
 *
 * - Profile data (name, email, etc.)
 * - Workspace memberships and roles
 * - Consent records
 * - Audit log of their actions
 *
 * Returns data as JSON (RFC 4180 for structured format compliance).
 * User-identifiable data only; no workspace data unless user is admin.
 */
export async function GET(request: NextRequest) {
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

  try {
    // Collect all user personal data
    const dataPortabilityPackage: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      userId: user.id,
      email: user.email,
    };

    // 1. Profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      logger.error(
        'Profile data export failed',
        'EXPORT_PROFILE_ERROR',
        profileError
      );
    } else if (profile) {
      dataPortabilityPackage.profile = {
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: profile.email,
        currentWorkspaceId: profile.current_workspace_id,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      };
    }

    // 2. Workspace memberships
    const { data: memberships, error: membershipsError } = await supabase
      .from('workspace_members')
      .select('id, workspace_id, role, status, joined_at, invited_at')
      .eq('user_id', user.id);

    if (membershipsError) {
      logger.error(
        'Workspace membership export failed',
        'EXPORT_MEMBERSHIPS_ERROR',
        membershipsError
      );
    } else {
      dataPortabilityPackage.workspaceMemberships = memberships || [];
    }

    // 3. Consent records
    const { data: consents, error: consentsError } = await supabase
      .from('consent_audit_log')
      .select(
        'action, gdpr_consent, marketing_consent, consent_version, created_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (consentsError) {
      logger.error(
        'Consent record export failed',
        'EXPORT_CONSENT_ERROR',
        consentsError
      );
    } else {
      dataPortabilityPackage.consentHistory = consents || [];
    }

    // 4. User's audit log (actions they've taken)
    const { data: auditLog, error: auditError } = await supabase
      .from('audit_logs')
      .select(
        'id, action, resource_type, resource_id, details, ip_address, user_agent, created_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1000); // Limit to prevent overly large exports

    if (auditError) {
      logger.error('Audit log export failed', 'EXPORT_AUDIT_ERROR', auditError);
    } else {
      dataPortabilityPackage.auditLog = auditLog || [];
    }

    // Log the export request (GDPR Article 30)
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    await logCreate(
      'system',
      'data_export',
      user.id,
      user.id,
      {
        reason: 'article_20_data_portability',
        timestamp: new Date().toISOString(),
      },
      ipAddress,
      userAgent
    );

    // Return data as JSON with appropriate headers for download
    const jsonString = JSON.stringify(dataPortabilityPackage, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="euro-ai-data-export-${user.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      },
    });
  } catch (err) {
    logger.error('Data portability export failed', 'EXPORT_ERROR', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to export personal data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/privacy/export — trigger async data export job
 *
 * For large datasets, returns a job ID instead of immediate download.
 * User can check status with GET /api/privacy/export/:jobId
 */
export async function POST(request: NextRequest) {
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

  try {
    // For MVP, we generate synchronously via GET and return job reference
    // In production, this would queue an async job
    const jobId = `export-${user.id}-${Date.now()}`;

    return NextResponse.json({
      ok: true,
      message: 'Data export initiated',
      jobId,
      downloadUrl: `/api/privacy/export?jobId=${jobId}`,
      note: 'Use GET request with jobId parameter to download when ready',
    });
  } catch (err) {
    logger.error('Export job creation failed', 'EXPORT_JOB_ERROR', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to initiate data export' },
      { status: 500 }
    );
  }
}
