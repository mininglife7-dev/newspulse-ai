import { NextResponse } from 'next/server';
import {
  getPlaybookForCategory,
  recordPlaybookUsage,
  getPlaybook,
  getAllPlaybooks,
  analyzePlaybookEffectiveness,
  applyPlaybookImprovement,
  getPlaybookImprovements,
  getPlaybookAnalysisHistory,
  generatePlaybookReport,
  formatPlaybookAsMarkdown,
  type PlaybookCategory,
  type PlaybookImprovement,
} from '@/lib/playbook-optimization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/playbook-optimization
 *
 * DNS-021 endpoint: Playbook optimization and continuous improvement.
 *
 * Query params:
 * - playbookId: Get specific playbook
 * - category: Get playbook for incident category
 * - report: Generate effectiveness report (report=true)
 * - format: Response format (json or markdown)
 *
 * Returns:
 * - 200 + playbook: Playbook data
 * - 200 + report: Playbook effectiveness report if report=true
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const playbookId = url.searchParams.get('playbookId');
    const category = url.searchParams.get('category') as PlaybookCategory | null;
    const reportParam = url.searchParams.get('report') === 'true';
    const format = url.searchParams.get('format') || 'json';

    // Get specific playbook
    if (playbookId) {
      const playbook = getPlaybook(playbookId);

      if (!playbook) {
        return NextResponse.json(
          { ok: false, error: 'Playbook not found', playbookId },
          { status: 404 }
        );
      }

      if (format === 'markdown') {
        const markdown = formatPlaybookAsMarkdown(playbook);
        return new NextResponse(markdown, {
          status: 200,
          headers: { 'content-type': 'text/markdown; charset=utf-8' },
        });
      }

      return NextResponse.json(
        {
          ok: true,
          playbook,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Get playbook by category
    if (category) {
      const playbook = getPlaybookForCategory(category);

      if (!playbook) {
        return NextResponse.json(
          { ok: false, error: 'No playbook found for category', category },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          playbook,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Generate effectiveness report
    if (reportParam) {
      const report = generatePlaybookReport();

      return NextResponse.json(
        {
          ok: true,
          report,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Get all playbooks
    const playbooks = getAllPlaybooks();

    return NextResponse.json(
      {
        ok: true,
        timestamp: new Date().toISOString(),
        playbookCount: playbooks.length,
        playbooks,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[playbook-optimization] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Playbook optimization query failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/playbook-optimization
 *
 * Manage playbook optimization and improvements.
 *
 * Body:
 * {
 *   action: 'record-usage' | 'analyze' | 'apply-improvement',
 *   playbookId: string,
 *   incidentId?: string (for record-usage),
 *   incidents?: Array (for analyze),
 *   type?: string (improvement type),
 *   change?: object (improvement change),
 *   rationale?: string (improvement rationale),
 *   stepId?: string (optional)
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, playbookId } = body;

    if (!action || !playbookId) {
      return NextResponse.json(
        { ok: false, error: 'Missing action or playbookId' },
        { status: 400 }
      );
    }

    // Record playbook usage for incident
    if (action === 'record-usage') {
      const { incidentId } = body;

      if (!incidentId) {
        return NextResponse.json(
          { ok: false, error: 'Missing incidentId' },
          { status: 400 }
        );
      }

      recordPlaybookUsage(incidentId, playbookId);

      const playbook = getPlaybook(playbookId);

      return NextResponse.json(
        {
          ok: true,
          message: 'Playbook usage recorded',
          playbookId,
          usageCount: playbook?.usageCount,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Analyze playbook effectiveness
    if (action === 'analyze') {
      const { incidents } = body;

      if (!incidents || !Array.isArray(incidents)) {
        return NextResponse.json(
          { ok: false, error: 'Missing or invalid incidents array' },
          { status: 400 }
        );
      }

      const analysis = analyzePlaybookEffectiveness(playbookId, incidents);

      return NextResponse.json(
        {
          ok: true,
          analysis,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Apply improvement to playbook
    if (action === 'apply-improvement') {
      const { type, change, rationale, stepId } = body;

      if (!type || !change || !rationale) {
        return NextResponse.json(
          { ok: false, error: 'Missing type, change, or rationale' },
          { status: 400 }
        );
      }

      const improvement = applyPlaybookImprovement(
        playbookId,
        type,
        change,
        rationale,
        stepId
      );

      if (!improvement) {
        return NextResponse.json(
          { ok: false, error: 'Failed to apply improvement' },
          { status: 404 }
        );
      }

      const playbook = getPlaybook(playbookId);

      return NextResponse.json(
        {
          ok: true,
          message: 'Improvement applied',
          improvement,
          playbookVersion: playbook?.version,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { ok: false, error: 'Unknown action', action },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[playbook-optimization] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Playbook optimization operation failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
