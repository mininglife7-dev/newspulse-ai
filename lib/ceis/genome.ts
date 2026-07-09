import type { GenomeEntry, GenomeKind } from '@/lib/ceis/types';
import { stableId } from '@/lib/ceis/util';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Knowledge Genome — the Cathedral's permanent, searchable memory.
 *
 * Two layers:
 *  1. SEED_GENOME — capabilities that exist in the codebase today, versioned
 *     in git so gap analysis works even with an empty database. Keep this
 *     list honest: it is what "already exists" is measured against.
 *  2. Supabase `ceis_genome` — lessons, decisions, rejected/successful ideas
 *     and evaluations accumulated by evolution cycles and founder reviews.
 */

function seed(
  kind: GenomeKind,
  title: string,
  summary: string,
  tags: string[]
): GenomeEntry {
  return {
    id: stableId('seed', kind, title),
    kind,
    title,
    summary,
    tags,
    evidence: null,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

export const SEED_GENOME: GenomeEntry[] = [
  seed(
    'capability',
    'Live web news search',
    'Firecrawl /v1/search wrapper fetches and scrapes fresh news articles for any keyword (lib/firecrawl.ts, POST /api/search).',
    ['search', 'firecrawl', 'news', 'scraping', 'web']
  ),
  seed(
    'capability',
    'AI article summarization',
    'Every article is summarized into 2-3 neutral sentences by gpt-4o-mini with bounded parallel concurrency and graceful fallback (lib/openai.ts).',
    ['ai', 'summarization', 'openai', 'llm', 'gpt-4o-mini']
  ),
  seed(
    'capability',
    'Persistent search history',
    'Every query and its results are stored in Supabase news_searches with replay, per-entry view and clear-all (app/history, /api/history).',
    ['supabase', 'history', 'persistence', 'database', 'postgres']
  ),
  seed(
    'capability',
    'API-first backend',
    'JSON API routes with validation and error envelopes: POST /api/search, GET/DELETE /api/history, GET /api/health.',
    ['api', 'rest', 'nextjs', 'routes', 'health', 'monitoring']
  ),
  seed(
    'capability',
    'Rate limiting middleware',
    'In-memory per-IP rate limiter on expensive API routes with X-RateLimit headers (middleware.ts).',
    ['rate-limit', 'middleware', 'security', 'abuse']
  ),
  seed(
    'capability',
    'Dark polished UI',
    'Tailwind dark theme, lucide-react icons, loading skeletons, empty states, error boundaries and OG social cards.',
    ['ui', 'tailwind', 'dark-theme', 'ux', 'frontend']
  ),
  seed(
    'capability',
    'CI and Vercel auto-deploy',
    'GitHub Actions lint/type-check/build pipeline and production deploys to Vercel on push to main.',
    ['ci', 'cd', 'vercel', 'github-actions', 'deploy']
  ),
  seed(
    'capability',
    'Cathedral Evolution Intelligence System',
    'CEIS itself: modular research collectors, principle extraction, gap analysis, immune system, evolution scoring, DNA generation, knowledge genome and weekly evolution reports (lib/ceis).',
    ['ceis', 'evolution', 'research', 'collectors', 'dna', 'genome', 'learning']
  ),
  seed(
    'architecture-decision',
    'Serverless-first on Vercel + Supabase',
    'The Cathedral runs as Next.js serverless functions with Supabase Postgres as the only stateful service. New organs must not require long-running daemons; continuous work is scheduled via cron-triggered API routes.',
    ['architecture', 'serverless', 'vercel', 'supabase', 'cron']
  ),
  seed(
    'architecture-decision',
    'Best-effort persistence, never block the user',
    'Database writes on hot paths are fire-and-forget with logged errors (see saveSearch). User-facing latency wins over write guarantees for non-critical data.',
    ['architecture', 'reliability', 'persistence', 'latency']
  ),
];

// ---------------------------------------------------------------------------
// Supabase-backed genome access (best-effort, consistent with lib/supabase.ts)
// ---------------------------------------------------------------------------

interface GenomeRow {
  id: string;
  kind: GenomeKind;
  title: string;
  summary: string;
  tags: string[];
  evidence: string | null;
  created_at: string;
}

/** Load the full genome: seed capabilities + everything learned since. */
export async function loadGenome(): Promise<GenomeEntry[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('ceis_genome')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000);
    if (error) {
      console.error('[ceis] loadGenome error:', error);
      return SEED_GENOME;
    }
    const learned = ((data ?? []) as GenomeRow[]).map((row) => ({
      ...row,
      tags: Array.isArray(row.tags) ? row.tags : [],
    }));
    // Seed entries stay authoritative; learned entries never shadow them.
    const seedIds = new Set(SEED_GENOME.map((s) => s.id));
    return [...SEED_GENOME, ...learned.filter((e) => !seedIds.has(e.id))];
  } catch (err) {
    console.error('[ceis] loadGenome exception:', err);
    return SEED_GENOME;
  }
}

/** Remember something permanently (idempotent on id). */
export async function rememberGenomeEntry(
  entry: Omit<GenomeEntry, 'created_at'>
): Promise<boolean> {
  try {
    const { error } = await getSupabaseAdmin().from('ceis_genome').upsert(
      {
        id: entry.id,
        kind: entry.kind,
        title: entry.title,
        summary: entry.summary,
        tags: entry.tags,
        evidence: entry.evidence,
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.error('[ceis] rememberGenomeEntry error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[ceis] rememberGenomeEntry exception:', err);
    return false;
  }
}

/** Count genome entries created after a given ISO timestamp (learning velocity). */
export async function countGenomeEntries(
  sinceIso?: string
): Promise<{ total: number; recent: number }> {
  try {
    const admin = getSupabaseAdmin();
    const { count: total } = await admin
      .from('ceis_genome')
      .select('id', { count: 'exact', head: true });
    let recent = 0;
    if (sinceIso) {
      const { count } = await admin
        .from('ceis_genome')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sinceIso);
      recent = count ?? 0;
    }
    return { total: (total ?? 0) + SEED_GENOME.length, recent };
  } catch (err) {
    console.error('[ceis] countGenomeEntries exception:', err);
    return { total: SEED_GENOME.length, recent: 0 };
  }
}
