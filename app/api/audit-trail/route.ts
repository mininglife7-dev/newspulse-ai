import { NextResponse } from 'next/server';
import {
  getAuditEntries,
  generateAuditReport,
  formatAuditReport,
  rotateAuditLog,
  exportAuditLog,
  type AuditAction,
  type AuditSeverity,
} from '@/lib/audit-trail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/audit-trail
 *
 * DNS-015 endpoint: Security Audit Trail for compliance, incident investigation, and accountability.
 *
 * Query parameters:
 * - format: 'report' (default), 'entries', 'export'
 * - startTime: ISO timestamp for filtering
 * - endTime: ISO timestamp for filtering
 * - action: specific AuditAction to filter
 * - severity: 'critical', 'warning', or 'info'
 * - actor: filter by actor ('governor-autonomous', 'founder', etc.)
 * - resource: filter by resource ID
 * - limit: max entries to return (default 100)
 * - exportFormat: 'json' or 'csv' (only for export format)
 *
 * Returns:
 * - 200 + audit report/entries: Audit trail data for Founder review
 * - 400: Invalid query parameters
 * - 503: Audit trail failed
 *
 * Used by: Founder's compliance dashboard, incident investigation, governance audits
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'report';
    const exportFormat = url.searchParams.get('exportFormat') || 'json';

    // Parse optional filters
    const startTimeStr = url.searchParams.get('startTime');
    const endTimeStr = url.searchParams.get('endTime');
    const action = (url.searchParams.get('action') || undefined) as AuditAction | undefined;
    const severity = (url.searchParams.get('severity') || undefined) as AuditSeverity | undefined;
    const actor = url.searchParams.get('actor') || undefined;
    const resource = url.searchParams.get('resource') || undefined;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 100;

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 10000) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid limit parameter',
          message: 'Limit must be between 1 and 10000',
        },
        { status: 400 }
      );
    }

    // Parse dates if provided
    const startTime = startTimeStr ? new Date(startTimeStr) : undefined;
    const endTime = endTimeStr ? new Date(endTimeStr) : undefined;

    if ((startTime && isNaN(startTime.getTime())) || (endTime && isNaN(endTime.getTime()))) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid date parameters',
          message: 'startTime and endTime must be valid ISO timestamps',
        },
        { status: 400 }
      );
    }

    if (format === 'export') {
      // Export audit log as JSON or CSV
      const exportData = exportAuditLog(exportFormat as 'json' | 'csv');

      return new NextResponse(exportData, {
        status: 200,
        headers: {
          'Content-Type': exportFormat === 'csv' ? 'text/csv' : 'application/json',
          'Content-Disposition': `attachment; filename="audit-trail-export-${new Date().toISOString().split('T')[0]}.${exportFormat === 'csv' ? 'csv' : 'json'}"`,
        },
      });
    }

    if (format === 'entries') {
      // Return raw audit entries with filters
      const entries = getAuditEntries({
        startTime,
        endTime,
        action,
        severity,
        actor,
        resource,
        limit,
      });

      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          count: entries.length,
          entries,
        },
        { status: 200 }
      );
    }

    // Default: return formatted compliance report
    const report = generateAuditReport({
      startTime,
      endTime,
    });

    const formatted = formatAuditReport(report);

    // Log for Founder visibility
    if (report.totalEntries > 0) {
      if (report.criticalActions.length > 0) {
        console.error('[audit-trail] REPORT:\n', formatted);
      } else {
        console.log('[audit-trail] REPORT:\n', formatted);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        timestamp: report.timestamp,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        totalEntries: report.totalEntries,
        criticalCount: report.criticalActions.length,
        summary: {
          byAction: report.byAction,
          bySeverity: report.bySeverity,
        },
        criticalActions: report.criticalActions,
        recentEntries: report.entries,
        formatted,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[audit-trail] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Audit trail query failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

/**
 * POST /api/audit-trail
 *
 * Rotate audit log (maintenance endpoint).
 *
 * Body (optional):
 * - keepDays: number of days to retain (default 90)
 *
 * Returns:
 * - 200 + rotation count: Entries archived
 * - 503: Rotation failed
 *
 * Called by: dna-audit-trail.yml workflow daily
 */
export async function POST(req: Request) {
  try {
    let keepDays = 90;

    // Parse optional body
    if (req.method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await req.json();
        if (typeof body.keepDays === 'number') {
          keepDays = body.keepDays;
        }
      } catch {
        // Continue with default
      }
    }

    // Rotate audit log
    const archived = rotateAuditLog(keepDays);

    console.log(`[audit-trail] Rotated: ${archived} entries archived (keeping ${keepDays} days)`);

    return NextResponse.json(
      {
        ok: true,
        timestamp: new Date().toISOString(),
        archived,
        keepDays,
        message: `Audit log rotated: ${archived} entries archived`,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[audit-trail] Rotation failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Audit log rotation failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
