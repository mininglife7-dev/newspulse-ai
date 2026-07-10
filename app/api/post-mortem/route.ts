import { NextResponse } from 'next/server';
import {
  createPostMortem,
  addFinding,
  addActionItem,
  completeAction,
  addParticipant,
  schedulePostMortem,
  startPostMortemSession,
  completePostMortem,
  getPostMortem,
  getPostMortemByIncident,
  getActivePostMortems,
  getPostMortemsByStatus,
  generatePostMortemMetrics,
  formatPostMortemReport,
  getHighImpactTrends,
  type PostMortemSummary,
  type FindingCategory,
  type PostMortemStatus,
} from '@/lib/post-mortem';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/post-mortem
 *
 * DNS-019 endpoint: Post-mortem automation and incident learning.
 *
 * Query params:
 * - postMortemId: Get specific post-mortem
 * - incidentId: Get post-mortem for incident
 * - status: Filter by status (pending, scheduled, in-progress, completed)
 * - trends: Get high-impact finding trends (trends=true)
 * - metrics: Get post-mortem metrics (metrics=true)
 * - format: Response format (json or markdown)
 *
 * Returns:
 * - 200 + post-mortem: Post-mortem data
 * - 200 + metrics: Post-mortem metrics
 * - 200 + trends: High-impact finding trends
 * - 404: Post-mortem not found
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const postMortemId = url.searchParams.get('postMortemId');
    const incidentId = url.searchParams.get('incidentId');
    const status = url.searchParams.get('status') as PostMortemStatus | null;
    const trendsParam = url.searchParams.get('trends') === 'true';
    const metricsParam = url.searchParams.get('metrics') === 'true';
    const format = url.searchParams.get('format') || 'json';

    // Get specific post-mortem
    if (postMortemId) {
      const pm = getPostMortem(postMortemId);
      if (!pm) {
        return NextResponse.json(
          { ok: false, error: 'Post-mortem not found', postMortemId },
          { status: 404 }
        );
      }

      if (format === 'markdown') {
        const report = formatPostMortemReport(pm);
        return new NextResponse(report, {
          status: 200,
          headers: { 'content-type': 'text/markdown; charset=utf-8' },
        });
      }

      return NextResponse.json(
        { ok: true, postMortem: pm, timestamp: new Date().toISOString() },
        { status: 200 }
      );
    }

    // Get post-mortem by incident
    if (incidentId) {
      const pm = getPostMortemByIncident(incidentId);
      if (!pm) {
        return NextResponse.json(
          { ok: false, error: 'No post-mortem found for incident', incidentId },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { ok: true, postMortem: pm, timestamp: new Date().toISOString() },
        { status: 200 }
      );
    }

    // Get high-impact trends
    if (trendsParam) {
      const trends = getHighImpactTrends();
      return NextResponse.json(
        {
          ok: true,
          trends,
          timestamp: new Date().toISOString(),
          interpretation:
            trends.length > 0
              ? `Top issue: ${trends[0].category} (${trends[0].count} high-impact findings)`
              : 'No high-impact findings identified yet',
        },
        { status: 200 }
      );
    }

    // Get metrics
    if (metricsParam) {
      const metrics = generatePostMortemMetrics();
      return NextResponse.json(
        {
          ok: true,
          metrics,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Get post-mortems by status or all active
    const postMortems = status ? getPostMortemsByStatus(status) : getActivePostMortems();
    const metrics = generatePostMortemMetrics();

    return NextResponse.json(
      {
        ok: true,
        timestamp: new Date().toISOString(),
        postMortems,
        metrics: {
          totalPostMortems: metrics.totalPostMortems,
          completedPostMortems: metrics.completedPostMortems,
          completionRate: metrics.completionRate,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[post-mortem] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Post-mortem query failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/post-mortem
 *
 * Manage post-mortem lifecycle.
 *
 * Body:
 * {
 *   action: 'create' | 'add-finding' | 'add-action' | 'complete-action' |
 *           'add-participant' | 'schedule' | 'start' | 'complete',
 *   postMortemId?: string (for actions on existing post-mortem),
 *   incidentId?: string (for creation),
 *   summary?: PostMortemSummary (for creation),
 *   scheduledFor?: string ISO date (for scheduling),
 *   finding?: { category, title, description, impact } (for add-finding),
 *   actionItem?: { title, owner, dueDate } (for add-action),
 *   actionId?: string (for complete-action),
 *   participant?: { name, role, email } (for add-participant),
 *   reviewNotes?: string (for complete)
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, postMortemId, incidentId } = body;

    if (!action) {
      return NextResponse.json(
        { ok: false, error: 'Missing action field' },
        { status: 400 }
      );
    }

    // Create post-mortem
    if (action === 'create') {
      if (!incidentId || !body.summary) {
        return NextResponse.json(
          { ok: false, error: 'Missing incidentId or summary for creation' },
          { status: 400 }
        );
      }

      const summary = body.summary as PostMortemSummary;
      const scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : undefined;

      const pm = createPostMortem(incidentId, summary, scheduledFor);

      return NextResponse.json(
        { ok: true, postMortem: pm, timestamp: new Date().toISOString() },
        { status: 201 }
      );
    }

    if (!postMortemId) {
      return NextResponse.json(
        { ok: false, error: 'Missing postMortemId for action' },
        { status: 400 }
      );
    }

    // Add finding
    if (action === 'add-finding') {
      const { finding } = body;
      if (!finding) {
        return NextResponse.json(
          { ok: false, error: 'Missing finding data' },
          { status: 400 }
        );
      }

      const updated = addFinding(
        postMortemId,
        finding.category as FindingCategory,
        finding.title,
        finding.description,
        finding.impact
      );

      if (!updated) {
        return NextResponse.json(
          { ok: false, error: 'Post-mortem not found', postMortemId },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { ok: true, postMortem: updated, timestamp: new Date().toISOString() },
        { status: 200 }
      );
    }

    // Add action item
    if (action === 'add-action') {
      const { actionItem } = body;
      if (!actionItem) {
        return NextResponse.json(
          { ok: false, error: 'Missing actionItem data' },
          { status: 400 }
        );
      }

      const dueDate = actionItem.dueDate ? new Date(actionItem.dueDate) : undefined;
      const updated = addActionItem(postMortemId, actionItem.title, actionItem.owner, dueDate);

      if (!updated) {
        return NextResponse.json(
          { ok: false, error: 'Post-mortem not found', postMortemId },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { ok: true, postMortem: updated, timestamp: new Date().toISOString() },
        { status: 200 }
      );
    }

    // Complete action
    if (action === 'complete-action') {
      const { actionId } = body;
      if (!actionId) {
        return NextResponse.json(
          { ok: false, error: 'Missing actionId' },
          { status: 400 }
        );
      }

      const updated = completeAction(postMortemId, actionId);

      if (!updated) {
        return NextResponse.json(
          { ok: false, error: 'Post-mortem not found', postMortemId },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { ok: true, postMortem: updated, timestamp: new Date().toISOString() },
        { status: 200 }
      );
    }

    // Add participant
    if (action === 'add-participant') {
      const { participant } = body;
      if (!participant) {
        return NextResponse.json(
          { ok: false, error: 'Missing participant data' },
          { status: 400 }
        );
      }

      const updated = addParticipant(
        postMortemId,
        participant.name,
        participant.role,
        participant.email
      );

      if (!updated) {
        return NextResponse.json(
          { ok: false, error: 'Post-mortem not found', postMortemId },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { ok: true, postMortem: updated, timestamp: new Date().toISOString() },
        { status: 200 }
      );
    }

    // Schedule post-mortem
    if (action === 'schedule') {
      if (!body.scheduledFor) {
        return NextResponse.json(
          { ok: false, error: 'Missing scheduledFor date' },
          { status: 400 }
        );
      }

      const updated = schedulePostMortem(postMortemId, new Date(body.scheduledFor));

      if (!updated) {
        return NextResponse.json(
          { ok: false, error: 'Post-mortem not found', postMortemId },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { ok: true, postMortem: updated, timestamp: new Date().toISOString() },
        { status: 200 }
      );
    }

    // Start post-mortem session
    if (action === 'start') {
      const updated = startPostMortemSession(postMortemId);

      if (!updated) {
        return NextResponse.json(
          { ok: false, error: 'Post-mortem not found', postMortemId },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { ok: true, postMortem: updated, timestamp: new Date().toISOString() },
        { status: 200 }
      );
    }

    // Complete post-mortem
    if (action === 'complete') {
      const reviewNotes = body.reviewNotes || 'Post-mortem completed';
      const updated = completePostMortem(postMortemId, reviewNotes);

      if (!updated) {
        return NextResponse.json(
          { ok: false, error: 'Post-mortem not found', postMortemId },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { ok: true, postMortem: updated, timestamp: new Date().toISOString() },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { ok: false, error: 'Unknown action', action },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[post-mortem] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Post-mortem operation failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
