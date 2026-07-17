/**
 * Performance Monitoring Module
 *
 * Exports all performance monitoring and observability utilities:
 * - Performance tracking: measure API response times
 * - SLO monitoring: detect SLO breaches
 * - Sentry integration: error tracking and performance monitoring
 * - API middleware: automatic request instrumentation
 *
 * Configuration is in sentry.config.ts and initialized via instrumentation.ts
 */

export {
  startPerformanceTracking,
  calculatePercentiles,
  getPerformanceSummary,
  clearMetricsBuffer,
  resetPerformanceTracking,
} from './performance-tracking';

export type { PerformanceMetrics } from './performance-tracking';

export {
  withPerformanceTracking,
  addPerformanceHeaders,
  trackApiPerformance,
} from './api-performance-middleware';

export type { PerformanceMiddlewareOptions } from './api-performance-middleware';
