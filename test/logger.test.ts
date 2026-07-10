import { describe, it, expect, vi, afterEach } from 'vitest';
import { log, newRequestId } from '@/lib/logger';

afterEach(() => vi.restoreAllMocks());

describe('structured logger', () => {
  it('generates short unique-ish request ids', () => {
    const a = newRequestId();
    const b = newRequestId();
    expect(a).toHaveLength(8);
    expect(typeof a).toBe('string');
    expect(a).not.toBe(b);
  });

  it('emits a single parseable JSON line with level + message + meta', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    log.error('boom', { requestId: 'abc123', route: 'POST /api/search', status: 500 });
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('error');
    expect(parsed.message).toBe('boom');
    expect(parsed.requestId).toBe('abc123');
    expect(parsed.status).toBe(500);
    expect(typeof parsed.ts).toBe('string');
  });

  it('only logs the fields it is given (no accidental secret sink)', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.info('ok', { userId: 'u1' });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    // The object has exactly ts, level, message, userId — nothing smuggled in.
    expect(Object.keys(parsed).sort()).toEqual(['level', 'message', 'ts', 'userId']);
  });
});
