import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

/**
 * POST /api/account/personal-export
 *
 * GDPR Article 20: Right to Data Portability
 *
 * Exports ONLY the data subject's personal data in machine-readable format.
 * Does NOT include:
 * - Organization-owned records (even if accessible by this user)
 * - Evidence/assessments created by other users
 * - Confidential workspace data (unless created by this user)
 * - Derived reports
 *
 * Classification:
 * ✅ PERSONAL: Profile, consent, memberships, own actions, own submissions
 * ❌ NOT PERSONAL: Evidence from others, org records, assessments not about user
 *
 * Returns: JSON with personal data only
 */

export const dynamic = 'force-dynamic';

interface PersonalDataExport {
  metadata: {
    exported_at: string;
    user_id: string;
    export_version: '1.0';
    data_classification: 'personal';
  };
  personal: {
    profile: {
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      created_at: string;
      updated_at: string;
    };
    consent: {
      gdpr_consent: boolean;
      marketing_consent: boolean;
      consent_version: string | null;
      consents_accepted_at: string | null;
      audit_log: Array<{
        action: 'consent_given' | 'consent_withdrawn' | 'consent_updated';
        timestamp: string;
        ip_address?: string;
      }>;
    };
    memberships: Array<{
      workspace_id: string;
      workspace_name: string;
      role: string;
      joined_at: string;
      status: string;
    }>;
    actions: Array<{
      action: string;
      resource_type: string;
      details: Record<string, unknown>;
      created_at: string;
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
    // 1. Export profile (personal data)
    const { data: profile } = await supabase
      .from('profiles')
      .select(
        'id, email, first_name, last_name, created_at, updated_at, gdpr_consent, marketing_consent, consent_version, consents_accepted_at'
      )
      .eq('id', user.id)
      .maybeSingle();

    // 2. Export consent audit log (personal data: records of this user's consent)
    const { data: consentAudit } = await supabase
      .from('consent_audit_log')
      .select('action, created_at, ip_address')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // 3. Export workspace memberships (personal data: user's roles and access)
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select(
        `
        workspace_id,
        role,
        joined_at: created_at,
        status,
        workspaces(
          name
        )
      `
      )
      .eq('user_id', user.id);

    // 4. Export only actions/audit entries CREATED BY this user (not all workspace data)
    // This is personal data: records of actions this user performed
    const { data: userActions } = await supabase
      .from('audit_log')
      .select('action, resource_type, details, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const exportData: PersonalDataExport = {
      metadata: {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        export_version: '1.0',
        data_classification: 'personal',
      },
      personal: {
        profile: {
          id: profile?.id || user.id,
          email: profile?.email || user.email || '',
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          created_at: profile?.created_at || new Date().toISOString(),
          updated_at: profile?.updated_at || new Date().toISOString(),
        },
        consent: {
          gdpr_consent: profile?.gdpr_consent || false,
          marketing_consent: profile?.marketing_consent || false,
          consent_version: profile?.consent_version || null,
          consents_accepted_at: profile?.consents_accepted_at || null,
          audit_log: (consentAudit || []).map((entry) => ({
            action: entry.action as
              'consent_given' | 'consent_withdrawn' | 'consent_updated',
            timestamp: entry.created_at,
            ip_address: entry.ip_address || undefined,
          })),
        },
        memberships: (memberships || []).map((m) => ({
          workspace_id: m.workspace_id,
          workspace_name: (m.workspaces as any)?.name || 'Unknown',
          role: m.role,
          joined_at: m.joined_at,
          status: m.status,
        })),
        actions: (userActions || []).map((action) => ({
          action: action.action,
          resource_type: action.resource_type,
          details: action.details || {},
          created_at: action.created_at,
        })),
      },
      note: 'This export contains only personal data (Article 20). Organization-owned records, evidence created by other users, and derived reports are not included. For organization data, request a separate workspace export from the workspace owner.',
    };

    // Return as JSON download
    return NextResponse.json(exportData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="personal-data-export-${user.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Personal data export error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to export personal data' },
      { status: 500 }
    );
  }
}
