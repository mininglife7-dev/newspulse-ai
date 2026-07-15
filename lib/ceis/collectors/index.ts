import { arxivCollector } from './arxiv';
import { customerSignalsCollector } from './customer-signals';
import { githubTrendingCollector } from './github-trending';
import { hackerNewsCollector } from './hacker-news';
import { redditCollector } from './reddit';
import type { Collector, CollectorContext, CollectorRunResult } from './types';
import { WEB_RESEARCH_CONFIGS, makeWebResearchCollector } from './web-research';

export type { Collector, CollectorContext, CollectorRunResult } from './types';

/**
 * The full research-module registry. Adding a source = adding one entry
 * here (or one config in WEB_RESEARCH_CONFIGS for Firecrawl-backed sources).
 */
export const COLLECTORS: Collector[] = [
  githubTrendingCollector,
  hackerNewsCollector,
  arxivCollector,
  redditCollector,
  customerSignalsCollector,
  ...WEB_RESEARCH_CONFIGS.map(makeWebResearchCollector),
];

export function buildCollectorContext(
  overrides: Partial<CollectorContext> = {}
): CollectorContext {
  return {
    now: new Date(),
    limit: 8,
    fetchImpl: fetch,
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY || undefined,
    supabaseAvailable: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    ...overrides,
  };
}

const COLLECTOR_TIMEOUT_MS = 20_000;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      )
    ),
  ]);
}

/**
 * Run every enabled collector in parallel with full failure isolation:
 * a broken or slow source never blocks the evolution cycle.
 */
export async function runCollectors(
  ctx: CollectorContext,
  collectors: Collector[] = COLLECTORS
): Promise<CollectorRunResult> {
  const result: CollectorRunResult = {
    observations: [],
    ran: [],
    failed: [],
    skipped: [],
  };

  const enabled = collectors.filter((c) => {
    const ok = c.enabled(ctx);
    if (!ok) result.skipped.push(c.id);
    return ok;
  });

  const settled = await Promise.allSettled(
    enabled.map((c) =>
      withTimeout(c.collect(ctx), COLLECTOR_TIMEOUT_MS, c.name)
    )
  );

  settled.forEach((s, i) => {
    const collector = enabled[i];
    if (s.status === 'fulfilled') {
      result.ran.push(collector.id);
      result.observations.push(...s.value);
    } else {
      const message = s.reason?.message || String(s.reason);
      console.error(`[ceis] collector ${collector.id} failed:`, message);
      result.failed.push({ id: collector.id, error: message });
    }
  });

  // Dedupe by stable id (same URL re-observed by two collectors).
  const seen = new Set<string>();
  result.observations = result.observations.filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });

  return result;
}
