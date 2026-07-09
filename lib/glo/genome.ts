/**
 * GLO shared learning genome — the living spine of the Cathedral.
 *
 * A single, domain-neutral ledger that every organ can write to and read from.
 * It supports the full loop the mission requires:
 *
 *   observe -> hypothesize -> experiment -> gather evidence ->
 *   earn confidence -> learn -> (retire / reject, preserved forever) -> transfer
 *
 * Design guarantees enforced here (and locked by Phase 7 tests):
 *  - Confidence is derived from evidence only (see confidence.ts).
 *  - `unknown` is never treated as success.
 *  - Rejected / retired hypotheses are PRESERVED, never deleted.
 *  - A learning can only be minted from a genuinely `supported` hypothesis.
 *  - Timestamps are supplied by callers; the genome never invents time.
 */

import { assessConfidence, isSuccess, REJECT_THRESHOLD } from './confidence';
import type {
  ConfidenceReport,
  Evidence,
  EvidenceDirection,
  Experiment,
  Hypothesis,
  HypothesisStatus,
  Learning,
  Observation,
  OrganId,
} from './types';

let counter = 0;
/** Deterministic-enough id generator (no Math.random / Date.now dependency). */
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter.toString(36)}`;
}

export class LearningGenome {
  private readonly observations = new Map<string, Observation>();
  private readonly hypotheses = new Map<string, Hypothesis>();
  private readonly experiments = new Map<string, Experiment>();
  private readonly evidence = new Map<string, Evidence>();
  private readonly learnings = new Map<string, Learning>();

  // ---- Observation ---------------------------------------------------------

  observe(input: {
    organId: OrganId;
    statement: string;
    source: string;
    at: string;
  }): Observation {
    const observation: Observation = {
      id: nextId('obs'),
      organId: input.organId,
      statement: input.statement,
      source: input.source,
      recordedAt: input.at,
    };
    this.observations.set(observation.id, observation);
    return observation;
  }

  // ---- Hypothesis ----------------------------------------------------------

  hypothesize(input: {
    organId: OrganId;
    statement: string;
    at: string;
    observationId?: string;
  }): Hypothesis {
    const hypothesis: Hypothesis = {
      id: nextId('hyp'),
      organId: input.organId,
      statement: input.statement,
      status: 'proposed',
      observationId: input.observationId,
      createdAt: input.at,
    };
    this.hypotheses.set(hypothesis.id, hypothesis);
    return hypothesis;
  }

  // ---- Experiment ----------------------------------------------------------

  design(input: {
    hypothesisId: string;
    design: string;
    at: string;
  }): Experiment {
    const hypothesis = this.requireHypothesis(input.hypothesisId);
    const experiment: Experiment = {
      id: nextId('exp'),
      hypothesisId: hypothesis.id,
      organId: hypothesis.organId,
      design: input.design,
      createdAt: input.at,
    };
    this.experiments.set(experiment.id, experiment);
    // Designing an experiment moves a proposed hypothesis into testing.
    if (hypothesis.status === 'proposed') {
      hypothesis.status = 'testing';
    }
    return experiment;
  }

  // ---- Evidence ------------------------------------------------------------

  /**
   * Record evidence for a hypothesis, then re-derive its status from ALL
   * evidence. Status changes are a pure function of the ledger — never a
   * caller assertion. Rejected hypotheses stay rejected-and-preserved.
   */
  recordEvidence(input: {
    hypothesisId: string;
    direction: EvidenceDirection;
    strength: number;
    source: string;
    at: string;
    experimentId?: string;
  }): Evidence {
    const hypothesis = this.requireHypothesis(input.hypothesisId);
    const datum: Evidence = {
      id: nextId('evd'),
      hypothesisId: hypothesis.id,
      organId: hypothesis.organId,
      direction: input.direction,
      strength: input.strength,
      source: input.source,
      recordedAt: input.at,
      experimentId: input.experimentId,
    };
    this.evidence.set(datum.id, datum);
    this.reconcile(hypothesis, input.at);
    return datum;
  }

  /** Re-derive a hypothesis's status from its evidence. */
  private reconcile(hypothesis: Hypothesis, at: string): void {
    // Retired hypotheses are frozen: their history is preserved, not revised.
    if (hypothesis.status === 'retired') return;

    const report = this.confidenceFor(hypothesis.id);

    if (report.netWeight <= REJECT_THRESHOLD) {
      if (hypothesis.status !== 'rejected') {
        hypothesis.status = 'rejected';
        hypothesis.resolvedAt = at;
        hypothesis.resolutionNote =
          hypothesis.resolutionNote ??
          'Refuting evidence crossed the rejection threshold.';
      }
      return;
    }

    if (isSuccess(report.level)) {
      hypothesis.status = 'supported';
      hypothesis.resolvedAt = at;
      return;
    }

    // Has evidence but belief not yet earned, or evidence pulled back:
    // return to a testing posture rather than claiming anything.
    if (hypothesis.status === 'supported' || hypothesis.status === 'rejected') {
      hypothesis.resolvedAt = undefined;
    }
    hypothesis.status = report.hasEvidence ? 'testing' : 'proposed';
  }

  // ---- Confidence ----------------------------------------------------------

  confidenceFor(hypothesisId: string): ConfidenceReport {
    this.requireHypothesis(hypothesisId);
    return assessConfidence(this.evidenceForHypothesis(hypothesisId));
  }

  // ---- Learning ------------------------------------------------------------

  /**
   * Extract a durable principle from a hypothesis. Only permitted when the
   * hypothesis is genuinely `supported` — you cannot learn from an unknown.
   */
  learn(input: {
    hypothesisId: string;
    principle: string;
    at: string;
  }): Learning {
    const hypothesis = this.requireHypothesis(input.hypothesisId);
    if (hypothesis.status !== 'supported') {
      throw new Error(
        `Cannot mint a learning from hypothesis ${hypothesis.id}: status is ` +
          `"${hypothesis.status}", not "supported". Confidence must be earned first.`
      );
    }
    const learning: Learning = {
      id: nextId('lrn'),
      organId: hypothesis.organId,
      principle: input.principle,
      sourceHypothesisId: hypothesis.id,
      createdAt: input.at,
    };
    this.learnings.set(learning.id, learning);
    return learning;
  }

  // ---- Retirement ----------------------------------------------------------

  /**
   * Retire a hypothesis (e.g. superseded). It is PRESERVED — kept in the
   * ledger with a note — never removed. Rejected hypotheses are likewise kept.
   */
  retire(input: {
    hypothesisId: string;
    note: string;
    at: string;
  }): Hypothesis {
    const hypothesis = this.requireHypothesis(input.hypothesisId);
    hypothesis.status = 'retired';
    hypothesis.resolvedAt = input.at;
    hypothesis.resolutionNote = input.note;
    return hypothesis;
  }

  // ---- Reads ---------------------------------------------------------------

  getObservation(id: string): Observation | undefined {
    return this.observations.get(id);
  }

  getHypothesis(id: string): Hypothesis | undefined {
    return this.hypotheses.get(id);
  }

  getLearning(id: string): Learning | undefined {
    return this.learnings.get(id);
  }

  allObservations(): Observation[] {
    return [...this.observations.values()];
  }

  allHypotheses(): Hypothesis[] {
    return [...this.hypotheses.values()];
  }

  allExperiments(): Experiment[] {
    return [...this.experiments.values()];
  }

  allEvidence(): Evidence[] {
    return [...this.evidence.values()];
  }

  allLearnings(): Learning[] {
    return [...this.learnings.values()];
  }

  hypothesesByStatus(status: HypothesisStatus): Hypothesis[] {
    return this.allHypotheses().filter((h) => h.status === status);
  }

  evidenceForHypothesis(hypothesisId: string): Evidence[] {
    return this.allEvidence().filter((e) => e.hypothesisId === hypothesisId);
  }

  observationsForOrgan(organId: OrganId): Observation[] {
    return this.allObservations().filter((o) => o.organId === organId);
  }

  learningsForOrgan(organId: OrganId): Learning[] {
    return this.allLearnings().filter((l) => l.organId === organId);
  }

  private requireHypothesis(id: string): Hypothesis {
    const hypothesis = this.hypotheses.get(id);
    if (!hypothesis) {
      throw new Error(`Unknown hypothesis: ${id}`);
    }
    return hypothesis;
  }
}
