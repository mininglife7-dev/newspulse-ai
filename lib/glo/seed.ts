/**
 * Honest seed for the GLO genome.
 *
 * Everything recorded here is verifiably true about THIS repository and the
 * DNA-GLO-001 build — no fabricated customers, revenue, edge, maturity, or
 * compliance. The seed exists so the dashboard shows a real (if small) ledger
 * instead of an empty one, and so the learning loop is demonstrable end to end.
 *
 * If you cannot cite a source for a record, it does not belong here.
 */

import { LearningGenome } from './genome';

/**
 * Build-time timestamp for the DNA-GLO-001 increment. Fixed and caller-supplied
 * (the genome never invents time). Matches the session date on which the
 * foundation was built.
 */
export const SEED_AT = '2026-07-09T00:00:00.000Z';

/**
 * Construct a fresh genome seeded with true records. Governor is the only organ
 * with any earned maturity today, because it is the only organ that has so far
 * done verified work (building this foundation). Every other organ stays
 * genuinely `unknown`.
 */
export function buildSeededGenome(): LearningGenome {
  const genome = new LearningGenome();

  // --- Observation: the state of the repo before this increment (git history).
  const obsPriorState = genome.observe({
    organId: 'governor',
    statement:
      'Before DNA-GLO-001 the repository had no shared learning module, no test runner, and no organ registry.',
    source: 'git log + repository inspection (Phase 1 discovery)',
    at: SEED_AT,
  });

  // --- Supported hypothesis: the honesty invariant, backed by the test suite.
  const hInvariant = genome.hypothesize({
    organId: 'governor',
    statement:
      'Deriving confidence purely from recorded evidence prevents "unknown" from ever being counted as success.',
    at: SEED_AT,
    observationId: obsPriorState.id,
  });
  const expInvariant = genome.design({
    hypothesisId: hInvariant.id,
    design:
      'Encode the invariant in confidence.ts and lock it with Phase 7 tests that assert unknown != success.',
    at: SEED_AT,
  });
  genome.recordEvidence({
    hypothesisId: hInvariant.id,
    direction: 'supporting',
    strength: 0.9,
    source:
      'lib/glo/confidence.ts — assessConfidence returns unknown for empty evidence',
    at: SEED_AT,
    experimentId: expInvariant.id,
  });
  genome.recordEvidence({
    hypothesisId: hInvariant.id,
    direction: 'supporting',
    strength: 0.9,
    source:
      'lib/glo/__tests__ — Phase 7 suite asserts the invariant and passes',
    at: SEED_AT,
    experimentId: expInvariant.id,
  });
  // Net supporting weight 1.8 >= threshold -> genuinely `supported`.
  genome.learn({
    hypothesisId: hInvariant.id,
    principle:
      'Confidence must be derived from evidence; "unknown" is the honest default, never success. This verification discipline should carry to every organ.',
    at: SEED_AT,
  });

  // --- Rejected hypothesis: deliberately preserved, not erased.
  const hGiant = genome.hypothesize({
    organId: 'governor',
    statement: 'The GLO must be a large multi-service system to be useful.',
    at: SEED_AT,
  });
  genome.recordEvidence({
    hypothesisId: hGiant.id,
    direction: 'refuting',
    strength: 0.95,
    source:
      'DNA-GLO-001 mission: "Do not build a giant system. Build one verified foundation."',
    at: SEED_AT,
  });
  genome.recordEvidence({
    hypothesisId: hGiant.id,
    direction: 'refuting',
    strength: 0.9,
    source:
      'A single minimal lib/glo module now serves seven organs — reuse, not scale, delivered the value.',
    at: SEED_AT,
  });
  // Net refuting weight <= reject threshold -> rejected, and kept forever.

  // --- Open hypothesis: real, unproven, honestly left in testing.
  const hReuse = genome.hypothesize({
    organId: 'governor',
    statement:
      'Sharing one genome across organs will reduce duplicated learning infrastructure over time.',
    at: SEED_AT,
  });
  genome.recordEvidence({
    hypothesisId: hReuse.id,
    direction: 'supporting',
    strength: 0.5,
    source:
      'Organ registry, transfer engine, and dashboard all import the same genome (one implementation).',
    at: SEED_AT,
  });
  // Net weight 0.5 -> confidence "low", stays in testing. Belief not yet earned.

  return genome;
}
