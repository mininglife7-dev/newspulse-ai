import { createRouteClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ComplianceAssessmentResult {
  overallScore: number; // 0-100
  readinessLevel: 'not-started' | 'in-progress' | 'advanced' | 'compliant';
  lastAssessed: string;
  sections: {
    discovery: {
      score: number;
      status: string;
      findings: string[];
    };
    documentation: {
      score: number;
      status: string;
      findings: string[];
    };
    security: {
      score: number;
      status: string;
      findings: string[];
    };
  };
  actionItems: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    action: string;
    estimatedTime: string;
    impact: string;
  }>;
}

export async function GET(request: Request) {
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

    // Fetch all needed data
    const [detectionsRes, bomRes, alertsRes] = await Promise.all([
      supabase
        .from('ai_system_detections')
        .select('count')
        .eq('workspace_id', workspaceId)
        .eq('status', 'detected'),
      supabase
        .from('ai_bom_records')
        .select('system_id, requires_ai_act_assessment, critical_risk_count')
        .eq('workspace_id', workspaceId),
      supabase
        .from('monitoring_alerts')
        .select('severity')
        .eq('workspace_id', workspaceId),
    ]);

    const systemCount = detectionsRes.count || 0;
    const bomRecords = bomRes.data || [];
    const alerts = alertsRes.data || [];

    // Calculate discovery score (20 points max)
    let discoveryScore = 0;
    let discoveryStatus = 'Not started';
    const discoveryFindings: string[] = [];

    if (systemCount === 0) {
      discoveryScore = 0;
      discoveryStatus = 'No AI systems discovered';
      discoveryFindings.push('Run GitHub, AWS, Azure, or GCP discovery to identify AI systems');
    } else if (systemCount < 5) {
      discoveryScore = 10;
      discoveryStatus = `${systemCount} systems discovered (consider expanding to all cloud providers)`;
      discoveryFindings.push(`Found ${systemCount} AI system(s). Expand discovery to AWS, Azure, GCP.`);
    } else {
      discoveryScore = 20;
      discoveryStatus = `${systemCount} systems discovered across multiple sources`;
      discoveryFindings.push(`✓ ${systemCount} AI systems identified and cataloged`);
    }

    // Calculate documentation score (30 points max)
    let documentationScore = 0;
    let documentationStatus = 'No documentation';
    const documentationFindings: string[] = [];

    const bomsWithAssessment = bomRecords.filter((b) => !b.requires_ai_act_assessment).length;
    const bomsNeedingAssessment = bomRecords.filter((b) => b.requires_ai_act_assessment).length;

    if (bomRecords.length === 0) {
      documentationScore = 0;
      documentationStatus = 'No AI-BOMs generated';
      documentationFindings.push('Generate AI-BOM for each system (POST /api/ai-bom/generate)');
    } else if (bomsWithAssessment < bomRecords.length / 2) {
      documentationScore = 15;
      documentationStatus = `${bomsWithAssessment}/${bomRecords.length} systems documented`;
      documentationFindings.push(`✓ ${bomsWithAssessment} systems have AI-BOM documentation`);
      documentationFindings.push(`⚠ ${bomsNeedingAssessment} systems need compliance assessment`);
    } else {
      documentationScore = 30;
      documentationStatus = `All ${bomRecords.length} systems documented`;
      documentationFindings.push(`✓ ${bomRecords.length}/${bomRecords.length} systems fully documented`);
    }

    // Calculate security score (50 points max)
    let securityScore = 0;
    let securityStatus = 'No threat monitoring';
    const securityFindings: string[] = [];

    const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;
    const highAlerts = alerts.filter((a) => a.severity === 'high').length;
    const totalThreats = alerts.length;

    if (totalThreats === 0) {
      securityScore = 40;
      securityStatus = 'No threats detected (monitoring active)';
      securityFindings.push('✓ Runtime threat monitoring enabled');
      securityFindings.push('✓ No critical or high-severity threats detected');
    } else if (criticalAlerts > 0) {
      securityScore = 20;
      securityStatus = `${criticalAlerts} critical threats require attention`;
      securityFindings.push(`⚠ ${criticalAlerts} critical threat(s) detected`);
      securityFindings.push(`⚠ ${highAlerts} high-severity threat(s) detected`);
      securityFindings.push('Review and remediate detected threats immediately');
    } else if (highAlerts > 0) {
      securityScore = 30;
      securityStatus = `${highAlerts} high-severity threats detected`;
      securityFindings.push(`⚠ ${highAlerts} high-severity threat(s) detected`);
      securityFindings.push('Review and address threats in backlog');
    } else {
      securityScore = 40;
      securityStatus = 'Low-severity threats only';
      securityFindings.push('✓ No critical or high-severity threats');
      securityFindings.push(`ℹ ${totalThreats} low/medium severity alert(s) for review`);
    }

    // Calculate overall score and readiness level
    const overallScore = discoveryScore + documentationScore + securityScore;

    let readinessLevel: ComplianceAssessmentResult['readinessLevel'] = 'not-started';
    if (overallScore >= 80) {
      readinessLevel = 'compliant';
    } else if (overallScore >= 50) {
      readinessLevel = 'advanced';
    } else if (overallScore > 0) {
      readinessLevel = 'in-progress';
    }

    // Build action items
    const actionItems: ComplianceAssessmentResult['actionItems'] = [];

    if (systemCount === 0) {
      actionItems.push({
        priority: 'critical',
        action: 'Discover AI systems across GitHub and cloud providers',
        estimatedTime: '30 minutes',
        impact: 'Enables compliance assessment and threat monitoring',
      });
    } else if (systemCount < 5) {
      actionItems.push({
        priority: 'high',
        action: 'Expand discovery to AWS, Azure, and GCP',
        estimatedTime: '1 hour',
        impact: 'Complete AI system inventory across all platforms',
      });
    }

    if (bomsNeedingAssessment > 0) {
      actionItems.push({
        priority: 'high',
        action: `Complete compliance assessment for ${bomsNeedingAssessment} system(s)`,
        estimatedTime: '2-4 hours',
        impact: 'Establish EU AI Act compliance baseline',
      });
    }

    if (criticalAlerts > 0) {
      actionItems.push({
        priority: 'critical',
        action: `Remediate ${criticalAlerts} critical security threat(s)`,
        estimatedTime: '4-8 hours',
        impact: 'Eliminate high-risk security vulnerabilities',
      });
    }

    if (highAlerts > 0) {
      actionItems.push({
        priority: 'high',
        action: `Address ${highAlerts} high-severity threat(s)`,
        estimatedTime: '2-4 hours',
        impact: 'Reduce security incident risk',
      });
    }

    if (actionItems.length === 0) {
      actionItems.push({
        priority: 'low',
        action: 'Maintain monitoring and compliance standards',
        estimatedTime: 'Ongoing',
        impact: 'Sustain AI governance compliance posture',
      });
    }

    const assessment: ComplianceAssessmentResult = {
      overallScore,
      readinessLevel,
      lastAssessed: new Date().toISOString(),
      sections: {
        discovery: {
          score: discoveryScore,
          status: discoveryStatus,
          findings: discoveryFindings,
        },
        documentation: {
          score: documentationScore,
          status: documentationStatus,
          findings: documentationFindings,
        },
        security: {
          score: securityScore,
          status: securityStatus,
          findings: securityFindings,
        },
      },
      actionItems,
    };

    return NextResponse.json(assessment);
  } catch (error) {
    console.error('Compliance assessment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
