import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runEvolutionCycle } from '@/lib/ceis/pipeline';
import type { GenomeEntry, Principle } from '@/lib/ceis/types';
import { makeObservation, makePrinciple } from './helpers';

/**
 * Orchestrator tests — the I/O boundaries (collectors, LLM extraction,
 * genome, store) are mocked; gap analysis, immune system, scoring, DNA
 * generation and reporting run for real. OPENAI_API_KEY is unset in the
 * test env, so DNA generation exercises the deterministic template path.
 */

vi.mock('@/lib/ceis/collectors', () => ({
  buildCollectorContext: vi.fn(() => ({})),
  runCollectors: vi.fn(),
}));
vi.mock('@/lib/ceis/extraction', () => ({
  extractPrinciples: vi.fn(),
}));
vi.mock('@/lib/ceis/genome', () => ({
  loadGenome: vi.fn(),
  rememberGenomeEntry: vi.fn(async () => true),
}));
vi.mock('@/lib/ceis/store', () => ({
  listProposals: vi.fn(async () => []),
  saveObservations: vi.fn(async () => true),
  savePrinciples: vi.fn(async () => true),
  saveProposals: vi.fn(async () => true),
  saveReport: vi.fn(async () => true),
}));

import { runCollectors } from '@/lib/ceis/collectors';
import { extractPrinciples } from '@/lib/ceis/extraction';
import { loadGenome, rememberGenomeEntry } from '@/lib/ceis/genome';
import {
  listProposals,
  saveObservations,
  savePrinciples,
  saveProposals,
  saveReport,
} from '@/lib/ceis/store';

const OBSERVATION = makeObservation();

/** A minimal genome that no test principle overlaps with. */
const UNRELATED_GENOME: GenomeEntry[] = [
  {
    id: 'g1',
    kind: 'capability',
    title: 'Bicycle rental scheduling',
    summary: 'Completely unrelated domain vocabulary for gap isolation.',
    tags: ['bicycles'],
    evidence: null,
    created_at: '2026-01-01T00:00:00Z',
  },
];

/** Passes the immune system AND clears MIN_DNA_SCORE (≈68/100). */
function strongPrinciple(): Principle {
  return makePrinciple({
    principle: 'Give users persistent context memory across sessions',
  });
}

/** Passes the immune system but scores below MIN_DNA_SCORE (≈37/100). */
function mediocrePrinciple(): Principle {
  return makePrinciple({
    principle: 'Offer seasonal color themes for the interface',
    what_happened: 'A product added seasonal themes.',
    why_it_worked: 'Small delight features retain a niche audience.',
    estimated_customer_value: 2,
    business_value: 2,
    engineering_complexity: 3,
    implementation_difficulty: 3,
    risk: 3,
    expected_roi: 3,
    confidence: 0.56,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(runCollectors).mockResolvedValue({
    observations: [OBSERVATION],
    ran: ['hacker-news'],
    failed: [{ id: 'reddit', error: 'boom' }],
    skipped: ['product-hunt'],
  });
  vi.mocked(loadGenome).mockResolvedValue(UNRELATED_GENOME);
  vi.mocked(listProposals).mockResolvedValue([]);
});

describe('runEvolutionCycle', () => {
  it('turns a strong principle into a proposed DNA mission and persists everything', async () => {
    vi.mocked(extractPrinciples).mockResolvedValue([strongPrinciple()]);

    const cycle = await runEvolutionCycle();

    expect(cycle.stats).toEqual({
      observations: 1,
      principles: 1,
      accepted: 1,
      rejected: 0,
      dna_generated: 1,
      collectors_run: 1,
      collectors_failed: 1,
    });
    expect(cycle.proposals).toHaveLength(1);
    expect(cycle.proposals[0].status).toBe('proposed');
    expect(cycle.proposals[0].gates).toHaveLength(9);
    expect(cycle.proposals[0].evolution_score.overall).toBeGreaterThanOrEqual(
      55
    );
    expect(cycle.overall_evolution_score).toBe(
      cycle.proposals[0].evolution_score.overall
    );

    expect(saveObservations).toHaveBeenCalledWith([OBSERVATION]);
    expect(savePrinciples).toHaveBeenCalledTimes(1);
    expect(saveProposals).toHaveBeenCalledWith(cycle.proposals);
    expect(saveReport).toHaveBeenCalledTimes(1);
    // The accepted principle becomes a permanent lesson.
    expect(
      vi.mocked(rememberGenomeEntry).mock.calls.map((c) => c[0].kind)
    ).toContain('lesson');
  });

  it('rejects weak principles with reasons and remembers them as rejected ideas', async () => {
    const weak = makePrinciple({
      principle: 'Chase every trending model release immediately',
      category: 'technology-trend',
      confidence: 0.2,
      estimated_customer_value: 1,
      business_value: 1,
    });
    vi.mocked(extractPrinciples).mockResolvedValue([weak]);

    const cycle = await runEvolutionCycle();

    expect(cycle.proposals).toHaveLength(0);
    expect(cycle.rejected).toHaveLength(1);
    const rules = cycle.rejected[0].verdict.rejections.map((r) => r.rule);
    expect(rules).toContain('insufficient-evidence');

    const rejectedEntries = vi
      .mocked(rememberGenomeEntry)
      .mock.calls.map((c) => c[0])
      .filter((e) => e.kind === 'rejected-idea');
    expect(rejectedEntries).toHaveLength(1);
    // Confidence at rejection time is recorded so the immune system can
    // demand stronger evidence before the idea is ever reopened.
    expect(rejectedEntries[0].evidence).toContain('confidence=0.20');
  });

  it('holds back immune-accepted principles that score below the DNA threshold', async () => {
    vi.mocked(extractPrinciples).mockResolvedValue([mediocrePrinciple()]);

    const cycle = await runEvolutionCycle();

    expect(cycle.verdicts[0].accepted).toBe(true); // immune system let it through
    expect(cycle.proposals).toHaveLength(0); // but the score gate did not
    expect(cycle.rejected).toHaveLength(1);
    expect(cycle.rejected[0].verdict.rejections[0].reason).toContain(
      'below the DNA threshold'
    );
  });

  it('protects active parallel work found in the existing proposal queue', async () => {
    const principle = strongPrinciple();
    vi.mocked(extractPrinciples).mockResolvedValue([principle]);
    vi.mocked(listProposals).mockResolvedValue([
      {
        title: 'Persistent context memory across user sessions',
        status: 'under-review',
      } as any,
    ]);

    const cycle = await runEvolutionCycle();

    expect(cycle.proposals).toHaveLength(0);
    expect(cycle.rejected[0].verdict.rejections.map((r) => r.rule)).toContain(
      'duplicate-of-active-work'
    );
  });

  it('dry run (persist: false) touches no storage at all', async () => {
    vi.mocked(extractPrinciples).mockResolvedValue([strongPrinciple()]);

    const cycle = await runEvolutionCycle({ persist: false });

    expect(cycle.proposals).toHaveLength(1);
    expect(listProposals).not.toHaveBeenCalled();
    expect(saveObservations).not.toHaveBeenCalled();
    expect(savePrinciples).not.toHaveBeenCalled();
    expect(saveProposals).not.toHaveBeenCalled();
    expect(saveReport).not.toHaveBeenCalled();
    expect(rememberGenomeEntry).not.toHaveBeenCalled();
  });

  it('completes a cycle even when nothing is observed', async () => {
    vi.mocked(runCollectors).mockResolvedValue({
      observations: [],
      ran: [],
      failed: [],
      skipped: [],
    });
    vi.mocked(extractPrinciples).mockResolvedValue([]);

    const cycle = await runEvolutionCycle();

    expect(cycle.stats.observations).toBe(0);
    expect(cycle.overall_evolution_score).toBe(0);
    expect(saveReport).toHaveBeenCalledTimes(1); // a quiet week still reports
  });
});
