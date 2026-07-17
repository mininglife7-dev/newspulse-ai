import { type NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

/**
 * GDPR Article 20: Right to Data Portability
 * Exports user's complete personal data in JSON format
 * Includes: profile, workspaces, companies, assessments, evidence, obligations
 */

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Must be logged in to export data.' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // First get all workspace IDs user has access to
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId);

    const { data: ownedWorkspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', userId);

    const accessibleWorkspaceIds = [
      ...(memberships?.map((m) => m.workspace_id) || []),
      ...(ownedWorkspaces?.map((w) => w.id) || []),
    ];

    // Fetch all user data
    const profileRes = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const membershipsRes = await supabase
      .from('workspace_members')
      .select('*')
      .eq('user_id', userId);

    // Conditionally fetch workspace-related data
    const workspacesRes =
      accessibleWorkspaceIds.length > 0
        ? await supabase
            .from('workspaces')
            .select('*')
            .or(accessibleWorkspaceIds.map((id) => `id.eq.${id}`).join(','))
        : { data: [] as unknown[] };

    const companiesRes =
      accessibleWorkspaceIds.length > 0
        ? await supabase
            .from('companies')
            .select('*')
            .or(
              accessibleWorkspaceIds
                .map((id) => `workspace_id.eq.${id}`)
                .join(',')
            )
        : { data: [] as unknown[] };

    const aiSystemsRes =
      accessibleWorkspaceIds.length > 0
        ? await supabase
            .from('ai_systems')
            .select('*')
            .or(
              accessibleWorkspaceIds
                .map((id) => `workspace_id.eq.${id}`)
                .join(',')
            )
        : { data: [] as unknown[] };

    const assessmentsRes =
      accessibleWorkspaceIds.length > 0
        ? await supabase
            .from('risk_assessments')
            .select('*')
            .or(
              accessibleWorkspaceIds
                .map((id) => `workspace_id.eq.${id}`)
                .join(',')
            )
        : { data: [] as unknown[] };

    const obligationsRes =
      accessibleWorkspaceIds.length > 0
        ? await supabase
            .from('obligations')
            .select('*')
            .or(
              accessibleWorkspaceIds
                .map((id) => `workspace_id.eq.${id}`)
                .join(',')
            )
        : { data: [] as unknown[] };

    const evidenceRes =
      accessibleWorkspaceIds.length > 0
        ? await supabase
            .from('evidence')
            .select('*')
            .or(
              accessibleWorkspaceIds
                .map((id) => `workspace_id.eq.${id}`)
                .join(',')
            )
        : { data: [] as unknown[] };

    const remediationRes =
      accessibleWorkspaceIds.length > 0
        ? await supabase
            .from('remediation_plans')
            .select('*')
            .or(
              accessibleWorkspaceIds
                .map((id) => `workspace_id.eq.${id}`)
                .join(',')
            )
        : { data: [] as unknown[] };

    // Compile portable data export
    const exportData = {
      exportDate: new Date().toISOString(),
      gdprArticle: 20,
      dataSubject: {
        id: userId,
        email: user.email,
      },
      profile: profileRes.data,
      workspaces: workspacesRes.data,
      memberships: membershipsRes.data,
      companies: companiesRes.data,
      aiSystems: aiSystemsRes.data,
      riskAssessments: assessmentsRes.data,
      obligations: obligationsRes.data,
      evidence: evidenceRes.data,
      remediationPlans: remediationRes.data,
      dataCategories: {
        personalData: ['profile'],
        organizationalData: ['companies', 'workspaces'],
        systemsData: ['aiSystems', 'riskAssessments', 'obligations'],
        complianceData: ['evidence', 'remediationPlans'],
      },
      statistics: {
        workspacesOwned: workspacesRes.data?.length || 0,
        workspacesJoined: membershipsRes.data?.length || 0,
        companiesManaged: companiesRes.data?.length || 0,
        aiSystemsTracked: aiSystemsRes.data?.length || 0,
        assessmentsCreated: assessmentsRes.data?.length || 0,
        obligationsTracked: obligationsRes.data?.length || 0,
        evidenceDocuments: evidenceRes.data?.length || 0,
        remediationPlans: remediationRes.data?.length || 0,
      },
    };

    // Create response with JSON file download
    const response = new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="euro-ai-data-export-${userId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json"`,
        'X-GDPR-Article': '20',
        'X-Export-Date': new Date().toISOString(),
      },
    });

    return response;
  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json(
      {
        error: 'Failed to export data',
        gdprArticle: 20,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Use POST to export your data',
      endpoint: '/api/account/export',
      method: 'POST',
      gdprArticle: 'Article 20 (Right to Data Portability)',
      response:
        'Returns JSON file with complete personal data in portable format',
      includes: [
        'User profile and account information',
        'All workspaces and memberships',
        'Companies, AI systems, and assessments',
        'Obligations, evidence, and remediation plans',
      ],
    },
    { status: 405 }
  );
}
