import { NextRequest, NextResponse } from 'next/server';

interface ErrorSignature {
  signature: string;
  count: number;
  trend: 'stable' | 'increasing' | 'decreasing';
  affectedUsers: number;
  firstSeen: string;
  lastSeen: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ErrorMetrics {
  totalErrors: number;
  uniqueSignatures: number;
  errorRate: number;
  period: string;
  topErrors: ErrorSignature[];
  incidents: Array<{
    id: string;
    severity: string;
    error: string;
    firstOccurrence: string;
    durationSeconds: number;
    status: 'resolved' | 'ongoing';
  }>;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lastHours = searchParams.get('last_hours') || '1';

  // In production, this would query from error tracking system
  // For now, return the response structure with example data
  const metrics: ErrorMetrics = {
    totalErrors: 0,
    uniqueSignatures: 0,
    errorRate: 0,
    period: `${lastHours}h`,
    topErrors: [],
    incidents: [],
  };

  // Calculate error rate (0% when no errors)
  const errorRatePercent = (metrics.totalErrors / 1000) * 100;

  return NextResponse.json(
    {
      ...metrics,
      errorRate: errorRatePercent,
      timestamp: new Date().toISOString(),
      thresholds: {
        critical: {
          errorRatePercent: 5,
          newSignaturesIn5Min: 10,
        },
        warning: {
          errorRatePercent: 2,
          errorSpikeMultiplier: 2,
        },
      },
      summary: {
        status:
          errorRatePercent > 5
            ? 'critical'
            : errorRatePercent > 2
              ? 'warning'
              : 'healthy',
        message:
          errorRatePercent === 0
            ? 'No errors detected'
            : errorRatePercent > 5
              ? 'High error rate detected - immediate investigation required'
              : 'Elevated error rate - monitoring in progress',
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Error-Rate': errorRatePercent.toString(),
      },
    }
  );
}
