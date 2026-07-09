import type {
  CollectorId,
  Observation,
  ObservationCategory,
} from '@/lib/ceis/types';
import { excerpt, stableId } from '@/lib/ceis/util';
import {
  extractDomain,
  extractPublishedDate,
  firecrawlSearch,
  type FirecrawlSearchResult,
} from '@/lib/firecrawl';
import type { Collector, CollectorContext } from './types';

/**
 * Firecrawl-backed research collectors. One implementation, many configs —
 * Product Hunt launches, engineering blogs, AI news, regulatory updates,
 * and conference talks all reuse the app's existing Firecrawl wrapper
 * instead of adding bespoke scrapers.
 *
 * These collectors only capture public titles, URLs and short description
 * excerpts — never full article bodies into permanent storage.
 */

export interface WebResearchConfig {
  id: CollectorId;
  name: string;
  description: string;
  category: ObservationCategory;
  query: string;
  confidence: number;
}

export const WEB_RESEARCH_CONFIGS: WebResearchConfig[] = [
  {
    id: 'product-hunt',
    name: 'Product Hunt',
    description: 'Recent AI product launches surfaced via web search.',
    category: 'product-innovation',
    query: 'site:producthunt.com new AI product launch',
    confidence: 0.55,
  },
  {
    id: 'engineering-blogs',
    name: 'Engineering Blogs',
    description:
      'Engineering lessons and architecture write-ups from company blogs.',
    category: 'engineering-practice',
    query:
      'AI engineering blog lessons learned architecture scaling LLM production',
    confidence: 0.7,
  },
  {
    id: 'ai-news',
    name: 'AI News',
    description: 'AI industry news: startups, funding, launches, unicorns.',
    category: 'ai-startups',
    query: 'AI startup news this week launch funding solo founder',
    confidence: 0.6,
  },
  {
    id: 'regulatory',
    name: 'AI Governance & Regulation',
    description: 'EU AI Act developments and AI regulatory updates.',
    category: 'governance-regulation',
    query: 'EU AI Act update compliance requirements AI regulation news',
    confidence: 0.75,
  },
  {
    id: 'conference-talks',
    name: 'Conference Talks',
    description: 'Takeaways from technical AI conference talks.',
    category: 'research',
    query: 'AI conference talk takeaways NeurIPS ICML engineering practices',
    confidence: 0.6,
  },
];

/** Pure mapper — exported for tests. */
export function firecrawlResultsToObservations(
  results: FirecrawlSearchResult[],
  config: WebResearchConfig,
  now: Date,
  limit: number
): Observation[] {
  return results
    .filter((r) => r && r.url)
    .slice(0, limit)
    .map((r) => {
      const title =
        r.title ||
        r.metadata?.title ||
        r.metadata?.ogTitle ||
        extractDomain(r.url);
      const description =
        r.description ||
        r.metadata?.description ||
        r.metadata?.ogDescription ||
        '';
      return {
        id: stableId(config.id, r.url),
        collector: config.id,
        category: config.category,
        title: excerpt(title, 200),
        url: r.url,
        source: extractDomain(r.url),
        observed_at: now.toISOString(),
        published_at: extractPublishedDate(r),
        evidence: excerpt(description || title, 280),
        confidence: config.confidence,
      };
    });
}

export function makeWebResearchCollector(config: WebResearchConfig): Collector {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    enabled: (ctx) => Boolean(ctx.firecrawlApiKey),
    async collect(ctx: CollectorContext): Promise<Observation[]> {
      const results = await firecrawlSearch({
        query: config.query,
        limit: ctx.limit,
        apiKey: ctx.firecrawlApiKey!,
      });
      return firecrawlResultsToObservations(
        results,
        config,
        ctx.now,
        ctx.limit
      );
    },
  };
}
