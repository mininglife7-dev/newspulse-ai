import { describe, it, expect, beforeEach } from 'vitest';
import {
  captureError,
  classifyError,
  calculateSeverity,
  aggregateErrorMetrics,
  formatErrorAlert,
  getErrorSummary,
  ErrorTracker,
  type ErrorEvent,
  type ErrorCategory,
  type ErrorSeverity,
} from '@/lib/error-tracking';

describe('Error Tracking (DNA-GOV-003)', () => {
  describe('classifyError', () => {
    it('classifies database errors', () => {
      const error = new Error('db connection timeout');
      const category = classifyError(error);
      expect(category).toBe('database');
    });

    it('classifies auth errors', () => {
      const error = new Error('unauthorized access - 401');
      const category = classifyError(error);
      expect(category).toBe('auth');
    });

    it('classifies validation errors', () => {
      const error = new Error('validation failed: required field missing');
      const category = classifyError(error);
      expect(category).toBe('validation');
    });

    it('classifies external service errors', () => {
      const error = new Error('external API timeout - ECONNREFUSED');
      const category = classifyError(error);
      expect(category).toBe('external-service');
    });

    it('classifies API errors', () => {
      const error = new Error('api endpoint /search failed');
      const category = classifyError(error);
      expect(category).toBe('api');
    });

    it('defaults to runtime for unknown errors', () => {
      const error = new Error('something weird happened');
      const category = classifyError(error);
      expect(category).toBe('runtime');
    });
  });

  describe('calculateSeverity', () => {
    it('marks 500 errors as critical', () => {
      const severity = calculateSeverity('Server error', 500);
      expect(severity).toBe('critical');
    });

    it('marks 503 errors as critical', () => {
      const severity = calculateSeverity('Service unavailable', 503);
      expect(severity).toBe('critical');
    });

    it('marks database errors as high', () => {
      const severity = calculateSeverity('db query failed', undefined, 'database');
      expect(severity).toBe('high');
    });

    it('marks 4xx errors as high', () => {
      const severity = calculateSeverity('Bad request', 400);
      expect(severity).toBe('high');
    });

    it('marks timeout errors as high', () => {
      const severity = calculateSeverity('request timeout - retry');
      expect(severity).toBe('high');
    });

    it('marks validation errors as medium', () => {
      const severity = calculateSeverity('validation error', undefined, 'validation');
      expect(severity).toBe('medium');
    });

    it('defaults unclassified errors to low', () => {
      const severity = calculateSeverity('minor issue');
      expect(severity).toBe('low');
    });
  });

  describe('captureError', () => {
    it('captures error with all properties', async () => {
      const error = new Error('test error');
      const event = await captureError(error, {
        endpoint: '/api/search',
        userId: 'user-123',
        context: { query: 'test' },
      });

      expect(event.message).toBe('test error');
      expect(event.endpoint).toBe('/api/search');
      expect(event.userId).toBe('user-123');
      expect(event.context).toEqual({ query: 'test' });
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.fingerprint).toBeDefined();
    });

    it('generates deterministic fingerprint for deduplication', async () => {
      const error1 = await captureError(new Error('database connection failed'), {
        endpoint: '/api/search',
      });
      const error2 = await captureError(new Error('database connection failed'), {
        endpoint: '/api/search',
      });

      expect(error1.fingerprint).toBe(error2.fingerprint);
    });

    it('generates different fingerprints for different endpoints', async () => {
      const error1 = await captureError(new Error('connection error'), {
        endpoint: '/api/search',
      });
      const error2 = await captureError(new Error('connection error'), {
        endpoint: '/api/workspace',
      });

      expect(error1.fingerprint).not.toBe(error2.fingerprint);
    });

    it('handles non-Error objects', async () => {
      const event = await captureError('string error message');
      expect(event.message).toBe('string error message');
      expect(event.category).toBe('runtime');
    });

    it('extracts status code from error object', async () => {
      const error = new Error('unauthorized');
      (error as any).statusCode = 401;
      const event = await captureError(error);

      expect(event.statusCode).toBe(401);
      expect(event.severity).toBe('high');
    });
  });

  describe('aggregateErrorMetrics', () => {
    it('counts errors by category', async () => {
      const errors: ErrorEvent[] = [
        await captureError(new Error('db connection failed')),
        await captureError(new Error('db query timeout')),
        await captureError(new Error('unauthorized - 401')),
      ];

      const metrics = aggregateErrorMetrics(errors);

      expect(metrics.errorsByCategory.database).toBe(2);
      expect(metrics.errorsByCategory.auth).toBe(1);
      expect(metrics.totalErrors).toBe(3);
    });

    it('counts errors by severity', async () => {
      const errors: ErrorEvent[] = [
        await captureError(new Error('fatal database error'), { context: { statusCode: 500 } }),
        await captureError(new Error('validation failed')),
        await captureError(new Error('minor issue')),
      ];

      const metrics = aggregateErrorMetrics(errors);

      expect(metrics.errorsBySeverity.critical).toBeGreaterThan(0);
      expect(metrics.errorsBySeverity.medium).toBeGreaterThan(0);
    });

    it('tracks error patterns', async () => {
      const error1 = await captureError(new Error('connection timeout'), { endpoint: '/api/search' });
      const error2 = await captureError(new Error('connection timeout'), { endpoint: '/api/search' });
      const error3 = await captureError(new Error('different error'));

      const metrics = aggregateErrorMetrics([error1, error2, error3]);

      expect(metrics.uniquePatterns).toBeGreaterThanOrEqual(2);
      expect(metrics.topPatterns.length).toBeGreaterThan(0);
      expect(metrics.topPatterns[0].occurrenceCount).toBeGreaterThanOrEqual(1);
    });

    it('identifies top patterns by occurrence count', async () => {
      const errors: ErrorEvent[] = [];
      for (let i = 0; i < 5; i++) {
        errors.push(await captureError(new Error('common error'), { endpoint: '/api/search' }));
      }
      for (let i = 0; i < 2; i++) {
        errors.push(await captureError(new Error('rare error'), { endpoint: '/api/workspace' }));
      }

      const metrics = aggregateErrorMetrics(errors);

      expect(metrics.topPatterns[0].occurrenceCount).toBe(5);
      expect(metrics.topPatterns[1].occurrenceCount).toBe(2);
    });

    it('calculates error rate per minute', async () => {
      const now = Date.now();
      const errors: ErrorEvent[] = [];

      // Create 10 errors over 2 minutes
      for (let i = 0; i < 10; i++) {
        const event = await captureError(new Error('test error'));
        event.timestamp = new Date(now - (2 - i / 10) * 60 * 1000).toISOString();
        errors.push(event);
      }

      const metrics = aggregateErrorMetrics(errors);
      expect(metrics.errorRate).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeLessThanOrEqual(10); // At most 10 errors per minute
    });

    it('handles empty error list', () => {
      const metrics = aggregateErrorMetrics([]);

      expect(metrics.totalErrors).toBe(0);
      expect(metrics.criticalErrors).toBe(0);
      expect(metrics.uniquePatterns).toBe(0);
      expect(metrics.topPatterns).toHaveLength(0);
    });
  });

  describe('formatErrorAlert', () => {
    it('creates critical alert for critical errors', async () => {
      const error = await captureError(new Error('critical failure'), { context: { statusCode: 500 } });
      const metrics = aggregateErrorMetrics([error]);

      const alert = formatErrorAlert(metrics);

      expect(alert.severity).toBe('critical');
      expect(alert.title).toContain('CRITICAL');
      expect(alert.title).toContain('🔴');
    });

    it('creates warning for database errors', async () => {
      const errors: ErrorEvent[] = [];
      for (let i = 0; i < 5; i++) {
        errors.push(await captureError(new Error('database error')));
      }

      const metrics = aggregateErrorMetrics(errors);
      const alert = formatErrorAlert(metrics);

      expect(alert.severity).toBe('warning');
      expect(alert.title).toContain('Database');
    });

    it('creates info alert when no critical errors', async () => {
      const error = await captureError(new Error('minor validation issue'));
      const metrics = aggregateErrorMetrics([error]);

      const alert = formatErrorAlert(metrics);

      expect(alert.severity).toBe('info');
      expect(alert.title).toContain('healthy');
      expect(alert.title).toContain('✅');
    });

    it('includes affected services in alert', async () => {
      const errors: ErrorEvent[] = [
        await captureError(new Error('api error'), { context: { statusCode: 500 } }),
      ];
      errors[0].affectedService = 'search-service';

      const metrics = aggregateErrorMetrics(errors);
      const alert = formatErrorAlert(metrics);

      expect(alert.affectedServices).toContain('search-service');
    });

    it('provides actionable recommendation', async () => {
      const error = await captureError(new Error('critical db failure'));
      const metrics = aggregateErrorMetrics([error]);

      const alert = formatErrorAlert(metrics);

      expect(alert.recommendedAction).toBeDefined();
      expect(alert.recommendedAction.length).toBeGreaterThan(0);
    });
  });

  describe('getErrorSummary', () => {
    it('returns formatted summary string', async () => {
      const errors: ErrorEvent[] = [
        await captureError(new Error('error 1'), { context: { statusCode: 500 } }),
        await captureError(new Error('error 2'), { context: { statusCode: 500 } }),
        await captureError(new Error('error 3')),
      ];

      const metrics = aggregateErrorMetrics(errors);
      const summary = getErrorSummary(metrics);

      expect(summary).toContain('Errors:');
      expect(summary).toContain('total');
      expect(summary).toContain('Rate:');
      expect(summary).toContain('Services');
    });

    it('includes error counts in summary', async () => {
      const error = await captureError(new Error('test error'));
      const metrics = aggregateErrorMetrics([error]);

      const summary = getErrorSummary(metrics);

      expect(summary).toContain('1 total');
    });
  });

  describe('ErrorTracker class', () => {
    let tracker: ErrorTracker;

    beforeEach(() => {
      tracker = new ErrorTracker();
    });

    it('captures errors in order', async () => {
      const error1 = await captureError(new Error('error 1'));
      const error2 = await captureError(new Error('error 2'));

      tracker.captureError(error1);
      tracker.captureError(error2);

      const metrics = tracker.getMetrics();
      expect(metrics.totalErrors).toBe(2);
    });

    it('filters errors by category', async () => {
      const dbError = await captureError(new Error('database error'));
      const authError = await captureError(new Error('unauthorized'));

      tracker.captureError(dbError);
      tracker.captureError(authError);

      const dbErrors = tracker.getErrorsByCategory('database');
      expect(dbErrors).toHaveLength(1);
      expect(dbErrors[0].message).toContain('database');
    });

    it('filters errors by severity', async () => {
      const criticalError = await captureError(new Error('critical'), { context: { statusCode: 500 } });
      const lowError = await captureError(new Error('minor issue'));

      tracker.captureError(criticalError);
      tracker.captureError(lowError);

      const critical = tracker.getErrorsBySeverity('critical');
      expect(critical.length).toBeGreaterThan(0);
    });

    it('retrieves error patterns', async () => {
      const error = await captureError(new Error('pattern test'));
      tracker.captureError(error);

      const pattern = tracker.getPattern(error.fingerprint);
      expect(pattern).toBeDefined();
      expect(pattern?.occurrenceCount).toBe(1);
    });

    it('tracks pattern occurrence count', async () => {
      const error1 = await captureError(new Error('repeated error'), { endpoint: '/api/search' });
      const error2 = await captureError(new Error('repeated error'), { endpoint: '/api/search' });

      tracker.captureError(error1);
      tracker.captureError(error2);

      const pattern = tracker.getPattern(error1.fingerprint);
      expect(pattern?.occurrenceCount).toBe(2);
    });

    it('respects max events limit', async () => {
      const tracker = new ErrorTracker();
      // Simulate capturing more than max events
      for (let i = 0; i < 10005; i++) {
        const error = await captureError(new Error(`error ${i}`));
        tracker.captureError(error);
      }

      const metrics = tracker.getMetrics();
      expect(metrics.totalErrors).toBeLessThanOrEqual(10000);
    });

    it('clears old errors', async () => {
      const now = Date.now();
      const error1 = await captureError(new Error('old error'));
      error1.timestamp = new Date(now - 120 * 60 * 1000).toISOString(); // 2 hours ago

      const error2 = await captureError(new Error('recent error'));
      error2.timestamp = new Date(now - 30 * 60 * 1000).toISOString(); // 30 min ago

      tracker.captureError(error1);
      tracker.captureError(error2);

      tracker.clearOldErrors(60); // Clear older than 60 minutes
      const metrics = tracker.getMetrics();

      expect(metrics.totalErrors).toBe(1);
    });

    it('resets tracker state', async () => {
      const error = await captureError(new Error('test error'));
      tracker.captureError(error);

      expect(tracker.getMetrics().totalErrors).toBe(1);

      tracker.reset();
      expect(tracker.getMetrics().totalErrors).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles errors with very long messages', async () => {
      const longMessage = 'error: ' + 'x'.repeat(10000);
      const error = await captureError(new Error(longMessage));

      expect(error.message.length).toBeGreaterThan(100);
      expect(error.fingerprint.length).toBeLessThanOrEqual(200); // Fingerprint is capped
    });

    it('handles missing properties gracefully', async () => {
      const event = await captureError('string error');

      expect(event.stack).toBeUndefined();
      expect(event.userId).toBeUndefined();
      expect(event.statusCode).toBeUndefined();
    });

    it('deduplicates identical error patterns', async () => {
      const errors: ErrorEvent[] = [];
      for (let i = 0; i < 100; i++) {
        errors.push(await captureError(new Error('identical error'), { endpoint: '/api/same' }));
      }

      const metrics = aggregateErrorMetrics(errors);
      expect(metrics.uniquePatterns).toBe(1);
      expect(metrics.topPatterns[0].occurrenceCount).toBe(100);
    });

    it('handles concurrent error capture', async () => {
      const tracker = new ErrorTracker();
      const promises = [];

      for (let i = 0; i < 50; i++) {
        promises.push(
          captureError(new Error(`concurrent error ${i}`)).then(e => tracker.captureError(e))
        );
      }

      await Promise.all(promises);
      const metrics = tracker.getMetrics();

      expect(metrics.totalErrors).toBe(50);
    });
  });
});
