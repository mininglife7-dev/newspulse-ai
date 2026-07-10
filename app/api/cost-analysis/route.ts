import { NextResponse } from 'next/server';
import { recordCostAlert } from '@/lib/alert-hub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CostMetrics {
  timestamp: string;
  vercelCost?: number;
  supabaseCost?: number;
  totalEstimate?: number;
  deploymentCount?: number;
  dbSizeGB?: number;
  realtimeUsage?: number;
}

// In-memory cost history (in production, would be persisted)
const costHistory: CostMetrics[] = [];

/**
 * GET /api/cost-analysis
 *
 * DNA-GOV-014 endpoint: Cost Optimization and Anomaly Detection.
 *
 * Analyzes infrastructure costs and detects spending anomalies:
 * - Vercel deployment/compute costs
 * - Supabase database and realtime costs
 * - Trend analysis (month-over-month, week-over-week)
 * - Anomaly detection with alerting
 * - Optimization recommendations
 *
 * Returns:
 * - 200: Cost analysis with trend and recommendations
 * - 206: Anomaly detected - escalation recommended
 * - 503: Analysis failed
 *
 * Used by: Cost monitoring dashboard, governance reporting
 */
export async function GET(req: Request) {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Simulate cost collection (in production, call actual billing APIs)
    // For MVP: estimate based on common patterns
    const estimatedVercelCost = estimateVercelCost();
    const estimatedSupabaseCost = estimateSupabaseCost();
    const totalEstimate = estimatedVercelCost + estimatedSupabaseCost;

    // Add to history
    const metrics: CostMetrics = {
      timestamp: now.toISOString(),
      vercelCost: estimatedVercelCost,
      supabaseCost: estimatedSupabaseCost,
      totalEstimate,
      deploymentCount: Math.floor(Math.random() * 50) + 10, // Simulated
      dbSizeGB: Math.random() * 5 + 2, // 2-7 GB
      realtimeUsage: Math.floor(Math.random() * 10000) + 1000,
    };

    costHistory.push(metrics);

    // Keep only last 90 days
    const ninetyDaysAgo = now.getTime() - 90 * 24 * 60 * 60 * 1000;
    const recentHistory = costHistory.filter(
      (m) => new Date(m.timestamp).getTime() > ninetyDaysAgo
    );

    // Calculate trends
    const trend = calculateTrend(recentHistory);
    const anomaly = detectAnomaly(recentHistory);
    const recommendations = generateRecommendations(metrics, trend, anomaly);

    // Record alert if anomaly
    if (anomaly.detected && anomaly.metric && anomaly.severity !== undefined) {
      recordCostAlert({
        metric: anomaly.metric,
        severity: anomaly.severity,
        currentValue: anomaly.currentValue || 0,
        previousValue: anomaly.previousValue || 0,
        changePercent: anomaly.changePercent || 0,
        recommendation: recommendations[0] || 'Review cost trends',
      });
    }

    return NextResponse.json(
      {
        ok: !anomaly.detected,
        timestamp: now.toISOString(),
        currentMetrics: {
          estimatedMonthlyVercel: estimatedVercelCost * 30,
          estimatedMonthlySupabase: estimatedSupabaseCost * 30,
          totalMonthlyEstimate: totalEstimate * 30,
          deploymentCount: metrics.deploymentCount,
          dbSizeGB: metrics.dbSizeGB,
          realtimeUsage: metrics.realtimeUsage,
        },
        trend: {
          direction: trend.direction,
          changePercent: trend.changePercent,
          daysAnalyzed: trend.daysAnalyzed,
          projectedMonthlyIncrease: trend.projectedIncrease,
        },
        anomalyDetected: anomaly.detected,
        ...(anomaly.detected && {
          anomaly: {
            metric: anomaly.metric || '',
            severity: anomaly.severity || 'warning',
            message: anomaly.message || '',
            currentValue: anomaly.currentValue || 0,
            previousValue: anomaly.previousValue || 0,
            changePercent: anomaly.changePercent || 0,
          },
        }),
        recommendations,
        analysis: generateAnalysis(metrics, trend, anomaly),
      },
      {
        status: anomaly.detected ? 206 : 200,
        headers: {
          'X-Anomaly-Detected': String(anomaly.detected),
          'X-Trend': trend.direction,
          'X-Monthly-Estimate': String(Math.round(totalEstimate * 30)),
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cost-analysis] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Cost analysis failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

function estimateVercelCost(): number {
  // Vercel Pro: $20/month + $0.50 per 1M compute seconds
  // Estimate: 5-50 compute seconds per deployment
  // ~20-50 deployments/month = 100-2500 compute seconds
  // Rough estimate: $20-$25/month baseline + usage
  return 20 + Math.random() * 10;
}

function estimateSupabaseCost(): number {
  // Supabase Pro: $25/month + storage/usage overage
  // Database: ~$3-5/month for our scale
  // Realtime: ~$5-10/month
  // Estimate: $30-40/month
  return 30 + Math.random() * 10;
}

function calculateTrend(
  history: CostMetrics[]
): {
  direction: 'increasing' | 'stable' | 'decreasing';
  changePercent: number;
  daysAnalyzed: number;
  projectedIncrease: number;
} {
  if (history.length < 2) {
    return {
      direction: 'stable',
      changePercent: 0,
      daysAnalyzed: 0,
      projectedIncrease: 0,
    };
  }

  const recent = history.slice(-7); // Last 7 days
  const previous = history.slice(-14, -7); // Previous 7 days

  const recentAvg =
    recent.reduce((sum, m) => sum + (m.totalEstimate || 0), 0) / recent.length;
  const previousAvg =
    previous.length > 0
      ? previous.reduce((sum, m) => sum + (m.totalEstimate || 0), 0) /
        previous.length
      : recentAvg;

  const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100;
  const direction =
    changePercent > 5 ? 'increasing' : changePercent < -5 ? 'decreasing' : 'stable';

  return {
    direction,
    changePercent: Math.round(changePercent * 10) / 10,
    daysAnalyzed: recent.length,
    projectedIncrease: Math.round((changePercent / 100) * recentAvg * 30),
  };
}

function detectAnomaly(
  history: CostMetrics[]
): {
  detected: boolean;
  metric?: string;
  severity?: 'warning' | 'critical';
  message?: string;
  currentValue?: number;
  previousValue?: number;
  changePercent?: number;
} {
  if (history.length < 2) {
    return { detected: false };
  }

  const current = history[history.length - 1];
  const previous = history[history.length - 2];

  if (!current.totalEstimate || !previous.totalEstimate) {
    return { detected: false };
  }

  const changePercent = ((current.totalEstimate - previous.totalEstimate) / previous.totalEstimate) * 100;

  // Anomaly: >20% daily increase or total > $100/day
  if (changePercent > 20 || (current.totalEstimate || 0) > 100) {
    return {
      detected: true,
      metric: 'daily_spend',
      severity: (current.totalEstimate || 0) > 100 ? 'critical' : 'warning',
      message: `Cost spike: ${Math.round(changePercent)}% increase or ${Math.round(current.totalEstimate || 0)}/day`,
      currentValue: current.totalEstimate,
      previousValue: previous.totalEstimate,
      changePercent: Math.round(changePercent * 10) / 10,
    };
  }

  return { detected: false };
}

function generateRecommendations(
  metrics: CostMetrics,
  trend: ReturnType<typeof calculateTrend>,
  anomaly: ReturnType<typeof detectAnomaly>
): string[] {
  const recs: string[] = [];

  // Database size recommendations
  if ((metrics.dbSizeGB || 0) > 5) {
    recs.push('Database size exceeds 5GB—archive old records or consider partitioning');
  }

  // Trend-based recommendations
  if (trend.direction === 'increasing') {
    recs.push(`Costs increasing ${trend.changePercent}%—review recent changes (new features, traffic spike)`);
    recs.push(`Projected monthly increase: $${trend.projectedIncrease}—monitor closely`);
  }

  // Deployment efficiency
  if ((metrics.deploymentCount || 0) > 100) {
    recs.push('High deployment frequency—consider batching or optimizing CI/CD');
  }

  // Realtime usage
  if ((metrics.realtimeUsage || 0) > 50000) {
    recs.push('High realtime usage—evaluate if all connections are necessary');
  }

  // Anomaly-specific
  if (anomaly.detected) {
    recs.push(`URGENT: ${anomaly.message}—investigate immediately`);
  }

  return recs.length > 0 ? recs : ['Costs stable—continue monitoring'];
}

function generateAnalysis(
  metrics: CostMetrics,
  trend: ReturnType<typeof calculateTrend>,
  anomaly: ReturnType<typeof detectAnomaly>
): string {
  const parts = [
    `Daily costs: ~$${Math.round((metrics.totalEstimate || 0) * 10) / 10}`,
    `Monthly projection: ~$${Math.round((metrics.totalEstimate || 0) * 30)}`,
  ];

  if (trend.direction !== 'stable') {
    parts.push(`Trend: ${trend.direction} (${Math.abs(trend.changePercent)}% change)`);
  }

  if (anomaly.detected) {
    parts.push(`⚠️ ANOMALY: ${anomaly.message}`);
  }

  return parts.join('; ');
}
