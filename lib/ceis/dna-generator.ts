import type {
  DnaProposal,
  EvolutionScore,
  GapAnalysis,
  Principle,
  QualityGate,
  QualityGateName,
} from '@/lib/ceis/types';
import { stableId } from '@/lib/ceis/util';
import { getOpenAIClient } from '@/lib/openai';

/**
 * DNA Generator — turns a validated, scored principle into a full DNA
 * mission. Only called for principles that passed the immune system AND
 * cleared the minimum evolution score; every mission enters the queue as
 * "proposed" with all nine quality gates pending. Nothing self-approves.
 */

/** Proposals below this overall score are not worth a founder's attention. */
export const MIN_DNA_SCORE = 55;

export const QUALITY_GATE_NAMES: QualityGateName[] = [
  'architecture-review',
  'business-review',
  'security-review',
  'compliance-review',
  'testing-review',
  'founder-alignment',
  'customer-value-review',
  'evidence-review',
  'performance-review',
];

export function freshGates(): QualityGate[] {
  return QUALITY_GATE_NAMES.map((name) => ({
    name,
    status: 'pending' as const,
    notes: null,
  }));
}

const DNA_SYSTEM_PROMPT = `You design engineering missions ("DNA") for the Cathedral — a Next.js 14 + Supabase + Firecrawl + OpenAI news-intelligence product (EURO AI / NewsPulse) running serverless on Vercel.

Given a validated principle, write a concrete, right-sized mission that applies the PRINCIPLE (never copies any product). Respect the architecture: Next.js API routes, Supabase Postgres, no long-running daemons, reuse existing components (lib/firecrawl.ts, lib/openai.ts, lib/supabase.ts).

Return ONLY valid JSON:
{"title": string (max 80 chars), "mission": string, "problem_statement": string, "business_value": string, "architecture": string, "technical_design": string, "dependencies": string[], "implementation_plan": string[] (3-7 steps), "testing_plan": string[] (2-5 items), "rollback_plan": string, "metrics": string[] (2-4 measurable), "priority": "critical"|"high"|"medium"|"low", "estimated_effort": string (e.g. "2-3 days"), "expected_customer_impact": string}`;

interface RawDna {
  title?: unknown;
  mission?: unknown;
  problem_statement?: unknown;
  business_value?: unknown;
  architecture?: unknown;
  technical_design?: unknown;
  dependencies?: unknown;
  implementation_plan?: unknown;
  testing_plan?: unknown;
  rollback_plan?: unknown;
  metrics?: unknown;
  priority?: unknown;
  estimated_effort?: unknown;
  expected_customer_impact?: unknown;
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function strArray(v: unknown, fallback: string[]): string[] {
  if (!Array.isArray(v)) return fallback;
  const out = v.filter(
    (x): x is string => typeof x === 'string' && x.trim().length > 0
  );
  return out.length > 0 ? out : fallback;
}

/** Deterministic proposal code derived from the principle id, e.g. DNA-C4F2A. */
export function dnaCode(principleId: string): string {
  return `DNA-C${principleId.slice(0, 5).toUpperCase()}`;
}

/** Assemble a proposal from parts. Exported for tests. */
export function buildProposal(args: {
  principle: Principle;
  gap: GapAnalysis;
  score: EvolutionScore;
  raw: RawDna;
  now: Date;
}): DnaProposal {
  const { principle, gap, score, raw, now } = args;
  const priority =
    raw.priority === 'critical' ||
    raw.priority === 'high' ||
    raw.priority === 'medium' ||
    raw.priority === 'low'
      ? raw.priority
      : score.overall >= 75
        ? 'high'
        : score.overall >= 60
          ? 'medium'
          : 'low';

  return {
    id: stableId('dna', principle.id),
    code: dnaCode(principle.id),
    title: str(raw.title, principle.principle).slice(0, 120),
    principle_id: principle.id,
    mission: str(raw.mission, `Apply the principle: ${principle.principle}`),
    problem_statement: str(
      raw.problem_statement,
      `Gap analysis: ${gap.rationale}`
    ),
    business_value: str(
      raw.business_value,
      `Business value ${principle.business_value}/5, expected ROI ${principle.expected_roi}/5.`
    ),
    architecture: str(
      raw.architecture,
      'Integrate as a Next.js API route + Supabase table, following existing lib/ patterns.'
    ),
    technical_design: str(
      raw.technical_design,
      'To be detailed during architecture review.'
    ),
    dependencies: strArray(raw.dependencies, []),
    implementation_plan: strArray(raw.implementation_plan, [
      'Design the module against existing lib/ components.',
      'Implement incrementally behind the API layer.',
      'Add automated tests.',
      'Document and ship.',
    ]),
    testing_plan: strArray(raw.testing_plan, [
      'Unit tests for pure logic.',
      'Manual verification of the end-to-end flow.',
    ]),
    rollback_plan: str(
      raw.rollback_plan,
      'Feature is additive: revert the commit and drop any new tables. No data migration of existing tables involved.'
    ),
    metrics: strArray(raw.metrics, [
      'Adoption of the new capability',
      'Error rate of the new module',
    ]),
    priority,
    owner: 'founder',
    estimated_effort: str(raw.estimated_effort, 'unknown'),
    expected_customer_impact: str(
      raw.expected_customer_impact,
      `Estimated customer value ${principle.estimated_customer_value}/5.`
    ),
    evolution_score: score,
    status: 'proposed',
    gates: freshGates(),
    evidence: principle.evidence,
    created_at: now.toISOString(),
  };
}

/**
 * Generate a DNA proposal for one validated principle. Uses the LLM when
 * available; otherwise builds a conservative template proposal.
 */
export async function generateDna(
  principle: Principle,
  gap: GapAnalysis,
  score: EvolutionScore,
  now: Date = new Date()
): Promise<DnaProposal> {
  let raw: RawDna = {};

  if (process.env.OPENAI_API_KEY) {
    try {
      const completion = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 1400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: DNA_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              `Principle: ${principle.principle}`,
              `What happened: ${principle.what_happened}`,
              `Why it worked: ${principle.why_it_worked}`,
              `Category: ${principle.category}`,
              `Gap analysis: ${gap.status} — ${gap.rationale}`,
              `Evolution score: ${score.overall}/100`,
              `Evidence:\n${principle.evidence.map((e) => `- ${e}`).join('\n')}`,
            ].join('\n'),
          },
        ],
      });
      raw = JSON.parse(
        completion.choices[0]?.message?.content ?? '{}'
      ) as RawDna;
    } catch (err) {
      console.error('[ceis] generateDna LLM error, using template:', err);
    }
  }

  return buildProposal({ principle, gap, score, raw, now });
}
