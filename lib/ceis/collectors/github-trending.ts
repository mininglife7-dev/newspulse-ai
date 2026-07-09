import type { Observation } from '@/lib/ceis/types';
import { clamp, excerpt, stableId } from '@/lib/ceis/util';
import type { Collector, CollectorContext } from './types';

/**
 * GitHub trending collector — fast-rising AI repositories via the public
 * GitHub search API (no auth needed at CEIS's weekly rate). We study what
 * the ecosystem rewards; we never copy code.
 */

interface GithubRepo {
  full_name?: string;
  html_url?: string;
  description?: string | null;
  stargazers_count?: number;
  language?: string | null;
  created_at?: string;
  topics?: string[];
}

/** Pure parser — exported for tests. */
export function parseGithubRepos(
  items: GithubRepo[],
  now: Date,
  limit: number
): Observation[] {
  return items
    .filter((r) => r && r.full_name && r.html_url)
    .slice(0, limit)
    .map((r) => {
      const stars = r.stargazers_count ?? 0;
      const details = [
        `${stars} stars`,
        r.language ? `written in ${r.language}` : null,
        r.description ? excerpt(r.description, 160) : null,
      ]
        .filter(Boolean)
        .join(' — ');
      return {
        id: stableId('github-trending', r.html_url!),
        collector: 'github-trending' as const,
        category: 'open-source' as const,
        title: r.full_name!,
        url: r.html_url!,
        source: 'github.com',
        observed_at: now.toISOString(),
        published_at: r.created_at ?? null,
        evidence: details,
        confidence: clamp(0.5 + stars / 5000, 0.5, 0.9),
      };
    });
}

export const githubTrendingCollector: Collector = {
  id: 'github-trending',
  name: 'GitHub Trending',
  description: 'Fast-rising open-source AI repositories from the last 14 days.',
  enabled: () => true,
  async collect(ctx: CollectorContext): Promise<Observation[]> {
    const since = new Date(ctx.now.getTime() - 14 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const q = encodeURIComponent(`topic:ai created:>${since} stars:>100`);
    const res = await ctx.fetchImpl(
      `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=${ctx.limit}`,
      {
        headers: { Accept: 'application/vnd.github+json' },
        cache: 'no-store',
      }
    );
    if (!res.ok) throw new Error(`GitHub search API failed (${res.status})`);
    const json = (await res.json()) as { items?: GithubRepo[] };
    return parseGithubRepos(json.items ?? [], ctx.now, ctx.limit);
  },
};
