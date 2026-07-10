import { describe, expect, it } from 'vitest';
import {
  MAX_KEYWORD_LENGTH,
  parseSearchKeyword,
  readBodyField,
} from '@/lib/validation';

describe('parseSearchKeyword', () => {
  it('accepts and trims a normal keyword', () => {
    expect(parseSearchKeyword('  Tesla  ')).toEqual({
      ok: true,
      keyword: 'Tesla',
    });
  });

  it('rejects a non-string (object) without throwing', () => {
    const res = parseSearchKeyword({ evil: true });
    expect(res.ok).toBe(false);
    expect(res.keyword).toBeUndefined();
  });

  it('rejects null and undefined', () => {
    expect(parseSearchKeyword(null).ok).toBe(false);
    expect(parseSearchKeyword(undefined).ok).toBe(false);
  });

  it('rejects a number', () => {
    expect(parseSearchKeyword(42).ok).toBe(false);
  });

  it('rejects an empty or whitespace-only string', () => {
    expect(parseSearchKeyword('').ok).toBe(false);
    expect(parseSearchKeyword('    ').ok).toBe(false);
  });

  it('rejects a keyword longer than the max', () => {
    const res = parseSearchKeyword('x'.repeat(MAX_KEYWORD_LENGTH + 1));
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/too long/i);
  });

  it('accepts a keyword exactly at the max length', () => {
    const res = parseSearchKeyword('x'.repeat(MAX_KEYWORD_LENGTH));
    expect(res.ok).toBe(true);
  });
});

describe('readBodyField', () => {
  it('reads a field from a plain object', () => {
    expect(readBodyField({ keyword: 'hi' }, 'keyword')).toBe('hi');
  });

  it('returns undefined for null, primitives, and arrays', () => {
    expect(readBodyField(null, 'keyword')).toBeUndefined();
    expect(readBodyField('a string', 'keyword')).toBeUndefined();
    expect(readBodyField(123, 'keyword')).toBeUndefined();
    expect(readBodyField(['keyword'], 'keyword')).toBeUndefined();
  });
});
