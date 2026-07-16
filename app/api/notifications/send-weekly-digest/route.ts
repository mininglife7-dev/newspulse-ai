import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { weeklyComplianceSummary } from '@/lib/email-templates';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 60;

// This endpoint is called weekly via Vercel Cron (Mondays at 9 AM UTC)
export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info('Sending weekly digest emails', { requestId });

    // Verify authorization
    const authHeader = req.headers.get('authorization');
    if (
      !process.env.CRON_SECRET ||
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      logger.warn('Unauthorized cron request for weekly digest', { requestId });
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Get all workspaces with active members
    const { data: workspaces, error: workspacesError } = await supabase
      .from('workspaces')
      .select('id, name, owner_id')
      .limit(100);

    if (workspacesError) {
      throw new Error(`Workspaces query failed: ${workspacesError.message}`);
    }

    let emailsSent = 0;
    let errors = 0;

    for (const workspace of workspaces || []) {
      try {
        // Get compliance stats for workspace
        const { data: obligations } = await supabase
          .from('obligations')
          .select('id, status, deadline_days')
          .eq('workspace_id', workspace.id);

        const totalObligations = obligations?.length || 0;
        const completedObligations =
          obligations?.filter((o) => o.status === 'completed').length || 0;
        const dueSoon =
          obligations?.filter((o) => o.deadline_days && o.deadline_days <= 7)
            .length || 0;
        const overdue =
          obligations?.filter((o) => o.deadline_days && o.deadline_days < 0)
            .length || 0;

        if (totalObligations === 0) {
          continue;
        }

        // Get workspace owner email
        const { data } = await supabase.auth.admin.getUserById(
          workspace.owner_id
        );

        if (!data?.user?.email) {
          logger.warn('Workspace owner email not found', {
            requestId,
            workspaceId: workspace.id,
          });
          continue;
        }

        // Check user's email preferences
        const { data: preferences } = await supabase
          .from('email_preferences')
          .select('weekly_digest, unsubscribe_all')
          .eq('user_id', workspace.owner_id)
          .eq('workspace_id', workspace.id)
          .single();

        // Skip if user has opted out
        if (
          preferences &&
          (preferences.unsubscribe_all || !preferences.weekly_digest)
        ) {
          continue;
        }

        const { html, text } = weeklyComplianceSummary(
          data.user.email,
          workspace.name,
          {
            totalObligations,
            completedObligations,
            dueSoon,
            overdue,
          }
        );

        await sendEmail({
          to: data.user.email,
          subject: `Weekly Compliance Summary — ${workspace.name}`,
          html,
          text,
          categories: ['euro-ai-weekly-digest'],
        });

        emailsSent++;
      } catch (error: any) {
        logger.error('Failed to send weekly digest', {
          requestId,
          workspaceId: workspace.id,
          error: error.message,
        });
        errors++;
      }
    }

    logger.info('Weekly digests completed', {
      requestId,
      emailsSent,
      errors,
      workspacesProcessed: workspaces?.length || 0,
    });

    return NextResponse.json(
      {
        ok: true,
        emailsSent,
        errors,
        workspacesProcessed: workspaces?.length || 0,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Weekly digest service failed', {
      requestId,
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
