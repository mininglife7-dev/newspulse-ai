/**
 * GLO Dashboard block.
 *
 * Aggregates the genome + registry into the numbers the Founder needs to answer
 * one question: "Is the organism actually learning?"
 *
 * Every figure here is computed from real ledger records. Nothing is hard-coded
 * or optimistic — if the genome is empty, the block honestly reports zeros and
 * `unknown`. That property is locked by Phase 7 tests.
 */

import { deriveMaturity, findFabricatedMaturity, listOrgans } from './organs';
import { recommendAllTransfers } from './transfer';
import type { LearningGenome } from './genome';
import type {
  ConfidenceLevel,
  Maturity,
  OrganId,
  TransferRecommendation,
} from './types';

export interface OrganSummary {
  id: OrganId;
  name: string;
  earnedMaturity: Maturity;
  unknownsCount: number;
  nextBestExperiment: string;
}

export interface DashboardBlock {
  generatedAt: string;
  totalOrgans: number;
  /** Organs whose loop is in motion: at least one proposed/testing hypothesis. */
  activeLearningLoops: number;
  activeHypotheses: number;
  supportedHypotheses: number;
  rejectedHypotheses: number;
  retiredHypotheses: number;
  /** Rejected + retired — the memory the organism refuses to erase. */
  preservedHypotheses: number;
  evidenceGenerated: number;
  learningsGenerated: number;
  confidenceDistribution: Record<ConfidenceLevel, number>;
  /** Declared unknowns across organs + organs still at `unknown` maturity. */
  unknownTerritory: {
    declaredUnknowns: number;
    organsAtUnknownMaturity: number;
  };
  transferableLessons: TransferRecommendation[];
  organs: OrganSummary[];
  nextBestOrganismExperiment: string;
  /** Integrity flag: true only if no organ declares more maturity than it earned. */
  integrityOk: boolean;
}

const MATURITY_RANK: Record<Maturity, number> = {
  unknown: 0,
  seed: 1,
  developing: 2,
  proven: 3,
};

/** Build the dashboard block from a genome. Pure read — never mutates anything. */
export function buildDashboardBlock(
  genome: LearningGenome,
  at: string
): DashboardBlock {
  const organs = listOrgans();
  const hypotheses = genome.allHypotheses();

  const activeHypotheses = hypotheses.filter(
    (h) => h.status === 'proposed' || h.status === 'testing'
  );
  const supported = hypotheses.filter((h) => h.status === 'supported');
  const rejected = hypotheses.filter((h) => h.status === 'rejected');
  const retired = hypotheses.filter((h) => h.status === 'retired');

  const activeLoopOrgans = new Set(activeHypotheses.map((h) => h.organId));

  const confidenceDistribution: Record<ConfidenceLevel, number> = {
    unknown: 0,
    low: 0,
    moderate: 0,
    high: 0,
  };
  for (const h of hypotheses) {
    // Confidence is re-derived from evidence, not read from a cached field.
    confidenceDistribution[genome.confidenceFor(h.id).level] += 1;
  }

  const organSummaries: OrganSummary[] = organs.map((organ) => ({
    id: organ.id,
    name: organ.name,
    earnedMaturity: deriveMaturity(organ.id, genome),
    unknownsCount: organ.unknowns.length,
    nextBestExperiment: organ.nextBestExperiment,
  }));

  const declaredUnknowns = organs.reduce(
    (sum, o) => sum + o.unknowns.length,
    0
  );
  const organsAtUnknownMaturity = organSummaries.filter(
    (o) => o.earnedMaturity === 'unknown'
  ).length;

  const transferableLessons = recommendAllTransfers(genome, at);

  return {
    generatedAt: at,
    totalOrgans: organs.length,
    activeLearningLoops: activeLoopOrgans.size,
    activeHypotheses: activeHypotheses.length,
    supportedHypotheses: supported.length,
    rejectedHypotheses: rejected.length,
    retiredHypotheses: retired.length,
    preservedHypotheses: rejected.length + retired.length,
    evidenceGenerated: genome.allEvidence().length,
    learningsGenerated: genome.allLearnings().length,
    confidenceDistribution,
    unknownTerritory: {
      declaredUnknowns,
      organsAtUnknownMaturity,
    },
    transferableLessons,
    organs: organSummaries,
    nextBestOrganismExperiment: chooseOrganismExperiment(organSummaries),
    integrityOk: findFabricatedMaturity(genome).length === 0,
  };
}

/**
 * Choose the single highest-leverage next experiment for the whole organism:
 * advance the least-mature organ that the most other organs depend on. Ties
 * break deterministically by registry order, so the result is reproducible.
 */
function chooseOrganismExperiment(summaries: OrganSummary[]): string {
  const organs = listOrgans();
  const dependents = new Map<OrganId, number>();
  for (const organ of organs) {
    for (const dep of organ.dependencies) {
      dependents.set(dep, (dependents.get(dep) ?? 0) + 1);
    }
  }

  const ranked = [...summaries].sort((a, b) => {
    const maturityDelta =
      MATURITY_RANK[a.earnedMaturity] - MATURITY_RANK[b.earnedMaturity];
    if (maturityDelta !== 0) return maturityDelta; // least mature first
    const depDelta = (dependents.get(b.id) ?? 0) - (dependents.get(a.id) ?? 0);
    if (depDelta !== 0) return depDelta; // most depended-upon first
    return 0;
  });

  const target = ranked[0];
  if (!target)
    return 'Record the first observation for any organ to start the loop.';
  return `${target.name}: ${target.nextBestExperiment}`;
}
