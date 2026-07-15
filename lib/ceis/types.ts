/**
 * Cathedral Evolution Intelligence System (CEIS) — domain types.
 *
 * CEIS is the Cathedral's evolution engine: it observes public knowledge,
 * extracts reusable principles (never IP, never code), validates them
 * against the Cathedral's own genome, and proposes evidence-based DNA
 * missions. These types are the shared vocabulary of every CEIS organ.
 */

// ---------------------------------------------------------------------------
// Observations — raw signals gathered by research collectors
// ---------------------------------------------------------------------------

export type CollectorId =
  | 'github-trending'
  | 'hacker-news'
  | 'arxiv'
  | 'reddit'
  | 'product-hunt'
  | 'engineering-blogs'
  | 'ai-news'
  | 'regulatory'
  | 'open-source'
  | 'conference-talks'
  | 'customer-feedback';

export type ObservationCategory =
  | 'ai-startups'
  | 'engineering-practice'
  | 'open-source'
  | 'research'
  | 'product-innovation'
  | 'governance-regulation'
  | 'customer-insight'
  | 'technology-trend'
  | 'competitor';

/** A single public-knowledge signal. Only metadata + short excerpts — never scraped IP. */
export interface Observation {
  /** Stable content hash (collector + url) so re-observations dedupe. */
  id: string;
  collector: CollectorId;
  category: ObservationCategory;
  title: string;
  url: string;
  /** Human-readable origin, e.g. "news.ycombinator.com" or "arXiv cs.AI". */
  source: string;
  /** When CEIS observed it (ISO 8601). */
  observed_at: string;
  /** When the source published it, if known. */
  published_at: string | null;
  /** Short public excerpt or signal metrics (stars, points, comments). */
  evidence: string;
  /** 0..1 — how much CEIS trusts this signal (source quality × signal strength). */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Principles — the reusable lesson behind an observation
// ---------------------------------------------------------------------------

/** 1 (very low) .. 5 (very high) — coarse scores keep the LLM honest. */
export type Score5 = 1 | 2 | 3 | 4 | 5;

export interface Principle {
  id: string;
  observation_ids: string[];
  /** What happened, factually. */
  what_happened: string;
  /** Why it worked — the mechanism. */
  why_it_worked: string;
  /** The extracted, source-independent principle. */
  principle: string;
  category: ObservationCategory;
  applies_to_euro_ai: boolean;
  applies_to_cathedral: boolean;
  estimated_customer_value: Score5;
  engineering_complexity: Score5;
  business_value: Score5;
  implementation_difficulty: Score5;
  risk: Score5;
  expected_roi: Score5;
  /** 0..1 — evidence-weighted confidence. */
  confidence: number;
  /** Evidence trail: URLs + excerpts backing the principle. */
  evidence: string[];
}

// ---------------------------------------------------------------------------
// Gap analysis — principle vs. current Cathedral genome
// ---------------------------------------------------------------------------

export type GapStatus =
  'already-exists' | 'partially-exists' | 'missing' | 'future-opportunity';

export interface GapAnalysis {
  principle_id: string;
  status: GapStatus;
  /** Best-matching genome capability, if any. */
  matched_capability: string | null;
  /** 0..1 similarity to the best genome match. */
  similarity: number;
  rationale: string;
}

// ---------------------------------------------------------------------------
// Immune system — automatic rejection with reasons
// ---------------------------------------------------------------------------

export type ImmuneRule =
  | 'already-exists'
  | 'duplicate-of-active-work'
  | 'previously-rejected'
  | 'architecture-conflict'
  | 'technical-debt'
  | 'reliability-risk'
  | 'unnecessary-complexity'
  | 'insufficient-evidence'
  | 'hype-without-customer-value';

export interface ImmuneRejection {
  rule: ImmuneRule;
  reason: string;
}

export interface ImmuneVerdict {
  principle_id: string;
  accepted: boolean;
  rejections: ImmuneRejection[];
}

// ---------------------------------------------------------------------------
// Evolution score
// ---------------------------------------------------------------------------

export interface EvolutionScoreDimensions {
  customer_value: Score5;
  launch_impact: Score5;
  innovation: Score5;
  strategic_alignment: Score5;
  /** Cost dimensions: 5 = very expensive/risky (inverted when scoring). */
  engineering_cost: Score5;
  maintenance_cost: Score5;
  complexity: Score5;
  risk: Score5;
  /** 0..1 */
  confidence: number;
  roi: Score5;
}

export interface EvolutionScore {
  dimensions: EvolutionScoreDimensions;
  /** 0..100 overall. */
  overall: number;
}

// ---------------------------------------------------------------------------
// DNA proposals — full missions generated only for validated principles
// ---------------------------------------------------------------------------

export type DnaStatus = 'proposed' | 'under-review' | 'approved' | 'rejected';

export type QualityGateName =
  | 'architecture-review'
  | 'business-review'
  | 'security-review'
  | 'compliance-review'
  | 'testing-review'
  | 'founder-alignment'
  | 'customer-value-review'
  | 'evidence-review'
  | 'performance-review';

export interface QualityGate {
  name: QualityGateName;
  status: 'pending' | 'passed' | 'failed';
  notes: string | null;
}

export interface DnaProposal {
  id: string;
  /** Human code, e.g. "DNA-C0042" (C = CEIS-generated). */
  code: string;
  title: string;
  principle_id: string;
  mission: string;
  problem_statement: string;
  business_value: string;
  architecture: string;
  technical_design: string;
  dependencies: string[];
  implementation_plan: string[];
  testing_plan: string[];
  rollback_plan: string;
  metrics: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  owner: string;
  estimated_effort: string;
  expected_customer_impact: string;
  evolution_score: EvolutionScore;
  status: DnaStatus;
  gates: QualityGate[];
  evidence: string[];
  created_at: string;
}

// ---------------------------------------------------------------------------
// Knowledge genome — the Cathedral's permanent memory
// ---------------------------------------------------------------------------

export type GenomeKind =
  | 'capability'
  | 'lesson'
  | 'architecture-decision'
  | 'rejected-idea'
  | 'successful-idea'
  | 'customer-insight'
  | 'implementation-result'
  | 'performance-improvement'
  | 'technology-evaluation';

export interface GenomeEntry {
  id: string;
  kind: GenomeKind;
  title: string;
  summary: string;
  tags: string[];
  evidence: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Evolution cycle + weekly report
// ---------------------------------------------------------------------------

export interface CycleStats {
  observations: number;
  principles: number;
  accepted: number;
  rejected: number;
  dna_generated: number;
  collectors_run: number;
  collectors_failed: number;
}

export interface EvolutionCycleResult {
  id: string;
  started_at: string;
  finished_at: string;
  stats: CycleStats;
  observations: Observation[];
  principles: Principle[];
  gaps: GapAnalysis[];
  verdicts: ImmuneVerdict[];
  proposals: DnaProposal[];
  /** Rejected principles with their reasons — the "intentionally ignored" list. */
  rejected: Array<{ principle: Principle; verdict: ImmuneVerdict }>;
  /** Mean evolution score across generated proposals, 0..100. */
  overall_evolution_score: number;
}

export interface EvolutionReport {
  id: string;
  /** ISO week label, e.g. "2026-W28". */
  week: string;
  generated_at: string;
  markdown: string;
  stats: CycleStats;
  overall_evolution_score: number;
}

// ---------------------------------------------------------------------------
// Founder dashboard payload
// ---------------------------------------------------------------------------

export interface EvolutionDashboard {
  ok: boolean;
  generated_at: string;
  evolution_score: number;
  architecture_health: number;
  dna_queue: DnaProposal[];
  approved: DnaProposal[];
  rejected: DnaProposal[];
  under_review: DnaProposal[];
  evidence_confidence: number;
  launch_readiness_impact: number;
  customer_impact: number;
  roi_estimate: number;
  knowledge_entries: number;
  /** Genome entries added in the last 7 days — learning velocity. */
  learning_velocity: number;
  latest_report: EvolutionReport | null;
  error?: string;
}
