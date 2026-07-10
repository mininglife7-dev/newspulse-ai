/**
 * DNS-016: Multi-region Failover
 *
 * Detect regional failures and autonomously shift traffic to healthy regions
 * to minimize customer impact. Provides unified visibility into multi-region health
 * and enables safe autonomous failover decisions without Founder intervention.
 */

export type RegionCode = 'us-east' | 'us-west' | 'eu-west' | 'ap-south' | 'sa-east';

export type RegionStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

export type FailoverAction = 'none' | 'monitor' | 'scale-up' | 'failover' | 'escalate';

export interface RegionHealthMetrics {
  region: RegionCode;
  timestamp: string;
  latency_p99_ms: number;
  error_rate_percent: number;
  availability_percent: number;
  cpu_percent: number;
  memory_percent: number;
  database_connections: number;
  active_users: number;
}

export interface RegionStatus_v2 {
  region: RegionCode;
  status: RegionStatus;
  lastUpdated: string;
  metrics?: RegionHealthMetrics;
  failoverEligible: boolean;
  trafficPercentage: number;
  failoverReason?: string;
}

export interface MultiRegionReport {
  timestamp: string;
  healthyRegions: RegionCode[];
  degradedRegions: RegionCode[];
  criticalRegions: RegionCode[];
  overallStatus: 'healthy' | 'degraded' | 'critical';
  recommendations: string[];
  failoverTriggered: boolean;
  failoverAction?: FailoverAction;
  affectedUsers: number;
  trafficDistribution: Record<RegionCode, number>;
}

const DEFAULT_THRESHOLDS = {
  latency_warning_ms: 2000,
  latency_critical_ms: 5000,
  error_rate_warning: 3,
  error_rate_critical: 10,
  availability_warning: 95,
  availability_critical: 90,
  cpu_warning: 75,
  cpu_critical: 90,
  memory_warning: 80,
  memory_critical: 95,
};

const REGIONS: RegionCode[] = ['us-east', 'us-west', 'eu-west', 'ap-south', 'sa-east'];

// In-memory region status tracking
const regionStatusMap = new Map<RegionCode, RegionStatus_v2>();

// Initialize all regions as unknown
for (const region of REGIONS) {
  regionStatusMap.set(region, {
    region,
    status: 'unknown',
    lastUpdated: new Date().toISOString(),
    failoverEligible: true,
    trafficPercentage: 100 / REGIONS.length,
  });
}

/**
 * Classify region health based on metrics
 */
export function classifyRegionHealth(metrics: RegionHealthMetrics): RegionStatus {
  // Critical conditions
  if (
    metrics.error_rate_percent > DEFAULT_THRESHOLDS.error_rate_critical ||
    metrics.availability_percent < DEFAULT_THRESHOLDS.availability_critical ||
    metrics.latency_p99_ms > DEFAULT_THRESHOLDS.latency_critical_ms ||
    metrics.memory_percent > DEFAULT_THRESHOLDS.memory_critical
  ) {
    return 'critical';
  }

  // Degraded conditions
  if (
    metrics.error_rate_percent > DEFAULT_THRESHOLDS.error_rate_warning ||
    metrics.availability_percent < DEFAULT_THRESHOLDS.availability_warning ||
    metrics.latency_p99_ms > DEFAULT_THRESHOLDS.latency_warning_ms ||
    metrics.cpu_percent > DEFAULT_THRESHOLDS.cpu_warning
  ) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Detect failures across all regions
 */
export function detectRegionalFailures(allMetrics: RegionHealthMetrics[]): RegionStatus_v2[] {
  return allMetrics.map((metrics) => {
    const status = classifyRegionHealth(metrics);

    return {
      region: metrics.region,
      status,
      lastUpdated: metrics.timestamp,
      metrics,
      failoverEligible: status !== 'critical',
      trafficPercentage: status === 'healthy' ? 25 : status === 'degraded' ? 15 : 5,
      failoverReason:
        status === 'critical'
          ? `Critical: Error rate ${metrics.error_rate_percent.toFixed(1)}%, Availability ${metrics.availability_percent.toFixed(1)}%`
          : status === 'degraded'
            ? `Degraded: Latency ${metrics.latency_p99_ms}ms (threshold: ${DEFAULT_THRESHOLDS.latency_warning_ms}ms)`
            : undefined,
    };
  });
}

/**
 * Determine failover action based on regional status
 */
export function determineFailoverAction(regionStatuses: RegionStatus_v2[]): FailoverAction {
  const criticalCount = regionStatuses.filter((r) => r.status === 'critical').length;
  const degradedCount = regionStatuses.filter((r) => r.status === 'degraded').length;
  const healthyCount = regionStatuses.filter((r) => r.status === 'healthy').length;

  // All regions critical: escalate immediately
  if (criticalCount >= REGIONS.length - 1) {
    return 'escalate';
  }

  // Multiple critical regions: failover to remaining healthy regions
  if (criticalCount >= 2 && healthyCount > 0) {
    return 'failover';
  }

  // Single critical region with healthy regions: failover traffic away
  if (criticalCount === 1 && healthyCount > 0) {
    return 'failover';
  }

  // Single critical region only: monitor (escalate if more fail)
  if (criticalCount === 1 && healthyCount === 0) {
    return 'monitor';
  }

  // Multiple degraded regions: scale up healthy regions
  if (degradedCount >= 2 && healthyCount > 0) {
    return 'scale-up';
  }

  // Single degraded region: monitor (scale if more fail)
  if (degradedCount === 1 && healthyCount > 0) {
    return 'monitor';
  }

  // All healthy: no action needed
  return 'none';
}

/**
 * Recalculate traffic distribution based on region health
 */
export function calculateTrafficDistribution(regionStatuses: RegionStatus_v2[]): Record<RegionCode, number> {
  const distribution: Record<RegionCode, number> = {} as Record<RegionCode, number>;
  const healthyRegions = regionStatuses.filter((r) => r.status === 'healthy');
  const degradedRegions = regionStatuses.filter((r) => r.status === 'degraded');
  const criticalRegions = regionStatuses.filter((r) => r.status === 'critical');

  if (healthyRegions.length === 0) {
    // Fallback: distribute equally among all regions
    const equal = 100 / REGIONS.length;
    for (const region of REGIONS) {
      distribution[region] = equal;
    }
    return distribution;
  }

  // 70% to healthy regions, 20% to degraded, 10% to critical for fallback
  const healthyPerRegion = 70 / healthyRegions.length;
  const degradedPerRegion = degradedRegions.length > 0 ? 20 / degradedRegions.length : 0;
  const criticalPerRegion = criticalRegions.length > 0 ? 10 / criticalRegions.length : 0;

  for (const region of REGIONS) {
    const status = regionStatuses.find((r) => r.region === region)?.status;
    if (status === 'healthy') {
      distribution[region] = healthyPerRegion;
    } else if (status === 'degraded') {
      distribution[region] = degradedPerRegion;
    } else if (status === 'critical') {
      distribution[region] = criticalPerRegion;
    } else {
      distribution[region] = 0;
    }
  }

  return distribution;
}

/**
 * Generate multi-region report
 */
export function generateMultiRegionReport(allMetrics: RegionHealthMetrics[]): MultiRegionReport {
  const regionStatuses = detectRegionalFailures(allMetrics);
  const failoverAction = determineFailoverAction(regionStatuses);
  const trafficDistribution = calculateTrafficDistribution(regionStatuses);

  const healthyRegions = regionStatuses.filter((r) => r.status === 'healthy').map((r) => r.region);
  const degradedRegions = regionStatuses.filter((r) => r.status === 'degraded').map((r) => r.region);
  const criticalRegions = regionStatuses.filter((r) => r.status === 'critical').map((r) => r.region);

  const recommendations: string[] = [];

  if (criticalRegions.length > 0) {
    recommendations.push(
      `🚨 Critical: ${criticalRegions.join(', ')} unreachable. Shifting traffic to healthy regions.`
    );
  }

  if (degradedRegions.length > 0) {
    recommendations.push(
      `⚠️ Degraded: ${degradedRegions.join(', ')} experiencing high latency/errors. Monitor closely.`
    );
  }

  if (failoverAction === 'failover') {
    recommendations.push(
      `🔄 Failover initiated: Routing traffic away from failing regions to healthy ones.`
    );
  }

  if (failoverAction === 'scale-up') {
    recommendations.push(
      `📈 Scaling up healthy regions to absorb traffic from degraded regions.`
    );
  }

  if (failoverAction === 'escalate') {
    recommendations.push(
      `🆘 All regions critical. Founder intervention required immediately.`
    );
  }

  if (healthyRegions.length > 0 && criticalRegions.length === 0 && degradedRegions.length === 0) {
    recommendations.push(
      `✅ All regions healthy. Multi-region load balancing optimal.`
    );
  }

  const affectedUsers = allMetrics
    .filter((m) => {
      const status = regionStatuses.find((r) => r.region === m.region)?.status;
      return status === 'critical' || status === 'degraded';
    })
    .reduce((sum, m) => sum + m.active_users, 0);

  const overallStatus = criticalRegions.length > 0 ? 'critical' : degradedRegions.length > 0 ? 'degraded' : 'healthy';

  return {
    timestamp: new Date().toISOString(),
    healthyRegions,
    degradedRegions,
    criticalRegions,
    overallStatus,
    recommendations,
    failoverTriggered: failoverAction !== 'none' && failoverAction !== 'monitor',
    failoverAction,
    affectedUsers,
    trafficDistribution,
  };
}

/**
 * Record region status in tracking map
 */
export function recordRegionStatus(region: RegionCode, status: RegionStatus_v2): void {
  regionStatusMap.set(region, status);
}

/**
 * Get current multi-region status
 */
export function getMultiRegionStatus(): RegionStatus_v2[] {
  return Array.from(regionStatusMap.values());
}

/**
 * Format multi-region report for Founder display
 */
export function formatMultiRegionReport(report: MultiRegionReport): string {
  const lines = [
    '# Multi-Region Status Report',
    '',
    `**Timestamp:** ${report.timestamp}`,
    `**Overall Status:** ${report.overallStatus.toUpperCase()}`,
    '',
    '## Regional Health',
  ];

  if (report.healthyRegions.length > 0) {
    lines.push(`- ✅ **Healthy:** ${report.healthyRegions.join(', ')}`);
  }

  if (report.degradedRegions.length > 0) {
    lines.push(`- ⚠️ **Degraded:** ${report.degradedRegions.join(', ')}`);
  }

  if (report.criticalRegions.length > 0) {
    lines.push(`- 🚨 **Critical:** ${report.criticalRegions.join(', ')}`);
  }

  lines.push('');
  lines.push('## Traffic Distribution');
  for (const [region, percentage] of Object.entries(report.trafficDistribution)) {
    lines.push(`- ${region}: ${Math.round(percentage)}%`);
  }

  if (report.affectedUsers > 0) {
    lines.push('');
    lines.push(`**Affected Users:** ${report.affectedUsers.toLocaleString()}`);
  }

  if (report.recommendations.length > 0) {
    lines.push('');
    lines.push('## Recommendations');
    report.recommendations.forEach((rec) => {
      lines.push(`- ${rec}`);
    });
  }

  if (report.failoverAction && report.failoverAction !== 'none') {
    lines.push('');
    lines.push(`**Failover Action:** ${report.failoverAction.toUpperCase()}`);
  }

  return lines.join('\n');
}

/**
 * Reset all region status (testing/admin only)
 */
export function resetRegionStatus(): void {
  regionStatusMap.clear();
  for (const region of REGIONS) {
    regionStatusMap.set(region, {
      region,
      status: 'unknown',
      lastUpdated: new Date().toISOString(),
      failoverEligible: true,
      trafficPercentage: 100 / REGIONS.length,
    });
  }
}

/**
 * Get all available regions
 */
export function getAvailableRegions(): RegionCode[] {
  return REGIONS;
}
