import type { Observation } from '@/lib/ceis/types';
import { excerpt, stableId } from '@/lib/ceis/util';
import type { Collector, CollectorContext } from './types';

/**
 * arXiv collector — recent AI research via the public arXiv Atom API.
 * Titles + abstracts only (both are public metadata arXiv explicitly
 * provides for discovery).
 */

const API =
  'https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=';

interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  published: string;
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

/** Minimal Atom parser (no XML dependency) — exported for tests. */
export function parseArxivAtom(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = [];
  const blocks = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  for (const block of blocks) {
    const id = tag(block, 'id');
    const title = tag(block, 'title');
    if (!id || !title) continue;
    entries.push({
      id,
      title,
      summary: tag(block, 'summary'),
      published: tag(block, 'published'),
    });
  }
  return entries;
}

export function arxivEntriesToObservations(
  entries: ArxivEntry[],
  now: Date,
  limit: number
): Observation[] {
  return entries.slice(0, limit).map((e) => ({
    id: stableId('arxiv', e.id),
    collector: 'arxiv' as const,
    category: 'research' as const,
    title: excerpt(e.title, 200),
    url: e.id,
    source: 'arxiv.org (cs.AI / cs.LG / cs.CL)',
    observed_at: now.toISOString(),
    published_at: e.published || null,
    evidence: excerpt(e.summary, 300),
    // Peer review hasn't happened yet for most submissions — solid but not proven.
    confidence: 0.6,
  }));
}

export const arxivCollector: Collector = {
  id: 'arxiv',
  name: 'arXiv Research',
  description: 'Latest AI/ML/NLP papers from arXiv (Atom API).',
  enabled: () => true,
  async collect(ctx: CollectorContext): Promise<Observation[]> {
    const res = await ctx.fetchImpl(API + ctx.limit, { cache: 'no-store' });
    if (!res.ok) throw new Error(`arXiv API failed (${res.status})`);
    const xml = await res.text();
    return arxivEntriesToObservations(parseArxivAtom(xml), ctx.now, ctx.limit);
  },
};
