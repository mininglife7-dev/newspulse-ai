import { countGenomeEntries } from '@/lib/ceis/genome';
import { getLatestReport, listProposals } from '@/lib/ceis/store';
import type {
  DnaProposal,
  EvolutionDashboard,
  EvolutionReport,
} from '@/lib/ceis/types';
import { clamp } from '@/lib/ceis/util';

/**
 * Founder Evolution Dashboard — aggregates CEIS state into one payload.
 * `computeDashboard` is pure (exported for tests); `buildDashboard` wires
 * in the data sources.
 */

function meanDimension(
  proposals: DnaProposal[],
  pick: (p: DnaProposal) => number
): number {
  if (proposals.length === 0) return 0;
  return proposals.reduce((sum, p) => sum + pick(p), 0) / proposals.length;
}

/** Convert a mean 1..5 dimension to 0..100. */
function toPercent(score5: number): number {
  if (score5 <= 0) return 0;
  return Math.round(((score5 - 1) / 4) * 100);
}

export function computeDashboard(args: {
  proposals: DnaProposal[];
  latestReport: EvolutionReport | null;
  genomeTotal: number;
  genomeRecent: number;
  now: Date;
}): EvolutionDashboard {
  const { proposals, latestReport, genomeTotal, genomeRecent, now } = args;

  const queue = proposals.filter((p) => p.status === 'proposed');
  const approved = proposals.filter((p) => p.status === 'approved');
  const rejectedDna = proposals.filter((p) => p.status === 'rejected');
  const underReview = proposals.filter((p) => p.status === 'under-review');
  const active = [...queue, ...underReview, ...approved];

  // Architecture health: perfect until evidence says otherwise. Failed
  // quality gates on live proposals and an overgrown queue both erode it.
  const failedGates = active.reduce(
    (sum, p) => sum + p.gates.filter((g) => g.status === 'failed').length,
    0
  );
  const backlogPressure = Math.max(0, queue.length - 10);
  const architectureHealth = clamp(
    100 - failedGates * 15 - backlogPressure * 2,
    0,
    100
  );

  return {
    ok: true,
    generated_at: now.toISOString(),
    evolution_score: latestReport?.overall_evolution_score ?? 0,
    architecture_health: architectureHealth,
    dna_queue: queue,
    approved,
    rejected: rejectedDna,
    under_review: underReview,
    evidence_confidence: Math.round(
      meanDimension(active, (p) => p.evolution_score.dimensions.confidence) *
        100
    ),
    launch_readiness_impact: toPercent(
      meanDimension(active, (p) => p.evolution_score.dimensions.launch_impact)
    ),
    customer_impact: toPercent(
      meanDimension(active, (p) => p.evolution_score.dimensions.customer_value)
    ),
    roi_estimate: toPercent(
      meanDimension(active, (p) => p.evolution_score.dimensions.roi)
    ),
    knowledge_entries: genomeTotal,
    learning_velocity: genomeRecent,
    latest_report: latestReport,
  };
}

export async function buildDashboard(): Promise<EvolutionDashboard> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const [proposals, latestReport, genomeCounts] = await Promise.all([
    listProposals(),
    getLatestReport(),
    countGenomeEntries(sevenDaysAgo),
  ]);
  return computeDashboard({
    proposals,
    latestReport,
    genomeTotal: genomeCounts.total,
    genomeRecent: genomeCounts.recent,
    now,
  });
}
