import type { GapAnalysis, GenomeEntry, Principle } from '@/lib/ceis/types';
import { similarity } from '@/lib/ceis/util';

/**
 * Cathedral Gap Analysis — compares every extracted principle against the
 * current genome (capabilities, decisions, prior ideas) and classifies it.
 * Pure and deterministic: same principle + same genome → same verdict.
 */

/** Similarity at/above which a principle is "the same thing" as a capability. */
export const EXISTS_THRESHOLD = 0.55;
/** Similarity at/above which it overlaps an existing capability. */
export const PARTIAL_THRESHOLD = 0.3;

function principleText(p: Principle): string {
  return `${p.principle} ${p.what_happened} ${p.why_it_worked}`;
}

function genomeText(e: GenomeEntry): string {
  return `${e.title} ${e.summary} ${e.tags.join(' ')}`;
}

export function analyzeGap(
  principle: Principle,
  genome: GenomeEntry[]
): GapAnalysis {
  const text = principleText(principle);

  let best: { entry: GenomeEntry; score: number } | null = null;
  for (const entry of genome) {
    const score = similarity(text, genomeText(entry));
    if (!best || score > best.score) best = { entry, score };
  }

  const matched = best && best.score >= PARTIAL_THRESHOLD ? best.entry : null;
  const score = best?.score ?? 0;

  if (matched && score >= EXISTS_THRESHOLD) {
    return {
      principle_id: principle.id,
      status: 'already-exists',
      matched_capability: matched.title,
      similarity: score,
      rationale: `Strong overlap (${(score * 100).toFixed(0)}%) with genome entry "${matched.title}" (${matched.kind}).`,
    };
  }

  if (matched) {
    return {
      principle_id: principle.id,
      status: 'partially-exists',
      matched_capability: matched.title,
      similarity: score,
      rationale: `Partial overlap (${(score * 100).toFixed(0)}%) with "${matched.title}" — the principle may extend it rather than duplicate it.`,
    };
  }

  // Nothing similar in the genome. High-difficulty/low-applicability ideas
  // are parked as future opportunities instead of immediate missions.
  const isFuture =
    !principle.applies_to_euro_ai ||
    (principle.implementation_difficulty >= 4 && principle.expected_roi <= 2);

  if (isFuture) {
    return {
      principle_id: principle.id,
      status: 'future-opportunity',
      matched_capability: null,
      similarity: score,
      rationale:
        'No genome overlap, but applicability is indirect or effort/ROI is currently unfavorable — parked for future evaluation.',
    };
  }

  return {
    principle_id: principle.id,
    status: 'missing',
    matched_capability: null,
    similarity: score,
    rationale: 'No meaningful overlap with any genome entry — a genuine gap.',
  };
}

export function analyzeGaps(
  principles: Principle[],
  genome: GenomeEntry[]
): GapAnalysis[] {
  return principles.map((p) => analyzeGap(p, genome));
}
