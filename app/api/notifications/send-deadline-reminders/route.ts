import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { obligationDeadlineReminder } from '@/lib/email-templates';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 60;

// This endpoint is called daily via Vercel Cron
export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info('Sending deadline reminder emails', { requestId });

    // Verify authorization
    const authHeader = req.headers.get('authorization');
    if (
      !process.env.CRON_SECRET ||
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      logger.warn('Unauthorized cron request', { requestId });
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Initialize Supabase with service role key for admin access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Find obligations due in next 7 days and with no recent reminder
    const { data: obligations, error: queryError } = await supabase
      .from('obligations')
      .select(
        `
        id,
        title,
        deadline_days,
        ai_system_id,
        workspace_id,
        created_at,
        reminder_sent_at
      `
      )
      .eq('status', 'identified')
      .lte('deadline_days', 7)
      .gt('deadline_days', 0);

    if (queryError) {
      throw new Error(`Query failed: ${queryError.message}`);
    }

    let emailsSent = 0;
    let errors = 0;
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const obligation of obligations || []) {
      try {
        // Skip if reminder was already sent in last 24 hours
        if (
          obligation.reminder_sent_at &&
          new Date(obligation.reminder_sent_at) > oneDayAgo
        ) {
          continue;
        }

        // Get workspace owner (for now, send to workspace owner)
        // In production, this would query obligation_assignments table
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('owner_id')
          .eq('id', obligation.workspace_id)
          .single();

        if (!workspace?.owner_id) {
          logger.warn('Workspace not found', {
            requestId,
            obligationId: obligation.id,
          });
          continue;
        }

        // Get workspace owner email
        const { data } = await supabase.auth.admin.getUserById(
          workspace.owner_id
        );

        if (!data?.user?.email) {
          logger.warn('User email not found', {
            requestId,
            obligationId: obligation.id,
            userId: workspace.owner_id,
          });
          continue;
        }

        const userEmail = data.user.email;

        const { html, text } = obligationDeadlineReminder(
          userEmail,
          obligation.title,
          obligation.deadline_days
        );

        await sendEmail({
          to: userEmail,
          subject: `Reminder: ${obligation.title} due in ${obligation.deadline_days} days`,
          html,
          text,
          categories: ['euro-ai-deadline-reminder'],
        });

        // Update reminder_sent_at timestamp
        await supabase
          .from('obligations')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', obligation.id);

        emailsSent++;
      } catch (error: any) {
        logger.error('Failed to send reminder email', {
          requestId,
          obligationId: obligation.id,
          error: error.message,
        });
        errors++;
      }
    }

    logger.info('Deadline reminders completed', {
      requestId,
      emailsSent,
      errors,
      total: obligations?.length || 0,
    });

    return NextResponse.json(
      {
        ok: true,
        emailsSent,
        errors,
        total: obligations?.length || 0,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Deadline reminder service failed', {
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
