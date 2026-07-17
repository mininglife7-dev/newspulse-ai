import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { PDFDocument, rgb } from 'pdf-lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function resolveContext(
  supabase: Awaited<ReturnType<typeof createRouteClient>>
) {
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
      error: 'No workspace yet',
    };
  }
  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
  };
}

export async function GET() {
  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  try {
    // Fetch metrics from compliance dashboard
    const { data: systems } = await supabase
      .from('ai_systems')
      .select('id')
      .eq('workspace_id', ctx.workspaceId);

    const { data: assessments } = await supabase
      .from('risk_assessments')
      .select('id, risk_level, status')
      .eq('workspace_id', ctx.workspaceId);

    const { data: evidence } = await supabase
      .from('evidence')
      .select('id, status')
      .eq('workspace_id', ctx.workspaceId);

    const totalSystems = systems?.length || 0;
    const assessedSystems =
      new Set(assessments?.map((a: any) => a.ai_system_id)).size || 0;

    const riskDistribution = {
      unacceptable: (assessments || []).filter(
        (a: any) => a.risk_level === 'unacceptable'
      ).length,
      high: (assessments || []).filter((a: any) => a.risk_level === 'high')
        .length,
      medium: (assessments || []).filter((a: any) => a.risk_level === 'medium')
        .length,
      low: (assessments || []).filter((a: any) => a.risk_level === 'low')
        .length,
    };

    const assessmentStatus = {
      draft: (assessments || []).filter((a: any) => a.status === 'draft')
        .length,
      in_review: (assessments || []).filter(
        (a: any) => a.status === 'in_review'
      ).length,
      finalized: (assessments || []).filter(
        (a: any) => a.status === 'finalized'
      ).length,
    };

    const evidenceStatus = {
      submitted: (evidence || []).filter((e: any) => e.status === 'submitted')
        .length,
      under_review: (evidence || []).filter(
        (e: any) => e.status === 'under_review'
      ).length,
      approved: (evidence || []).filter((e: any) => e.status === 'approved')
        .length,
      rejected: (evidence || []).filter((e: any) => e.status === 'rejected')
        .length,
    };

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const { height } = page.getSize();
    let y = height - 50;

    // Title
    page.drawText('Compliance Status Report', {
      x: 50,
      y,
      size: 18,
      color: rgb(0, 0, 0),
    });
    y -= 10;
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 50,
      y,
      size: 9,
      color: rgb(0.6, 0.6, 0.6),
    });
    y -= 30;

    // AI Systems Summary
    page.drawText('AI Systems Inventory', {
      x: 50,
      y,
      size: 14,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 20;

    page.drawText(`Total Systems: ${totalSystems}`, {
      x: 50,
      y,
      size: 11,
      color: rgb(0, 0, 0),
    });
    y -= 15;
    page.drawText(
      `Assessed: ${assessedSystems} (${totalSystems > 0 ? Math.round((assessedSystems / totalSystems) * 100) : 0}%)`,
      {
        x: 50,
        y,
        size: 11,
        color: rgb(0, 0, 0),
      }
    );
    y -= 15;
    page.drawText(`Pending Assessment: ${totalSystems - assessedSystems}`, {
      x: 50,
      y,
      size: 11,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 25;

    // Risk Distribution
    page.drawText('Risk Classification Distribution', {
      x: 50,
      y,
      size: 14,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 20;

    const riskLevels = [
      {
        label: 'Unacceptable (Prohibited)',
        count: riskDistribution.unacceptable,
        color: rgb(1, 0.2, 0.2),
      },
      {
        label: 'High Risk',
        count: riskDistribution.high,
        color: rgb(1, 0.6, 0.2),
      },
      {
        label: 'Medium Risk',
        count: riskDistribution.medium,
        color: rgb(1, 0.8, 0.2),
      },
      {
        label: 'Low Risk',
        count: riskDistribution.low,
        color: rgb(0.2, 0.8, 0.2),
      },
    ];

    riskLevels.forEach(({ label, count, color }) => {
      page.drawText(`${label}: ${count}`, {
        x: 50,
        y,
        size: 11,
        color,
      });
      y -= 15;
    });
    y -= 10;

    // Assessment Status
    page.drawText('Assessment Status', {
      x: 50,
      y,
      size: 14,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 20;

    page.drawText(`Draft: ${assessmentStatus.draft}`, {
      x: 50,
      y,
      size: 11,
      color: rgb(0, 0, 0),
    });
    y -= 15;
    page.drawText(`In Review: ${assessmentStatus.in_review}`, {
      x: 50,
      y,
      size: 11,
      color: rgb(0, 0, 0),
    });
    y -= 15;
    page.drawText(`Finalized: ${assessmentStatus.finalized}`, {
      x: 50,
      y,
      size: 11,
      color: rgb(0.2, 0.8, 0.2),
    });
    y -= 25;

    // Evidence Tracking
    page.drawText('Compliance Evidence', {
      x: 50,
      y,
      size: 14,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 20;

    page.drawText(`Submitted: ${evidenceStatus.submitted}`, {
      x: 50,
      y,
      size: 11,
      color: rgb(0, 0, 0),
    });
    y -= 15;
    page.drawText(`Under Review: ${evidenceStatus.under_review}`, {
      x: 50,
      y,
      size: 11,
      color: rgb(0, 0, 0),
    });
    y -= 15;
    page.drawText(`Approved: ${evidenceStatus.approved}`, {
      x: 50,
      y,
      size: 11,
      color: rgb(0.2, 0.8, 0.2),
    });
    y -= 15;
    page.drawText(`Rejected: ${evidenceStatus.rejected}`, {
      x: 50,
      y,
      size: 11,
      color: rgb(1, 0.2, 0.2),
    });
    y -= 25;

    // Readiness Score
    const assessmentReadiness =
      totalSystems > 0 ? Math.round((assessedSystems / totalSystems) * 100) : 0;
    const evidenceReadiness =
      (evidence || []).length > 0
        ? Math.round((evidenceStatus.approved / (evidence || []).length) * 100)
        : 0;
    const readiness = Math.round((assessmentReadiness + evidenceReadiness) / 2);

    page.drawText('Compliance Readiness', {
      x: 50,
      y,
      size: 14,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 20;

    const readinessColor =
      readiness >= 75
        ? rgb(0.2, 0.8, 0.2)
        : readiness >= 50
          ? rgb(1, 0.8, 0.2)
          : rgb(1, 0.2, 0.2);

    page.drawText(`Overall Readiness: ${readiness}%`, {
      x: 50,
      y,
      size: 12,
      color: readinessColor,
    });
    y -= 15;
    page.drawText(`Assessment Coverage: ${assessmentReadiness}%`, {
      x: 50,
      y,
      size: 11,
      color: rgb(0, 0, 0),
    });
    y -= 15;
    page.drawText(`Evidence Approval Rate: ${evidenceReadiness}%`, {
      x: 50,
      y,
      size: 11,
      color: rgb(0, 0, 0),
    });

    // Footer
    page.drawText('EURO AI — Compliance & Governance Platform', {
      x: 50,
      y: 20,
      size: 9,
      color: rgb(0.7, 0.7, 0.7),
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="compliance-report-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (err) {
    console.error('[api/reports/dashboard] pdf generation failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
