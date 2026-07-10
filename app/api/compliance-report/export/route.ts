import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { getDashboardMetrics } from '@/lib/dashboard-metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function resolveContext(supabase: ReturnType<typeof createRouteClient>) {
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

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
  };
}

export async function GET(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  try {
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'html';

    // Fetch all report data
    const [workspace, metrics, assessments, obligations, plans] = await Promise.all([
      supabase
        .from('workspaces')
        .select('name, slug')
        .eq('id', ctx.workspaceId)
        .maybeSingle(),

      getDashboardMetrics(supabase, ctx.workspaceId),

      supabase
        .from('risk_assessments')
        .select('id, risk_level, created_at')
        .eq('workspace_id', ctx.workspaceId),

      supabase
        .from('obligations')
        .select('id, title, status')
        .eq('workspace_id', ctx.workspaceId),

      supabase
        .from('remediation_plans')
        .select('id, title, status, target_date')
        .eq('workspace_id', ctx.workspaceId),
    ]);

    if (format === 'json') {
      return NextResponse.json({
        ok: true,
        report: {
          workspace: workspace.data,
          generatedAt: new Date().toISOString(),
          metrics,
          assessments: assessments.data || [],
          obligations: obligations.data || [],
          plans: plans.data || [],
        },
      });
    }

    // Generate HTML version for printing to PDF
    const html = generateHTML({
      workspace: workspace.data,
      metrics,
      assessments: assessments.data || [],
      obligations: obligations.data || [],
      plans: plans.data || [],
    });

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'attachment; filename="compliance-report.html"',
      },
    });
  } catch (err) {
    console.error('[api/compliance-report/export] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to export compliance report' },
      { status: 500 }
    );
  }
}

function generateHTML(data: any): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const riskColor = (level: string) => {
    const colors: Record<string, string> = {
      unacceptable: '#dc2626',
      high: '#ea580c',
      limited: '#f59e0b',
      minimal: '#10b981',
    };
    return colors[level] || '#6b7280';
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compliance Report - ${data.workspace?.name || 'Organization'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: white;
            padding: 40px;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
        }

        .header {
            border-bottom: 3px solid #0f172a;
            padding-bottom: 30px;
            margin-bottom: 40px;
        }

        .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
            color: #0f172a;
        }

        .header p {
            color: #6b7280;
            font-size: 14px;
        }

        .metadata {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 40px;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
        }

        .metadata-item label {
            font-weight: 600;
            color: #4b5563;
            font-size: 12px;
            text-transform: uppercase;
            display: block;
            margin-bottom: 5px;
        }

        .metadata-item value {
            font-size: 16px;
            color: #0f172a;
        }

        .section {
            margin-bottom: 50px;
            page-break-inside: avoid;
        }

        .section h2 {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 15px;
            margin-bottom: 30px;
        }

        .metric-card {
            padding: 15px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            background: #f9fafb;
        }

        .metric-card .label {
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            margin-bottom: 8px;
        }

        .metric-card .value {
            font-size: 28px;
            font-weight: 700;
            color: #0f172a;
        }

        .risk-distribution {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 10px;
        }

        .risk-item {
            padding: 12px;
            border-radius: 6px;
            text-align: center;
        }

        .risk-item .label {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 5px;
        }

        .risk-item .count {
            font-size: 24px;
            font-weight: 700;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        table th {
            background: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            color: #4b5563;
            text-transform: uppercase;
            border-bottom: 2px solid #e5e7eb;
        }

        table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }

        table tbody tr:nth-child(even) {
            background: #f9fafb;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: capitalize;
        }

        .status-completed {
            background: #d1fae5;
            color: #065f46;
        }

        .status-in_progress {
            background: #fef3c7;
            color: #92400e;
        }

        .status-pending {
            background: #dbeafe;
            color: #0c2d6b;
        }

        .status-approved {
            background: #d1fae5;
            color: #065f46;
        }

        .status-rejected {
            background: #fee2e2;
            color: #7f1d1d;
        }

        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
        }

        .compliance-score {
            font-size: 48px;
            font-weight: 700;
            color: ${data.metrics.compliancePercentage >= 80 ? '#10b981' : data.metrics.compliancePercentage >= 50 ? '#f59e0b' : '#dc2626'};
            margin: 20px 0;
        }

        @media print {
            body {
                padding: 0;
            }
            .section {
                page-break-inside: avoid;
            }
            table {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AI Governance Compliance Report</h1>
            <p>${data.workspace?.name || 'Organization'} • Generated ${dateStr}</p>
        </div>

        <div class="metadata">
            <div class="metadata-item">
                <label>Organization</label>
                <value>${data.workspace?.name || 'N/A'}</value>
            </div>
            <div class="metadata-item">
                <label>Generated</label>
                <value>${dateStr}</value>
            </div>
            <div class="metadata-item">
                <label>Systems Assessed</label>
                <value>${data.metrics.totalSystems}</value>
            </div>
            <div class="metadata-item">
                <label>Total Assessments</label>
                <value>${data.metrics.totalAssessments}</value>
            </div>
        </div>

        <div class="section">
            <h2>Compliance Score</h2>
            <div class="compliance-score">${data.metrics.compliancePercentage}%</div>
            <p>Overall compliance percentage based on completed remediation plans and approved evidence.</p>
        </div>

        <div class="section">
            <h2>Key Metrics</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="label">Completed Plans</div>
                    <div class="value">${data.metrics.completedPlans}</div>
                </div>
                <div class="metric-card">
                    <div class="label">Approved Evidence</div>
                    <div class="value">${data.metrics.approvedEvidence}</div>
                </div>
                <div class="metric-card">
                    <div class="label">Pending Reviews</div>
                    <div class="value">${data.metrics.pendingReviews}</div>
                </div>
                <div class="metric-card">
                    <div class="label">Overdue Plans</div>
                    <div class="value">${data.metrics.overduePlans}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Risk Distribution</h2>
            <div class="risk-distribution">
                <div class="risk-item" style="background: rgba(220, 38, 38, 0.1);">
                    <div class="label">Unacceptable</div>
                    <div class="count">${data.metrics.riskDistribution.unacceptable}</div>
                </div>
                <div class="risk-item" style="background: rgba(234, 88, 12, 0.1);">
                    <div class="label">High</div>
                    <div class="count">${data.metrics.riskDistribution.high}</div>
                </div>
                <div class="risk-item" style="background: rgba(245, 158, 11, 0.1);">
                    <div class="label">Limited</div>
                    <div class="count">${data.metrics.riskDistribution.limited}</div>
                </div>
                <div class="risk-item" style="background: rgba(16, 185, 129, 0.1);">
                    <div class="label">Minimal</div>
                    <div class="count">${data.metrics.riskDistribution.minimal}</div>
                </div>
            </div>
        </div>

        ${data.assessments.length > 0 ? `
        <div class="section">
            <h2>Assessments</h2>
            <table>
                <thead>
                    <tr>
                        <th>Risk Level</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.assessments.map((a: any) => `
                    <tr>
                        <td>
                            <span class="status-badge" style="background: rgba(${a.risk_level === 'unacceptable' ? '220, 38, 38' : a.risk_level === 'high' ? '234, 88, 12' : a.risk_level === 'limited' ? '245, 158, 11' : '16, 185, 129'}, 0.1); color: ${riskColor(a.risk_level)};">
                                ${a.risk_level}
                            </span>
                        </td>
                        <td>${new Date(a.created_at).toLocaleDateString()}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        ${data.obligations.length > 0 ? `
        <div class="section">
            <h2>Obligations</h2>
            <table>
                <thead>
                    <tr>
                        <th>Obligation</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.obligations.map((o: any) => `
                    <tr>
                        <td>${o.title}</td>
                        <td><span class="status-badge status-${o.status}">${o.status}</span></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        ${data.plans.length > 0 ? `
        <div class="section">
            <h2>Remediation Plans</h2>
            <table>
                <thead>
                    <tr>
                        <th>Plan</th>
                        <th>Status</th>
                        <th>Target Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.plans.map((p: any) => `
                    <tr>
                        <td>${p.title}</td>
                        <td><span class="status-badge status-${p.status}">${p.status}</span></td>
                        <td>${new Date(p.target_date).toLocaleDateString()}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <div class="footer">
            <p>This report was automatically generated by EURO AI on ${dateStr}.</p>
            <p>For questions or clarifications, contact your compliance team.</p>
        </div>
    </div>
</body>
</html>`;
}
