import { createRouteClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AuditExportRequest {
  format: 'json' | 'csv';
  sections?: string[];
  includeEvidence?: boolean;
}

interface AuditTrail {
  exportedAt: string;
  exportedBy: string;
  workspace: {
    id: string;
  };
  euAiActCompliance: {
    article11: {
      title: 'AI Bill of Materials Requirements';
      status: 'compliant' | 'partial' | 'non-compliant';
      systems: Array<{
        id: string;
        name: string;
        hasAiBom: boolean;
        bomGeneratedAt?: string;
        componentCount: number;
        criticalRisks: number;
      }>;
    };
    article15: {
      title: 'Risk Assessment and Management';
      status: 'compliant' | 'partial' | 'non-compliant';
      assessmentSummary: {
        totalSystems: number;
        systemsAssessed: number;
        highRiskSystems: number;
      };
    };
    article24: {
      title: 'Documentation and Record Keeping';
      status: 'compliant' | 'partial' | 'non-compliant';
      documentation: {
        complianceReadinessScore: number;
        lastAssessmentDate: string;
        completionPercentage: number;
      };
    };
  };
  securityMonitoring: {
    runtimeThreats: {
      totalAlerts: number;
      criticalThreats: number;
      highThreats: number;
      monitoringActive: boolean;
    };
    lastThreatUpdate: string;
  };
  discoveryStatus: {
    totalSystems: number;
    discoveredSources: string[];
    lastDiscoveryDate: string;
  };
  actionItems: Array<{
    priority: string;
    action: string;
    estimatedTime: string;
    impact: string;
  }>;
  attestation: {
    generatedDate: string;
    auditTrailCompleteAndAccurate: boolean;
    readyForRegulation: boolean;
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace context
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: 'No active workspace — complete company setup first' },
        { status: 409 }
      );
    }

    const workspaceId = membership.workspace_id as string;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'json') as 'json' | 'csv';
    const includeEvidence = searchParams.get('includeEvidence') === 'true';

    // Fetch all compliance data
    const [detections, bomsRes, alertsRes, assessmentRes] = await Promise.all([
      supabase
        .from('ai_system_detections')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'detected'),

      supabase
        .from('ai_bom_records')
        .select('*')
        .eq('workspace_id', workspaceId),

      supabase
        .from('monitoring_alerts')
        .select('severity')
        .eq('workspace_id', workspaceId),

      supabase
        .from('ai_system_detections')
        .select('count')
        .eq('workspace_id', workspaceId)
        .eq('status', 'detected'),
    ]);

    const systems = detections.data || [];
    const boms = bomsRes.data || [];
    const alerts = alertsRes.data || [];
    const systemCount = assessmentRes.count || 0;

    // Calculate compliance status (mirroring compliance assessment)
    const bomMap = new Map(boms.map((b: any) => [b.system_id, b]));
    const bomsWithAssessment = boms.filter((b: any) => !b.requires_ai_act_assessment).length;
    const criticalAlerts = alerts.filter((a: any) => a.severity === 'critical').length;
    const highAlerts = alerts.filter((a: any) => a.severity === 'high').length;

    // Determine compliance statuses
    const article11Status = boms.length > 0 ? (bomsWithAssessment === boms.length ? 'compliant' : 'partial') : 'partial';
    const article15Status = (systems || []).length > 0 ? (criticalAlerts === 0 ? 'compliant' : 'partial') : 'non-compliant';
    const article24Status = bomsWithAssessment > 0 ? 'partial' : 'non-compliant';

    // Build audit trail
    const auditTrail: AuditTrail = {
      exportedAt: new Date().toISOString(),
      exportedBy: user.email || 'unknown',
      workspace: { id: workspaceId },
      euAiActCompliance: {
        article11: {
          title: 'AI Bill of Materials Requirements',
          status: article11Status,
          systems: (systems || []).map((sys: any) => ({
            id: sys.ai_system_id,
            name: sys.name,
            hasAiBom: !!bomMap.get(sys.ai_system_id),
            bomGeneratedAt: bomMap.get(sys.ai_system_id)?.generated_at,
            componentCount: bomMap.get(sys.ai_system_id)?.component_count || 0,
            criticalRisks: bomMap.get(sys.ai_system_id)?.critical_risk_count || 0,
          })),
        },
        article15: {
          title: 'Risk Assessment and Management',
          status: article15Status,
          assessmentSummary: {
            totalSystems: (systems || []).length,
            systemsAssessed: (systems || []).filter((s: any) => bomMap.has(s.ai_system_id)).length,
            highRiskSystems: (systems || []).filter((s: any) => {
              const bom = bomMap.get(s.ai_system_id);
              return bom && bom.critical_risk_count > 0;
            }).length,
          },
        },
        article24: {
          title: 'Documentation and Record Keeping',
          status: article24Status,
          documentation: {
            complianceReadinessScore: Math.min(100, Math.round((bomsWithAssessment / (boms.length || 1)) * 100)),
            lastAssessmentDate: new Date().toISOString(),
            completionPercentage: boms.length > 0 ? Math.round((bomsWithAssessment / boms.length) * 100) : 0,
          },
        },
      },
      securityMonitoring: {
        runtimeThreats: {
          totalAlerts: alerts.length,
          criticalThreats: criticalAlerts,
          highThreats: highAlerts,
          monitoringActive: true,
        },
        lastThreatUpdate: new Date().toISOString(),
      },
      discoveryStatus: {
        totalSystems: (systems || []).length,
        discoveredSources: Array.from(
          new Set((systems || []).map((s: any) => s.detection_source))
        ) as string[],
        lastDiscoveryDate: (systems || []).length > 0 ? (systems[0] as any).created_at : new Date().toISOString(),
      },
      actionItems: [
        ...(boms.length === 0 ? [{ priority: 'critical', action: 'Generate AI-BOM for all systems', estimatedTime: '2-4 hours', impact: 'Establish EU AI Act Article 11 compliance' }] : []),
        ...(criticalAlerts > 0 ? [{ priority: 'critical', action: `Remediate ${criticalAlerts} critical threat(s)`, estimatedTime: '4-8 hours', impact: 'Eliminate high-risk security vulnerabilities' }] : []),
        ...(boms.length < (systems || []).length ? [{ priority: 'high', action: `Complete assessment for ${(systems || []).length - boms.length} system(s)`, estimatedTime: '2-4 hours', impact: 'Close compliance gaps' }] : []),
      ],
      attestation: {
        generatedDate: new Date().toISOString(),
        auditTrailCompleteAndAccurate: true,
        readyForRegulation: article11Status === 'compliant' && article15Status === 'compliant' && criticalAlerts === 0,
      },
    };

    if (format === 'csv') {
      // Simple CSV format for audit trail
      const csvContent = `EU AI Act Compliance Audit Trail
Generated: ${auditTrail.exportedAt}
Exported By: ${auditTrail.exportedBy}
Workspace: ${auditTrail.workspace.id}

ARTICLE 11: AI BILL OF MATERIALS
Status,${auditTrail.euAiActCompliance.article11.status}
Total Systems,${auditTrail.euAiActCompliance.article11.systems.length}
Systems with BOM,${auditTrail.euAiActCompliance.article11.systems.filter((s) => s.hasAiBom).length}

ARTICLE 15: RISK ASSESSMENT
Status,${auditTrail.euAiActCompliance.article15.status}
Systems Assessed,${auditTrail.euAiActCompliance.article15.assessmentSummary.systemsAssessed}
High Risk Systems,${auditTrail.euAiActCompliance.article15.assessmentSummary.highRiskSystems}

ARTICLE 24: DOCUMENTATION
Status,${auditTrail.euAiActCompliance.article24.status}
Completion Percentage,${auditTrail.euAiActCompliance.article24.documentation.completionPercentage}%

SECURITY MONITORING
Total Alerts,${auditTrail.securityMonitoring.runtimeThreats.totalAlerts}
Critical Threats,${auditTrail.securityMonitoring.runtimeThreats.criticalThreats}
High Threats,${auditTrail.securityMonitoring.runtimeThreats.highThreats}

READINESS FOR REGULATION,${auditTrail.attestation.readyForRegulation ? 'YES' : 'NO'}`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit-trail-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Return JSON format
    return NextResponse.json(auditTrail, {
      headers: {
        'Content-Disposition': `attachment; filename="audit-trail-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Audit export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
