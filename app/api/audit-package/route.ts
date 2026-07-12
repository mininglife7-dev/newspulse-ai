import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import {
  generateAuditPackageSummary,
  generateAuditPackageContent,
  calculateAuditPackageMetadata,
  validateAuditPackageRequest,
} from '@/lib/audit-package-generator';
import {
  calculateComplianceMetrics,
  identifyComplianceGaps,
} from '@/lib/compliance-metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/audit-package
 * Generate compliance audit package for export
 *
 * Request body:
 * {
 *   "company_id": "uuid",
 *   "format": "json" | "pdf",
 *   "includeEvidence": true,
 *   "includeObligations": true,
 *   "includeTechnicalDetails": false
 * }
 */
export async function POST(req: Request) {
  let body: {
    company_id: string;
    format?: string;
    includeEvidence?: boolean;
    includeObligations?: boolean;
    includeTechnicalDetails?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate input
  if (!body.company_id) {
    return NextResponse.json(
      { ok: false, error: 'company_id is required' },
      { status: 400 }
    );
  }

  const format = body.format || 'json';
  if (!['json', 'pdf'].includes(format)) {
    return NextResponse.json(
      { ok: false, error: 'format must be "json" or "pdf"' },
      { status: 400 }
    );
  }

  // Authenticate
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  // Verify user has access to the company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, workspace_id, name')
    .eq('id', body.company_id)
    .maybeSingle();

  if (companyError || !company) {
    return NextResponse.json(
      { ok: false, error: 'Company not found' },
      { status: 404 }
    );
  }

  // Verify user is member of workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', company.workspace_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
  }

  try {
    // Fetch all required data
    const [
      { data: obligations },
      { data: evidence },
      { data: riskAssessments },
    ] = await Promise.all([
      supabase
        .from('obligations')
        .select('id, title, status, priority, due_date, description, source')
        .eq('company_id', body.company_id),
      supabase
        .from('evidence')
        .select('id, obligation_id, title, file_type, status, created_at')
        .eq('company_id', body.company_id),
      supabase
        .from('risk_assessments')
        .select('id, ai_system_id, risk_level, risk_score, created_at')
        .eq('company_id', body.company_id),
    ]);

    if (!obligations || !evidence || !riskAssessments) {
      return NextResponse.json(
        { ok: false, error: 'Failed to fetch compliance data' },
        { status: 500 }
      );
    }

    // Validate we have data to export
    const validation = validateAuditPackageRequest(body.company_id, { totalObligations: obligations.length });
    if (!validation.valid) {
      return NextResponse.json(
        { ok: false, error: validation.reason || 'Cannot generate audit package' },
        { status: 400 }
      );
    }

    // Calculate metrics
    const metrics = calculateComplianceMetrics(obligations);
    const gaps = identifyComplianceGaps(obligations, evidence);

    // Get AI system names for risk assessments
    const { data: aiSystems } = await supabase
      .from('ai_systems')
      .select('id, name');

    const systemMap = new Map(aiSystems?.map(s => [s.id, s.name]) || []);

    const enrichedAssessments = riskAssessments.map(ra => ({
      ...ra,
      name: systemMap.get(ra.ai_system_id) || 'Unknown System',
    }));

    // Group evidence by obligation
    const evidenceByObligation = new Map<string, any[]>();
    for (const ev of evidence) {
      if (ev.obligation_id) {
        if (!evidenceByObligation.has(ev.obligation_id)) {
          evidenceByObligation.set(ev.obligation_id, []);
        }
        evidenceByObligation.get(ev.obligation_id)!.push(ev);
      }
    }

    // Enrich obligations with evidence
    const enrichedObligations = obligations.map(o => ({
      ...o,
      evidence: evidenceByObligation.get(o.id) || [],
    }));

    // Generate audit package
    const summary = generateAuditPackageSummary(
      company.name,
      0, // TODO: Calculate from compliance metrics
      metrics.overallStatus,
      'high', // TODO: Get from risk assessments
      {
        totalObligations: metrics.totalObligations,
        completedObligations: metrics.completedObligations,
      },
      evidence
    );

    const recommendations: string[] = [];
    if (gaps.length > 0) {
      const criticalGaps = gaps.filter(g => g.priority === 'critical');
      if (criticalGaps.length > 0) {
        recommendations.push(`Address ${criticalGaps.length} critical compliance gaps immediately`);
      }
    }
    if (metrics.urgentObligations > 0) {
      recommendations.push(`${metrics.urgentObligations} obligations require urgent attention`);
    }
    if (recommendations.length === 0) {
      recommendations.push('Continue current compliance tracking and evidence submission');
    }

    const content = generateAuditPackageContent(
      summary,
      enrichedAssessments,
      enrichedObligations,
      gaps,
      recommendations
    );

    const metadata = calculateAuditPackageMetadata(content);

    // For JSON format, return directly
    if (format === 'json') {
      return NextResponse.json({
        ok: true,
        format: 'json',
        companyId: body.company_id,
        companyName: company.name,
        generatedAt: new Date().toISOString(),
        content,
        metadata,
      });
    }

    // For PDF format, return export-ready payload
    // In production, this would integrate with a PDF generation service (e.g., Puppeteer, PDFKit, or external API)
    return NextResponse.json({
      ok: true,
      format: 'pdf',
      companyId: body.company_id,
      companyName: company.name,
      generatedAt: new Date().toISOString(),
      message: 'PDF generation requires integration with PDF service. JSON format recommended for this version.',
      jsonContent: content,
      metadata,
      pdfExportUrl: null, // Would be populated by PDF service
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/audit-package] generation failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Audit package generation failed',
        message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/audit-package
 * List generated audit packages for a company
 *
 * Query params:
 * - company_id: Company to list packages for (required)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get('company_id');

  if (!companyId) {
    return NextResponse.json(
      { ok: false, error: 'company_id is required' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  // Verify user has access to the company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, workspace_id')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError || !company) {
    return NextResponse.json(
      { ok: false, error: 'Company not found' },
      { status: 404 }
    );
  }

  // Verify user is member of workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', company.workspace_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
  }

  // Return placeholder response (audit packages are generated on-demand in current implementation)
  return NextResponse.json({
    ok: true,
    companyId,
    message: 'Audit packages are generated on-demand. Use POST to create a new package.',
    packages: [],
  });
}
