import { NextResponse } from 'next/server';
import { autoRepairEngine } from '@/lib/observability/auto-repair';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const type = searchParams.get('type');
  const severity = searchParams.get('severity');

  let investigations = autoRepairEngine.getInvestigations();

  // Filter by type if specified
  if (type) {
    investigations = investigations.filter((inv) => inv.issueType === type);
  }

  // Filter by severity if specified
  if (severity) {
    investigations = investigations.filter((inv) => inv.severity === severity);
  }

  // Sort by timestamp descending (most recent first)
  investigations.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Limit results
  const limited = investigations.slice(0, limit);

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      count: limited.length,
      total: autoRepairEngine.getInvestigations().length,
      filters: {
        type: type || null,
        severity: severity || null,
        limit,
      },
      investigations: limited,
    },
    { status: 200, headers: { 'Cache-Control': 'max-age=30' } }
  );
}
