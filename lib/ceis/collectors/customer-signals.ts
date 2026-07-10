import type { Observation } from '@/lib/ceis/types';
import { clamp, stableId } from '@/lib/ceis/util';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Collector, CollectorContext } from './types';

/**
 * Customer-signals collector — the Cathedral listening to its own users.
 *
 * EURO AI customers register the AI systems they need to govern in
 * `ai_systems`; the system types and vendors they enter are first-party
 * evidence of where compliance demand actually is. This collector
 * aggregates recent registrations into customer-insight observations —
 * no external service, pure reuse. Only aggregate counts of type/vendor
 * labels are observed; no tenant-identifying data leaves the database.
 */

interface AiSystemRow {
  system_type: string | null;
  vendor: string | null;
  created_at: string;
}

/** Pure aggregation — exported for tests. */
export function aggregateAiSystems(
  rows: AiSystemRow[],
  now: Date,
  limit: number
): Observation[] {
  const counts = new Map<string, { count: number; latest: string }>();
  for (const row of rows) {
    const labels = [
      row.system_type?.trim().toLowerCase().replace(/_/g, ' '),
      row.vendor?.trim().toLowerCase(),
    ].filter((l): l is string => Boolean(l));
    for (const label of labels) {
      const entry = counts.get(label);
      if (entry) {
        entry.count++;
        if (row.created_at > entry.latest) entry.latest = row.created_at;
      } else {
        counts.set(label, { count: 1, latest: row.created_at });
      }
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([label, { count, latest }]) => ({
      id: stableId('customer-feedback', label),
      collector: 'customer-feedback' as const,
      category: 'customer-insight' as const,
      title: `Customers are governing "${label}" AI systems`,
      url: '/dashboard',
      source: 'euro-ai ai_systems inventory (first-party, aggregated)',
      observed_at: now.toISOString(),
      published_at: latest,
      evidence: `${count} recent registration${count === 1 ? '' : 's'} in the AI inventory — direct signal of compliance demand.`,
      // First-party behavioral data is the strongest evidence CEIS has.
      confidence: clamp(0.7 + count / 50, 0.7, 0.95),
    }));
}

export const customerSignalsCollector: Collector = {
  id: 'customer-feedback',
  name: 'Customer Signals',
  description:
    'First-party compliance demand derived from AI systems registered in the inventory.',
  enabled: (ctx) => ctx.supabaseAvailable,
  async collect(ctx: CollectorContext): Promise<Observation[]> {
    const { data, error } = await getSupabaseAdmin()
      .from('ai_systems')
      .select('system_type, vendor, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error)
      throw new Error(`Supabase ai_systems query failed: ${error.message}`);
    return aggregateAiSystems(
      (data ?? []) as AiSystemRow[],
      ctx.now,
      ctx.limit
    );
  },
};
