import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  data: Record<string, any>;
}

export async function triggerWebhooks(
  workspaceId: string,
  eventType: string,
  entityType: string,
  entityId: string,
  data: Record<string, any>
) {
  const requestId = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      logger.warn('Webhook service: Missing Supabase configuration', {
        requestId,
      });
      return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Get active subscriptions for this workspace and event
    const { data: subscriptions, error: queryError } = await supabase
      .from('webhook_subscriptions')
      .select('id, url, events, secret')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);

    if (queryError) {
      logger.error('Failed to query webhook subscriptions', {
        requestId,
        error: queryError.message,
      });
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      workspace_id: workspaceId,
      entity_type: entityType,
      entity_id: entityId,
      data,
    };

    // Send to each matching subscription
    for (const subscription of subscriptions) {
      if (!subscription.events.includes(eventType)) {
        continue;
      }

      try {
        await deliverWebhook(
          supabase,
          subscription.id,
          workspaceId,
          subscription.url,
          subscription.secret,
          payload,
          eventType,
          entityType,
          entityId,
          requestId
        );
      } catch (error: any) {
        logger.error('Failed to deliver webhook', {
          requestId,
          subscriptionId: subscription.id,
          error: error.message,
        });
      }
    }
  } catch (error: any) {
    logger.error('Webhook trigger service failed', {
      requestId,
      workspaceId,
      error: error.message,
    });
  }
}

async function deliverWebhook(
  supabase: any,
  subscriptionId: string,
  workspaceId: string,
  url: string,
  secret: string,
  payload: WebhookPayload,
  eventType: string,
  entityType: string,
  entityId: string,
  requestId: string
) {
  const payloadJson = JSON.stringify(payload);
  const timestamp = Date.now();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payloadJson}`)
    .digest('hex');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `t=${timestamp},v1=${signature}`,
        'X-Webhook-Event': eventType,
        'X-Webhook-Delivery-ID': `${subscriptionId}-${timestamp}`,
      },
      body: payloadJson,
    });

    // Record delivery attempt
    const { error: logError } = await supabase.from('webhook_events').insert({
      workspace_id: workspaceId,
      subscription_id: subscriptionId,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      payload,
      http_status: response.status,
      delivery_attempts: 1,
      delivered_at: response.ok ? new Date().toISOString() : null,
    });

    if (logError) {
      logger.warn('Failed to log webhook event', {
        requestId,
        subscriptionId,
        error: logError.message,
      });
    }

    if (!response.ok) {
      logger.warn('Webhook delivery failed', {
        requestId,
        subscriptionId,
        status: response.status,
        url,
      });
    } else {
      logger.info('Webhook delivered', {
        requestId,
        subscriptionId,
        eventType,
      });

      // Update last_triggered_at
      await supabase
        .from('webhook_subscriptions')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('id', subscriptionId);
    }
  } catch (error: any) {
    // Record failed delivery
    await supabase.from('webhook_events').insert({
      workspace_id: workspaceId,
      subscription_id: subscriptionId,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      payload,
      http_status: null,
      error_message: error.message,
      delivery_attempts: 1,
    });

    logger.error('Webhook delivery error', {
      requestId,
      subscriptionId,
      error: error.message,
      url,
    });
  }
}
