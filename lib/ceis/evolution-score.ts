import type {
  EvolutionScore,
  EvolutionScoreDimensions,
  GapAnalysis,
  Principle,
} from '@/lib/ceis/types';
import { clamp, toScore5 } from '@/lib/ceis/util';

/**
 * Evolution Score — one number (0..100) that ranks every proposal.
 *
 * Pure weighted model. Benefit dimensions push the score up; cost
 * dimensions (engineering, maintenance, complexity, risk) are inverted.
 * The final score is scaled by evidence confidence: a brilliant idea with
 * weak evidence must not outrank a solid idea with strong evidence.
 */

export const WEIGHTS: Record<
  keyof Omit<EvolutionScoreDimensions, 'confidence'>,
  number
> = {
  customer_value: 0.2,
  launch_impact: 0.15,
  innovation: 0.1,
  strategic_alignment: 0.15,
  engineering_cost: 0.1,
  maintenance_cost: 0.05,
  complexity: 0.05,
  risk: 0.1,
  roi: 0.1,
};

const COST_DIMENSIONS = new Set([
  'engineering_cost',
  'maintenance_cost',
  'complexity',
  'risk',
]);

/** Score a full dimension set → 0..100. Pure. */
export function computeEvolutionScore(
  dimensions: EvolutionScoreDimensions
): EvolutionScore {
  let weighted = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(WEIGHTS) as Array<
    [keyof typeof WEIGHTS, number]
  >) {
    const raw = dimensions[key];
    // Normalize 1..5 → 0..1; invert cost dimensions so 5 (expensive) → 0.
    const normalized = (raw - 1) / 4;
    const value = COST_DIMENSIONS.has(key) ? 1 - normalized : normalized;
    weighted += value * weight;
    totalWeight += weight;
  }

  const base = weighted / totalWeight; // 0..1
  // Confidence scaling: full confidence keeps the score; zero evidence halves it.
  const confidence = clamp(dimensions.confidence, 0, 1);
  const overall = Math.round(base * (0.5 + 0.5 * confidence) * 100);

  return { dimensions, overall: clamp(overall, 0, 100) };
}

/**
 * Derive score dimensions from a validated principle + its gap analysis.
 * Deterministic mapping — the LLM already provided the 1..5 judgments.
 */
export function scorePrinciple(
  principle: Principle,
  gap: GapAnalysis
): EvolutionScore {
  // Missing capabilities move launch readiness most; partial overlaps less.
  const launchImpact =
    gap.status === 'missing'
      ? principle.business_value
      : gap.status === 'partially-exists'
        ? toScore5(principle.business_value - 1)
        : 2;

  // Strategic alignment: direct product applicability beats generic lessons.
  const alignment = toScore5(
    (principle.applies_to_euro_ai ? 3 : 1) +
      (principle.applies_to_cathedral ? 1 : 0) +
      (gap.status === 'missing' ? 1 : 0)
  );

  return computeEvolutionScore({
    customer_value: principle.estimated_customer_value,
    launch_impact: launchImpact,
    innovation: gap.status === 'missing' ? 4 : 2,
    strategic_alignment: alignment,
    engineering_cost: principle.engineering_complexity,
    maintenance_cost: principle.engineering_complexity, // proxy until measured
    complexity: principle.implementation_difficulty,
    risk: principle.risk,
    confidence: principle.confidence,
    roi: principle.expected_roi,
  });
}

/** Mean overall score across proposals — the cycle-level Evolution Score. */
export function overallEvolutionScore(scores: EvolutionScore[]): number {
  if (scores.length === 0) return 0;
  return Math.round(
    scores.reduce((sum, s) => sum + s.overall, 0) / scores.length
  );
}
