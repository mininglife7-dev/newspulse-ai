import { describe, expect, it } from 'vitest';
import {
  runCollectors,
  type Collector,
  type CollectorContext,
} from '@/lib/ceis/collectors';
import {
  arxivEntriesToObservations,
  parseArxivAtom,
} from '@/lib/ceis/collectors/arxiv';
import { aggregateKeywords } from '@/lib/ceis/collectors/customer-signals';
import { parseGithubRepos } from '@/lib/ceis/collectors/github-trending';
import { parseHnHits } from '@/lib/ceis/collectors/hacker-news';
import { parseRedditPosts } from '@/lib/ceis/collectors/reddit';
import {
  WEB_RESEARCH_CONFIGS,
  firecrawlResultsToObservations,
} from '@/lib/ceis/collectors/web-research';
import { makeObservation, NOW } from './helpers';

function testCtx(overrides: Partial<CollectorContext> = {}): CollectorContext {
  return {
    now: NOW,
    limit: 5,
    fetchImpl: fetch,
    supabaseAvailable: false,
    ...overrides,
  };
}

describe('parseHnHits', () => {
  it('maps hits to observations with engagement-scaled confidence', () => {
    const obs = parseHnHits(
      [
        {
          objectID: '1',
          title: 'Show HN: An AI tool',
          url: 'https://a.com',
          points: 500,
          num_comments: 120,
          created_at: '2026-07-01T00:00:00Z',
        },
        { objectID: '2', title: 'Ask HN: thing', url: null, points: 90 },
        { objectID: '3' }, // no title → dropped
      ],
      NOW,
      5
    );
    expect(obs).toHaveLength(2);
    expect(obs[0].evidence).toBe('500 points, 120 comments on Hacker News');
    expect(obs[0].confidence).toBeGreaterThan(obs[1].confidence);
    // Story without URL falls back to the HN item page.
    expect(obs[1].url).toBe('https://news.ycombinator.com/item?id=2');
  });

  it('is idempotent: same story → same id', () => {
    const hit = { objectID: '1', title: 'T', url: 'https://a.com' };
    const [a] = parseHnHits([hit], NOW, 5);
    const [b] = parseHnHits([hit], new Date(), 5);
    expect(a.id).toBe(b.id);
  });
});

describe('parseGithubRepos', () => {
  it('maps repos and respects the limit', () => {
    const repos = Array.from({ length: 10 }, (_, i) => ({
      full_name: `org/repo${i}`,
      html_url: `https://github.com/org/repo${i}`,
      stargazers_count: 1000 - i,
      language: 'TypeScript',
      description: 'An AI framework',
    }));
    const obs = parseGithubRepos(repos, NOW, 3);
    expect(obs).toHaveLength(3);
    expect(obs[0].category).toBe('open-source');
    expect(obs[0].evidence).toContain('1000 stars');
  });
});

describe('parseArxivAtom', () => {
  const xml = `<?xml version="1.0"?><feed>
    <entry><id>http://arxiv.org/abs/2607.01234</id><title>Retrieval  Augmented\n Everything</title>
      <summary>We show that retrieval helps.</summary><published>2026-07-01T00:00:00Z</published></entry>
    <entry><id>http://arxiv.org/abs/2607.05678</id><title>Second Paper</title>
      <summary>Another abstract.</summary><published>2026-07-02T00:00:00Z</published></entry>
  </feed>`;

  it('parses entries and normalizes whitespace', () => {
    const entries = parseArxivAtom(xml);
    expect(entries).toHaveLength(2);
    expect(entries[0].title).toBe('Retrieval Augmented Everything');
  });

  it('converts to research observations', () => {
    const obs = arxivEntriesToObservations(parseArxivAtom(xml), NOW, 1);
    expect(obs).toHaveLength(1);
    expect(obs[0].category).toBe('research');
    expect(obs[0].url).toContain('arxiv.org');
  });

  it('returns empty for garbage input', () => {
    expect(parseArxivAtom('not xml at all')).toHaveLength(0);
  });
});

describe('parseRedditPosts', () => {
  it('maps posts and builds permalinks', () => {
    const obs = parseRedditPosts(
      [
        {
          data: {
            title: 'Big model drop',
            permalink: '/r/ML/comments/1',
            score: 900,
            num_comments: 300,
            subreddit: 'MachineLearning',
            created_utc: 1750000000,
          },
        },
        { data: {} }, // no title → dropped
      ],
      NOW,
      5
    );
    expect(obs).toHaveLength(1);
    expect(obs[0].url).toBe('https://www.reddit.com/r/ML/comments/1');
    expect(obs[0].source).toBe('reddit.com/r/MachineLearning');
  });
});

describe('aggregateKeywords', () => {
  it('counts, normalizes and ranks first-party search keywords', () => {
    const rows = [
      { keyword: 'EU AI Act', created_at: '2026-07-01T00:00:00Z' },
      { keyword: 'eu ai act', created_at: '2026-07-03T00:00:00Z' },
      { keyword: 'quantum', created_at: '2026-07-02T00:00:00Z' },
      { keyword: '  ', created_at: '2026-07-02T00:00:00Z' },
    ];
    const obs = aggregateKeywords(rows, NOW, 5);
    expect(obs).toHaveLength(2);
    expect(obs[0].title).toContain('eu ai act');
    expect(obs[0].evidence).toContain('2 times');
    expect(obs[0].category).toBe('customer-insight');
    expect(obs[0].confidence).toBeGreaterThan(obs[1].confidence);
  });
});

describe('firecrawlResultsToObservations', () => {
  it('maps results using the config category and confidence', () => {
    const config = WEB_RESEARCH_CONFIGS.find((c) => c.id === 'regulatory')!;
    const obs = firecrawlResultsToObservations(
      [
        {
          url: 'https://europa.eu/ai-act-update',
          title: 'AI Act enforcement begins',
          description: 'Rules apply from August.',
        },
      ],
      config,
      NOW,
      5
    );
    expect(obs[0].category).toBe('governance-regulation');
    expect(obs[0].confidence).toBe(config.confidence);
    expect(obs[0].source).toBe('europa.eu');
  });
});

describe('runCollectors', () => {
  const good: Collector = {
    id: 'hacker-news',
    name: 'Good',
    description: '',
    enabled: () => true,
    collect: async () => [makeObservation({ title: 'A' })],
  };
  const broken: Collector = {
    id: 'reddit',
    name: 'Broken',
    description: '',
    enabled: () => true,
    collect: async () => {
      throw new Error('boom');
    },
  };
  const disabled: Collector = {
    id: 'product-hunt',
    name: 'Disabled',
    description: '',
    enabled: () => false,
    collect: async () => [makeObservation({ title: 'B' })],
  };

  it('isolates failures and reports ran/failed/skipped', async () => {
    const result = await runCollectors(testCtx(), [good, broken, disabled]);
    expect(result.observations).toHaveLength(1);
    expect(result.ran).toEqual(['hacker-news']);
    expect(result.failed).toEqual([{ id: 'reddit', error: 'boom' }]);
    expect(result.skipped).toEqual(['product-hunt']);
  });

  it('dedupes observations with the same id across collectors', async () => {
    const dupe: Collector = { ...good, id: 'arxiv', name: 'Dupe' };
    const result = await runCollectors(testCtx(), [good, dupe]);
    expect(result.observations).toHaveLength(1);
  });
});
