import { describe, it, expect } from 'vitest';
import { extractDomain, extractPublishedDate } from '@/lib/firecrawl';

describe('extractDomain', () => {
  it('strips protocol and www', () => {
    expect(extractDomain('https://www.bbc.com/news/article')).toBe('bbc.com');
    expect(extractDomain('http://example.org')).toBe('example.org');
  });
  it('returns the input unchanged when it is not a URL', () => {
    expect(extractDomain('not a url')).toBe('not a url');
  });
});

describe('extractPublishedDate', () => {
  it('reads publishedTime metadata as ISO', () => {
    const iso = extractPublishedDate({
      url: 'https://x.com',
      metadata: { publishedTime: '2026-01-02T03:04:05Z' },
    });
    expect(iso).toBe(new Date('2026-01-02T03:04:05Z').toISOString());
  });
  it('falls back to article:published_time', () => {
    const iso = extractPublishedDate({
      url: 'https://x.com',
      metadata: { 'article:published_time': '2026-05-06T00:00:00Z' },
    });
    expect(iso).toBe(new Date('2026-05-06T00:00:00Z').toISOString());
  });
  it('returns null for missing or invalid dates', () => {
    expect(extractPublishedDate({ url: 'https://x.com' })).toBeNull();
    expect(
      extractPublishedDate({
        url: 'https://x.com',
        metadata: { publishedTime: 'not-a-date' },
      })
    ).toBeNull();
  });
});
