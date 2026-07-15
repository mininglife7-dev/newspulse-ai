/**
 * Structured logger for production safety
 * In development: verbose console logs
 * In production: sanitized structured logs (no sensitive data)
 */

const isDev = process.env.NODE_ENV !== 'production';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

export const logger = {
  /**
   * Debug level - development only
   */
  debug(message: string, data?: Record<string, unknown>) {
    if (!isDev) return;
    console.log(message, data || '');
  },

  /**
   * Info level - normal operation
   * Production: log only message + code
   */
  info(message: string, code?: string, data?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      code,
    };

    if (isDev && data) {
      entry.details = data;
    }

    if (isDev) {
      console.log(message, data || '');
    } else {
      console.log(formatLogEntry(entry));
    }
  },

  /**
   * Warning level - unexpected but recoverable
   * Production: log message + code + sanitized details
   */
  warn(message: string, code?: string, data?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      code,
    };

    if (isDev && data) {
      entry.details = data;
    }

    if (isDev) {
      console.warn(message, data || '');
    } else {
      console.warn(formatLogEntry(entry));
    }
  },

  /**
   * Error level - something failed
   * Production: log message + error code, NOT full error/stack
   * Sanitizes: strips email, full error messages, internal IDs
   */
  error(message: string, code?: string, error?: Error | unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      code,
    };

    if (isDev) {
      if (error instanceof Error) {
        console.error(message, error);
      } else {
        console.error(message, error);
      }
    } else {
      // Production: never include raw error object
      if (error instanceof Error) {
        // Only log error name/code, not message which might contain sensitive data
        entry.details = {
          errorType: error.name,
        };
      }
      console.error(formatLogEntry(entry));
    }
  },

  /**
   * Request lifecycle logging
   */
  request(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `${method} ${path} → ${statusCode}`,
      details: isDev ? { durationMs } : undefined,
    };

    if (isDev) {
      console.log(`${method} ${path} [${statusCode}] ${durationMs}ms`);
    } else {
      console.log(formatLogEntry(entry));
    }
  },

  /**
   * Alert/status reporting (minimal, safe for production)
   */
  report(category: string, status: string, summary: string, count?: number) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `${category}: ${status}`,
      details: isDev && count ? { count } : undefined,
    };

    if (isDev) {
      console.log(
        `${category}: ${status} - ${summary}`,
        count ? `(${count})` : ''
      );
    } else {
      console.log(formatLogEntry(entry));
    }
  },
};

/**
 * Sanitize error message for safe logging
 * Removes: emails, phone numbers, API keys, internal IDs
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    let msg = error.message;

    // Remove common sensitive patterns
    msg = msg.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '[email]'
    );
    msg = msg.replace(/\d{10,}/g, '[id]');
    msg = msg.replace(/sk-[A-Za-z0-9]{40,}/g, '[key]');

    return msg;
  }

  return String(error).substring(0, 100);
}
