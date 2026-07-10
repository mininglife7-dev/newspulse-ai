import { NextResponse } from 'next/server';
import { type ProductEvent } from '@/lib/product-observability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/telemetry/event
 *
 * Record a product event for observability and analytics.
 * Used by client-side code to track user behavior, feature adoption, errors, and performance.
 *
 * Payload:
 * {
 *   workspace_id: UUID,
 *   user_id: UUID,
 *   event_type: 'assessment_created' | 'evidence_uploaded' | ...,
 *   category: 'funnel' | 'feature_adoption' | 'error' | 'performance',
 *   metadata: { ... }
 * }
 *
 * Response: { ok: true, event_id: uuid } or error
 */
export async function POST(request: Request) {
  try {
    const event = (await request.json()) as ProductEvent;

    // Validate required fields
    if (!event.workspace_id || !event.user_id || !event.event_type || !event.category) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate event_type and category
    const validEventTypes = [
      'signup_started',
      'email_verified',
      'workspace_created',
      'first_assessment_started',
      'first_assessment_completed',
      'assessment_created',
      'obligation_created',
      'evidence_uploaded',
      'assessment_exported',
      'framework_selected',
      'api_error',
      'validation_error',
      'auth_error',
      'timeout_error',
      'page_load',
      'api_request',
    ];

    const validCategories = ['funnel', 'feature_adoption', 'error', 'performance'];

    if (!validEventTypes.includes(event.event_type)) {
      return NextResponse.json(
        { ok: false, error: `Invalid event_type: ${event.event_type}` },
        { status: 400 }
      );
    }

    if (!validCategories.includes(event.category)) {
      return NextResponse.json(
        { ok: false, error: `Invalid category: ${event.category}` },
        { status: 400 }
      );
    }

    // In production, this would insert into Supabase product_events table
    // For now, just log and acknowledge receipt
    console.log('[api/telemetry/event]', {
      workspace_id: event.workspace_id,
      event_type: event.event_type,
      category: event.category,
      metadata_keys: Object.keys(event.metadata || {}),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        ok: true,
        event_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[api/telemetry/event] error:', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to record event',
        message: (err as any).message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
