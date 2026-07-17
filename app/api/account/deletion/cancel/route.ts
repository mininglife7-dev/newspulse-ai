import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

/**
 * POST /api/account/deletion/cancel?id=<deletion_request_id>
 *
 * GDPR Article 17: Right to Erasure (with recovery window)
 *
 * Cancel a pending account deletion request within the 30-day grace period.
 * Requires: authenticated user, matching deletion request ID
 */

export const dynamic = 'force-dynamic';

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
    // Get deletion request ID from query parameter
    const { searchParams } = new URL(request.url);
    const deletionRequestId = searchParams.get('id');

    if (!deletionRequestId) {
      return NextResponse.json(
        { ok: false, error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    // Fetch the deletion request
    const { data: deletionRequest, error: fetchError } = await supabase
      .from('account_deletion_request')
      .select('*')
      .eq('id', deletionRequestId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching deletion request:', fetchError);
      return NextResponse.json(
        { ok: false, error: 'Failed to cancel deletion' },
        { status: 500 }
      );
    }

    if (!deletionRequest) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Deletion request not found or does not belong to you',
        },
        { status: 404 }
      );
    }

    // Check if deletion has already been executed
    if (deletionRequest.status === 'executed') {
      return NextResponse.json(
        {
          ok: false,
          error: 'Account has already been deleted and cannot be recovered',
        },
        { status: 410 }
      );
    }

    // Check if within grace period
    const now = new Date();
    const scheduledAt = new Date(deletionRequest.scheduled_deletion_at);
    if (now > scheduledAt) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Grace period has expired. Account has been permanently deleted.',
        },
        { status: 410 }
      );
    }

    // Cancel the deletion request
    const { error: updateError } = await supabase
      .from('account_deletion_request')
      .update({ status: 'cancelled' })
      .eq('id', deletionRequestId);

    if (updateError) {
      console.error('Error cancelling deletion request:', updateError);
      return NextResponse.json(
        { ok: false, error: 'Failed to cancel deletion' },
        { status: 500 }
      );
    }

    // Log cancellation
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'update',
      resource_type: 'account_deletion_request',
      resource_id: deletionRequestId,
      details: {
        status_change: 'pending -> cancelled',
        reason: 'User cancelled account deletion',
      },
    });

    return NextResponse.json({
      ok: true,
      message: 'Account deletion cancelled. Your account is active.',
      status: 'cancelled',
    });
  } catch (error) {
    console.error('Cancellation error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to cancel deletion' },
      { status: 500 }
    );
  }
}
