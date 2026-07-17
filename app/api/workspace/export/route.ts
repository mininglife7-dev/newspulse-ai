import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

/**
 * POST /api/workspace/export?workspace_id=<id>
 *
 * GDPR Article 15: Right of Access (workspace-level)
 *
 * Exports ONLY organization-owned records from workspace.
 * Requires: workspace owner or admin role
 *
 * Includes:
 * - AI systems
 * - Risk assessments
 * - Evidence and compliance records
 * - Obligations
 * - Audit log entries for workspace
 *
 * Excludes:
 * - Personal data of individual members
 * - Private notes or personal metadata
 */

export const dynamic = 'force-dynamic';

interface WorkspaceExport {
  metadata: {
    exported_at: string;
    workspace_id: string;
    workspace_name: string;
    export_version: '1.0';
    data_classification: 'organizational';
    exported_by_user_id: string;
  };
  organizational: {
    ai_systems: Array<{
      id: string;
      name: string;
      description: string | null;
      created_at: string;
      updated_at: string;
    }>;
    risk_assessments: Array<{
      id: string;
      ai_system_id: string;
      status: string;
      risk_level: string | null;
      created_at: string;
      updated_at: string;
    }>;
    evidence: Array<{
      id: string;
      title: string;
      description: string | null;
      evidence_type: string;
      created_at: string;
      created_by_user_id: string;
    }>;
    obligations: Array<{
      id: string;
      title: string;
      description: string | null;
      status: string;
      due_date: string | null;
      created_at: string;
    }>;
    audit_entries: Array<{
      action: string;
      resource_type: string;
      details: Record<string, unknown>;
      created_at: string;
      created_by_user_id: string;
    }>;
  };
  note: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json(
        { ok: false, error: 'Missing required parameter: workspace_id' },
        { status: 400 }
      );
    }

    // Verify user has admin/owner role in workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name, owner_id')
      .eq('id', workspaceId)
      .maybeSingle();

    if (!workspace) {
      return NextResponse.json(
        { ok: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const isOwner = workspace.owner_id === user.id;
    const isAdmin = membership?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Only workspace owner or admin can export organizational data',
        },
        { status: 403 }
      );
    }

    // Fetch all organizational data
    const { data: aiSystems } = await supabase
      .from('ai_systems')
      .select('id, name, description, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    const { data: assessments } = await supabase
      .from('risk_assessments')
      .select('id, ai_system_id, status, risk_level, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    const { data: evidence } = await supabase
      .from('evidence')
      .select(
        'id, title, description, evidence_type, created_at, created_by: user_id'
      )
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    const { data: obligations } = await supabase
      .from('obligations')
      .select('id, title, description, status, due_date, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    const { data: auditLog } = await supabase
      .from('audit_log')
      .select('action, resource_type, details, created_at, user_id: created_by')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    const exportData: WorkspaceExport = {
      metadata: {
        exported_at: new Date().toISOString(),
        workspace_id: workspace.id,
        workspace_name: workspace.name,
        export_version: '1.0',
        data_classification: 'organizational',
        exported_by_user_id: user.id,
      },
      organizational: {
        ai_systems:
          aiSystems?.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            created_at: s.created_at,
            updated_at: s.updated_at,
          })) || [],
        risk_assessments:
          assessments?.map((a) => ({
            id: a.id,
            ai_system_id: a.ai_system_id,
            status: a.status,
            risk_level: a.risk_level,
            created_at: a.created_at,
            updated_at: a.updated_at,
          })) || [],
        evidence:
          evidence?.map((e) => ({
            id: e.id,
            title: e.title,
            description: e.description,
            evidence_type: e.evidence_type,
            created_at: e.created_at,
            created_by_user_id: (e as any).created_by,
          })) || [],
        obligations:
          obligations?.map((o) => ({
            id: o.id,
            title: o.title,
            description: o.description,
            status: o.status,
            due_date: o.due_date,
            created_at: o.created_at,
          })) || [],
        audit_entries:
          auditLog?.map((entry) => ({
            action: entry.action,
            resource_type: entry.resource_type,
            details: entry.details || {},
            created_at: entry.created_at,
            created_by_user_id: (entry as any).created_by,
          })) || [],
      },
      note: 'This export contains organizational data owned by the workspace. Personal data of individual members is not included. For personal data export, use the personal data export endpoint.',
    };

    return NextResponse.json(exportData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="workspace-export-${workspace.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Workspace export error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to export workspace data' },
      { status: 500 }
    );
  }
}
