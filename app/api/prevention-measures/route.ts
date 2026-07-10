/**
 * DNS-024: Prevention Measure API
 *
 * Endpoints for orchestrating prevention measures into GitHub issues
 * and tracking their effectiveness.
 */

import {
  orchestratePreventionIssues,
  analyzePreventionEffectiveness,
  createPreventionIssueLink,
  formatPreventionIssue,
  type PreventionMeasureOrchestrationRequest,
  type PreventionIssueLink,
  type PreventionOrchestrationMetrics,
} from '@/lib/prevention-measure-orchestration';
import type { PreventionMeasure } from '@/lib/post-mortem';

// In-memory storage for prevention issue links
// In production, would use Supabase
const preventionIssueLinks = new Map<string, PreventionIssueLink[]>();
const preventionMetrics = new Map<string, PreventionOrchestrationMetrics>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // Get prevention issues for incident
  if (action === 'by-incident') {
    const incidentId = searchParams.get('incidentId');
    if (!incidentId) {
      return Response.json({ error: 'Missing incidentId' }, { status: 400 });
    }

    const links = preventionIssueLinks.get(incidentId) || [];
    return Response.json({ incidentId, issues: links });
  }

  // Get all prevention metrics
  if (action === 'metrics') {
    const allMetrics = Array.from(preventionMetrics.values());
    return Response.json({
      timestamp: new Date().toISOString(),
      metrics: allMetrics,
      summary: {
        totalIncidents: preventionMetrics.size,
        totalMeasures: allMetrics.reduce((sum, m) => sum + m.totalMeasures, 0),
        totalIssuesCreated: allMetrics.reduce((sum, m) => sum + m.issuesCreated, 0),
        totalIssuesClosed: allMetrics.reduce((sum, m) => sum + m.issuesClosed, 0),
        avgPreventionEffectiveness:
          allMetrics.length > 0
            ? allMetrics.reduce((sum, m) => sum + m.preventionEffectiveness, 0) / allMetrics.length
            : 0,
      },
    });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PreventionMeasureOrchestrationRequest;

    // Validate request
    if (!body.incidentId || !body.preventionMeasures || body.preventionMeasures.length === 0) {
      return Response.json(
        { error: 'Missing required fields: incidentId, preventionMeasures' },
        { status: 400 }
      );
    }

    // Orchestrate issue creation
    const results = await orchestratePreventionIssues(body);

    // Create issue links and track them
    const issueLinks: PreventionIssueLink[] = [];
    results.forEach((result, index) => {
      if (result.success && result.issueNumber) {
        const link = createPreventionIssueLink(
          result.measureId,
          result.issueNumber,
          body.incidentId,
          body.relatedRegressions
        );
        issueLinks.push(link);

        // Update measure with issue number
        const measure = body.preventionMeasures[index];
        if (measure) {
          measure.issueNumber = result.issueNumber;
        }
      }
    });

    // Store links
    preventionIssueLinks.set(body.incidentId, issueLinks);

    // Create metrics snapshot
    const metrics = analyzePreventionEffectiveness(issueLinks, 0); // 0 recurrence rate = optimistic
    preventionMetrics.set(body.incidentId, metrics);

    return Response.json(
      {
        success: true,
        incidentId: body.incidentId,
        issuesCreated: issueLinks.length,
        issueLinks,
        metrics,
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      incidentId: string;
      measureId: string;
      status: 'open' | 'in-progress' | 'closed';
    };

    if (!body.incidentId || !body.measureId) {
      return Response.json(
        { error: 'Missing required fields: incidentId, measureId' },
        { status: 400 }
      );
    }

    const links = preventionIssueLinks.get(body.incidentId);
    if (!links) {
      return Response.json({ error: 'Incident not found' }, { status: 404 });
    }

    const link = links.find((l) => l.measureId === body.measureId);
    if (!link) {
      return Response.json({ error: 'Prevention measure not found' }, { status: 404 });
    }

    // Update status
    link.status = body.status;
    if (body.status === 'closed') {
      link.closedAt = new Date().toISOString();
    }

    // Update metrics
    const metrics = analyzePreventionEffectiveness(links, 0);
    preventionMetrics.set(body.incidentId, metrics);

    return Response.json({
      success: true,
      link,
      metrics,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const incidentId = searchParams.get('incidentId');

  if (!incidentId) {
    return Response.json({ error: 'Missing incidentId' }, { status: 400 });
  }

  preventionIssueLinks.delete(incidentId);
  preventionMetrics.delete(incidentId);

  return Response.json({ success: true, deleted: incidentId });
}
