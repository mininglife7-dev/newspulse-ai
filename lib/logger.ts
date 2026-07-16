type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: string;
  workspaceId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: any;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, message: string, context: LogContext = {}): void {
  const logEntry = {
    timestamp: formatTimestamp(),
    level,
    message,
    ...context,
  };

  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) =>
    log('debug', message, context),
  info: (message: string, context?: LogContext) =>
    log('info', message, context),
  warn: (message: string, context?: LogContext) =>
    log('warn', message, context),
  error: (message: string, context?: LogContext) =>
    log('error', message, context),
};

export function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function measureDuration(startTime: number): number {
  return Date.now() - startTime;
}
