/**
 * DNA-GOV-013: Cost Anomaly Detection
 *
 * Monitor Vercel and Supabase spending for cost anomalies.
 * Detects unexpected spikes in usage/cost relative to baseline.
 *
 * Purpose: Prevent cost overruns; identify resource leaks early.
 */

export interface CostMetric {
  service: 'vercel' | 'supabase';
  metric: string; // e.g., 'bandwidth', 'function-invocations', 'database-size'
  value: number; // cost in USD or usage count
  unit: string; // 'USD', 'GB', 'invocations', etc.
  timestamp: string;
  period: 'daily' | 'weekly' | 'monthly';
}

export interface CostBaseline {
  service: 'vercel' | 'supabase';
  metric: string;
  avgDailySpend: number;
  avgDailyUsage: number;
  maxDailySpend: number; // 95th percentile
  stdDeviation: number;
  dataPoints: number;
  lastUpdated: string;
}

export interface CostAnomaly {
  service: 'vercel' | 'supabase';
  metric: string;
  currentValue: number;
  baselineValue: number;
  percentageChange: number;
  zScore: number; // standard deviations from mean
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  detectedAt: string;
}

export interface CostAnomalyReport {
  timestamp: string;
  period: 'daily' | 'weekly' | 'monthly';
  anomalies: CostAnomaly[];
  totalAnomalies: number;
  criticalCount: number;
  highCount: number;
  estimatedMonthlyImpact: number; // projected annual cost impact
  recommendations: string[];
}

const ANOMALY_THRESHOLDS = {
  low: 1.5, // 1.5 standard deviations
  medium: 2.0, // 2 standard deviations
  high: 2.5, // 2.5 standard deviations
  critical: 3.0, // 3+ standard deviations
};

/**
 * Fetch Vercel usage data from API
 */
export async function getVercelMetrics(): Promise<CostMetric[]> {
  try {
    if (!process.env.VERCEL_TOKEN) {
      return [];
    }

    const response = await fetch('https://api.vercel.com/v6/billing/usage', {
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Vercel API error: ${response.status}`);
    }

    const data = (await response.json()) as any;

    const metrics: CostMetric[] = [];

    // Extract bandwidth usage
    if (data.usage?.bandwidth) {
      metrics.push({
        service: 'vercel',
        metric: 'bandwidth',
        value: data.usage.bandwidth.totalGB || 0,
        unit: 'GB',
        timestamp: new Date().toISOString(),
        period: 'monthly',
      });
    }

    // Extract serverless function invocations
    if (data.usage?.functionInvocations) {
      metrics.push({
        service: 'vercel',
        metric: 'function-invocations',
        value: data.usage.functionInvocations.count || 0,
        unit: 'invocations',
        timestamp: new Date().toISOString(),
        period: 'monthly',
      });
    }

    // Extract estimated monthly cost
    if (data.balance?.estimated_cost) {
      metrics.push({
        service: 'vercel',
        metric: 'estimated-monthly-cost',
        value: data.balance.estimated_cost,
        unit: 'USD',
        timestamp: new Date().toISOString(),
        period: 'monthly',
      });
    }

    return metrics;
  } catch (err) {
    console.error('[cost-anomaly-detection] Failed to fetch Vercel metrics:', err);
    return [];
  }
}

/**
 * Fetch Supabase usage data from API
 */
export async function getSupabaseMetrics(): Promise<CostMetric[]> {
  try {
    if (!process.env.SUPABASE_API_KEY) {
      return [];
    }

    const response = await fetch('https://api.supabase.com/v1/projects', {
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.status}`);
    }

    const data = (await response.json()) as any;
    const metrics: CostMetric[] = [];

    // Extract database size from each project
    if (Array.isArray(data)) {
      for (const project of data) {
        if (project.db_size_bytes) {
          metrics.push({
            service: 'supabase',
            metric: 'database-size',
            value: project.db_size_bytes / (1024 * 1024 * 1024), // Convert to GB
            unit: 'GB',
            timestamp: new Date().toISOString(),
            period: 'daily',
          });
        }

        // Extract storage usage
        if (project.storage_size_bytes) {
          metrics.push({
            service: 'supabase',
            metric: 'storage-usage',
            value: project.storage_size_bytes / (1024 * 1024 * 1024), // Convert to GB
            unit: 'GB',
            timestamp: new Date().toISOString(),
            period: 'daily',
          });
        }
      }
    }

    return metrics;
  } catch (err) {
    console.error('[cost-anomaly-detection] Failed to fetch Supabase metrics:', err);
    return [];
  }
}

/**
 * Calculate Z-score to detect anomalies
 */
export function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Determine severity based on Z-score
 */
export function getSeverity(zScore: number): 'low' | 'medium' | 'high' | 'critical' {
  const absScore = Math.abs(zScore);

  if (absScore >= ANOMALY_THRESHOLDS.critical) return 'critical';
  if (absScore >= ANOMALY_THRESHOLDS.high) return 'high';
  if (absScore >= ANOMALY_THRESHOLDS.medium) return 'medium';
  if (absScore >= ANOMALY_THRESHOLDS.low) return 'low';

  return 'low';
}

/**
 * Detect cost anomalies for a single metric
 */
export function detectAnomaly(
  metric: CostMetric,
  baseline: CostBaseline
): CostAnomaly | null {
  const zScore = calculateZScore(metric.value, baseline.avgDailyUsage, baseline.stdDeviation);

  // No anomaly if within 1.5 standard deviations
  if (Math.abs(zScore) < ANOMALY_THRESHOLDS.low) {
    return null;
  }

  const percentageChange = ((metric.value - baseline.avgDailyUsage) / baseline.avgDailyUsage) * 100;
  const severity = getSeverity(zScore);

  return {
    service: metric.service,
    metric: metric.metric,
    currentValue: metric.value,
    baselineValue: baseline.avgDailyUsage,
    percentageChange,
    zScore,
    severity,
    reason: `${metric.metric} is ${Math.abs(percentageChange).toFixed(1)}% ${percentageChange > 0 ? 'higher' : 'lower'} than baseline (${zScore.toFixed(2)}σ)`,
    detectedAt: metric.timestamp,
  };
}

/**
 * Project annual cost impact from monthly anomaly
 */
export function projectCostImpact(
  currentMonthlySpend: number,
  baselineMonthlySpend: number
): number {
  const monthlyCostDifference = currentMonthlySpend - baselineMonthlySpend;
  return monthlyCostDifference * 12; // Project to annual cost
}

/**
 * Generate cost anomaly report
 */
export async function generateCostAnomalyReport(): Promise<CostAnomalyReport> {
  const timestamp = new Date().toISOString();

  // Fetch metrics from both services
  const vercelMetrics = await getVercelMetrics();
  const supabaseMetrics = await getSupabaseMetrics();
  const allMetrics = [...vercelMetrics, ...supabaseMetrics];

  // For demonstration, create baseline data
  // In production, this would be stored in database and updated weekly
  const baselines: Map<string, CostBaseline> = new Map([
    [
      'vercel:bandwidth',
      {
        service: 'vercel',
        metric: 'bandwidth',
        avgDailySpend: 5.0,
        avgDailyUsage: 50, // GB
        maxDailySpend: 15,
        stdDeviation: 8,
        dataPoints: 30,
        lastUpdated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    [
      'vercel:function-invocations',
      {
        service: 'vercel',
        metric: 'function-invocations',
        avgDailySpend: 10.0,
        avgDailyUsage: 10000,
        maxDailySpend: 30,
        stdDeviation: 2000,
        dataPoints: 30,
        lastUpdated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    [
      'supabase:database-size',
      {
        service: 'supabase',
        metric: 'database-size',
        avgDailySpend: 2.0,
        avgDailyUsage: 10, // GB
        maxDailySpend: 5,
        stdDeviation: 1.5,
        dataPoints: 30,
        lastUpdated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  ]);

  // Detect anomalies
  const anomalies: CostAnomaly[] = [];

  for (const metric of allMetrics) {
    const key = `${metric.service}:${metric.metric}`;
    const baseline = baselines.get(key);

    if (baseline) {
      const anomaly = detectAnomaly(metric, baseline);
      if (anomaly) {
        anomalies.push(anomaly);
      }
    }
  }

  // Count by severity
  const criticalCount = anomalies.filter((a) => a.severity === 'critical').length;
  const highCount = anomalies.filter((a) => a.severity === 'high').length;

  // Generate recommendations
  const recommendations: string[] = [];

  if (anomalies.some((a) => a.metric === 'bandwidth' && a.percentageChange > 0)) {
    recommendations.push('Review CDN usage and consider enabling aggressive caching');
  }

  if (anomalies.some((a) => a.metric === 'function-invocations' && a.percentageChange > 0)) {
    recommendations.push('Investigate function invocation spike - may indicate runaway loop or inefficient code');
  }

  if (anomalies.some((a) => a.metric === 'database-size' && a.percentageChange > 0)) {
    recommendations.push('Review database growth - check for unintended data accumulation or backups');
  }

  if (anomalies.some((a) => a.metric === 'storage-usage' && a.percentageChange > 0)) {
    recommendations.push('Audit storage usage - implement retention policies for logs and temporary files');
  }

  if (anomalies.length === 0) {
    recommendations.push('✅ All metrics within normal baseline - no action required');
  }

  // Calculate estimated impact
  const estimatedMonthlyImpact = anomalies.reduce((sum, a) => {
    return sum + projectCostImpact(a.currentValue, a.baselineValue);
  }, 0);

  return {
    timestamp,
    period: 'monthly',
    anomalies,
    totalAnomalies: anomalies.length,
    criticalCount,
    highCount,
    estimatedMonthlyImpact,
    recommendations,
  };
}

/**
 * Format cost anomaly report for display
 */
export function formatCostAnomalyReport(report: CostAnomalyReport): string {
  const lines = ['Cost Anomaly Detection Report', '='.repeat(40)];
  lines.push(`Period: ${report.period.toUpperCase()}`);
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push('');

  lines.push(`Total Anomalies: ${report.totalAnomalies}`);
  lines.push(`  🔴 Critical: ${report.criticalCount}`);
  lines.push(`  🟠 High: ${report.highCount}`);
  lines.push('');

  if (report.estimatedMonthlyImpact !== 0) {
    const sign = report.estimatedMonthlyImpact > 0 ? '+' : '';
    lines.push(
      `Estimated Annual Impact: ${sign}$${Math.abs(report.estimatedMonthlyImpact * 12).toFixed(2)}`
    );
    lines.push('');
  }

  if (report.anomalies.length > 0) {
    lines.push('Detected Anomalies:');
    for (const anomaly of report.anomalies) {
      const icon = anomaly.severity === 'critical' ? '🔴' : anomaly.severity === 'high' ? '🟠' : '🟡';
      lines.push(`${icon} [${anomaly.service}] ${anomaly.metric}`);
      lines.push(`   ${anomaly.reason}`);
      lines.push(`   Current: ${anomaly.currentValue.toFixed(2)} ${anomaly.metric}`);
    }
    lines.push('');
  }

  if (report.recommendations.length > 0) {
    lines.push('Recommendations:');
    report.recommendations.forEach((rec) => {
      lines.push(`• ${rec}`);
    });
  }

  return lines.join('\n');
}
