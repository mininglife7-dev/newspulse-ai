import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  firecrawlSearch,
  extractDomain,
  extractPublishedDate,
} from '@/lib/firecrawl';

describe('extractDomain', () => {
  it('strips protocol, path and www prefix', () => {
    expect(extractDomain('https://www.bbc.com/news/article')).toBe('bbc.com');
  });

  it('keeps non-www subdomains', () => {
    expect(extractDomain('https://edition.cnn.com/world')).toBe(
      'edition.cnn.com'
    );
  });

  it('returns the input unchanged when it is not a URL', () => {
    expect(extractDomain('not a url')).toBe('not a url');
  });
});

describe('extractPublishedDate', () => {
  it('returns null when no metadata is present', () => {
    expect(extractPublishedDate({ url: 'https://a.com' })).toBeNull();
  });

  it('uses metadata.publishedTime when valid', () => {
    expect(
      extractPublishedDate({
        url: 'https://a.com',
        metadata: { publishedTime: '2026-07-01T10:00:00Z' },
      })
    ).toBe('2026-07-01T10:00:00.000Z');
  });

  it('falls back to article:published_time', () => {
    expect(
      extractPublishedDate({
        url: 'https://a.com',
        metadata: { 'article:published_time': '2026-06-15T00:00:00Z' },
      })
    ).toBe('2026-06-15T00:00:00.000Z');
  });

  it('returns null for unparseable dates', () => {
    expect(
      extractPublishedDate({
        url: 'https://a.com',
        metadata: { publishedTime: 'yesterday-ish' },
      })
    ).toBeNull();
  });
});

describe('firecrawlSearch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns data on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [{ url: 'https://a.com', title: 'A' }],
          }),
          { status: 200 }
        )
      )
    );
    const results = await firecrawlSearch({ query: 'test', apiKey: 'fc-x' });
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://a.com');
  });

  it('throws with status on HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('quota exceeded', { status: 402 }))
    );
    await expect(
      firecrawlSearch({ query: 'test', apiKey: 'fc-x' })
    ).rejects.toThrow(/402/);
  });

  it('throws when the API reports success=false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: 'bad query' }), {
          status: 200,
        })
      )
    );
    await expect(
      firecrawlSearch({ query: 'test', apiKey: 'fc-x' })
    ).rejects.toThrow('bad query');
  });

  it('returns [] when success=true but data is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ success: true }), { status: 200 })
        )
    );
    const results = await firecrawlSearch({ query: 'test', apiKey: 'fc-x' });
    expect(results).toEqual([]);
  });
});
