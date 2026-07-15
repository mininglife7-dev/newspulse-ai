import type {
  EvolutionCycleResult,
  EvolutionReport,
  Observation,
  ObservationCategory,
} from '@/lib/ceis/types';
import { isoWeek, stableId } from '@/lib/ceis/util';

/**
 * Weekly Evolution Report — a founder-readable markdown digest of one
 * evolution cycle. Pure function of the cycle result: deterministic,
 * testable, no I/O.
 */

function section(
  observations: Observation[],
  categories: ObservationCategory[],
  max = 5
): string {
  const items = observations
    .filter((o) => categories.includes(o.category))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, max);
  if (items.length === 0) return '_Nothing significant observed this cycle._';
  return items
    .map((o) => `- **[${o.title}](${o.url})** (${o.source}) — ${o.evidence}`)
    .join('\n');
}

export function buildReport(
  cycle: EvolutionCycleResult,
  now: Date = new Date()
): EvolutionReport {
  const week = isoWeek(now);
  const { observations, proposals, rejected, stats } = cycle;

  const proposalSection =
    proposals.length === 0
      ? '_No new DNA generated — the immune system and quality thresholds held everything back this cycle._'
      : proposals
          .map(
            (p) =>
              `### ${p.code}: ${p.title}\n` +
              `- **Evolution Score:** ${p.evolution_score.overall}/100 · **Priority:** ${p.priority} · **Effort:** ${p.estimated_effort}\n` +
              `- **Mission:** ${p.mission}\n` +
              `- **Expected customer impact:** ${p.expected_customer_impact}`
          )
          .join('\n\n');

  const ignoredSection =
    rejected.length === 0
      ? '_Nothing was rejected this cycle._'
      : rejected
          .map(
            ({ principle, verdict }) =>
              `- **${principle.principle}** — rejected: ${verdict.rejections
                .map((r) => `${r.rule} (${r.reason})`)
                .join('; ')}`
          )
          .join('\n');

  const markdown = `# 🧬 Cathedral Evolution Report — ${week}

_Generated ${now.toISOString()} by CEIS. ${stats.observations} observations from ${stats.collectors_run} collectors → ${stats.principles} principles → ${stats.dna_generated} DNA proposals._

## Overall Evolution Score: ${cycle.overall_evolution_score}/100

## Top AI & Startup Discoveries
${section(observations, ['ai-startups', 'product-innovation', 'competitor'])}

## Top Engineering Ideas
${section(observations, ['engineering-practice', 'open-source'])}

## Research Breakthroughs
${section(observations, ['research'])}

## Governance & Regulatory Watch
${section(observations, ['governance-regulation'])}

## Customer Insights
${section(observations, ['customer-insight'])}

## Technology Trends
${section(observations, ['technology-trend'])}

## 🧬 DNA Proposals (awaiting quality gates)
${proposalSection}

## 🛡️ Intentionally Ignored (immune system)
${ignoredSection}

## Expected Business Impact
${
  proposals.length === 0
    ? 'No proposals this cycle — evolution continues via observation. A quiet week is a healthy immune system, not a failure.'
    : `${proposals.length} proposal${proposals.length === 1 ? '' : 's'} in the queue. Highest-scoring: **${
        [...proposals].sort(
          (a, b) => b.evolution_score.overall - a.evolution_score.overall
        )[0].title
      }** (${[...proposals].sort((a, b) => b.evolution_score.overall - a.evolution_score.overall)[0].evolution_score.overall}/100). All proposals require the nine quality gates and founder approval before any implementation.`
}

---
_CEIS learns from public knowledge and extracts principles only — it never copies products, code, or IP. Collectors failed this cycle: ${stats.collectors_failed}._
`;

  return {
    id: stableId('report', week, now.toISOString()),
    week,
    generated_at: now.toISOString(),
    markdown,
    stats,
    overall_evolution_score: cycle.overall_evolution_score,
  };
}
