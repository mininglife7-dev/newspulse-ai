import type {
  DnaProposal,
  EvolutionScoreDimensions,
  GapAnalysis,
  Observation,
  Principle,
} from '@/lib/ceis/types';
import { computeEvolutionScore } from '@/lib/ceis/evolution-score';
import { freshGates } from '@/lib/ceis/dna-generator';
import { stableId } from '@/lib/ceis/util';

export const NOW = new Date('2026-07-09T12:00:00.000Z');

export function makeObservation(
  overrides: Partial<Observation> = {}
): Observation {
  const title =
    overrides.title ?? 'An AI startup shipped memory-augmented agents';
  return {
    id: stableId('test-obs', title),
    collector: 'hacker-news',
    category: 'technology-trend',
    title,
    url: 'https://example.com/story',
    source: 'example.com',
    observed_at: NOW.toISOString(),
    published_at: null,
    evidence: '450 points, 200 comments',
    confidence: 0.8,
    ...overrides,
  };
}

export function makePrinciple(overrides: Partial<Principle> = {}): Principle {
  const principle =
    overrides.principle ??
    'Give users persistent context memory across sessions';
  return {
    id: stableId('test-principle', principle),
    observation_ids: ['obs1'],
    what_happened: 'A product added session memory and engagement doubled.',
    why_it_worked: 'Users hate repeating themselves; memory compounds value.',
    principle,
    category: 'product-innovation',
    applies_to_euro_ai: true,
    applies_to_cathedral: false,
    estimated_customer_value: 4,
    engineering_complexity: 2,
    business_value: 4,
    implementation_difficulty: 2,
    risk: 2,
    expected_roi: 4,
    confidence: 0.8,
    evidence: ['https://example.com — 450 points'],
    ...overrides,
  };
}

export function makeGap(overrides: Partial<GapAnalysis> = {}): GapAnalysis {
  return {
    principle_id: 'p1',
    status: 'missing',
    matched_capability: null,
    similarity: 0.1,
    rationale: 'No meaningful overlap with any genome entry — a genuine gap.',
    ...overrides,
  };
}

export function makeDimensions(
  overrides: Partial<EvolutionScoreDimensions> = {}
): EvolutionScoreDimensions {
  return {
    customer_value: 4,
    launch_impact: 4,
    innovation: 3,
    strategic_alignment: 4,
    engineering_cost: 2,
    maintenance_cost: 2,
    complexity: 2,
    risk: 2,
    confidence: 0.8,
    roi: 4,
    ...overrides,
  };
}

export function makeProposal(
  overrides: Partial<DnaProposal> = {}
): DnaProposal {
  return {
    id: stableId('test-dna', overrides.title ?? 'proposal'),
    code: 'DNA-CTEST1',
    title: 'Add semantic memory to search',
    principle_id: 'p1',
    mission: 'Apply the memory principle.',
    problem_statement: 'Users repeat searches.',
    business_value: 'Retention.',
    architecture: 'API route + Supabase.',
    technical_design: 'TBD.',
    dependencies: [],
    implementation_plan: ['design', 'build', 'test'],
    testing_plan: ['unit tests'],
    rollback_plan: 'Revert commit.',
    metrics: ['retention'],
    priority: 'medium',
    owner: 'founder',
    estimated_effort: '2 days',
    expected_customer_impact: 'High.',
    evolution_score: computeEvolutionScore(makeDimensions()),
    status: 'proposed',
    gates: freshGates(),
    evidence: ['https://example.com'],
    created_at: NOW.toISOString(),
    ...overrides,
  };
}
