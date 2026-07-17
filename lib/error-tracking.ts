/**
 * DNA-GOV-003: Error Tracking and Alerting
 *
 * Capture and aggregate production errors to provide observability.
 * Track error patterns, severity, frequency, and affected services.
 * Surface errors to Founder without requiring external tool access.
 */

export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ErrorCategory =
  | 'runtime'
  | 'api'
  | 'database'
  | 'auth'
  | 'validation'
  | 'external-service'
  | 'unknown';

export interface ErrorEvent {
  id: string;
  timestamp: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  userId?: string;
  endpoint?: string;
  statusCode?: number;
  affectedService: string;
  fingerprint: string; // Deduplication key
}

export interface ErrorPattern {
  fingerprint: string;
  category: ErrorCategory;
  message: string;
  firstSeen: string;
  lastSeen: string;
  occurrenceCount: number;
  severity: ErrorSeverity;
  affectedServices: Set<string>;
  sampleStackTrace?: string;
  resolvedAt?: string;
}

export interface ErrorMetrics {
  timestamp: string;
  totalErrors: number;
  criticalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByService: Record<string, number>;
  uniquePatterns: number;
  errorRate: number; // Errors per minute
  topPatterns: ErrorPattern[];
  newPatternsLastHour: ErrorPattern[];
  resolvedPatterns: ErrorPattern[];
}

export interface ErrorAlert {
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  affectedPatterns: ErrorPattern[];
  recommendedAction: string;
  affectedServices: string[];
}

const ERROR_STORE_PATH = 'docs/governance/.error-tracking.jsonl';
const ERROR_PATTERN_CACHE_PATH = 'docs/governance/.error-patterns.json';

function getStorePath(): string {
  return process.env.ERROR_STORE_PATH || ERROR_STORE_PATH;
}

function getPatternCachePath(): string {
  return process.env.ERROR_PATTERN_CACHE_PATH || ERROR_PATTERN_CACHE_PATH;
}

function generateFingerprint(
  message: string,
  category: ErrorCategory,
  endpoint?: string
): string {
  // Create a deterministic hash for error deduplication
  // Pattern: category:endpoint:first-line-of-message
  const messageLine = message.split('\n')[0];
  const endpointPart = endpoint ? endpoint.split('?')[0] : 'unknown';
  return `${category}:${endpointPart}:${messageLine}`.substring(0, 200);
}

export function classifyError(
  error: unknown,
  context?: Record<string, unknown>
): ErrorCategory {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : '';

  if (
    message.toLowerCase().includes('database') ||
    message.includes('db ') ||
    message.includes('db_') ||
    message.includes('connection pool')
  ) {
    return 'database';
  }
  if (
    message.includes('auth') ||
    message.includes('unauthorized') ||
    message.includes('403') ||
    message.includes('401')
  ) {
    return 'auth';
  }
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required')
  ) {
    return 'validation';
  }
  if (
    message.includes('external') ||
    message.includes('timeout') ||
    message.includes('ECONNREFUSED')
  ) {
    return 'external-service';
  }
  if (
    message.includes('api') ||
    message.includes('endpoint') ||
    stack?.includes('api/')
  ) {
    return 'api';
  }
  return 'runtime';
}

export function calculateSeverity(
  message: string,
  statusCode?: number,
  category?: ErrorCategory
): ErrorSeverity {
  // Critical: 500, 503, pool exhaustion, fatal/critical keywords
  if (statusCode === 500 || statusCode === 503) {
    return 'critical';
  }
  if (
    message.includes('pool') ||
    message.includes('fatal') ||
    message.includes('critical') ||
    message.includes('catastrophic')
  ) {
    return 'critical';
  }

  // High: Database failures, 4xx errors, timeouts, auth failures
  if (category === 'database' || category === 'auth') {
    return 'high';
  }
  if (
    statusCode === 400 ||
    statusCode === 401 ||
    statusCode === 403 ||
    statusCode === 429
  ) {
    return 'high';
  }
  if (message.includes('timeout') || message.includes('retry')) {
    return 'high';
  }

  // Medium: Validation errors, unexpected states
  if (category === 'validation' || message.includes('unexpected')) {
    return 'medium';
  }

  return 'low';
}

export async function captureError(
  error: unknown,
  options?: {
    endpoint?: string;
    userId?: string;
    context?: Record<string, unknown>;
  }
): Promise<ErrorEvent> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const statusCode =
    error instanceof Error && 'statusCode' in error
      ? (error as any).statusCode
      : undefined;

  const category = classifyError(error, options?.context);
  const severity = calculateSeverity(message, statusCode, category);
  const fingerprint = generateFingerprint(message, category, options?.endpoint);

  const event: ErrorEvent = {
    id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    severity,
    category,
    message,
    stack,
    context: options?.context,
    userId: options?.userId,
    endpoint: options?.endpoint,
    statusCode,
    affectedService: 'api', // Will be enhanced with actual service detection
    fingerprint,
  };

  return event;
}

export function aggregateErrorMetrics(errors: ErrorEvent[]): ErrorMetrics {
  const byCategory: Record<ErrorCategory, number> = {
    runtime: 0,
    api: 0,
    database: 0,
    auth: 0,
    validation: 0,
    'external-service': 0,
    unknown: 0,
  };

  const bySeverity: Record<ErrorSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const byService: Record<string, number> = {};
  const patterns = new Map<string, ErrorPattern>();

  for (const error of errors) {
    byCategory[error.category]++;
    bySeverity[error.severity]++;
    byService[error.affectedService] =
      (byService[error.affectedService] || 0) + 1;

    if (!patterns.has(error.fingerprint)) {
      patterns.set(error.fingerprint, {
        fingerprint: error.fingerprint,
        category: error.category,
        message: error.message,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        occurrenceCount: 0,
        severity: error.severity,
        affectedServices: new Set([error.affectedService]),
        sampleStackTrace: error.stack,
      });
    }

    const pattern = patterns.get(error.fingerprint)!;
    pattern.occurrenceCount++;
    pattern.lastSeen = error.timestamp;
    pattern.affectedServices.add(error.affectedService);
  }

  // Calculate error rate (errors per minute)
  let errorRatePerMinute = 0;
  if (errors.length > 0) {
    const oldestError = new Date(errors[errors.length - 1].timestamp);
    const newestError = new Date(errors[0].timestamp);
    const minutesDiff =
      (newestError.getTime() - oldestError.getTime()) / (1000 * 60);
    errorRatePerMinute =
      minutesDiff > 0 ? errors.length / minutesDiff : errors.length;
  }

  const topPatterns = Array.from(patterns.values())
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
    .slice(0, 5);

  return {
    timestamp: new Date().toISOString(),
    totalErrors: errors.length,
    criticalErrors: bySeverity.critical,
    errorsByCategory: byCategory,
    errorsBySeverity: bySeverity,
    errorsByService: byService,
    uniquePatterns: patterns.size,
    errorRate: errorRatePerMinute,
    topPatterns,
    newPatternsLastHour: [],
    resolvedPatterns: [],
  };
}

export function formatErrorAlert(metrics: ErrorMetrics): ErrorAlert {
  if (metrics.criticalErrors > 0) {
    const criticalPatterns = metrics.topPatterns.filter(
      (p) => p.severity === 'critical'
    );
    return {
      timestamp: metrics.timestamp,
      severity: 'critical',
      title: `🔴 CRITICAL: ${metrics.criticalErrors} Critical Errors Detected`,
      message: `${metrics.criticalErrors} critical-severity errors affecting ${new Set(metrics.topPatterns.flatMap((p) => Array.from(p.affectedServices))).size} services. Error rate: ${metrics.errorRate.toFixed(2)}/min`,
      affectedPatterns: criticalPatterns,
      recommendedAction: `Review critical error patterns immediately. Consider auto-remediation (restart service, circuit-break affected endpoint).`,
      affectedServices: Array.from(
        new Set(criticalPatterns.flatMap((p) => Array.from(p.affectedServices)))
      ),
    };
  }

  if (metrics.errorsByCategory.database > 0) {
    const dbPatterns = metrics.topPatterns.filter(
      (p) => p.category === 'database'
    );
    return {
      timestamp: metrics.timestamp,
      severity: 'warning',
      title: `⚠️ WARNING: ${metrics.errorsByCategory.database} Database Errors`,
      message: `${metrics.errorsByCategory.database} database-related errors in last hour. Check connection pool, query performance, and data integrity.`,
      affectedPatterns: dbPatterns,
      recommendedAction: `Investigate database health. Consider connection pool restart or query optimization.`,
      affectedServices: Array.from(
        new Set(dbPatterns.flatMap((p) => Array.from(p.affectedServices)))
      ),
    };
  }

  if (metrics.errorsBySeverity.high > 10) {
    return {
      timestamp: metrics.timestamp,
      severity: 'warning',
      title: `⚠️ WARNING: ${metrics.errorsBySeverity.high} High-Severity Errors`,
      message: `${metrics.errorsBySeverity.high} high-severity errors detected. Top patterns: ${metrics.topPatterns
        .slice(0, 3)
        .map((p) => `${p.category}:${p.occurrenceCount}x`)
        .join(', ')}`,
      affectedPatterns: metrics.topPatterns
        .filter((p) => p.severity === 'high')
        .slice(0, 5),
      recommendedAction: `Review error patterns and implement targeted fixes. Consider circuit-breaking affected services.`,
      affectedServices: Array.from(
        new Set(
          metrics.topPatterns.flatMap((p) => Array.from(p.affectedServices))
        )
      ),
    };
  }

  return {
    timestamp: metrics.timestamp,
    severity: 'info',
    title: `✅ Error tracking: system healthy`,
    message: `No critical errors. ${metrics.totalErrors} total errors across ${metrics.uniquePatterns} unique patterns. Error rate: ${metrics.errorRate.toFixed(2)}/min`,
    affectedPatterns: [],
    recommendedAction:
      'Continue monitoring. Review high-occurrence patterns for optimization opportunities.',
    affectedServices: Object.keys(metrics.errorsByService),
  };
}

export function getErrorSummary(metrics: ErrorMetrics): string {
  const line1 = `Errors: ${metrics.totalErrors} total (${metrics.criticalErrors} critical, ${metrics.errorsBySeverity.high} high) across ${metrics.uniquePatterns} unique patterns`;
  const line2 = `Rate: ${metrics.errorRate.toFixed(2)}/min | Top: ${metrics.topPatterns[0]?.category || 'none'} (${metrics.topPatterns[0]?.occurrenceCount || 0}x)`;
  const line3 = `Services affected: ${Object.keys(metrics.errorsByService).slice(0, 3).join(', ') || 'none'}`;

  return `${line1}\n${line2}\n${line3}`;
}

export class ErrorTracker {
  private errors: ErrorEvent[] = [];
  private patterns = new Map<string, ErrorPattern>();
  private maxEvents = 10000; // Keep last 10k errors in memory

  captureError(error: ErrorEvent): void {
    this.errors.unshift(error); // Newest first
    if (this.errors.length > this.maxEvents) {
      this.errors.pop();
    }

    // Update pattern
    if (!this.patterns.has(error.fingerprint)) {
      this.patterns.set(error.fingerprint, {
        fingerprint: error.fingerprint,
        category: error.category,
        message: error.message,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        occurrenceCount: 0,
        severity: error.severity,
        affectedServices: new Set([error.affectedService]),
        sampleStackTrace: error.stack,
      });
    }

    const pattern = this.patterns.get(error.fingerprint)!;
    pattern.occurrenceCount++;
    pattern.lastSeen = error.timestamp;
    pattern.affectedServices.add(error.affectedService);
  }

  getMetrics(): ErrorMetrics {
    return aggregateErrorMetrics(this.errors);
  }

  getErrorsByCategory(category: ErrorCategory): ErrorEvent[] {
    return this.errors.filter((e) => e.category === category);
  }

  getErrorsBySeverity(severity: ErrorSeverity): ErrorEvent[] {
    return this.errors.filter((e) => e.severity === severity);
  }

  getErrorsByService(service: string): ErrorEvent[] {
    return this.errors.filter((e) => e.affectedService === service);
  }

  getPattern(fingerprint: string): ErrorPattern | undefined {
    return this.patterns.get(fingerprint);
  }

  clearOldErrors(olderThanMinutes: number): void {
    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    this.errors = this.errors.filter((e) => new Date(e.timestamp) > cutoffTime);
  }

  reset(): void {
    this.errors = [];
    this.patterns.clear();
  }
}
