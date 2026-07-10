import { describe, it, expect } from 'vitest';
import { generateRequestId } from '@/lib/request-context';

describe('generateRequestId', () => {
  it('returns a UUID-shaped string', () => {
    expect(generateRequestId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('returns a fresh, unique id on every call (no shared singleton)', () => {
    const ids = new Set(
      Array.from({ length: 1000 }, () => generateRequestId())
    );
    expect(ids.size).toBe(1000);
  });
});
