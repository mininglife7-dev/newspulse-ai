/**
 * Performance Profiling Utilities
 * Captures detailed performance metrics for debugging and optimization
 */

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: 'pending' | 'completed' | 'failed';
  error?: Error;
  metadata?: Record<string, any>;
}

export interface PerformanceProfile {
  requestId: string;
  endpoint: string;
  totalDurationMs: number;
  metrics: PerformanceMetric[];
  metadata?: Record<string, any>;
}

const activeProfiles = new Map<string, PerformanceProfile>();
const completedProfiles: PerformanceProfile[] = [];
const maxProfileHistory = 1000;

/**
 * Start profiling a request
 */
export function startProfile(requestId: string, endpoint: string): PerformanceProfile {
  const profile: PerformanceProfile = {
    requestId,
    endpoint,
    totalDurationMs: 0,
    metrics: [],
  };

  activeProfiles.set(requestId, profile);
  return profile;
}

/**
 * Mark a metric checkpoint within a profile
 */
export function markMetric(
  requestId: string,
  metricName: string,
  metadata?: Record<string, any>
): PerformanceMetric {
  const profile = activeProfiles.get(requestId);
  if (!profile) {
    throw new Error(`Profile not found: ${requestId}`);
  }

  const metric: PerformanceMetric = {
    name: metricName,
    startTime: Date.now(),
    status: 'pending',
    metadata,
  };

  profile.metrics.push(metric);
  return metric;
}

/**
 * Complete a metric
 */
export function completeMetric(
  requestId: string,
  metricName: string,
  status: 'completed' | 'failed' = 'completed',
  error?: Error
): void {
  const profile = activeProfiles.get(requestId);
  if (!profile) {
    throw new Error(`Profile not found: ${requestId}`);
  }

  const metric = profile.metrics.find((m) => m.name === metricName && !m.endTime);
  if (!metric) {
    throw new Error(`Metric not found: ${metricName}`);
  }

  metric.endTime = Date.now();
  metric.durationMs = metric.endTime - metric.startTime;
  metric.status = status;
  if (error) {
    metric.error = error;
  }
}

/**
 * Complete a profile and store results
 */
export function completeProfile(requestId: string): PerformanceProfile {
  const profile = activeProfiles.get(requestId);
  if (!profile) {
    throw new Error(`Profile not found: ${requestId}`);
  }

  // Calculate total duration from first metric start to last metric end
  if (profile.metrics.length > 0) {
    const firstStart = Math.min(...profile.metrics.map((m) => m.startTime));
    const lastEnd = Math.max(...profile.metrics.map((m) => m.endTime || m.startTime));
    profile.totalDurationMs = lastEnd - firstStart;
  }

  // Complete any remaining pending metrics
  profile.metrics.forEach((m) => {
    if (!m.endTime) {
      m.endTime = Date.now();
      m.durationMs = m.endTime - m.startTime;
      m.status = 'completed';
    }
  });

  activeProfiles.delete(requestId);
  completedProfiles.push(profile);

  // Maintain history size
  if (completedProfiles.length > maxProfileHistory) {
    completedProfiles.shift();
  }

  return profile;
}

/**
 * Get a specific profile
 */
export function getProfile(requestId: string): PerformanceProfile | undefined {
  return activeProfiles.get(requestId) || completedProfiles.find((p) => p.requestId === requestId);
}

/**
 * Get performance statistics
 */
export function getPerformanceStats(
  filters?: {
    endpoint?: string;
    minDurationMs?: number;
    maxDurationMs?: number;
    limit?: number;
  }
): {
  totalProfiles: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  byEndpoint: Record<string, { count: number; avgDurationMs: number }>;
  slowestProfiles: PerformanceProfile[];
} {
  let profiles = [...completedProfiles];

  if (filters?.endpoint) {
    profiles = profiles.filter((p) => p.endpoint === filters.endpoint);
  }

  if (filters?.minDurationMs) {
    profiles = profiles.filter((p) => p.totalDurationMs >= filters.minDurationMs!);
  }

  if (filters?.maxDurationMs) {
    profiles = profiles.filter((p) => p.totalDurationMs <= filters.maxDurationMs!);
  }

  if (profiles.length === 0) {
    return {
      totalProfiles: 0,
      avgDurationMs: 0,
      minDurationMs: 0,
      maxDurationMs: 0,
      p50DurationMs: 0,
      p95DurationMs: 0,
      p99DurationMs: 0,
      byEndpoint: {},
      slowestProfiles: [],
    };
  }

  const durations = profiles.map((p) => p.totalDurationMs).sort((a, b) => a - b);

  const getPercentile = (percentile: number) => {
    const index = Math.floor((durations.length * percentile) / 100);
    return durations[index] || 0;
  };

  const byEndpoint: Record<string, { count: number; avgDurationMs: number }> = {};
  profiles.forEach((p) => {
    if (!byEndpoint[p.endpoint]) {
      byEndpoint[p.endpoint] = { count: 0, avgDurationMs: 0 };
    }
    byEndpoint[p.endpoint].count += 1;
    byEndpoint[p.endpoint].avgDurationMs =
      (byEndpoint[p.endpoint].avgDurationMs * (byEndpoint[p.endpoint].count - 1) +
        p.totalDurationMs) /
      byEndpoint[p.endpoint].count;
  });

  const slowestProfiles = profiles
    .sort((a, b) => b.totalDurationMs - a.totalDurationMs)
    .slice(0, Math.min(10, filters?.limit || 10));

  return {
    totalProfiles: profiles.length,
    avgDurationMs: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    minDurationMs: durations[0] || 0,
    maxDurationMs: durations[durations.length - 1] || 0,
    p50DurationMs: getPercentile(50),
    p95DurationMs: getPercentile(95),
    p99DurationMs: getPercentile(99),
    byEndpoint,
    slowestProfiles,
  };
}

/**
 * Get metrics breakdown for a specific profile
 */
export function getProfileMetricsBreakdown(requestId: string): {
  totalDurationMs: number;
  metrics: Array<{
    name: string;
    durationMs: number;
    percentOfTotal: number;
    status: string;
    error?: string;
  }>;
} {
  const profile = getProfile(requestId);
  if (!profile) {
    throw new Error(`Profile not found: ${requestId}`);
  }

  const metrics = profile.metrics
    .filter((m) => m.durationMs)
    .sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0))
    .map((m) => ({
      name: m.name,
      durationMs: m.durationMs || 0,
      percentOfTotal: Math.round(((m.durationMs || 0) / profile.totalDurationMs) * 100),
      status: m.status,
      error: m.error?.message,
    }));

  return {
    totalDurationMs: profile.totalDurationMs,
    metrics,
  };
}

/**
 * Clear old profiles (for testing or memory cleanup)
 */
export function clearProfiles(keepLast: number = 100): void {
  while (completedProfiles.length > keepLast) {
    completedProfiles.shift();
  }
}

/**
 * Get memory snapshot of profiler state
 */
export function getProfilerState(): {
  activeProfiles: number;
  completedProfiles: number;
  totalMemoryEstimate: string;
} {
  const activeCount = activeProfiles.size;
  const completedCount = completedProfiles.length;

  // Rough estimate: each profile ~ 1KB + metrics
  const estimatedBytes =
    activeCount * 2048 + completedCount * 2048 + completedCount * 512 * 20; // avg 20 metrics per profile
  const estimatedMB = (estimatedBytes / 1024 / 1024).toFixed(2);

  return {
    activeProfiles: activeCount,
    completedProfiles: completedCount,
    totalMemoryEstimate: `${estimatedMB}MB`,
  };
}
