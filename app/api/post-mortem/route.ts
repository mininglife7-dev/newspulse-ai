import { NextResponse } from 'next/server';
import {
  createPostMortem,
  extractLearnings,
  generateInsights,
  createPreventionPlan,
  analyzePostMortemMetrics,
  formatPostMortemIssue,
  shouldCreatePostMortem,
  type PostMortem,
} from '@/lib/post-mortem';
import { getIncidentMetrics } from '@/lib/incident-metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory post-mortem storage (would be Supabase in production)
const postMortems: Map<string, PostMortem> = new Map();

/**
 * GET /api/post-mortem
 * Retrieve post-mortems or metrics
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const incidentId = url.searchParams.get('incidentId');
    const metrics = url.searchParams.get('metrics') === 'true';
    const status = url.searchParams.get('status');

    if (metrics) {
      const allPostMortems = Array.from(postMortems.values());
      const filtered = status ? allPostMortems.filter((pm) => pm.status === status) : allPostMortems;
      const analysis = analyzePostMortemMetrics(filtered);
      return NextResponse.json({ ok: true, metrics: analysis, timestamp: new Date().toISOString() }, { status: 200 });
    }

    if (incidentId) {
      const postMortem = postMortems.get(incidentId);
      if (!postMortem) {
        return NextResponse.json({ ok: false, error: 'Post-mortem not found' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, postMortem, timestamp: new Date().toISOString() }, { status: 200 });
    }

    const allPostMortems = Array.from(postMortems.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return NextResponse.json(
      { ok: true, postMortems: allPostMortems, count: allPostMortems.length, timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[post-mortem] GET failed:', message);
    return NextResponse.json(
      { ok: false, error: 'Failed to retrieve post-mortems', message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

/**
 * POST /api/post-mortem
 * Create post-mortem from incident data
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      incidentId,
      title,
      startTime,
      endTime,
      severity,
      category,
      rootCause,
      impactedSystems = [],
      relatedRegressions = [],
    } = body;

    if (!incidentId || !title || !startTime || !endTime || !severity || !rootCause) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if should create post-mortem
    const durationMinutes = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
    const playbookImpact = 15; // Placeholder
    if (!shouldCreatePostMortem(severity, durationMinutes, playbookImpact)) {
      return NextResponse.json(
        { ok: true, created: false, reason: 'Incident does not meet post-mortem criteria', timestamp: new Date().toISOString() },
        { status: 200 }
      );
    }

    // Get incident metrics
    const metrics = getIncidentMetrics(24);

    // Create post-mortem
    const postMortem = createPostMortem(
      incidentId,
      title,
      startTime,
      endTime,
      severity,
      category,
      rootCause,
      impactedSystems,
      metrics,
      relatedRegressions
    );

    // Extract learnings and insights
    postMortem.learnings = extractLearnings(postMortem);
    postMortem.insights = generateInsights(postMortem);
    postMortem.preventionPlan = createPreventionPlan(postMortem.learnings);

    // Store post-mortem
    postMortems.set(incidentId, postMortem);

    return NextResponse.json(
      {
        ok: true,
        postMortem,
        learnings: postMortem.learnings,
        insights: postMortem.insights,
        preventionPlan: postMortem.preventionPlan,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[post-mortem] POST failed:', message);
    return NextResponse.json(
      { ok: false, error: 'Failed to create post-mortem', message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/post-mortem
 * Update post-mortem status or format for GitHub issue
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { incidentId, status, action } = body;

    if (!incidentId) {
      return NextResponse.json({ ok: false, error: 'Missing incidentId' }, { status: 400 });
    }

    const postMortem = postMortems.get(incidentId);
    if (!postMortem) {
      return NextResponse.json({ ok: false, error: 'Post-mortem not found' }, { status: 404 });
    }

    if (action === 'format-issue') {
      const issueData = formatPostMortemIssue(postMortem);
      return NextResponse.json(
        { ok: true, issueData, timestamp: new Date().toISOString() },
        { status: 200 }
      );
    }

    if (status) {
      postMortem.status = status;
      if (status === 'approved') {
        postMortem.approvedBy = 'automated-system';
      }
      if (status === 'completed') {
        postMortem.completedAt = new Date().toISOString();
      }
      postMortems.set(incidentId, postMortem);
    }

    return NextResponse.json({ ok: true, postMortem, timestamp: new Date().toISOString() }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[post-mortem] PUT failed:', message);
    return NextResponse.json(
      { ok: false, error: 'Failed to update post-mortem', message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/post-mortem
 * Clear all post-mortems (for testing)
 */
export async function DELETE(req: Request) {
  try {
    postMortems.clear();
    return NextResponse.json(
      { ok: true, message: 'All post-mortems cleared', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[post-mortem] DELETE failed:', message);
    return NextResponse.json(
      { ok: false, error: 'Failed to clear post-mortems', message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
