/**
 * Structured Logging for Production Observability
 *
 * DNA-LOGGER-001: Provides consistent, parseable logging across all services.
 * All logs emit as JSON with contextual metadata for easy parsing and analysis.
 *
 * Usage:
 * - logger.info('User created account', 'USER_SIGNUP', { userId, email })
 * - logger.error('Payment failed', 'PAYMENT_ERROR', error, { orderId, amount })
 * - logger.warn('Rate limit approaching', 'RATE_LIMIT_WARN', { userId, remaining })
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  code: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration_ms?: number;
  environment: string;
  version: string;
}

/**
 * Structured logger for production observability.
 * Emits JSON logs suitable for log aggregation (Datadog, ELK, CloudWatch).
 */
class StructuredLogger {
  private environment: string;
  private version: string;
  private isDevelopment: boolean;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.version = process.env.NEXT_PUBLIC_VERSION || '1.0.0';
    this.isDevelopment = this.environment === 'development';
  }

  /**
   * Format and emit a log entry.
   * In production: JSON output for log aggregation
   * In development: Pretty-printed for readability
   */
  private emit(entry: LogEntry): void {
    if (this.isDevelopment) {
      // Development: Pretty print with colors
      const color = this.getColor(entry.level);
      const reset = '\x1b[0m';
      console.log(
        `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} ${entry.code}`,
        entry.message,
        entry.context || ''
      );
      if (entry.error) {
        console.error(entry.error);
      }
    } else {
      // Production: Emit as JSON
      console.log(JSON.stringify(entry));
    }
  }

  private getColor(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      critical: '\x1b[35m', // Magenta
    };
    return colors[level];
  }

  /**
   * Log informational message
   * Use for: Normal business operations (user actions, successful operations)
   */
  info(
    message: string,
    code: string,
    context?: Record<string, unknown>,
    duration_ms?: number
  ): void {
    this.emit({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      code,
      context,
      duration_ms,
      environment: this.environment,
      version: this.version,
    });
  }

  /**
   * Log warning message
   * Use for: Degraded but operational (slow query, rate limit approaching, retry)
   */
  warn(
    message: string,
    code: string,
    context?: Record<string, unknown>,
    duration_ms?: number
  ): void {
    this.emit({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      code,
      context,
      duration_ms,
      environment: this.environment,
      version: this.version,
    });
  }

  /**
   * Log error with exception details
   * Use for: Errors that don't crash the service (validation error, external API failure)
   */
  error(
    message: string,
    code: string,
    error: Error | unknown,
    context?: Record<string, unknown>
  ): void {
    const errorData =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : {
            name: 'UnknownError',
            message: String(error),
          };

    this.emit({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      code,
      context,
      error: errorData,
      environment: this.environment,
      version: this.version,
    });
  }

  /**
   * Log critical issue requiring immediate attention
   * Use for: Service-level failures (database down, auth broken, cascading errors)
   */
  critical(
    message: string,
    code: string,
    error: Error | unknown,
    context?: Record<string, unknown>
  ): void {
    const errorData =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : {
            name: 'UnknownError',
            message: String(error),
          };

    this.emit({
      timestamp: new Date().toISOString(),
      level: 'critical',
      message,
      code,
      context,
      error: errorData,
      environment: this.environment,
      version: this.version,
    });
  }

  /**
   * Log debug message (development only)
   */
  debug(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ): void {
    if (!this.isDevelopment) return; // Skip in production

    this.emit({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      code,
      context,
      environment: this.environment,
      version: this.version,
    });
  }

  /**
   * Time an async operation and log the result
   * Use for: Measuring operation latency
   *
   * Example:
   * await logger.time(
   *   () => fetchData(userId),
   *   'FETCH_DATA',
   *   { userId }
   * );
   */
  async time<T>(
    fn: () => Promise<T>,
    code: string,
    context?: Record<string, unknown>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      if (duration > 1000) {
        // Log slow operations (> 1 second)
        this.warn(`Operation took ${duration}ms`, code, context, duration);
      } else {
        this.debug(`Operation completed in ${duration}ms`, code, context);
      }
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`Operation failed after ${duration}ms`, code, error, context);
      throw error;
    }
  }
}

/**
 * Global logger instance
 * Use: import { logger } from '@/lib/structured-logger'
 */
export const logger = new StructuredLogger();

export default logger;
