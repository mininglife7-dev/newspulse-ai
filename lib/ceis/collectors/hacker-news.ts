import type { Observation } from '@/lib/ceis/types';
import { clamp, excerpt, stableId } from '@/lib/ceis/util';
import type { Collector, CollectorContext } from './types';

/**
 * Hacker News collector — front-page-quality AI stories via the free
 * Algolia search API. Public metadata only (title, url, points, comments).
 */

const API =
  'https://hn.algolia.com/api/v1/search?tags=story&numericFilters=points%3E80&query=';
const QUERY = 'AI';

interface HnHit {
  objectID: string;
  title?: string;
  url?: string | null;
  points?: number;
  num_comments?: number;
  created_at?: string;
}

/** Pure parser — exported for tests. */
export function parseHnHits(
  hits: HnHit[],
  now: Date,
  limit: number
): Observation[] {
  return hits
    .filter((h) => h && h.title)
    .slice(0, limit)
    .map((h) => {
      const url = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;
      const points = h.points ?? 0;
      const comments = h.num_comments ?? 0;
      return {
        id: stableId('hacker-news', url),
        collector: 'hacker-news' as const,
        category: 'technology-trend' as const,
        title: excerpt(h.title!, 200),
        url,
        source: 'news.ycombinator.com',
        observed_at: now.toISOString(),
        published_at: h.created_at ?? null,
        evidence: `${points} points, ${comments} comments on Hacker News`,
        // Community-validated signal: scale confidence with engagement.
        confidence: clamp(0.5 + points / 1000, 0.5, 0.9),
      };
    });
}

export const hackerNewsCollector: Collector = {
  id: 'hacker-news',
  name: 'Hacker News',
  description:
    'High-signal AI stories from the Hacker News community (Algolia API).',
  enabled: () => true,
  async collect(ctx: CollectorContext): Promise<Observation[]> {
    const res = await ctx.fetchImpl(API + encodeURIComponent(QUERY), {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HN Algolia API failed (${res.status})`);
    const json = (await res.json()) as { hits?: HnHit[] };
    return parseHnHits(json.hits ?? [], ctx.now, ctx.limit);
  },
};
