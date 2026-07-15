import type { CollectorId, Observation } from '@/lib/ceis/types';

/**
 * Everything a collector may need, injected so collectors stay pure-ish and
 * testable: no collector reads process.env or global fetch directly.
 */
export interface CollectorContext {
  now: Date;
  /** Max observations a single collector should return. */
  limit: number;
  /** Injectable fetch for tests; defaults to global fetch. */
  fetchImpl: typeof fetch;
  /** Present only when FIRECRAWL_API_KEY is configured. */
  firecrawlApiKey?: string;
  /** Present only when Supabase service credentials are configured. */
  supabaseAvailable: boolean;
}

export interface Collector {
  id: CollectorId;
  name: string;
  description: string;
  /** Whether this collector can run in the current environment. */
  enabled(ctx: CollectorContext): boolean;
  /** Gather observations. Throwing is fine — the runner isolates failures. */
  collect(ctx: CollectorContext): Promise<Observation[]>;
}

export interface CollectorRunResult {
  observations: Observation[];
  ran: CollectorId[];
  failed: Array<{ id: CollectorId; error: string }>;
  skipped: CollectorId[];
}
