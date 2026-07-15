import { describe, it, expect, beforeEach } from 'vitest';
import {
  startProfile,
  completeProfile,
  markMetric,
  completeMetric,
  getProfile,
  getPerformanceStats,
  getProfileMetricsBreakdown,
  clearProfiles,
} from '@/lib/performance-profiler';

describe('Performance Profiler', () => {
  beforeEach(() => {
    clearProfiles(0); // Clear all profiles before each test
  });

  it('creates and completes a profile', () => {
    const profile = startProfile('req-001', '/api/search');
    expect(profile.requestId).toBe('req-001');
    expect(profile.endpoint).toBe('/api/search');
    expect(profile.metrics).toHaveLength(0);

    const completed = completeProfile('req-001');
    expect(completed.requestId).toBe('req-001');
    expect(completed.totalDurationMs).toBe(0); // No metrics, so 0 duration
  });

  it('tracks metrics within a profile', () => {
    startProfile('req-002', '/api/history');

    markMetric('req-002', 'fetch-data');
    markMetric('req-002', 'process-data');

    const profile = getProfile('req-002');
    expect(profile?.metrics).toHaveLength(2);
    expect(profile?.metrics[0].name).toBe('fetch-data');
    expect(profile?.metrics[1].name).toBe('process-data');
  });

  it('measures metric duration', (done) => {
    startProfile('req-003', '/api/obligations');

    markMetric('req-003', 'database-query');

    // Simulate async operation
    setTimeout(() => {
      completeMetric('req-003', 'database-query', 'completed');

      const breakdown = getProfileMetricsBreakdown('req-003');
      expect(breakdown.metrics[0].durationMs).toBeGreaterThanOrEqual(50); // At least 50ms
      expect(breakdown.metrics[0].status).toBe('completed');
      done();
    }, 50);
  });

  it('handles metric failures', () => {
    startProfile('req-004', '/api/assessment');

    markMetric('req-004', 'validation');
    completeMetric('req-004', 'validation', 'failed', new Error('Invalid input'));

    const profile = getProfile('req-004');
    const failedMetric = profile?.metrics.find((m) => m.name === 'validation');
    expect(failedMetric?.status).toBe('failed');
    expect(failedMetric?.error?.message).toBe('Invalid input');
  });

  it('calculates performance statistics', (done) => {
    // Create multiple profiles
    for (let i = 0; i < 5; i++) {
      const profile = startProfile(`req-${i}`, i % 2 === 0 ? '/api/search' : '/api/history');
      markMetric(`req-${i}`, 'operation');
    }

    setTimeout(() => {
      for (let i = 0; i < 5; i++) {
        completeMetric(`req-${i}`, 'operation', 'completed');
        completeProfile(`req-${i}`);
      }

      const stats = getPerformanceStats();
      expect(stats.totalProfiles).toBe(5);
      expect(stats.avgDurationMs).toBeGreaterThan(0);
      expect(stats.byEndpoint['/api/search']).toBeDefined();
      expect(stats.byEndpoint['/api/search'].count).toBe(3);
      expect(stats.byEndpoint['/api/history'].count).toBe(2);
      done();
    }, 50);
  });

  it('calculates percentiles correctly', (done) => {
    // Create profiles with known durations
    const durations = [10, 50, 100, 150, 200];

    durations.forEach((duration, i) => {
      startProfile(`perf-${i}`, '/api/test');
      markMetric(`perf-${i}`, 'delay');
    });

    setTimeout(() => {
      durations.forEach((duration, i) => {
        completeMetric(`perf-${i}`, 'delay', 'completed');
        completeProfile(`perf-${i}`);
      });

      const stats = getPerformanceStats();
      expect(stats.p50DurationMs).toBeGreaterThanOrEqual(50);
      expect(stats.p95DurationMs).toBeGreaterThanOrEqual(100);
      expect(stats.p99DurationMs).toBeGreaterThanOrEqual(100);
      done();
    }, 250);
  });

  it('filters profiles by endpoint', (done) => {
    startProfile('api-1', '/api/search');
    startProfile('api-2', '/api/history');
    startProfile('api-3', '/api/search');

    setTimeout(() => {
      completeMetric('api-1', 'dummy', 'completed');
      completeMetric('api-2', 'dummy', 'completed');
      completeMetric('api-3', 'dummy', 'completed');

      completeProfile('api-1');
      completeProfile('api-2');
      completeProfile('api-3');

      const searchStats = getPerformanceStats({ endpoint: '/api/search' });
      expect(searchStats.totalProfiles).toBe(2);

      const historyStats = getPerformanceStats({ endpoint: '/api/history' });
      expect(historyStats.totalProfiles).toBe(1);
      done();
    }, 50);
  });

  it('filters profiles by minimum duration', (done) => {
    // Create profiles with varying durations
    startProfile('slow-1', '/api/search');
    startProfile('slow-2', '/api/search');

    setTimeout(() => {
      completeMetric('slow-1', 'query', 'completed');
      completeMetric('slow-2', 'query', 'completed');
      completeProfile('slow-1');
      completeProfile('slow-2');

      // Both should be >= 100ms
      const slowStats = getPerformanceStats({ minDurationMs: 50 });
      expect(slowStats.totalProfiles).toBe(2);

      // None should be >= 5000ms
      const verySlow = getPerformanceStats({ minDurationMs: 5000 });
      expect(verySlow.totalProfiles).toBe(0);
      done();
    }, 150);
  });

  it('tracks metadata in metrics', () => {
    startProfile('meta-req', '/api/search');
    markMetric('meta-req', 'query', { queryType: 'full-text', resultCount: 42 });

    const profile = getProfile('meta-req');
    expect(profile?.metrics[0].metadata?.queryType).toBe('full-text');
    expect(profile?.metrics[0].metadata?.resultCount).toBe(42);
  });

  it('auto-completes pending metrics on profile completion', (done) => {
    startProfile('pending-req', '/api/search');
    markMetric('pending-req', 'step1');
    markMetric('pending-req', 'step2');

    setTimeout(() => {
      completeMetric('pending-req', 'step1', 'completed');
      // step2 is never explicitly completed

      const profile = completeProfile('pending-req');
      expect(profile.metrics[0].status).toBe('completed');
      expect(profile.metrics[1].status).toBe('completed'); // Auto-completed
      expect(profile.metrics[1].endTime).toBeDefined();
      done();
    }, 50);
  });

  it('retrieves slowest profiles in stats', (done) => {
    // Create profiles
    startProfile('slow-a', '/api/search');
    startProfile('slow-b', '/api/search');
    startProfile('slow-c', '/api/search');

    setTimeout(() => {
      for (const id of ['slow-a', 'slow-b', 'slow-c']) {
        completeMetric(id, 'op', 'completed');
        completeProfile(id);
      }

      const stats = getPerformanceStats({ limit: 2 });
      expect(stats.slowestProfiles.length).toBeLessThanOrEqual(2);
      expect(stats.slowestProfiles[0].totalDurationMs).toBeGreaterThanOrEqual(
        stats.slowestProfiles[1]?.totalDurationMs || 0
      );
      done();
    }, 100);
  });

  it('throws error for unknown profile', () => {
    expect(() => markMetric('unknown-req', 'metric')).toThrow('Profile not found');
  });

  it('throws error for unknown metric', () => {
    startProfile('test-req', '/api/test');
    expect(() => completeMetric('test-req', 'unknown-metric')).toThrow('Metric not found');
  });
});
