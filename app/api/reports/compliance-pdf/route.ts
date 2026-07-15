import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { resolveContext, contextError } from '@/lib/api-context';
import { generateComplianceReport } from '@/lib/pdf-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/reports/compliance-pdf
 * Generate a compliance report PDF for the workspace
 */
export async function GET(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return contextError(ctx);
  }

  try {
    // Fetch workspace name
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', ctx.workspaceId)
      .maybeSingle();

    const workspaceName = workspace?.name || 'Unknown';

    // Fetch AI systems
    const { data: systems } = await supabase
      .from('ai_systems')
      .select('id, name, system_type, vendor, status')
      .eq('workspace_id', ctx.workspaceId);

    // Fetch assessments
    const { data: assessments } = await supabase
      .from('risk_assessments')
      .select('id, ai_system_id, risk_score, risk_level, status, updated_at')
      .in('ai_system_id', (systems || []).map((s: any) => s.id))
      .eq('status', 'finalized');

    // Fetch obligations
    const { data: obligations } = await supabase
      .from('obligations')
      .select('id, title, description, priority, status, due_date')
      .eq('workspace_id', ctx.workspaceId);

    // Create system name map
    const systemMap = new Map((systems || []).map((s: any) => [s.id, s]));

    // Build report data
    const reportData = {
      workspaceName,
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      systems: (systems || []).map((s: any) => ({
        name: s.name,
        type: s.system_type,
        vendor: s.vendor,
        status: s.status,
      })),
      assessments: (assessments || []).map((a: any) => {
        const system = systemMap.get(a.ai_system_id);
        return {
          systemName: system?.name || 'Unknown',
          riskLevel: a.risk_level,
          riskScore: a.risk_score,
          completedDate: a.updated_at,
        };
      }),
      obligations: (obligations || []).map((o: any) => ({
        title: o.title,
        description: o.description,
        priority: o.priority,
        status: o.status,
        dueDate: o.due_date,
      })),
      obligationStats: {
        total: (obligations || []).length,
        completed: (obligations || []).filter((o: any) => o.status === 'completed').length,
        inProgress: (obligations || []).filter((o: any) => o.status === 'in_progress').length,
        critical: (obligations || []).filter((o: any) => o.priority === 'critical').length,
        criticalCompleted: (obligations || []).filter(
          (o: any) => o.priority === 'critical' && o.status === 'completed'
        ).length,
      },
      summary: {
        completePercent:
          (obligations || []).length > 0
            ? Math.round(
                ((obligations || []).filter((o: any) => o.status === 'completed').length /
                  (obligations || []).length) *
                  100
              )
            : 0,
        systemsAssessed: (assessments || []).length,
        totalSystems: (systems || []).length,
      },
    };

    // Generate PDF
    const pdf = await generateComplianceReport(reportData);
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    // Return PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="compliance-report-${workspaceName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[api/reports/compliance-pdf] failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to generate compliance report' },
      { status: 500 }
    );
  }
}
