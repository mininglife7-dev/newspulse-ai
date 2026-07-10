/**
 * Minimal structured logger.
 *
 * Emits one JSON object per line to stdout/stderr so that Vercel's log drain (or
 * any aggregator) can parse, filter, and alert on them. Every server log carries
 * a `requestId` so a customer-reported failure can be traced end-to-end.
 *
 * SAFETY: only the fields explicitly passed in `meta` are logged. Never pass
 * secrets, tokens, raw request bodies, or full article content through here.
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogMeta {
  requestId?: string;
  route?: string;
  userId?: string;
  status?: number;
  durationMs?: number;
  dependency?: string;
  [key: string]: string | number | boolean | null | undefined;
}

/** Generate a short, unique request id. Falls back if crypto is unavailable. */
export function newRequestId(): string {
  try {
    // Available in Node 18+ and the edge runtime.
    return crypto.randomUUID().slice(0, 8);
  } catch {
    // Deterministic-enough fallback; only used if crypto is missing.
    return 'req-' + Date.now().toString(36);
  }
}

function emit(level: LogLevel, message: string, meta: LogMeta = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  info: (message: string, meta?: LogMeta) => emit('info', message, meta),
  warn: (message: string, meta?: LogMeta) => emit('warn', message, meta),
  error: (message: string, meta?: LogMeta) => emit('error', message, meta),
};
