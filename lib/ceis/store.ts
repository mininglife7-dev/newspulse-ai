import type {
  DnaProposal,
  DnaStatus,
  EvolutionReport,
  Observation,
  Principle,
  QualityGate,
} from '@/lib/ceis/types';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * CEIS persistence — Supabase access for observations, principles, DNA
 * proposals and reports. Follows the repo convention (lib/supabase.ts):
 * best-effort writes, logged errors, safe fallbacks — an evolution cycle
 * must never crash because the database hiccuped.
 */

// ---------------------------------------------------------------------------
// Observations & principles (upserted — re-observation is idempotent)
// ---------------------------------------------------------------------------

export async function saveObservations(
  observations: Observation[]
): Promise<boolean> {
  if (observations.length === 0) return true;
  try {
    const { error } = await getSupabaseAdmin()
      .from('ceis_observations')
      .upsert(
        observations.map((o) => ({
          id: o.id,
          collector: o.collector,
          category: o.category,
          title: o.title,
          url: o.url,
          source: o.source,
          observed_at: o.observed_at,
          published_at: o.published_at,
          evidence: o.evidence,
          confidence: o.confidence,
        })),
        { onConflict: 'id' }
      );
    if (error) {
      console.error('[ceis] saveObservations error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[ceis] saveObservations exception:', err);
    return false;
  }
}

export async function savePrinciples(
  principles: Principle[]
): Promise<boolean> {
  if (principles.length === 0) return true;
  try {
    const { error } = await getSupabaseAdmin()
      .from('ceis_principles')
      .upsert(
        principles.map((p) => ({ id: p.id, data: p })),
        { onConflict: 'id' }
      );
    if (error) {
      console.error('[ceis] savePrinciples error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[ceis] savePrinciples exception:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// DNA proposals
// ---------------------------------------------------------------------------

interface ProposalRow {
  id: string;
  code: string;
  status: DnaStatus;
  data: DnaProposal;
  created_at: string;
  updated_at: string;
}

export async function saveProposals(
  proposals: DnaProposal[]
): Promise<boolean> {
  if (proposals.length === 0) return true;
  try {
    const { error } = await getSupabaseAdmin()
      .from('ceis_dna_proposals')
      .upsert(
        proposals.map((p) => ({
          id: p.id,
          code: p.code,
          status: p.status,
          data: p,
        })),
        // New cycles must not clobber founder decisions on existing proposals:
        // ignoreDuplicates skips rows whose id already exists.
        { onConflict: 'id', ignoreDuplicates: true }
      );
    if (error) {
      console.error('[ceis] saveProposals error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[ceis] saveProposals exception:', err);
    return false;
  }
}

export async function listProposals(
  status?: DnaStatus
): Promise<DnaProposal[]> {
  try {
    let query = getSupabaseAdmin()
      .from('ceis_dna_proposals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) {
      console.error('[ceis] listProposals error:', error);
      return [];
    }
    return ((data ?? []) as ProposalRow[]).map((row) => ({
      ...row.data,
      status: row.status, // column is authoritative (founder actions update it)
    }));
  } catch (err) {
    console.error('[ceis] listProposals exception:', err);
    return [];
  }
}

export async function getProposal(id: string): Promise<DnaProposal | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('ceis_dna_proposals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as ProposalRow;
    return { ...row.data, status: row.status };
  } catch (err) {
    console.error('[ceis] getProposal exception:', err);
    return null;
  }
}

export async function updateProposal(
  id: string,
  changes: { status?: DnaStatus; gates?: QualityGate[] }
): Promise<DnaProposal | null> {
  const current = await getProposal(id);
  if (!current) return null;

  const next: DnaProposal = {
    ...current,
    status: changes.status ?? current.status,
    gates: changes.gates ?? current.gates,
  };

  try {
    const { error } = await getSupabaseAdmin()
      .from('ceis_dna_proposals')
      .update({
        status: next.status,
        data: next,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) {
      console.error('[ceis] updateProposal error:', error);
      return null;
    }
    return next;
  } catch (err) {
    console.error('[ceis] updateProposal exception:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function saveReport(report: EvolutionReport): Promise<boolean> {
  try {
    const { error } = await getSupabaseAdmin().from('ceis_reports').upsert(
      {
        id: report.id,
        week: report.week,
        generated_at: report.generated_at,
        markdown: report.markdown,
        stats: report.stats,
        overall_evolution_score: report.overall_evolution_score,
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.error('[ceis] saveReport error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[ceis] saveReport exception:', err);
    return false;
  }
}

export async function getLatestReport(): Promise<EvolutionReport | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('ceis_reports')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data as EvolutionReport;
  } catch (err) {
    console.error('[ceis] getLatestReport exception:', err);
    return null;
  }
}

export async function listReports(limit = 12): Promise<EvolutionReport[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('ceis_reports')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('[ceis] listReports error:', error);
      return [];
    }
    return (data ?? []) as EvolutionReport[];
  } catch (err) {
    console.error('[ceis] listReports exception:', err);
    return [];
  }
}
