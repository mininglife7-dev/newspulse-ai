import { describe, it, expect, vi, beforeEach } from 'vitest';

// summarizeArticle must degrade gracefully — a missing key or API failure
// should yield a fallback summary, never a thrown error.
describe('summarizeArticle without OPENAI_API_KEY', () => {
  beforeEach(() => {
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.resetModules();
  });

  it('falls back to truncated content instead of throwing', async () => {
    const { summarizeArticle } = await import('@/lib/openai');
    const content = 'Sentence one. '.repeat(50);
    const summary = await summarizeArticle({ title: 'T', content });
    expect(summary.length).toBeLessThanOrEqual(281); // 280 chars + ellipsis
    expect(summary).toContain('Sentence one.');
  });

  it('returns the title when content is empty', async () => {
    const { summarizeArticle } = await import('@/lib/openai');
    expect(await summarizeArticle({ title: 'Only Title', content: '' })).toBe(
      'Only Title'
    );
  });

  it('returns a placeholder when both title and content are empty', async () => {
    const { summarizeArticle } = await import('@/lib/openai');
    expect(await summarizeArticle({ title: '', content: '' })).toBe(
      'No content available to summarize.'
    );
  });
});

describe('summarizeBatch', () => {
  beforeEach(() => {
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.resetModules();
  });

  it('preserves input order and length', async () => {
    const { summarizeBatch } = await import('@/lib/openai');
    const articles = Array.from({ length: 7 }, (_, i) => ({
      title: `Article ${i}`,
      content: '',
    }));
    const summaries = await summarizeBatch(articles, 3);
    expect(summaries).toHaveLength(7);
    summaries.forEach((s, i) => expect(s).toBe(`Article ${i}`));
  });

  it('handles an empty batch', async () => {
    const { summarizeBatch } = await import('@/lib/openai');
    expect(await summarizeBatch([])).toEqual([]);
  });
});
