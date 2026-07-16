import type { Observation } from '@/lib/ceis/types';
import { clamp, excerpt, stableId } from '@/lib/ceis/util';
import type { Collector, CollectorContext } from './types';

/**
 * Reddit collector — top weekly threads from AI communities via the public
 * JSON endpoints. Public titles + vote counts only.
 */

const SUBREDDITS =
  'MachineLearning+artificial+LocalLLaMA+ArtificialInteligence';

interface RedditPost {
  data?: {
    title?: string;
    permalink?: string;
    url?: string;
    score?: number;
    num_comments?: number;
    subreddit?: string;
    created_utc?: number;
    selftext?: string;
  };
}

/** Pure parser — exported for tests. */
export function parseRedditPosts(
  posts: RedditPost[],
  now: Date,
  limit: number
): Observation[] {
  return posts
    .map((p) => p.data)
    .filter((d): d is NonNullable<RedditPost['data']> => Boolean(d?.title))
    .slice(0, limit)
    .map((d) => {
      const url = d.permalink
        ? `https://www.reddit.com${d.permalink}`
        : d.url || 'https://www.reddit.com';
      const score = d.score ?? 0;
      return {
        id: stableId('reddit', url),
        collector: 'reddit' as const,
        category: 'technology-trend' as const,
        title: excerpt(d.title!, 200),
        url,
        source: `reddit.com/r/${d.subreddit ?? 'AI'}`,
        observed_at: now.toISOString(),
        published_at: d.created_utc
          ? new Date(d.created_utc * 1000).toISOString()
          : null,
        evidence: `${score} upvotes, ${d.num_comments ?? 0} comments${
          d.selftext ? ` — ${excerpt(d.selftext, 200)}` : ''
        }`,
        // Community chatter — useful trend signal, lower evidentiary weight.
        confidence: clamp(0.4 + score / 2000, 0.4, 0.75),
      };
    });
}

export const redditCollector: Collector = {
  id: 'reddit',
  name: 'Reddit AI Communities',
  description: `Top weekly threads from r/${SUBREDDITS.split('+').join(', r/')}.`,
  enabled: () => true,
  async collect(ctx: CollectorContext): Promise<Observation[]> {
    const res = await ctx.fetchImpl(
      `https://www.reddit.com/r/${SUBREDDITS}/top.json?t=week&limit=${ctx.limit}`,
      {
        headers: {
          'User-Agent':
            'ceis-evolution-engine/1.0 (research; public metadata only)',
        },
        cache: 'no-store',
      }
    );
    if (!res.ok) throw new Error(`Reddit API failed (${res.status})`);
    const json = (await res.json()) as { data?: { children?: RedditPost[] } };
    return parseRedditPosts(json.data?.children ?? [], ctx.now, ctx.limit);
  },
};
