import type {
  GapAnalysis,
  GenomeEntry,
  ImmuneRejection,
  ImmuneVerdict,
  Principle,
} from '@/lib/ceis/types';
import { similarity } from '@/lib/ceis/util';

/**
 * Immune System — the Cathedral's defense against bad DNA.
 *
 * Pure rule engine: every rejection names its rule and explains WHY, and
 * rejected ideas are remembered in the genome so they are never rediscovered
 * without new evidence. Rules are evaluated exhaustively (a principle can be
 * rejected for several reasons at once — all are reported).
 */

/** Minimum blended confidence for an idea to be considered evidenced. */
export const MIN_EVIDENCE_CONFIDENCE = 0.55;
/** Similarity to a previously rejected idea that re-triggers rejection. */
export const REJECTED_SIMILARITY_THRESHOLD = 0.5;
/** Confidence uplift over the past rejection required to re-open an idea. */
export const NEW_EVIDENCE_UPLIFT = 0.15;

export interface ImmuneContext {
  gap: GapAnalysis;
  /** Prior rejected ideas from the genome (kind = 'rejected-idea'). */
  rejectedIdeas: GenomeEntry[];
  /** Titles of DNA proposals currently in the queue / under review. */
  activeWork: string[];
}

export function runImmuneSystem(
  principle: Principle,
  ctx: ImmuneContext
): ImmuneVerdict {
  const rejections: ImmuneRejection[] = [];

  // 1. Already exists in the genome → duplicate DNA is forbidden.
  if (ctx.gap.status === 'already-exists') {
    rejections.push({
      rule: 'already-exists',
      reason: `The Cathedral already has this: ${ctx.gap.rationale}`,
    });
  }

  // 2. Duplicates active parallel work → protect in-flight engineering.
  const duplicateWork = ctx.activeWork.find(
    (title) => similarity(principle.principle, title) >= 0.5
  );
  if (duplicateWork) {
    rejections.push({
      rule: 'duplicate-of-active-work',
      reason: `Overlaps DNA already in the queue: "${duplicateWork}". Parallel work is protected.`,
    });
  }

  // 3. Previously rejected → don't rediscover without meaningfully new evidence.
  for (const past of ctx.rejectedIdeas) {
    const sim = similarity(
      principle.principle,
      `${past.title} ${past.summary}`
    );
    if (sim >= REJECTED_SIMILARITY_THRESHOLD) {
      const pastConfidence = extractRecordedConfidence(past.evidence);
      if (principle.confidence < pastConfidence + NEW_EVIDENCE_UPLIFT) {
        rejections.push({
          rule: 'previously-rejected',
          reason: `Rejected before as "${past.title}" and current evidence (confidence ${principle.confidence.toFixed(2)}) is not meaningfully stronger than it was (${pastConfidence.toFixed(2)}). Bring new evidence to reopen.`,
        });
      }
      break;
    }
  }

  // 4. Architecture conflict → serverless-first: nothing that needs daemons.
  const text =
    `${principle.principle} ${principle.why_it_worked}`.toLowerCase();
  const conflictMarkers = [
    'long-running daemon',
    'background daemon',
    'dedicated server',
    'self-hosted gpu',
    'kubernetes cluster',
    'stateful service',
  ];
  const conflict = conflictMarkers.find((m) => text.includes(m));
  if (conflict) {
    rejections.push({
      rule: 'architecture-conflict',
      reason: `Requires "${conflict}", conflicting with the serverless-first architecture decision (Vercel functions + Supabase only).`,
    });
  }

  // 5. Debt / reliability / complexity — high implementation cost with weak payoff.
  if (principle.engineering_complexity >= 4 && principle.expected_roi <= 2) {
    rejections.push({
      rule: 'technical-debt',
      reason: `Complexity ${principle.engineering_complexity}/5 against ROI ${principle.expected_roi}/5 — would add debt faster than value.`,
    });
  }
  if (principle.risk >= 4 && principle.estimated_customer_value <= 3) {
    rejections.push({
      rule: 'reliability-risk',
      reason: `Risk ${principle.risk}/5 outweighs customer value ${principle.estimated_customer_value}/5 — reliability is a feature the Cathedral does not trade away.`,
    });
  }
  if (
    principle.implementation_difficulty >= 4 &&
    principle.estimated_customer_value <= 2
  ) {
    rejections.push({
      rule: 'unnecessary-complexity',
      reason: `Difficulty ${principle.implementation_difficulty}/5 for customer value ${principle.estimated_customer_value}/5 — complexity must buy customer value.`,
    });
  }

  // 6. Evidence gate.
  if (principle.confidence < MIN_EVIDENCE_CONFIDENCE) {
    rejections.push({
      rule: 'insufficient-evidence',
      reason: `Confidence ${principle.confidence.toFixed(2)} is below the evidence threshold ${MIN_EVIDENCE_CONFIDENCE}. Needs corroboration from more or stronger sources.`,
    });
  }

  // 7. Hype filter — trends with no customer value do not enter the Cathedral.
  if (
    principle.category === 'technology-trend' &&
    principle.estimated_customer_value <= 2 &&
    principle.business_value <= 2
  ) {
    rejections.push({
      rule: 'hype-without-customer-value',
      reason:
        'Trending signal with customer value ≤2/5 and business value ≤2/5 — hype without demonstrated customer benefit.',
    });
  }

  return {
    principle_id: principle.id,
    accepted: rejections.length === 0,
    rejections,
  };
}

/**
 * Rejected-idea genome entries record the confidence at rejection time as
 * "confidence=0.62" inside their evidence field; parse it back out.
 * Exported for tests.
 */
export function extractRecordedConfidence(evidence: string | null): number {
  const m = evidence?.match(/confidence=([0-9.]+)/);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) ? n : 0.5;
}
