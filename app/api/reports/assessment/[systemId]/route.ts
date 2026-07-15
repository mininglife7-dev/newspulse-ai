import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ systemId: string }> }
) {
  const { systemId } = await context.params;

  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  // Fetch system and assessment
  const { data: system, error: systemError } = await supabase
    .from('ai_systems')
    .select('id, name, description, system_type, vendor, purpose, status')
    .eq('id', systemId)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();

  if (systemError || !system) {
    return NextResponse.json(
      { ok: false, error: 'System not found' },
      { status: 404 }
    );
  }

  const { data: assessment, error: assessmentError } = await supabase
    .from('risk_assessments')
    .select('id, risk_level, risk_score, assessment_data, status, created_at')
    .eq('ai_system_id', systemId)
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assessmentError || !assessment) {
    return NextResponse.json(
      { ok: false, error: 'No assessment found for this system' },
      { status: 404 }
    );
  }

  try {
    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { height } = page.getSize();
    let y = height - 50;

    const fontSize = 12;
    const smallFontSize = 10;

    // Title
    page.drawText('AI System Risk Assessment Report', {
      x: 50,
      y,
      size: 18,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // System Information
    page.drawText('System Information', {
      x: 50,
      y,
      size: 14,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 20;

    const systemInfo = [
      [`System Name:`, system.name],
      [`Type:`, system.system_type || 'Not specified'],
      [`Vendor:`, system.vendor || 'Not specified'],
      [`Status:`, system.status],
      [`Purpose:`, system.purpose || 'Not specified'],
    ];

    systemInfo.forEach(([label, value]) => {
      page.drawText(label, {
        x: 50,
        y,
        size: smallFontSize,
        color: rgb(0.4, 0.4, 0.4),
      });
      page.drawText(String(value), {
        x: 200,
        y,
        size: smallFontSize,
        color: rgb(0, 0, 0),
      });
      y -= 15;
    });

    y -= 10;

    // Risk Assessment Results
    page.drawText('Risk Assessment Results', {
      x: 50,
      y,
      size: 14,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 20;

    const riskColor =
      assessment.risk_level === 'unacceptable'
        ? rgb(1, 0.2, 0.2)
        : assessment.risk_level === 'high'
          ? rgb(1, 0.6, 0.2)
          : assessment.risk_level === 'medium'
            ? rgb(1, 0.8, 0.2)
            : rgb(0.2, 0.8, 0.2);

    page.drawText(`Risk Level: ${assessment.risk_level.toUpperCase()}`, {
      x: 50,
      y,
      size: 12,
      color: riskColor,
    });
    y -= 18;

    page.drawText(`Risk Score: ${assessment.risk_score}/100`, {
      x: 50,
      y,
      size: 11,
      color: rgb(0, 0, 0),
    });
    y -= 18;

    page.drawText(`Status: ${assessment.status}`, {
      x: 50,
      y,
      size: 11,
      color: rgb(0, 0, 0),
    });
    y -= 18;

    page.drawText(
      `Generated: ${new Date(assessment.created_at).toLocaleDateString()}`,
      {
        x: 50,
        y,
        size: smallFontSize,
        color: rgb(0.6, 0.6, 0.6),
      }
    );
    y -= 25;

    // Assessment Details
    if (assessment.assessment_data) {
      page.drawText('Assessment Details', {
        x: 50,
        y,
        size: 14,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 20;

      const data = assessment.assessment_data as any;

      if (data.rationale) {
        page.drawText('Classification Rationale:', {
          x: 50,
          y,
          size: 11,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= 14;

        const rationale = String(data.rationale);
        const words = rationale.split(' ');
        let line = '';
        for (const word of words) {
          if ((line + word).length > 70) {
            page.drawText(line, {
              x: 60,
              y,
              size: smallFontSize,
              color: rgb(0, 0, 0),
            });
            y -= 12;
            line = word + ' ';
          } else {
            line += word + ' ';
          }
        }
        if (line) {
          page.drawText(line, {
            x: 60,
            y,
            size: smallFontSize,
            color: rgb(0, 0, 0),
          });
          y -= 12;
        }
        y -= 10;
      }

      if (
        data.obligations &&
        Array.isArray(data.obligations) &&
        data.obligations.length > 0
      ) {
        page.drawText('Applicable Obligations:', {
          x: 50,
          y,
          size: 11,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= 14;

        data.obligations.slice(0, 5).forEach((obligation: string) => {
          page.drawText(`• ${obligation}`, {
            x: 60,
            y,
            size: smallFontSize,
            color: rgb(0, 0, 0),
          });
          y -= 12;
        });

        if (data.obligations.length > 5) {
          page.drawText(`... and ${data.obligations.length - 5} more`, {
            x: 60,
            y,
            size: smallFontSize,
            color: rgb(0.5, 0.5, 0.5),
          });
          y -= 12;
        }
      }
    }

    // Footer
    page.drawText('EURO AI — Compliance & Governance Platform', {
      x: 50,
      y: 20,
      size: 9,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Return PDF
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="assessment-${system.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (err) {
    console.error('[api/reports/assessment] pdf generation failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
