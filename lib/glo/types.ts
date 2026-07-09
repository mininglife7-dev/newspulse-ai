/**
 * GLO — General Learning Organism
 * Domain-neutral core types for the shared learning genome.
 *
 * These types are intentionally free of any product/domain vocabulary
 * (no markets, no regulation, no news) so that every organ — VAJRA,
 * EURO AI, Governor, Founder Academy, Sales, Support — can reuse them.
 *
 * Governing doctrine (see docs/governance/GLO_CONSTITUTION.md):
 *   Machines execute. Tools solve. Products serve.
 *   Organisms learn. Cathedrals endure.
 */

/** Stable identifiers for the organs that share the genome. */
export type OrganId =
  | 'vajra'
  | 'euro-ai'
  | 'governor'
  | 'founder-academy'
  | 'sales-engine'
  | 'support-engine'
  | 'future-organs';

/**
 * Confidence is EARNED, never assigned. `unknown` is the honest default
 * and must never be treated as success anywhere in the system.
 */
export type ConfidenceLevel = 'unknown' | 'low' | 'moderate' | 'high';

/**
 * Maturity is DERIVED from recorded evidence, never declared. Every organ
 * starts `unknown`; it can only rise when the ledger supports it.
 */
export type Maturity = 'unknown' | 'seed' | 'developing' | 'proven';

/** Lifecycle of a hypothesis. Rejected/retired states are preserved, never erased. */
export type HypothesisStatus =
  | 'proposed' // stated, not yet tested
  | 'testing' // an experiment is gathering evidence
  | 'supported' // evidence crossed the support threshold
  | 'rejected' // evidence refuted it — preserved as a learned negative
  | 'retired'; // superseded/withdrawn — preserved for provenance

/** Which way a piece of evidence points relative to its hypothesis. */
export type EvidenceDirection = 'supporting' | 'refuting';

/** A recorded, sourced fact or signal. The raw input to learning. */
export interface Observation {
  id: string;
  organId: OrganId;
  statement: string;
  /** Where this observation came from — a URL, a log, a test, a human note. */
  source: string;
  recordedAt: string; // ISO timestamp, supplied by the caller (never invented)
}

/** A testable claim. Confidence is computed from evidence, never set directly. */
export interface Hypothesis {
  id: string;
  organId: OrganId;
  statement: string;
  status: HypothesisStatus;
  /** Optional link back to the observation that motivated it. */
  observationId?: string;
  createdAt: string;
  /** Set when the hypothesis leaves the proposed/testing states. */
  resolvedAt?: string;
  /** Free-text reason a hypothesis was rejected or retired. */
  resolutionNote?: string;
}

/** A designed test that produces evidence for a hypothesis. */
export interface Experiment {
  id: string;
  hypothesisId: string;
  organId: OrganId;
  design: string;
  createdAt: string;
}

/** An outcome linked to a hypothesis. Evidence is the ONLY source of confidence. */
export interface Evidence {
  id: string;
  hypothesisId: string;
  organId: OrganId;
  direction: EvidenceDirection;
  /** How strong this single datum is, in [0, 1]. */
  strength: number;
  source: string;
  recordedAt: string;
  experimentId?: string;
}

/** A validated principle extracted from a SUPPORTED hypothesis. */
export interface Learning {
  id: string;
  organId: OrganId;
  principle: string;
  sourceHypothesisId: string;
  createdAt: string;
}

/**
 * A recommendation that a learning from one organ MAY help another.
 * A transfer never mutates the target organ — the Founder/organ accepts it.
 */
export type TransferStatus = 'recommended' | 'accepted' | 'rejected';

export interface TransferRecommendation {
  id: string;
  learningId: string;
  fromOrgan: OrganId;
  toOrgan: OrganId;
  rationale: string;
  /** Confidence of the *recommendation*, itself derived from source evidence. */
  confidence: ConfidenceLevel;
  status: TransferStatus;
  createdAt: string;
  decidedAt?: string;
  decisionNote?: string;
}

/** Static, honest description of an organ. Maturity here is only ever declared `unknown`. */
export interface OrganProfile {
  id: OrganId;
  name: string;
  mission: string;
  evidenceSource: string;
  learningLoop: string;
  /** Declared maturity MUST be `unknown` — real maturity is derived from the genome. */
  declaredMaturity: Extract<Maturity, 'unknown'>;
  unknowns: string[];
  dependencies: OrganId[];
  nextBestExperiment: string;
}

/** A confidence read-out for a hypothesis, always accompanied by its evidence basis. */
export interface ConfidenceReport {
  level: ConfidenceLevel;
  /** Net signed evidence weight. Zero when there is no evidence. */
  netWeight: number;
  supportingCount: number;
  refutingCount: number;
  /** True only when at least one piece of evidence exists. */
  hasEvidence: boolean;
}
