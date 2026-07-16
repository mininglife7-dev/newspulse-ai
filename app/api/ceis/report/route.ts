import { NextRequest, NextResponse } from 'next/server';
import { getLatestReport, listReports } from '@/lib/ceis/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ceis/report          — latest weekly evolution report.
 * GET /api/ceis/report?all=1    — recent reports (up to 12).
 */
export async function GET(req: NextRequest) {
  try {
    if (req.nextUrl.searchParams.get('all') === '1') {
      const reports = await listReports();
      return NextResponse.json({ ok: true, count: reports.length, reports });
    }
    const report = await getLatestReport();
    if (!report) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'No evolution report generated yet. Run POST /api/ceis/run first.',
        },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, report });
  } catch (err: any) {
    console.error('[/api/ceis/report] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to load report.' },
      { status: 500 }
    );
  }
}
