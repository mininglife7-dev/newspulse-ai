/**
 * GLO confidence engine.
 *
 * The single rule that keeps the organism honest:
 *   confidence is a function of recorded evidence and nothing else.
 *
 * No evidence  -> `unknown`  (never success)
 * Only refuting -> stays low / drives rejection
 * The word `unknown` is load-bearing: it is NOT a synonym for zero, failure,
 * or success. It means "the organism has not earned a belief here yet."
 */

import type { ConfidenceLevel, ConfidenceReport, Evidence } from './types';

/** Net supporting weight required before a hypothesis may be called `supported`. */
export const SUPPORT_THRESHOLD = 1.5;

/** Net refuting weight required before a hypothesis may be called `rejected`. */
export const REJECT_THRESHOLD = -1.5;

/**
 * Derive a confidence report purely from evidence.
 *
 * This is the ONLY place confidence is produced. There is no setter that lets
 * a caller assert a confidence level directly.
 */
export function assessConfidence(
  evidence: readonly Evidence[]
): ConfidenceReport {
  let netWeight = 0;
  let supportingCount = 0;
  let refutingCount = 0;

  for (const e of evidence) {
    const strength = clampStrength(e.strength);
    if (e.direction === 'supporting') {
      netWeight += strength;
      supportingCount += 1;
    } else {
      netWeight -= strength;
      refutingCount += 1;
    }
  }

  const hasEvidence = evidence.length > 0;

  return {
    level: levelFor(netWeight, hasEvidence),
    netWeight,
    supportingCount,
    refutingCount,
    hasEvidence,
  };
}

/**
 * Map net evidence weight to a confidence level.
 *
 * Without evidence the answer is always `unknown`. This function can never
 * return a non-`unknown` level from an empty evidence set — that invariant is
 * what Phase 7 tests lock down.
 */
export function levelFor(
  netWeight: number,
  hasEvidence: boolean
): ConfidenceLevel {
  if (!hasEvidence) return 'unknown';
  if (netWeight >= SUPPORT_THRESHOLD) return 'high';
  if (netWeight >= 0.75) return 'moderate';
  if (netWeight > 0) return 'low';
  // Net non-positive weight, but evidence exists: belief is not earned.
  return 'unknown';
}

/** `unknown` is never a win. Use this everywhere a "did we succeed?" check is made. */
export function isSuccess(level: ConfidenceLevel): boolean {
  return level === 'high' || level === 'moderate';
}

function clampStrength(strength: number): number {
  if (Number.isNaN(strength)) return 0;
  return Math.min(1, Math.max(0, strength));
}
