/**
 * CEIS LLM client — minimal fetch-based OpenAI chat-completions wrapper.
 *
 * The platform itself no longer depends on the `openai` SDK, so CEIS talks
 * to the REST API directly with fetch (zero new dependencies). Only used
 * when OPENAI_API_KEY is set; every caller has a deterministic fallback.
 */

export const CEIS_MODEL = 'gpt-4o-mini';

export function llmAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Run a JSON-mode chat completion and return the parsed object.
 * Throws on HTTP errors, missing content or invalid JSON — callers catch
 * and fall back.
 */
export async function completeJson<T>(args: {
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
}): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: CEIS_MODEL,
      temperature: args.temperature ?? 0.2,
      max_tokens: args.maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: args.system },
        { role: 'user', content: args.user },
      ],
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenAI API failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned no content');
  return JSON.parse(content) as T;
}
