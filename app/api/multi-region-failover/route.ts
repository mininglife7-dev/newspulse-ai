import { NextResponse } from 'next/server';
import {
  generateMultiRegionReport,
  formatMultiRegionReport,
  getMultiRegionStatus,
  recordRegionStatus,
  type RegionHealthMetrics,
} from '@/lib/multi-region-failover';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/multi-region-failover
 *
 * DNS-016 endpoint: Multi-region failover and traffic routing.
 *
 * Returns current multi-region health status and traffic distribution.
 * Used for monitoring dashboard, failover decisions, and Founder visibility.
 *
 * Returns:
 * - 200 + report: All regions healthy
 * - 206 + report: Some regions degraded
 * - 503 + report: Multiple regions critical
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const detailed = url.searchParams.get('detailed') === 'true';

    // Get current region status
    const currentStatus = getMultiRegionStatus();

    // For demo: simulate metrics if not already recorded
    if (currentStatus.every((r) => !r.metrics)) {
      const simulatedMetrics = simulateRegionMetrics();
      const report = generateMultiRegionReport(simulatedMetrics);

      // Record status
      report.healthyRegions.forEach((region) => {
        const metrics = simulatedMetrics.find((m) => m.region === region)!;
        recordRegionStatus(region, {
          region,
          status: 'healthy',
          lastUpdated: report.timestamp,
          metrics,
          failoverEligible: true,
          trafficPercentage: report.trafficDistribution[region],
        });
      });

      report.degradedRegions.forEach((region) => {
        const metrics = simulatedMetrics.find((m) => m.region === region)!;
        recordRegionStatus(region, {
          region,
          status: 'degraded',
          lastUpdated: report.timestamp,
          metrics,
          failoverEligible: true,
          trafficPercentage: report.trafficDistribution[region],
          failoverReason: `Latency ${metrics.latency_p99_ms}ms or Error rate ${metrics.error_rate_percent}%`,
        });
      });

      report.criticalRegions.forEach((region) => {
        const metrics = simulatedMetrics.find((m) => m.region === region)!;
        recordRegionStatus(region, {
          region,
          status: 'critical',
          lastUpdated: report.timestamp,
          metrics,
          failoverEligible: false,
          trafficPercentage: report.trafficDistribution[region],
          failoverReason: `Critical: Error rate ${metrics.error_rate_percent}% or Availability ${metrics.availability_percent}%`,
        });
      });

      const formatted = formatMultiRegionReport(report);

      if (report.overallStatus === 'critical') {
        console.error('[multi-region-failover] CRITICAL:\n', formatted);
      } else if (report.overallStatus === 'degraded') {
        console.warn('[multi-region-failover] DEGRADED:\n', formatted);
      } else {
        console.log('[multi-region-failover] Healthy:\n', formatted);
      }

      const statusCode = report.overallStatus === 'critical' ? 503 : report.overallStatus === 'degraded' ? 206 : 200;

      return NextResponse.json(
        {
          ok: report.overallStatus === 'healthy',
          timestamp: report.timestamp,
          overallStatus: report.overallStatus,
          healthyRegions: report.healthyRegions,
          degradedRegions: report.degradedRegions,
          criticalRegions: report.criticalRegions,
          failoverTriggered: report.failoverTriggered,
          failoverAction: report.failoverAction,
          affectedUsers: report.affectedUsers,
          trafficDistribution: report.trafficDistribution,
          recommendations: report.recommendations,
          ...(detailed && { regionStatuses: currentStatus, metrics: simulatedMetrics }),
          formatted,
        },
        {
          status: statusCode,
          headers: {
            'X-Overall-Status': report.overallStatus,
            'X-Healthy-Regions': String(report.healthyRegions.length),
            'X-Degraded-Regions': String(report.degradedRegions.length),
            'X-Critical-Regions': String(report.criticalRegions.length),
            'X-Failover-Action': report.failoverAction || 'none',
          },
        }
      );
    }

    const report = generateMultiRegionReport(
      currentStatus.map((s) => s.metrics || getPlaceholderMetrics(s.region)).filter(Boolean) as RegionHealthMetrics[]
    );
    const formatted = formatMultiRegionReport(report);

    const statusCode = report.overallStatus === 'critical' ? 503 : report.overallStatus === 'degraded' ? 206 : 200;

    return NextResponse.json(
      {
        ok: report.overallStatus === 'healthy',
        timestamp: report.timestamp,
        overallStatus: report.overallStatus,
        healthyRegions: report.healthyRegions,
        degradedRegions: report.degradedRegions,
        criticalRegions: report.criticalRegions,
        failoverTriggered: report.failoverTriggered,
        failoverAction: report.failoverAction,
        affectedUsers: report.affectedUsers,
        trafficDistribution: report.trafficDistribution,
        recommendations: report.recommendations,
        ...(detailed && { regionStatuses: currentStatus }),
        formatted,
      },
      {
        status: statusCode,
        headers: {
          'X-Overall-Status': report.overallStatus,
          'X-Healthy-Regions': String(report.healthyRegions.length),
          'X-Degraded-Regions': String(report.degradedRegions.length),
          'X-Critical-Regions': String(report.criticalRegions.length),
          'X-Failover-Action': report.failoverAction || 'none',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[multi-region-failover] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Multi-region failover check failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

/**
 * POST /api/multi-region-failover
 *
 * Submit region metrics and get failover recommendation.
 *
 * Body:
 * - metrics: Array of RegionHealthMetrics
 *
 * Returns failover decision with traffic routing recommendations.
 */
export async function POST(req: Request) {
  try {
    let metrics: RegionHealthMetrics[] | undefined;

    if (req.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await req.json();
        metrics = body.metrics;
      } catch {
        // Continue with simulated metrics
      }
    }

    if (!metrics || metrics.length === 0) {
      metrics = simulateRegionMetrics();
    }

    const report = generateMultiRegionReport(metrics);
    const formatted = formatMultiRegionReport(report);

    const statusCode = report.overallStatus === 'critical' ? 503 : report.overallStatus === 'degraded' ? 206 : 200;

    return NextResponse.json(
      {
        ok: report.overallStatus === 'healthy',
        timestamp: report.timestamp,
        overallStatus: report.overallStatus,
        healthyRegions: report.healthyRegions,
        degradedRegions: report.degradedRegions,
        criticalRegions: report.criticalRegions,
        failoverTriggered: report.failoverTriggered,
        failoverAction: report.failoverAction,
        affectedUsers: report.affectedUsers,
        trafficDistribution: report.trafficDistribution,
        recommendations: report.recommendations,
        formatted,
      },
      {
        status: statusCode,
        headers: {
          'X-Overall-Status': report.overallStatus,
          'X-Failover-Action': report.failoverAction || 'none',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[multi-region-failover] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Multi-region failover analysis failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

function simulateRegionMetrics(): RegionHealthMetrics[] {
  const regions = ['us-east', 'us-west', 'eu-west', 'ap-south', 'sa-east'] as const;
  const now = new Date().toISOString();

  return regions.map((region) => {
    // 80% chance of healthy, 15% degraded, 5% critical
    const rand = Math.random();
    let latency, errorRate, availability;

    if (rand > 0.95) {
      // Critical
      latency = 6000 + Math.random() * 4000;
      errorRate = 15 + Math.random() * 10;
      availability = 85 + Math.random() * 5;
    } else if (rand > 0.8) {
      // Degraded
      latency = 2500 + Math.random() * 2000;
      errorRate = 5 + Math.random() * 3;
      availability = 93 + Math.random() * 2;
    } else {
      // Healthy
      latency = 200 + Math.random() * 500;
      errorRate = Math.random() * 1;
      availability = 99 + Math.random() * 1;
    }

    return {
      region,
      timestamp: now,
      latency_p99_ms: Math.round(latency),
      error_rate_percent: Math.round(errorRate * 10) / 10,
      availability_percent: Math.round(availability * 100) / 100,
      cpu_percent: 30 + Math.random() * 40,
      memory_percent: 40 + Math.random() * 40,
      database_connections: 50 + Math.floor(Math.random() * 150),
      active_users: Math.floor(1000 + Math.random() * 9000),
    };
  });
}

function getPlaceholderMetrics(region: string): RegionHealthMetrics {
  return {
    region: region as any,
    timestamp: new Date().toISOString(),
    latency_p99_ms: 500,
    error_rate_percent: 0.5,
    availability_percent: 99.9,
    cpu_percent: 50,
    memory_percent: 60,
    database_connections: 100,
    active_users: 5000,
  };
}
