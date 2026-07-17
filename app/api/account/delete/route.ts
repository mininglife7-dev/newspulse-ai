import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteClient } from '@/lib/supabase-server';

/**
 * GDPR Article 17: Right to Erasure
 * Completely deletes user account and all associated data
 * Requires user to be authenticated
 */

export const dynamic = 'force-dynamic';

interface DeleteAccountRequest {
  confirmed: boolean;
  reason?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get user session from cookies
    const supabase = await createRouteClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Must be logged in to delete account.' },
        { status: 401 }
      );
    }

    const userId = user.id;

    const body = (await request.json()) as unknown;
    if (typeof body !== 'object' || body === null || !('confirmed' in body)) {
      return NextResponse.json(
        {
          error: 'Missing required field: confirmed (boolean)',
          gdprArticle: 'Article 17 (Right to Erasure)',
        },
        { status: 400 }
      );
    }

    const req = body as DeleteAccountRequest;
    if (req.confirmed !== true) {
      return NextResponse.json(
        {
          error:
            'Account deletion must be explicitly confirmed. Set confirmed=true.',
          gdprArticle: 'Article 17 (Right to Erasure)',
        },
        { status: 400 }
      );
    }

    // Initialize service-role client (needed to delete from auth.users)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: { persistSession: false },
      }
    );

    // Get user's workspaces for audit logging before deletion
    const { data: workspaces } = await supabaseAdmin
      .from('workspaces')
      .select('id')
      .eq('owner_id', userId);

    // Log deletion request to audit log (GDPR Article 30)
    // Do this before cascade deletion occurs
    if (workspaces && workspaces.length > 0) {
      for (const workspace of workspaces) {
        await supabaseAdmin.from('audit_log').insert({
          workspace_id: workspace.id,
          user_id: userId,
          action: 'delete',
          resource_type: 'account',
          details: {
            gdpr_article: 17,
            reason: req.reason || 'User requested account deletion',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    // Delete auth user (cascades to all related tables via foreign keys)
    // This single operation triggers cascade deletes:
    // - profiles
    // - workspaces (cascade to companies, ai_systems, risk_assessments, obligations, evidence, remediation_plans, assessment_obligations)
    // - workspace_members
    // - audit_log entries where user_id = this user
    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Account deletion failed:', deleteError);
      return NextResponse.json(
        {
          error: 'Failed to delete account. Please contact support.',
          gdprArticle: 'Article 17 (Right to Erasure)',
        },
        { status: 500 }
      );
    }

    // Clear auth session cookie
    const response = NextResponse.json(
      {
        success: true,
        message:
          'Your account and all associated data have been permanently deleted.',
        gdprArticle: 'Article 17 (Right to Erasure)',
        deletionTimestamp: new Date().toISOString(),
      },
      { status: 200 }
    );

    // Clear Supabase auth cookie
    response.cookies.set('sb-auth-token', '', {
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error during account deletion',
        gdprArticle: 'Article 17 (Right to Erasure)',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Use POST to delete your account',
      endpoint: '/api/account/delete',
      method: 'POST',
      requiredBody: {
        confirmed: true,
        reason: 'optional explanation',
      },
      gdprArticle: 'Article 17 (Right to Erasure)',
      warning:
        'This action is permanent and irreversible. All your data will be deleted.',
    },
    { status: 405 }
  );
}
