import OpenAI from 'openai';

let _client: OpenAI | null = null;

function client(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable');
  }
  _client = new OpenAI({ apiKey });
  return _client;
}

const SUMMARY_SYSTEM_PROMPT = `You are an expert news summarizer.
Given the title and content of a news article, produce a crisp 2-3 sentence summary that:
- Captures the most important facts (who, what, when, where, why).
- Uses neutral, factual tone.
- Avoids filler like "this article discusses".
- Never invents details not present in the source.
Return only the summary text — no preamble, headers, or quotes.`;

/**
 * Summarize a single article with gpt-4o-mini.
 * Falls back to a truncated description on failure.
 */
export async function summarizeArticle(args: {
  title: string;
  content: string;
  url?: string;
}): Promise<string> {
  const { title, content, url } = args;
  const trimmed = (content ?? '').slice(0, 6000).trim();

  if (!trimmed) {
    return title || 'No content available to summarize.';
  }

  try {
    const completion = await client().chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 180,
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Title: ${title}\n${url ? `URL: ${url}\n` : ''}\nArticle content:\n${trimmed}`,
        },
      ],
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    if (summary) return summary;
    return fallbackSummary(content, title);
  } catch (err) {
    console.error('[openai] summarizeArticle error:', err);
    return fallbackSummary(content, title);
  }
}

/**
 * Summarize many articles in parallel with bounded concurrency.
 */
export async function summarizeBatch(
  articles: Array<{ title: string; content: string; url?: string }>,
  concurrency = 4
): Promise<string[]> {
  const results: string[] = new Array(articles.length).fill('');
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= articles.length) return;
      results[i] = await summarizeArticle(articles[i]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, articles.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

function fallbackSummary(content: string, title: string): string {
  const text = (content ?? '').replace(/\s+/g, ' ').trim();
  if (text.length > 0) {
    return text.slice(0, 280) + (text.length > 280 ? '…' : '');
  }
  return title || 'Summary unavailable.';
}
