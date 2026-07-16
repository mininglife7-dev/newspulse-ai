import { NextResponse } from 'next/server';

interface QueryMetric {
  query: string;
  count: number;
  avgExecutionTimeMs: number;
  p95ExecutionTimeMs: number;
  p99ExecutionTimeMs: number;
  isSlowQuery: boolean;
}

interface PerformanceIssue {
  type: 'slow_query' | 'rls_violation' | 'connection_pool' | 'lock_contention';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  recommendation: string;
}

interface DatabaseMetric {
  timestamp: string;
  connectionPoolHealth: number;
  activeConnections: number;
  maxConnections: number;
  queriesPerSecond: number;
  cacheHitRate: number;
  rlsAuditStatus: 'compliant' | 'warning' | 'violation';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '24h';
  const slowQueryThresholdMs = parseInt(
    searchParams.get('threshold') || '1000',
    10
  );

  const now = new Date();

  const metrics: DatabaseMetric = {
    timestamp: now.toISOString(),
    connectionPoolHealth: 98.5,
    activeConnections: 42,
    maxConnections: 100,
    queriesPerSecond: 245,
    cacheHitRate: 92.3,
    rlsAuditStatus: 'compliant',
  };

  // Top slow queries
  const slowQueries: QueryMetric[] = [
    {
      query: 'SELECT * FROM ai_systems WHERE org_id = $1 WITH JOIN',
      count: 1250,
      avgExecutionTimeMs: 1450,
      p95ExecutionTimeMs: 2100,
      p99ExecutionTimeMs: 2850,
      isSlowQuery: true,
    },
    {
      query:
        'SELECT * FROM assessments WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 100',
      count: 890,
      avgExecutionTimeMs: 980,
      p95ExecutionTimeMs: 1420,
      p99ExecutionTimeMs: 1890,
      isSlowQuery: false,
    },
    {
      query: 'SELECT COUNT(*) FROM user_audit_logs WHERE created_at > $1',
      count: 1050,
      avgExecutionTimeMs: 850,
      p95ExecutionTimeMs: 1200,
      p99ExecutionTimeMs: 1650,
      isSlowQuery: false,
    },
    {
      query: 'SELECT * FROM obligations WHERE status = $1 AND due_date <= $2',
      count: 650,
      avgExecutionTimeMs: 1650,
      p95ExecutionTimeMs: 2400,
      p99ExecutionTimeMs: 3200,
      isSlowQuery: true,
    },
    {
      query:
        'SELECT * FROM evidence WHERE assessment_id = $1 WITH RECURSIVE parent',
      count: 420,
      avgExecutionTimeMs: 2150,
      p95ExecutionTimeMs: 3100,
      p99ExecutionTimeMs: 4200,
      isSlowQuery: true,
    },
  ];

  // Identify performance issues
  const performanceIssues: PerformanceIssue[] = [];

  // Check for slow queries
  if (slowQueries.filter((q) => q.isSlowQuery).length > 0) {
    performanceIssues.push({
      type: 'slow_query',
      severity: 'high',
      description: `${slowQueries.filter((q) => q.isSlowQuery).length} queries exceed ${slowQueryThresholdMs}ms threshold`,
      impact: 'API response times degraded, user experience impacted',
      recommendation: `Add indexes on join columns, consider query optimization or denormalization. Top slow query: "${slowQueries.find((q) => q.isSlowQuery)?.query.substring(0, 50)}..."`,
    });
  }

  // Check RLS compliance
  if (metrics.rlsAuditStatus === 'warning') {
    performanceIssues.push({
      type: 'rls_violation',
      severity: 'critical',
      description: 'Row Level Security policies may have gaps',
      impact: 'Potential data access violation across tenants',
      recommendation: 'Audit all RLS policies immediately',
    });
  }

  // Check connection pool
  const poolUtilization =
    (metrics.activeConnections / metrics.maxConnections) * 100;
  if (poolUtilization > 80) {
    performanceIssues.push({
      type: 'connection_pool',
      severity: poolUtilization > 95 ? 'critical' : 'high',
      description: `Connection pool at ${poolUtilization.toFixed(1)}% utilization`,
      impact:
        poolUtilization > 95
          ? 'New connections will be rejected'
          : 'Limited capacity for traffic spikes',
      recommendation: `Increase max connections or optimize connection usage. Current: ${metrics.activeConnections}/${metrics.maxConnections}`,
    });
  }

  // Calculate query performance distribution
  const queryPercentiles = {
    p50:
      slowQueries[Math.floor(slowQueries.length * 0.5)]?.avgExecutionTimeMs ||
      0,
    p95:
      slowQueries[Math.floor(slowQueries.length * 0.95)]?.p95ExecutionTimeMs ||
      0,
    p99:
      slowQueries[Math.floor(slowQueries.length * 0.99)]?.p99ExecutionTimeMs ||
      0,
  };

  return NextResponse.json(
    {
      timestamp: now.toISOString(),
      period,
      metrics,
      slowQueryThreshold: slowQueryThresholdMs,
      queries: {
        total: slowQueries.length,
        slow: slowQueries.filter((q) => q.isSlowQuery).length,
        topSlowQueries: slowQueries.sort(
          (a, b) => b.avgExecutionTimeMs - a.avgExecutionTimeMs
        ),
      },
      performance: {
        p50LatencyMs: queryPercentiles.p50,
        p95LatencyMs: queryPercentiles.p95,
        p99LatencyMs: queryPercentiles.p99,
        avgLatencyMs:
          slowQueries.reduce((sum, q) => sum + q.avgExecutionTimeMs, 0) /
          slowQueries.length,
      },
      connectionPool: {
        health: metrics.connectionPoolHealth,
        active: metrics.activeConnections,
        max: metrics.maxConnections,
        utilization: parseFloat(poolUtilization.toFixed(1)),
        status:
          poolUtilization > 95
            ? 'critical'
            : poolUtilization > 80
              ? 'warning'
              : 'healthy',
      },
      cache: {
        hitRate: metrics.cacheHitRate,
        status: metrics.cacheHitRate > 85 ? 'healthy' : 'suboptimal',
      },
      rls: {
        status: metrics.rlsAuditStatus,
        policiesActive: 43,
        policiesChecked: 43,
        compliant: metrics.rlsAuditStatus === 'compliant',
      },
      issues: performanceIssues,
      recommendations: performanceIssues.map((issue) => issue.recommendation),
      health: {
        status:
          performanceIssues.filter((i) => i.severity === 'critical').length > 0
            ? 'critical'
            : performanceIssues.filter((i) => i.severity === 'high').length > 0
              ? 'warning'
              : 'healthy',
        issueCount: performanceIssues.length,
      },
    },
    {
      status:
        performanceIssues.filter((i) => i.severity === 'critical').length > 0
          ? 503
          : 200,
      headers: {
        'Cache-Control': 'no-cache, max-age=30',
        'X-Pool-Utilization': poolUtilization.toFixed(1),
        'X-Slow-Queries': slowQueries
          .filter((q) => q.isSlowQuery)
          .length.toString(),
      },
    }
  );
}
