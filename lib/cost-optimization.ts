/**
 * DNS-020: Cost Optimization Escalation
 *
 * Monitor cloud resource costs across providers and auto-escalate to Founder
 * when anomalies or thresholds are exceeded. Enables financial accountability
 * and prevents runaway infrastructure costs during incident response.
 */

export type CostProvider = 'vercel' | 'supabase' | 'aws' | 'datadog' | 'sendgrid' | 'other';

export type CostMetric = 'compute' | 'storage' | 'bandwidth' | 'api-calls' | 'monitoring' | 'notifications';

export type EscalationSeverity = 'warning' | 'critical';

export interface CostDataPoint {
  id: string;
  provider: CostProvider;
  metric: CostMetric;
  timestamp: string;
  cost: number;
  currency: string;
  unit?: string;
  metadata?: Record<string, unknown>;
}

export interface CostThreshold {
  provider: CostProvider;
  metric: CostMetric;
  dailyLimit: number;
  monthlyLimit: number;
  escalationSeverity: EscalationSeverity;
}

export interface CostAnomaly {
  id: string;
  provider: CostProvider;
  metric: CostMetric;
  timestamp: string;
  currentCost: number;
  baselineCost: number;
  percentageIncrease: number;
  anomalyType: 'spike' | 'trend' | 'threshold-exceeded';
  severity: EscalationSeverity;
}

export interface CostReport {
  id: string;
  timestamp: string;
  periodStart: string;
  periodEnd: string;
  totalCost: number;
  currency: string;
  costsByProvider: Record<CostProvider, number>;
  costsByMetric: Record<CostMetric, number>;
  anomalies: CostAnomaly[];
  escalations: number;
  forecast?: {
    projectedMonthlyTotal: number;
    trendDirection: 'increasing' | 'stable' | 'decreasing';
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export interface EscalationEvent {
  id: string;
  timestamp: string;
  type: 'cost-spike' | 'threshold-exceeded' | 'trend-warning';
  provider: CostProvider;
  metric: CostMetric;
  currentCost: number;
  threshold: number;
  severity: EscalationSeverity;
  founderNotified: boolean;
  recommendedActions: string[];
}

// Default cost thresholds (adjust per business needs)
const defaultThresholds: CostThreshold[] = [
  { provider: 'vercel', metric: 'compute', dailyLimit: 50, monthlyLimit: 1000, escalationSeverity: 'warning' },
  { provider: 'vercel', metric: 'bandwidth', dailyLimit: 100, monthlyLimit: 2000, escalationSeverity: 'warning' },
  { provider: 'supabase', metric: 'storage', dailyLimit: 30, monthlyLimit: 500, escalationSeverity: 'warning' },
  { provider: 'supabase', metric: 'api-calls', dailyLimit: 200, monthlyLimit: 4000, escalationSeverity: 'warning' },
  { provider: 'aws', metric: 'compute', dailyLimit: 150, monthlyLimit: 3000, escalationSeverity: 'critical' },
  { provider: 'datadog', metric: 'monitoring', dailyLimit: 80, monthlyLimit: 1500, escalationSeverity: 'warning' },
  { provider: 'sendgrid', metric: 'notifications', dailyLimit: 50, monthlyLimit: 800, escalationSeverity: 'warning' },
];

// In-memory stores
const costDataStore = new Map<string, CostDataPoint>();
const anomalyStore = new Map<string, CostAnomaly>();
const escalationStore = new Map<string, EscalationEvent>();
const reportHistory: CostReport[] = [];
let thresholds = [...defaultThresholds];

/**
 * Record a cost data point
 */
export function recordCostDataPoint(
  provider: CostProvider,
  metric: CostMetric,
  cost: number,
  currency: string = 'USD',
  unit?: string,
  metadata?: Record<string, unknown>,
  timestamp?: Date
): CostDataPoint {
  const dataPoint: CostDataPoint = {
    id: `cost-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    provider,
    metric,
    timestamp: (timestamp || new Date()).toISOString(),
    cost,
    currency,
    unit,
    metadata,
  };

  costDataStore.set(dataPoint.id, dataPoint);
  return dataPoint;
}

/**
 * Detect cost anomalies using baseline comparison and spike detection
 */
export function detectAnomalies(): CostAnomaly[] {
  const anomalies: CostAnomaly[] = [];
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Group data points by provider and metric
  const groupedData: Record<string, CostDataPoint[]> = {};
  for (const [, dataPoint] of costDataStore) {
    const key = `${dataPoint.provider}:${dataPoint.metric}`;
    if (!groupedData[key]) {
      groupedData[key] = [];
    }
    groupedData[key].push(dataPoint);
  }

  // Analyze each provider+metric combination
  for (const [key, dataPoints] of Object.entries(groupedData)) {
    const [provider, metric] = key.split(':') as [CostProvider, CostMetric];

    // Sort by timestamp
    const sorted = dataPoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Get today's and week's data
    const todayData = sorted.filter((d) => new Date(d.timestamp) > oneDayAgo);
    const weekData = sorted.filter((d) => new Date(d.timestamp) > sevenDaysAgo);

    if (todayData.length === 0) continue;

    const todayTotal = todayData.reduce((sum, d) => sum + d.cost, 0);
    const weekAverage = weekData.length > 0 ? weekData.reduce((sum, d) => sum + d.cost, 0) / weekData.length : 0;

    // Detect spike: today's cost > 150% of weekly average (only if we have history)
    if (weekData.length >= 2 && weekAverage > 0 && todayTotal > weekAverage * 1.5) {
      const anomaly: CostAnomaly = {
        id: `anomaly-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        provider,
        metric,
        timestamp: new Date().toISOString(),
        currentCost: todayTotal,
        baselineCost: weekAverage,
        percentageIncrease: Math.round(((todayTotal - weekAverage) / weekAverage) * 100),
        anomalyType: 'spike',
        severity: todayTotal > weekAverage * 2 ? 'critical' : 'warning',
      };

      anomalies.push(anomaly);
      anomalyStore.set(anomaly.id, anomaly);
    }

    // Detect threshold exceeded
    const threshold = thresholds.find((t) => t.provider === provider && t.metric === metric);
    if (threshold && todayTotal > threshold.dailyLimit) {
      const anomaly: CostAnomaly = {
        id: `anomaly-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        provider,
        metric,
        timestamp: new Date().toISOString(),
        currentCost: todayTotal,
        baselineCost: threshold.dailyLimit,
        percentageIncrease: Math.round(((todayTotal - threshold.dailyLimit) / threshold.dailyLimit) * 100),
        anomalyType: 'threshold-exceeded',
        severity: threshold.escalationSeverity,
      };

      anomalies.push(anomaly);
      anomalyStore.set(anomaly.id, anomaly);
    }
  }

  return anomalies;
}

/**
 * Check cost thresholds and generate escalation events
 */
export function checkThresholdsAndEscalate(): EscalationEvent[] {
  const escalations: EscalationEvent[] = [];
  const anomalies = detectAnomalies();

  for (const anomaly of anomalies) {
    // Skip if already escalated in last hour
    const recentEscalation = Array.from(escalationStore.values()).find(
      (e) =>
        e.provider === anomaly.provider &&
        e.metric === anomaly.metric &&
        new Date(e.timestamp).getTime() > Date.now() - 60 * 60 * 1000
    );

    if (recentEscalation) continue;

    // Get recommended actions based on provider
    const recommendedActions: string[] = [];
    if (anomaly.percentageIncrease > 100) {
      recommendedActions.push('Review recent deployments or configuration changes');
      recommendedActions.push('Check for runaway queries or memory leaks');
      recommendedActions.push('Consider temporary rate limiting or caching improvements');
    }
    if (anomaly.percentageIncrease > 200) {
      recommendedActions.push('URGENT: Investigate immediate cause of cost spike');
      recommendedActions.push('Consider temporarily disabling non-critical features');
      recommendedActions.push('Contact provider support for cost analysis');
    }

    const escalation: EscalationEvent = {
      id: `escalation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: anomaly.anomalyType === 'threshold-exceeded' ? 'threshold-exceeded' : 'cost-spike',
      provider: anomaly.provider,
      metric: anomaly.metric,
      currentCost: anomaly.currentCost,
      threshold: anomaly.baselineCost,
      severity: anomaly.severity,
      founderNotified: false,
      recommendedActions,
    };

    escalations.push(escalation);
    escalationStore.set(escalation.id, escalation);
  }

  return escalations;
}

/**
 * Mark escalation as notified to Founder
 */
export function markEscalationNotified(escalationId: string): EscalationEvent | undefined {
  const escalation = escalationStore.get(escalationId);
  if (escalation) {
    escalation.founderNotified = true;
  }
  return escalation;
}

/**
 * Update cost thresholds
 */
export function updateThreshold(provider: CostProvider, metric: CostMetric, newThreshold: CostThreshold): void {
  thresholds = thresholds.filter((t) => !(t.provider === provider && t.metric === metric));
  thresholds.push(newThreshold);
}

/**
 * Generate cost report for period
 */
export function generateCostReport(periodStart: Date, periodEnd: Date): CostReport {
  const periodData = Array.from(costDataStore.values()).filter((d) => {
    const timestamp = new Date(d.timestamp);
    return timestamp >= periodStart && timestamp <= periodEnd;
  });

  const costsByProvider: Record<CostProvider, number> = {
    vercel: 0,
    supabase: 0,
    aws: 0,
    datadog: 0,
    sendgrid: 0,
    other: 0,
  };

  const costsByMetric: Record<CostMetric, number> = {
    compute: 0,
    storage: 0,
    bandwidth: 0,
    'api-calls': 0,
    monitoring: 0,
    notifications: 0,
  };

  let totalCost = 0;
  for (const dataPoint of periodData) {
    totalCost += dataPoint.cost;
    costsByProvider[dataPoint.provider] += dataPoint.cost;
    costsByMetric[dataPoint.metric] += dataPoint.cost;
  }

  // Forecast for reporting period to month
  const today = new Date();
  const daysInReportingPeriod = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysPassed = today.getDate();
  // Project based on the reporting period's daily rate
  const dailyRate = daysInReportingPeriod > 0 ? totalCost / daysInReportingPeriod : 0;
  const projectedMonthlyTotal = dailyRate * daysInMonth;

  // Determine trend based on weekly comparison
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekData = Array.from(costDataStore.values()).filter((d) => new Date(d.timestamp) > oneWeekAgo);
  const weeklyAverage = weekData.length > 0 ? weekData.reduce((sum, d) => sum + d.cost, 0) / 7 : 0;
  const todayData = Array.from(costDataStore.values()).filter((d) => {
    const d_date = new Date(d.timestamp);
    return d_date.toDateString() === today.toDateString();
  });
  const todayTotal = todayData.reduce((sum, d) => sum + d.cost, 0);

  const trendDirection =
    weeklyAverage === 0 ? 'stable' : todayTotal > weeklyAverage * 1.1 ? 'increasing' : todayTotal < weeklyAverage * 0.9 ? 'decreasing' : 'stable';

  const riskLevel = projectedMonthlyTotal > 5000 ? 'high' : projectedMonthlyTotal > 2500 ? 'medium' : 'low';

  const anomalies = Array.from(anomalyStore.values()).filter((a) => {
    const timestamp = new Date(a.timestamp);
    return timestamp >= periodStart && timestamp <= periodEnd;
  });

  const report: CostReport = {
    id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    totalCost,
    currency: 'USD',
    costsByProvider,
    costsByMetric,
    anomalies,
    escalations: Array.from(escalationStore.values()).filter(
      (e) => new Date(e.timestamp) >= periodStart && new Date(e.timestamp) <= periodEnd
    ).length,
    forecast: {
      projectedMonthlyTotal: Math.round(projectedMonthlyTotal * 100) / 100,
      trendDirection,
      riskLevel,
    },
  };

  reportHistory.push(report);
  return report;
}

/**
 * Get recent escalations
 */
export function getRecentEscalations(hours: number = 24): EscalationEvent[] {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return Array.from(escalationStore.values())
    .filter((e) => new Date(e.timestamp) > cutoff)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Get escalation event by ID
 */
export function getEscalation(escalationId: string): EscalationEvent | undefined {
  return escalationStore.get(escalationId);
}

/**
 * Format cost report as markdown
 */
export function formatCostReportAsMarkdown(report: CostReport): string {
  const lines = [
    '# Cost Optimization Report',
    '',
    `**Report Period:** ${new Date(report.periodStart).toLocaleDateString()} – ${new Date(report.periodEnd).toLocaleDateString()}`,
    `**Generated:** ${new Date(report.timestamp).toLocaleString()}`,
    '',
    '## Executive Summary',
    `- **Total Cost:** $${report.totalCost.toFixed(2)} USD`,
    `- **Projected Monthly:** $${report.forecast?.projectedMonthlyTotal.toFixed(2)} USD`,
    `- **Trend:** ${report.forecast?.trendDirection.toUpperCase()}`,
    `- **Risk Level:** ${report.forecast?.riskLevel.toUpperCase()}`,
    `- **Anomalies Detected:** ${report.anomalies.length}`,
    `- **Escalations Triggered:** ${report.escalations}`,
    '',
    '## Cost by Provider',
  ];

  for (const [provider, cost] of Object.entries(report.costsByProvider)) {
    if (cost > 0) {
      const percent = ((cost / report.totalCost) * 100).toFixed(1);
      lines.push(`- **${provider}:** $${cost.toFixed(2)} (${percent}%)`);
    }
  }

  lines.push('', '## Cost by Metric');
  for (const [metric, cost] of Object.entries(report.costsByMetric)) {
    if (cost > 0) {
      const percent = ((cost / report.totalCost) * 100).toFixed(1);
      lines.push(`- **${metric}:** $${cost.toFixed(2)} (${percent}%)`);
    }
  }

  if (report.anomalies.length > 0) {
    lines.push('', '## Detected Anomalies');
    for (const anomaly of report.anomalies) {
      const severity = anomaly.severity === 'critical' ? '🔴' : '🟡';
      lines.push(`${severity} **${anomaly.provider}/${anomaly.metric}** (${anomaly.anomalyType})`);
      lines.push(`   - Current Cost: $${anomaly.currentCost.toFixed(2)}`);
      lines.push(`   - Baseline: $${anomaly.baselineCost.toFixed(2)}`);
      lines.push(`   - Increase: +${anomaly.percentageIncrease}%`);
    }
  }

  lines.push('', '## Recommendations');
  if (report.forecast?.riskLevel === 'high') {
    lines.push('⚠️ **HIGH RISK:** Immediate cost reduction measures recommended');
    lines.push('- Review infrastructure scaling policies');
    lines.push('- Implement aggressive caching and rate limiting');
    lines.push('- Consider scheduled maintenance windows');
  } else if (report.forecast?.riskLevel === 'medium') {
    lines.push('⚠️ **MEDIUM RISK:** Monitor closely and implement preventive measures');
    lines.push('- Optimize database queries');
    lines.push('- Review CDN and bandwidth usage');
    lines.push('- Implement cost allocation tagging');
  } else {
    lines.push('✓ **LOW RISK:** Current cost trajectory is healthy');
    lines.push('- Continue regular monitoring');
    lines.push('- Maintain optimization practices');
  }

  return lines.join('\n');
}

/**
 * Reset cost store (testing/admin only)
 */
export function resetCostStore(): void {
  costDataStore.clear();
  anomalyStore.clear();
  escalationStore.clear();
  reportHistory.length = 0;
  thresholds = [...defaultThresholds];
}
