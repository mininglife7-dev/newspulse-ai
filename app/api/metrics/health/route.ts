import { NextRequest, NextResponse } from 'next/server';

interface HealthMetric {
  timestamp: string;
  uptime: number;
  errorRate: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  requestsPerSecond: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period') || '24h';

  // Generate synthetic data for demonstration
  // In production, this would aggregate from metrics backend (Prometheus, CloudWatch, etc.)
  const now = new Date();
  const metrics: HealthMetric[] = [];

  // Generate hourly metrics for the requested period
  const hours = period === '24h' ? 24 : period === '7d' ? 168 : 24;

  for (let i = 0; i < hours; i++) {
    const timestamp = new Date(now.getTime() - i * 3600000);
    metrics.push({
      timestamp: timestamp.toISOString(),
      uptime: 99.95 + Math.random() * 0.04,
      errorRate: Math.max(0, 0.2 + Math.random() * 0.3),
      p50Latency: 45 + Math.random() * 15,
      p95Latency: 120 + Math.random() * 40,
      p99Latency: 250 + Math.random() * 100,
      requestsPerSecond: 15 + Math.random() * 25,
    });
  }

  // Calculate averages
  const avgUptime =
    metrics.reduce((sum, m) => sum + m.uptime, 0) / metrics.length;
  const avgErrorRate =
    metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;
  const avgP99 =
    metrics.reduce((sum, m) => sum + m.p99Latency, 0) / metrics.length;

  return NextResponse.json(
    {
      period,
      metrics: metrics.reverse(), // Return in chronological order
      summary: {
        averageUptime: parseFloat(avgUptime.toFixed(2)),
        averageErrorRate: parseFloat(avgErrorRate.toFixed(2)),
        averageP99Latency: parseFloat(avgP99.toFixed(0)),
        status:
          avgErrorRate > 5
            ? 'critical'
            : avgErrorRate > 2
              ? 'warning'
              : 'healthy',
      },
      alerts: generateAlerts(avgErrorRate, avgP99, avgUptime),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, max-age=30',
      },
    }
  );
}

function generateAlerts(
  errorRate: number,
  p99Latency: number,
  uptime: number
): Array<{
  severity: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
}> {
  const alerts = [];

  if (errorRate > 5) {
    alerts.push({
      severity: 'critical',
      message: 'Error rate exceeds critical threshold',
      metric: 'error_rate',
      value: parseFloat(errorRate.toFixed(2)),
      threshold: 5,
    });
  } else if (errorRate > 2) {
    alerts.push({
      severity: 'warning',
      message: 'Error rate elevated',
      metric: 'error_rate',
      value: parseFloat(errorRate.toFixed(2)),
      threshold: 2,
    });
  }

  if (p99Latency > 5000) {
    alerts.push({
      severity: 'critical',
      message: 'P99 latency exceeds critical threshold',
      metric: 'p99_latency',
      value: parseFloat(p99Latency.toFixed(0)),
      threshold: 5000,
    });
  } else if (p99Latency > 2000) {
    alerts.push({
      severity: 'warning',
      message: 'P99 latency elevated',
      metric: 'p99_latency',
      value: parseFloat(p99Latency.toFixed(0)),
      threshold: 2000,
    });
  }

  if (uptime < 99) {
    alerts.push({
      severity: 'warning',
      message: 'Uptime below target',
      metric: 'uptime',
      value: parseFloat(uptime.toFixed(2)),
      threshold: 99,
    });
  }

  return alerts;
}
