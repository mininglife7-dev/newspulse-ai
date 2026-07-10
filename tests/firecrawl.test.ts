import { describe, expect, it } from 'vitest';
import {
  extractDomain,
  extractPublishedDate,
  normalizeFirecrawlResults,
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

describe('normalizeFirecrawlResults', () => {
  it('drops entries without a usable URL', () => {
    const out = normalizeFirecrawlResults([
      { url: '' } as FirecrawlSearchResult,
      { url: 'https://good.com/a', title: 'Good' },
      null as unknown as FirecrawlSearchResult,
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe('https://good.com/a');
  });

  it('resolves title from result → metadata.title → ogTitle → domain', () => {
    expect(
      normalizeFirecrawlResults([{ url: 'https://a.com', title: 'Direct' }])[0]
        .title
    ).toBe('Direct');
    expect(
      normalizeFirecrawlResults([
        { url: 'https://a.com', metadata: { title: 'MetaTitle' } },
      ])[0].title
    ).toBe('MetaTitle');
    expect(
      normalizeFirecrawlResults([
        { url: 'https://a.com', metadata: { ogTitle: 'OgTitle' } },
      ])[0].title
    ).toBe('OgTitle');
    // No title anywhere → falls back to the source domain.
    expect(
      normalizeFirecrawlResults([{ url: 'https://www.a.com/x' }])[0].title
    ).toBe('a.com');
  });

  it('resolves description from result → metadata → og, else null', () => {
    expect(
      normalizeFirecrawlResults([
        { url: 'https://a.com', description: 'D' },
      ])[0].description
    ).toBe('D');
    expect(
      normalizeFirecrawlResults([{ url: 'https://a.com' }])[0].description
    ).toBeNull();
  });

  it('prefers markdown, then content, then description for summarizable content', () => {
    expect(
      normalizeFirecrawlResults([
        { url: 'https://a.com', markdown: 'MD', content: 'C', description: 'D' },
      ])[0].content
    ).toBe('MD');
    expect(
      normalizeFirecrawlResults([
        { url: 'https://a.com', content: 'C', description: 'D' },
      ])[0].content
    ).toBe('C');
    expect(
      normalizeFirecrawlResults([
        { url: 'https://a.com', description: 'D' },
      ])[0].content
    ).toBe('D');
    expect(
      normalizeFirecrawlResults([{ url: 'https://a.com' }])[0].content
    ).toBe('');
  });

  it('derives source domain and preserves url', () => {
    const out = normalizeFirecrawlResults([
      { url: 'https://www.bbc.com/news/x', title: 'T' },
    ]);
    expect(out[0].source).toBe('bbc.com');
    expect(out[0].url).toBe('https://www.bbc.com/news/x');
  });

  it('handles empty / nullish input', () => {
    expect(normalizeFirecrawlResults([])).toEqual([]);
    expect(
      normalizeFirecrawlResults(undefined as unknown as FirecrawlSearchResult[])
    ).toEqual([]);
  });
});
