/**
 * GLO Knowledge Transfer Engine.
 *
 * When one organ learns a principle, another organ may benefit. This engine
 * CLASSIFIES that possibility and RECOMMENDS a transfer — it never applies one.
 *
 * Hard rule (locked by Phase 7 tests): producing a recommendation must not
 * mutate the target organ, the genome, or anyone's confidence. A transfer is
 * an inert suggestion until a human/organ explicitly accepts it.
 *
 * Worked examples from the mission:
 *  - VAJRA learns stronger hypothesis validation -> EURO AI may reuse it for
 *    compliance evidence.
 *  - EURO AI learns better audit trails -> VAJRA may reuse them for trading
 *    research records.
 *  - Founder Academy learns better explanation methods -> Governor may reuse
 *    them for founder briefs.
 */

import { isSuccess } from './confidence';
import type { LearningGenome } from './genome';
import type {
  ConfidenceLevel,
  Learning,
  OrganId,
  TransferRecommendation,
} from './types';

/** A hand-curated map of which organs plausibly benefit from which source. */
const AFFINITY: Array<{
  from: OrganId;
  to: OrganId;
  theme: RegExp;
  rationale: string;
}> = [
  {
    from: 'vajra',
    to: 'euro-ai',
    theme: /valid|hypothes|rigor|test|falsif/i,
    rationale:
      'Stronger hypothesis validation from market research can harden compliance evidence.',
  },
  {
    from: 'euro-ai',
    to: 'vajra',
    theme: /audit|trail|record|provenance|evidence/i,
    rationale:
      'Better audit trails can improve the integrity of trading research records.',
  },
  {
    from: 'founder-academy',
    to: 'governor',
    theme: /explain|teach|clarit|narrat|brief/i,
    rationale:
      'Clearer explanation methods can sharpen Governor founder briefs.',
  },
  {
    from: 'governor',
    to: 'founder-academy',
    theme: /verif|evidence|discipline|process/i,
    rationale:
      'Verification discipline can make Academy lessons more trustworthy.',
  },
];

let transferCounter = 0;
function nextTransferId(): string {
  transferCounter += 1;
  return `xfer_${transferCounter.toString(36)}`;
}

/**
 * Recommend transfers for a single learning. PURE with respect to state:
 * it reads the genome to estimate confidence but writes nothing anywhere.
 * Every returned recommendation starts life as `recommended` — inert.
 */
export function recommendTransfers(
  learning: Learning,
  genome: LearningGenome,
  at: string
): TransferRecommendation[] {
  const confidence = confidenceOfSource(learning, genome);

  // A learning built on an unearned belief is not safe to propagate.
  if (!isSuccess(confidence)) return [];

  const matches = AFFINITY.filter(
    (rule) =>
      rule.from === learning.organId &&
      rule.to !== learning.organId &&
      rule.theme.test(learning.principle)
  );

  return matches.map((rule) => ({
    id: nextTransferId(),
    learningId: learning.id,
    fromOrgan: rule.from,
    toOrgan: rule.to,
    rationale: rule.rationale,
    confidence,
    status: 'recommended' as const,
    createdAt: at,
  }));
}

/** Recommend transfers across every learning currently in the genome. */
export function recommendAllTransfers(
  genome: LearningGenome,
  at: string
): TransferRecommendation[] {
  return genome
    .allLearnings()
    .flatMap((learning) => recommendTransfers(learning, genome, at));
}

/**
 * Record a human/organ decision on a recommendation. Returns a NEW object —
 * the input is never mutated, and nothing about the target organ changes.
 * Accepting a transfer authorizes follow-up work; it does not perform it.
 */
export function decideTransfer(
  recommendation: TransferRecommendation,
  decision: 'accepted' | 'rejected',
  at: string,
  note?: string
): TransferRecommendation {
  return {
    ...recommendation,
    status: decision,
    decidedAt: at,
    decisionNote: note,
  };
}

/** Confidence of the hypothesis that produced this learning. */
function confidenceOfSource(
  learning: Learning,
  genome: LearningGenome
): ConfidenceLevel {
  const hypothesis = genome.getHypothesis(learning.sourceHypothesisId);
  if (!hypothesis) return 'unknown';
  return genome.confidenceFor(hypothesis.id).level;
}
