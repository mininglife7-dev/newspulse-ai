/**
 * Single source of truth for values displayed in the UI *and* used by the
 * backend. Import from here instead of hard-coding, so screens can never
 * drift from what the server actually does.
 */

/** OpenAI model used for article summaries (lib/openai.ts + UI labels). */
export const SUMMARY_MODEL = 'gpt-4o-mini';

/**
 * Canonical site URL for metadata, robots.txt, and sitemap.xml.
 * Previously each file resolved its own fallback (layout: localhost,
 * robots/sitemap: vercel.app) — three answers to one question.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://newspulse-ai.vercel.app';
