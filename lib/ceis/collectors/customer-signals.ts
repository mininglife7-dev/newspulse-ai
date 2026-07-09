import type { Observation } from '@/lib/ceis/types';
import { clamp, stableId } from '@/lib/ceis/util';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Collector, CollectorContext } from './types';

/**
 * Customer-signals collector — the Cathedral listening to its own users.
 *
 * NewsPulse AI already records every search in `news_searches`; the
 * keywords users actually type are first-party customer evidence of what
 * they care about. This collector aggregates recent keywords into
 * customer-insight observations — no external service, pure reuse.
 */

interface KeywordRow {
  keyword: string;
  created_at: string;
}

/** Pure aggregation — exported for tests. */
export function aggregateKeywords(
  rows: KeywordRow[],
  now: Date,
  limit: number
): Observation[] {
  const counts = new Map<string, { count: number; latest: string }>();
  for (const row of rows) {
    const key = row.keyword.trim().toLowerCase();
    if (!key) continue;
    const entry = counts.get(key);
    if (entry) {
      entry.count++;
      if (row.created_at > entry.latest) entry.latest = row.created_at;
    } else {
      counts.set(key, { count: 1, latest: row.created_at });
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([keyword, { count, latest }]) => ({
      id: stableId('customer-feedback', keyword),
      collector: 'customer-feedback' as const,
      category: 'customer-insight' as const,
      title: `Users are searching for "${keyword}"`,
      url: '/history',
      source: 'newspulse news_searches (first-party)',
      observed_at: now.toISOString(),
      published_at: latest,
      evidence: `Searched ${count} time${count === 1 ? '' : 's'} recently — direct signal of customer interest.`,
      // First-party behavioral data is the strongest evidence CEIS has.
      confidence: clamp(0.7 + count / 50, 0.7, 0.95),
    }));
}

export const customerSignalsCollector: Collector = {
  id: 'customer-feedback',
  name: 'Customer Signals',
  description:
    'First-party customer interest derived from recent NewsPulse searches.',
  enabled: (ctx) => ctx.supabaseAvailable,
  async collect(ctx: CollectorContext): Promise<Observation[]> {
    const { data, error } = await getSupabaseAdmin()
      .from('news_searches')
      .select('keyword, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error)
      throw new Error(`Supabase keyword query failed: ${error.message}`);
    return aggregateKeywords((data ?? []) as KeywordRow[], ctx.now, ctx.limit);
  },
};
