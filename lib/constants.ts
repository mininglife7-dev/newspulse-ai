/**
 * Single source of truth for values displayed in the UI *and* used by the
 * backend. Import from here instead of hard-coding, so screens can never
 * drift from what the server actually does.
 */

/** OpenAI model used for article summaries (lib/openai.ts + UI labels). */
export const SUMMARY_MODEL = 'gpt-4o-mini';
