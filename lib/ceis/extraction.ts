import type {
  Observation,
  ObservationCategory,
  Principle,
} from '@/lib/ceis/types';
import { clamp, excerpt, stableId, toScore5 } from '@/lib/ceis/util';
import { getOpenAIClient } from '@/lib/openai';

/**
 * Principle Extraction Engine.
 *
 * Turns raw observations into source-independent, reusable principles.
 * The prompt is the ethics boundary: extract the *mechanism* that made
 * something work — never product specifics, code, or anything that would
 * amount to copying a competitor.
 */

const EXTRACTION_SYSTEM_PROMPT = `You are the Principle Extraction Engine of an evolution system for "the Cathedral" — an AI news-intelligence product (NewsPulse / EURO AI): users search a topic, articles are scraped, AI-summarized, and saved to history.

You receive public observations (titles, URLs, short excerpts, engagement metrics). For each observation worth learning from, extract ONE reusable principle.

STRICT ETHICS RULES:
- Extract PRINCIPLES (the underlying mechanism), never product features to clone.
- Never suggest copying source code, designs, branding, or any intellectual property.
- Skip observations that carry no transferable lesson (return nothing for them).

For each principle, answer: what happened, why it worked, what the general principle is, and whether it can improve this product (applies_to_euro_ai) or its architecture/engineering system (applies_to_cathedral).

Score each 1-5 (integers): estimated_customer_value, engineering_complexity, business_value, implementation_difficulty, risk, expected_roi. Set confidence 0..1 based on evidence strength.

Return ONLY valid JSON: {"principles": [{"observation_ids": string[], "what_happened": string, "why_it_worked": string, "principle": string, "category": string, "applies_to_euro_ai": boolean, "applies_to_cathedral": boolean, "estimated_customer_value": number, "engineering_complexity": number, "business_value": number, "implementation_difficulty": number, "risk": number, "expected_roi": number, "confidence": number}]}
Category must be one of: ai-startups, engineering-practice, open-source, research, product-innovation, governance-regulation, customer-insight, technology-trend, competitor.
Extract at most 10 principles. Quality over quantity.`;

const VALID_CATEGORIES: ObservationCategory[] = [
  'ai-startups',
  'engineering-practice',
  'open-source',
  'research',
  'product-innovation',
  'governance-regulation',
  'customer-insight',
  'technology-trend',
  'competitor',
];

interface RawPrinciple {
  observation_ids?: unknown;
  what_happened?: unknown;
  why_it_worked?: unknown;
  principle?: unknown;
  category?: unknown;
  applies_to_euro_ai?: unknown;
  applies_to_cathedral?: unknown;
  estimated_customer_value?: unknown;
  engineering_complexity?: unknown;
  business_value?: unknown;
  implementation_difficulty?: unknown;
  risk?: unknown;
  expected_roi?: unknown;
  confidence?: unknown;
}

/**
 * Validate + normalize one raw LLM principle. Exported for tests.
 * Returns null when the item is unusable.
 */
export function normalizePrinciple(
  raw: RawPrinciple,
  observations: Observation[]
): Principle | null {
  const principleText =
    typeof raw.principle === 'string' ? raw.principle.trim() : '';
  if (!principleText) return null;

  const knownIds = new Set(observations.map((o) => o.id));
  const observationIds = (
    Array.isArray(raw.observation_ids) ? raw.observation_ids : []
  ).filter((id): id is string => typeof id === 'string' && knownIds.has(id));
  // A principle without a real observation behind it is unfalsifiable — drop it.
  if (observationIds.length === 0) return null;

  const backing = observations.filter((o) => observationIds.includes(o.id));
  const category = VALID_CATEGORIES.includes(
    raw.category as ObservationCategory
  )
    ? (raw.category as ObservationCategory)
    : backing[0].category;

  const evidenceConfidence =
    backing.reduce((sum, o) => sum + o.confidence, 0) / backing.length;
  const llmConfidence =
    typeof raw.confidence === 'number' ? clamp(raw.confidence, 0, 1) : 0.5;

  return {
    id: stableId('principle', principleText),
    observation_ids: observationIds,
    what_happened:
      typeof raw.what_happened === 'string' && raw.what_happened.trim()
        ? raw.what_happened.trim()
        : backing[0].title,
    why_it_worked:
      typeof raw.why_it_worked === 'string' && raw.why_it_worked.trim()
        ? raw.why_it_worked.trim()
        : 'Mechanism not identified.',
    principle: principleText,
    category,
    applies_to_euro_ai: raw.applies_to_euro_ai !== false,
    applies_to_cathedral: raw.applies_to_cathedral === true,
    estimated_customer_value: toScore5(raw.estimated_customer_value),
    engineering_complexity: toScore5(raw.engineering_complexity),
    business_value: toScore5(raw.business_value),
    implementation_difficulty: toScore5(raw.implementation_difficulty),
    risk: toScore5(raw.risk, 2),
    expected_roi: toScore5(raw.expected_roi),
    // Blend model confidence with source-evidence confidence.
    confidence: clamp(0.5 * llmConfidence + 0.5 * evidenceConfidence, 0, 1),
    evidence: backing.map((o) => `${o.url} — ${excerpt(o.evidence, 160)}`),
  };
}

function observationsPrompt(observations: Observation[]): string {
  return observations
    .map(
      (o) =>
        `- id: ${o.id}\n  source: ${o.source} (${o.collector}, confidence ${o.confidence.toFixed(2)})\n  title: ${o.title}\n  url: ${o.url}\n  evidence: ${o.evidence}`
    )
    .join('\n');
}

/** How many top-confidence observations to send to the LLM per cycle. */
const MAX_OBSERVATIONS_FOR_EXTRACTION = 30;

/**
 * Extract principles from a cycle's observations.
 * Falls back to a deterministic heuristic when OPENAI_API_KEY is absent
 * (CI, tests, local dev without keys) so the pipeline never hard-fails.
 */
export async function extractPrinciples(
  observations: Observation[]
): Promise<Principle[]> {
  if (observations.length === 0) return [];

  const top = [...observations]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_OBSERVATIONS_FOR_EXTRACTION);

  if (!process.env.OPENAI_API_KEY) {
    console.warn('[ceis] OPENAI_API_KEY missing — using heuristic extraction.');
    return heuristicPrinciples(top);
  }

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Observations from this evolution cycle:\n\n${observationsPrompt(top)}`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(text) as { principles?: RawPrinciple[] };
    const principles = (parsed.principles ?? [])
      .map((raw) => normalizePrinciple(raw, top))
      .filter((p): p is Principle => p !== null);

    // Dedupe identical principles the model may have repeated.
    const seen = new Set<string>();
    return principles.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  } catch (err) {
    console.error('[ceis] extractPrinciples LLM error, falling back:', err);
    return heuristicPrinciples(top);
  }
}

/**
 * Keyless fallback: turn the strongest observations into conservative,
 * low-confidence principles so downstream organs still get exercised.
 * Exported for tests.
 */
export function heuristicPrinciples(observations: Observation[]): Principle[] {
  return observations
    .filter((o) => o.confidence >= 0.6)
    .slice(0, 5)
    .map((o) => {
      const principleText = `Investigate the pattern behind: ${o.title}`;
      return {
        id: stableId('principle', principleText),
        observation_ids: [o.id],
        what_happened: o.title,
        why_it_worked: 'Unknown — heuristic extraction (no LLM available).',
        principle: principleText,
        category: o.category,
        applies_to_euro_ai: true,
        applies_to_cathedral: false,
        estimated_customer_value: 2 as const,
        engineering_complexity: 3 as const,
        business_value: 2 as const,
        implementation_difficulty: 3 as const,
        risk: 2 as const,
        expected_roi: 2 as const,
        // Deliberately below the immune system's evidence threshold unless
        // the source signal itself was very strong.
        confidence: clamp(o.confidence - 0.2, 0, 1),
        evidence: [`${o.url} — ${excerpt(o.evidence, 160)}`],
      };
    });
}
