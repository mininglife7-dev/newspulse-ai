import { buildCollectorContext, runCollectors } from '@/lib/ceis/collectors';
import { MIN_DNA_SCORE, generateDna } from '@/lib/ceis/dna-generator';
import {
  overallEvolutionScore,
  scorePrinciple,
} from '@/lib/ceis/evolution-score';
import { extractPrinciples } from '@/lib/ceis/extraction';
import { analyzeGaps } from '@/lib/ceis/gap-analysis';
import { loadGenome, rememberGenomeEntry } from '@/lib/ceis/genome';
import { runImmuneSystem } from '@/lib/ceis/immune-system';
import { buildReport } from '@/lib/ceis/report';
import {
  listProposals,
  saveObservations,
  savePrinciples,
  saveProposals,
  saveReport,
} from '@/lib/ceis/store';
import type {
  DnaProposal,
  EvolutionCycleResult,
  GapAnalysis,
  ImmuneVerdict,
  Principle,
} from '@/lib/ceis/types';
import { stableId } from '@/lib/ceis/util';

/**
 * The Evolution Cycle — the heartbeat of CEIS.
 *
 *   Observe → Learn → Extract principles → Validate (gap + immune) →
 *   Score → Generate DNA → Remember → Report.
 *
 * Runs weekly via cron (vercel.json) or on demand via POST /api/ceis/run.
 * Autonomous but never self-approving: every generated DNA waits in the
 * queue for quality gates and founder review.
 */
export async function runEvolutionCycle(options?: {
  /** Skip Supabase writes (dry run / preview). */
  persist?: boolean;
}): Promise<EvolutionCycleResult> {
  const persist = options?.persist !== false;
  const startedAt = new Date();

  // ---------- 1) Observe: run every enabled research collector ----------
  const ctx = buildCollectorContext();
  const collected = await runCollectors(ctx);
  const observations = collected.observations;

  // ---------- 2) Learn: extract reusable principles ----------
  const principles = await extractPrinciples(observations);

  // ---------- 3) Validate: gap analysis against the genome ----------
  const genome = await loadGenome();
  const gaps = analyzeGaps(principles, genome);
  const gapById = new Map<string, GapAnalysis>(
    gaps.map((g) => [g.principle_id, g])
  );

  // ---------- 4) Validate: immune system ----------
  const rejectedIdeas = genome.filter((e) => e.kind === 'rejected-idea');
  const existingProposals = persist ? await listProposals() : [];
  const activeWork = existingProposals
    .filter(
      (p) =>
        p.status === 'proposed' ||
        p.status === 'under-review' ||
        p.status === 'approved'
    )
    .map((p) => p.title);

  const verdicts: ImmuneVerdict[] = [];
  const survivors: Principle[] = [];
  const rejected: Array<{ principle: Principle; verdict: ImmuneVerdict }> = [];

  for (const principle of principles) {
    const gap = gapById.get(principle.id)!;
    const verdict = runImmuneSystem(principle, {
      gap,
      rejectedIdeas,
      activeWork,
    });
    verdicts.push(verdict);
    if (verdict.accepted && gap.status !== 'future-opportunity') {
      survivors.push(principle);
    } else if (!verdict.accepted) {
      rejected.push({ principle, verdict });
    }
    // future-opportunity + accepted → parked silently (remembered below).
  }

  // ---------- 5) Score + 6) Generate DNA for qualified survivors ----------
  const proposals: DnaProposal[] = [];
  for (const principle of survivors) {
    const gap = gapById.get(principle.id)!;
    const score = scorePrinciple(principle, gap);
    if (score.overall < MIN_DNA_SCORE) {
      rejected.push({
        principle,
        verdict: {
          principle_id: principle.id,
          accepted: false,
          rejections: [
            {
              rule: 'insufficient-evidence',
              reason: `Evolution score ${score.overall}/100 is below the DNA threshold ${MIN_DNA_SCORE} — not worth founder attention yet.`,
            },
          ],
        },
      });
      continue;
    }
    proposals.push(await generateDna(principle, gap, score, startedAt));
  }

  const finishedAt = new Date();
  const cycle: EvolutionCycleResult = {
    id: stableId('cycle', startedAt.toISOString()),
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    stats: {
      observations: observations.length,
      principles: principles.length,
      accepted: proposals.length,
      rejected: rejected.length,
      dna_generated: proposals.length,
      collectors_run: collected.ran.length,
      collectors_failed: collected.failed.length,
    },
    observations,
    principles,
    gaps,
    verdicts,
    proposals,
    rejected,
    overall_evolution_score: overallEvolutionScore(
      proposals.map((p) => p.evolution_score)
    ),
  };

  // ---------- 7) Remember + 8) Report (best-effort persistence) ----------
  if (persist) {
    await Promise.all([
      saveObservations(observations),
      savePrinciples(principles),
      saveProposals(proposals),
      // Rejected ideas enter the genome so they are never rediscovered
      // without meaningfully new evidence.
      ...rejected.map(({ principle, verdict }) =>
        rememberGenomeEntry({
          id: stableId('rejected', principle.id),
          kind: 'rejected-idea',
          title: principle.principle,
          summary: verdict.rejections
            .map((r) => `${r.rule}: ${r.reason}`)
            .join(' | '),
          tags: [principle.category],
          evidence: `confidence=${principle.confidence.toFixed(2)} at rejection; ${principle.evidence.join('; ')}`,
        })
      ),
      // Accepted principles become lessons the Cathedral has learned.
      ...survivors.map((principle) =>
        rememberGenomeEntry({
          id: stableId('lesson', principle.id),
          kind: 'lesson',
          title: principle.principle,
          summary: `${principle.what_happened} — why it worked: ${principle.why_it_worked}`,
          tags: [principle.category],
          evidence: principle.evidence.join('; '),
        })
      ),
    ]);

    const report = buildReport(cycle, finishedAt);
    await saveReport(report);
  }

  return cycle;
}
