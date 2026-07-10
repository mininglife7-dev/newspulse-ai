import { describe, expect, it } from 'vitest';
import {
  extractDomain,
  extractPublishedDate,
  type FirecrawlSearchResult,
} from '@/lib/firecrawl';

describe('extractDomain', () => {
  it('strips the www prefix', () => {
    expect(extractDomain('https://www.bbc.com/news/article')).toBe('bbc.com');
  });

  it('keeps non-www hosts intact', () => {
    expect(extractDomain('https://example.org/path?q=1')).toBe('example.org');
  });

  it('handles subdomains that are not www', () => {
    expect(extractDomain('https://tech.example.com/a')).toBe(
      'tech.example.com'
    );
  });

  it('returns the raw input when it is not a valid URL', () => {
    expect(extractDomain('definitely not a url')).toBe('definitely not a url');
  });
});

describe('extractPublishedDate', () => {
  it('reads metadata.publishedTime', () => {
    const r: FirecrawlSearchResult = {
      url: 'https://x.com',
      metadata: { publishedTime: '2025-01-02T03:04:05.000Z' },
    };
    expect(extractPublishedDate(r)).toBe('2025-01-02T03:04:05.000Z');
  });

  it('falls back to article:published_time', () => {
    const r: FirecrawlSearchResult = {
      url: 'https://x.com',
      metadata: { 'article:published_time': '2024-12-31T00:00:00.000Z' },
    };
    expect(extractPublishedDate(r)).toBe('2024-12-31T00:00:00.000Z');
  });

  it('returns null when no date metadata is present', () => {
    const r: FirecrawlSearchResult = { url: 'https://x.com', metadata: {} };
    expect(extractPublishedDate(r)).toBeNull();
  });

  it('returns null when metadata is missing entirely', () => {
    const r: FirecrawlSearchResult = { url: 'https://x.com' };
    expect(extractPublishedDate(r)).toBeNull();
  });

  it('returns null for an unparseable date', () => {
    const r: FirecrawlSearchResult = {
      url: 'https://x.com',
      metadata: { publishedTime: 'not-a-date' },
    };
    expect(extractPublishedDate(r)).toBeNull();
  });
});
