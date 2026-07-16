import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// SendGrid webhook for handling email events (bounces, complaints, etc.)
export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    const body = await req.json();
    const events = Array.isArray(body) ? body : [body];

    logger.info('SendGrid webhook received', {
      requestId,
      eventCount: events.length,
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    for (const event of events) {
      try {
        const eventType = event.event as string;
        const email = event.email as string;
        const timestamp = event.timestamp as number;

        // Log all events for monitoring
        logger.info('Email event', {
          requestId,
          event: eventType,
          email,
        });

        // Handle bounces and complaints - update workspace member status
        if (
          eventType === 'bounce' ||
          eventType === 'complained' ||
          eventType === 'dropped'
        ) {
          // Store event in email_events table
          if (email) {
            // First, find workspace from user email
            const { data: userData } = await supabase.auth.admin.listUsers();
            const user = userData?.users?.find((u) => u.email === email);

            if (user) {
              // Insert event record (workspace_id will need to be determined from context)
              await supabase.from('email_events').insert({
                workspace_id: user.user_metadata?.current_workspace_id,
                recipient_email: email,
                event_type: eventType,
                email_category: event.category,
                metadata: {
                  sendgrid_event: event,
                  bounce_type: event.bounce_type,
                  bounce_subtype: event.bounce_subtype,
                  reason: event.reason,
                },
              });

              logger.info('Email event recorded', {
                requestId,
                email,
                eventType,
              });
            }
          }
        }

        // Handle unsubscribes
        if (eventType === 'unsubscribe') {
          logger.info('User unsubscribed', { requestId, email });
          // Could update email_preferences to set unsubscribe_all = true
        }
      } catch (error: any) {
        logger.error('Failed to process event', {
          requestId,
          error: error.message,
          event: event.event,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    logger.error('SendGrid webhook processing failed', {
      requestId,
      error: error.message,
    });

    // SendGrid requires 2xx response even on errors to not retry
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 200 }
    );
  }
}
