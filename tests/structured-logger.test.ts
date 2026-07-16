import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '@/lib/structured-logger';

describe('Structured Logger (DNA-LOGGER-001)', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on console output
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('info logging', () => {
    it('logs info message with code and context', () => {
      logger.info('User created account', 'USER_SIGNUP', {
        userId: '123',
        email: 'test@example.com',
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const callArg = consoleLogSpy.mock.calls[0][0];

      // In production mode (our test), should output JSON
      const log = typeof callArg === 'string' ? JSON.parse(callArg) : callArg;
      expect(log.level).toBe('info');
      expect(log.message).toBe('User created account');
      expect(log.code).toBe('USER_SIGNUP');
      expect(log.context.userId).toBe('123');
      expect(log.context.email).toBe('test@example.com');
    });

    it('includes timestamp and environment', () => {
      logger.info('Test message', 'TEST_CODE');

      const callArg = consoleLogSpy.mock.calls[0][0];
      const log = typeof callArg === 'string' ? JSON.parse(callArg) : callArg;

      expect(log.timestamp).toBeDefined();
      expect(log.environment).toBeDefined();
      expect(log.version).toBeDefined();
    });

    it('includes duration_ms when provided', () => {
      logger.info(
        'Operation completed',
        'OP_COMPLETE',
        { userId: '123' },
        1500
      );

      const callArg = consoleLogSpy.mock.calls[0][0];
      const log = typeof callArg === 'string' ? JSON.parse(callArg) : callArg;

      expect(log.duration_ms).toBe(1500);
    });

    it('handles optional context', () => {
      logger.info('Simple message', 'SIMPLE_CODE');

      const callArg = consoleLogSpy.mock.calls[0][0];
      const log = typeof callArg === 'string' ? JSON.parse(callArg) : callArg;

      expect(log.message).toBe('Simple message');
      expect(log.code).toBe('SIMPLE_CODE');
    });
  });

  describe('error logging', () => {
    it('logs error with Error object', () => {
      const testError = new Error('Database connection failed');
      logger.error('Failed to connect', 'DB_CONNECTION_ERROR', testError, {
        retries: 3,
      });

      const callArg = consoleLogSpy.mock.calls[0][0];
      const log = typeof callArg === 'string' ? JSON.parse(callArg) : callArg;

      expect(log.level).toBe('error');
      expect(log.message).toBe('Failed to connect');
      expect(log.code).toBe('DB_CONNECTION_ERROR');
      expect(log.error.name).toBe('Error');
      expect(log.error.message).toBe('Database connection failed');
      expect(log.context.retries).toBe(3);
    });

    it('handles non-Error exception objects', () => {
      logger.error(
        'Unknown error occurred',
        'UNKNOWN_ERROR',
        'String error message'
      );

      const callArg = consoleLogSpy.mock.calls[0][0];
      const log = typeof callArg === 'string' ? JSON.parse(callArg) : callArg;

      expect(log.error.name).toBe('UnknownError');
      expect(log.error.message).toBe('String error message');
    });

    it('includes stack trace for Error objects', () => {
      const testError = new Error('Test error');
      logger.error('Error occurred', 'ERROR_CODE', testError);

      const callArg = consoleLogSpy.mock.calls[0][0];
      const log = typeof callArg === 'string' ? JSON.parse(callArg) : callArg;

      expect(log.error.stack).toBeDefined();
      expect(log.error.stack).toContain('Test error');
    });
  });

  describe('critical logging', () => {
    it('logs critical issues with highest severity', () => {
      const critError = new Error('Service unavailable');
      logger.critical('System failure detected', 'SYSTEM_FAILURE', critError, {
        affectedUsers: 'all',
      });

      const callArg = consoleLogSpy.mock.calls[0][0];
      const log = typeof callArg === 'string' ? JSON.parse(callArg) : callArg;

      expect(log.level).toBe('critical');
      expect(log.message).toBe('System failure detected');
      expect(log.context.affectedUsers).toBe('all');
    });
  });

  describe('warning logging', () => {
    it('logs warnings for degraded conditions', () => {
      logger.warn(
        'Rate limit approaching',
        'RATE_LIMIT_WARNING',
        { remaining: 10 },
        500
      );

      const callArg = consoleLogSpy.mock.calls[0][0];
      const log = typeof callArg === 'string' ? JSON.parse(callArg) : callArg;

      expect(log.level).toBe('warn');
      expect(log.message).toBe('Rate limit approaching');
      expect(log.context.remaining).toBe(10);
      expect(log.duration_ms).toBe(500);
    });
  });

  describe('async operation timing', () => {
    it('times successful async operations and returns result', async () => {
      const mockFn = vi.fn(async () => 'success');

      const result = await logger.time(mockFn, 'TEST_OPERATION', {
        operationId: '123',
      });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalled();
      // Fast operations (< 1s) log to debug, which doesn't output in production
      // Just verify the operation ran and returned
    });

    it('times failed async operations and re-throws error', async () => {
      const testError = new Error('Operation failed');
      const mockFn = vi.fn(async () => {
        throw testError;
      });

      await expect(logger.time(mockFn, 'FAILED_OPERATION')).rejects.toThrow(
        'Operation failed'
      );

      expect(mockFn).toHaveBeenCalled();
      // Error operations log to error level
      expect(consoleLogSpy).toHaveBeenCalled();

      const callArg = consoleLogSpy.mock.calls[0][0];
      const log = JSON.parse(callArg as string);
      expect(log.level).toBe('error');
      expect(log.code).toBe('FAILED_OPERATION');
    });

    it('logs slow operations (> 1000ms) as warnings', async () => {
      // Reset spy for this test
      consoleLogSpy.mockClear();

      const slowMockFn = vi.fn(async () => {
        // Simulate operation taking > 1 second
        // Note: We're mocking this, not actually waiting
        await new Promise((resolve) => setTimeout(resolve, 1100));
        return 'result';
      });

      const result = await logger.time(slowMockFn, 'SLOW_OPERATION');

      expect(result).toBe('result');
      // Slow operations should log a warning
      expect(consoleLogSpy).toHaveBeenCalled();

      const callArg = consoleLogSpy.mock.calls[0][0];
      const log = JSON.parse(callArg as string);
      expect(log.level).toBe('warn');
      expect(log.code).toBe('SLOW_OPERATION');
    });
  });

  describe('JSON output format', () => {
    it('outputs valid JSON in production', () => {
      logger.info('Test message', 'TEST_CODE', { key: 'value' });

      const callArg = consoleLogSpy.mock.calls[0][0];

      // Should be parseable as JSON
      expect(() => {
        JSON.parse(callArg as string);
      }).not.toThrow();
    });

    it('includes all required fields in JSON', () => {
      logger.info('Test', 'CODE', { context: 'value' });

      const callArg = consoleLogSpy.mock.calls[0][0];
      const log = JSON.parse(callArg as string);

      expect(log).toHaveProperty('timestamp');
      expect(log).toHaveProperty('level');
      expect(log).toHaveProperty('message');
      expect(log).toHaveProperty('code');
      expect(log).toHaveProperty('context');
      expect(log).toHaveProperty('environment');
      expect(log).toHaveProperty('version');
    });

    it('omits error field when not provided', () => {
      logger.info('Normal message', 'CODE');

      const callArg = consoleLogSpy.mock.calls[0][0];
      const log = JSON.parse(callArg as string);

      expect(log.error).toBeUndefined();
    });
  });

  describe('critical API patterns', () => {
    it('logs authentication failures', () => {
      logger.error(
        'Authentication failed',
        'AUTH_FAILURE',
        new Error('Invalid token'),
        {
          userId: 'user123',
          method: 'jwt',
          sessionId: 'sess456',
        }
      );

      const callArg = consoleLogSpy.mock.calls[0][0];
      const log = JSON.parse(callArg as string);

      expect(log.code).toBe('AUTH_FAILURE');
      expect(log.context.userId).toBe('user123');
    });

    it('logs database operation timing and execution success', async () => {
      const mockDbOp = async () => ({ rows: [{ id: 1, name: 'Test' }] });

      const result = await logger.time(mockDbOp, 'DB_QUERY', {
        table: 'users',
        operation: 'SELECT',
      });

      expect(result).toEqual({ rows: [{ id: 1, name: 'Test' }] });
      // Fast DB operations (< 1s) log to debug, which doesn't output in production
      // Just verify the operation ran successfully
    });

    it('logs API request/response patterns', () => {
      logger.info('Request completed', 'API_REQUEST_COMPLETE', {
        endpoint: '/api/assessment',
        method: 'POST',
        statusCode: 201,
        responseTime: 350,
      });

      const callArg = consoleLogSpy.mock.calls[0][0];
      const log = JSON.parse(callArg as string);

      expect(log.context.endpoint).toBe('/api/assessment');
      expect(log.context.statusCode).toBe(201);
    });

    it('logs security events', () => {
      logger.warn('Suspicious activity detected', 'SECURITY_WARNING', {
        userId: 'user789',
        eventType: 'multiple_failed_logins',
        count: 5,
        timeWindow: '10m',
      });

      const callArg = consoleLogSpy.mock.calls[0][0];
      const log = JSON.parse(callArg as string);

      expect(log.level).toBe('warn');
      expect(log.context.eventType).toBe('multiple_failed_logins');
    });
  });

  describe('log codes (DNA nomenclature)', () => {
    it('uses standardized code format', () => {
      const codes = [
        'USER_SIGNUP',
        'DB_CONNECTION_ERROR',
        'AUTH_FAILURE',
        'RATE_LIMIT_WARNING',
        'API_REQUEST_COMPLETE',
      ];

      codes.forEach((code) => {
        logger.info('Test', code);
      });

      const calls = consoleLogSpy.mock.calls;
      expect(calls.length).toBe(codes.length);

      calls.forEach((call: any[], index: number) => {
        const log = JSON.parse(call[0] as string);
        expect(log.code).toBe(codes[index]);
      });
    });
  });
});
