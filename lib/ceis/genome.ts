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
    'Multi-tenant workspaces with auth and RBAC',
    'Supabase Auth (email + magic links) with @supabase/ssr cookie sessions, workspace/company/profile onboarding, role-based membership and RLS-enforced tenant isolation (middleware.ts, lib/auth.ts, app/auth, app/workspace).',
    [
      'auth',
      'multi-tenant',
      'workspace',
      'rbac',
      'rls',
      'supabase',
      'session',
      'security',
    ]
  ),
  seed(
    'capability',
    'AI system inventory',
    'Organizations catalog their AI systems — name, type, vendor, purpose, data categories, status — in the ai_systems table with per-workspace isolation (app/inventory, /api/ai-systems).',
    ['inventory', 'ai-systems', 'catalog', 'vendors', 'registry']
  ),
  seed(
    'capability',
    'EU AI Act risk assessment and obligations',
    'Risk classification per AI system with mapped EU AI Act obligations, assessment-obligation links and an obligations management page with search and filtering (risk_assessments, obligations tables, /api/risk-assessments).',
    [
      'eu-ai-act',
      'risk',
      'assessment',
      'classification',
      'obligations',
      'compliance',
      'regulation',
    ]
  ),
  seed(
    'capability',
    'Compliance evidence and remediation tracking',
    'Evidence collection and remediation plans per obligation, with dashboards showing readiness state and obligation metrics (evidence, remediation_plans tables, compliance dashboard UI).',
    [
      'evidence',
      'remediation',
      'compliance',
      'documentation',
      'tracking',
      'dashboard',
    ]
  ),
  seed(
    'capability',
    'Production health and deployment monitoring',
    'Health, production-health, error-rate, blocking-conditions and verify-deployment API endpoints report system state truthfully for uptime probes and launch gates.',
    ['health', 'monitoring', 'observability', 'deployment', 'uptime', 'api']
  ),
  seed(
    'capability',
    'Dark polished UI with PWA support',
    'Tailwind dark theme, lucide-react icons, loading skeletons, error boundaries, installable PWA with service worker, privacy/terms pages.',
    ['ui', 'tailwind', 'dark-theme', 'ux', 'frontend', 'pwa']
  ),
  seed(
    'capability',
    'CI, test suites and Vercel auto-deploy',
    'GitHub Actions pipeline (lint, type-check, vitest unit tests, build, smoke suite, Playwright E2E) and Vercel Git-integration deploys: main to production, PRs to previews.',
    [
      'ci',
      'cd',
      'vercel',
      'github-actions',
      'deploy',
      'testing',
      'vitest',
      'playwright',
    ]
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
    'RLS is the security boundary',
    'Row-Level Security policies in Postgres enforce multi-tenant isolation; middleware route protection is a UX concern only. Server code must never trust getSession() without getUser() validation.',
    ['architecture', 'security', 'rls', 'multi-tenant', 'postgres']
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
