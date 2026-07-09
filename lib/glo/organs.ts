/**
 * GLO Organ Registry.
 *
 * The organism is not one product. It is a set of organs that share one genome.
 * This registry records what each organ is FOR, where its evidence comes from,
 * and — honestly — what it does not yet know.
 *
 * Non-negotiable: maturity is never fabricated. Every profile declares
 * `unknown`; real maturity is DERIVED from the genome ledger by
 * `deriveMaturity`. Unknown stays unknown until evidence says otherwise.
 */

import { isSuccess } from './confidence';
import type { LearningGenome } from './genome';
import type { Maturity, OrganId, OrganProfile } from './types';

/**
 * The seven organs of the Cathedral. Maturity is deliberately `unknown` for
 * every one of them today — none has earned a higher rating in the ledger yet.
 */
export const ORGAN_REGISTRY: readonly OrganProfile[] = [
  {
    id: 'vajra',
    name: 'VAJRA',
    mission:
      'Generate and validate market hypotheses through disciplined research.',
    evidenceSource:
      'Historical market data, backtests, and research records (no live trading).',
    learningLoop:
      'Observe market signal -> hypothesize edge -> backtest experiment -> weigh evidence -> keep or retire.',
    declaredMaturity: 'unknown',
    unknowns: [
      'Whether any proposed edge survives out-of-sample evidence.',
      'What baseline confidence threshold is right for research promotion.',
    ],
    dependencies: ['governor'],
    nextBestExperiment:
      'Record one market observation and one falsifiable hypothesis, then attach backtest evidence.',
  },
  {
    id: 'euro-ai',
    name: 'EURO AI',
    mission:
      'Turn regulatory text into defensible, evidence-backed compliance guidance.',
    evidenceSource:
      'Primary regulation, official guidance, and audited interpretation trails.',
    learningLoop:
      'Observe regulation -> hypothesize obligation -> test against sources -> record audit evidence -> confirm or reject.',
    declaredMaturity: 'unknown',
    unknowns: [
      'Which interpretations hold under adversarial review.',
      'How to score evidence quality for legal sources.',
    ],
    dependencies: ['governor'],
    nextBestExperiment:
      'Capture one regulatory obligation as a hypothesis with a citation as supporting evidence.',
  },
  {
    id: 'governor',
    name: 'Governor',
    mission:
      "Advise the Founder and operate the Cathedral's engineering organization.",
    evidenceSource:
      'Repository state, CI/deployment telemetry, and verified task outcomes.',
    learningLoop:
      'Observe operating signal -> hypothesize improvement -> ship experiment -> verify outcome -> learn or revert.',
    declaredMaturity: 'unknown',
    unknowns: [
      'Which operating decisions generalize across organs.',
      'How to quantify the confidence of an operating recommendation.',
    ],
    dependencies: [],
    nextBestExperiment:
      'Record the DNA-GLO-001 build itself as an observation and track whether the genome reduces rework.',
  },
  {
    id: 'founder-academy',
    name: 'Founder Academy',
    mission:
      'Teach the Founder and future operators through clear, tested explanations.',
    evidenceSource:
      'Explanation attempts and measured comprehension/outcome feedback.',
    learningLoop:
      'Observe a knowledge gap -> hypothesize an explanation -> teach experiment -> measure understanding -> refine or drop.',
    declaredMaturity: 'unknown',
    unknowns: [
      'Which explanation methods transfer to Governor briefs.',
      'How to measure comprehension without a live audience yet.',
    ],
    dependencies: ['governor'],
    nextBestExperiment:
      'Draft one explanation of the GLO and record whether it improves a Governor brief.',
  },
  {
    id: 'sales-engine',
    name: 'Sales Engine',
    mission:
      'Learn what genuinely moves prospects toward value (no fabricated pipeline).',
    evidenceSource:
      'Real outreach outcomes and conversion signals — none exist yet.',
    learningLoop:
      'Observe prospect response -> hypothesize what worked -> test variant -> measure conversion -> keep or retire.',
    declaredMaturity: 'unknown',
    unknowns: [
      'Everything — there are no customers or revenue to learn from yet.',
    ],
    dependencies: ['governor'],
    nextBestExperiment:
      'Define the first honest conversion signal to observe once outreach begins.',
  },
  {
    id: 'support-engine',
    name: 'Support Engine',
    mission:
      'Learn from real user problems to resolve them faster and prevent recurrence.',
    evidenceSource:
      'Support interactions and resolution outcomes — none exist yet.',
    learningLoop:
      'Observe an issue -> hypothesize a cause/fix -> test resolution -> record outcome -> confirm or reject.',
    declaredMaturity: 'unknown',
    unknowns: [
      'Everything — there are no support interactions to learn from yet.',
    ],
    dependencies: ['governor'],
    nextBestExperiment:
      'Define the first support signal to capture when the first user arrives.',
  },
  {
    id: 'future-organs',
    name: 'Future Organs',
    mission:
      'Reserved capacity for organs not yet born; keeps the registry honest about growth.',
    evidenceSource: 'None — this is deliberately empty territory.',
    learningLoop:
      'Undefined until a concrete organ is proposed with its own evidence source.',
    declaredMaturity: 'unknown',
    unknowns: [
      'Which organ the Cathedral needs next, and what its evidence source would be.',
    ],
    dependencies: [],
    nextBestExperiment:
      'Leave unknown until a real need produces a falsifiable proposal.',
  },
] as const;

const REGISTRY_BY_ID = new Map<OrganId, OrganProfile>(
  ORGAN_REGISTRY.map((organ) => [organ.id, organ])
);

export function getOrgan(id: OrganId): OrganProfile | undefined {
  return REGISTRY_BY_ID.get(id);
}

export function listOrgans(): readonly OrganProfile[] {
  return ORGAN_REGISTRY;
}

/**
 * Derive an organ's maturity from the genome — the ONLY sanctioned source of
 * maturity. Fabrication is impossible because callers cannot pass a maturity
 * in; it is computed from supported hypotheses and their evidence.
 *
 *   unknown    — nothing recorded, or nothing has earned belief
 *   seed       — observations/hypotheses exist, but none supported yet
 *   developing — at least one hypothesis is genuinely supported by evidence
 *   proven     — multiple supported hypotheses AND at least one learning minted
 */
export function deriveMaturity(
  organId: OrganId,
  genome: LearningGenome
): Maturity {
  const hypotheses = genome
    .allHypotheses()
    .filter((h) => h.organId === organId);
  const observations = genome.observationsForOrgan(organId);
  const learnings = genome.learningsForOrgan(organId);

  const supported = hypotheses.filter((h) => {
    if (h.status !== 'supported') return false;
    // Defence in depth: confirm the ledger really backs the "supported" label.
    const report = genome.confidenceFor(h.id);
    return report.hasEvidence && isSuccess(report.level);
  });

  if (supported.length >= 2 && learnings.length >= 1) return 'proven';
  if (supported.length >= 1) return 'developing';
  if (observations.length > 0 || hypotheses.length > 0) return 'seed';
  return 'unknown';
}

/**
 * Honesty guard: a declared maturity may never exceed the maturity the ledger
 * has earned. Returns the offending organs (empty array === everything honest).
 * Used by tests and can be used by CI to catch fabricated maturity.
 */
export function findFabricatedMaturity(
  genome: LearningGenome,
  organs: readonly OrganProfile[] = ORGAN_REGISTRY
): Array<{ organId: OrganId; declared: Maturity; earned: Maturity }> {
  const rank: Record<Maturity, number> = {
    unknown: 0,
    seed: 1,
    developing: 2,
    proven: 3,
  };
  const offenders: Array<{
    organId: OrganId;
    declared: Maturity;
    earned: Maturity;
  }> = [];
  for (const organ of organs) {
    const earned = deriveMaturity(organ.id, genome);
    if (rank[organ.declaredMaturity] > rank[earned]) {
      offenders.push({
        organId: organ.id,
        declared: organ.declaredMaturity,
        earned,
      });
    }
  }
  return offenders;
}
