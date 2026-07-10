/**
 * Input validation helpers for API routes.
 * Keep these pure and dependency-free so they are trivially unit-testable and
 * safe to run at the very edge of every request.
 */

/** Maximum accepted length of a search keyword (characters, post-trim). */
export const MAX_KEYWORD_LENGTH = 200;

export interface KeywordParseResult {
  ok: boolean;
  keyword?: string;
  error?: string;
}

/**
 * Validate and normalize a search keyword taken from an untrusted request body.
 *
 * Accepts `unknown` on purpose: the caller must not assume the body is a
 * string (or even an object). Guards against non-string types (which would
 * otherwise throw on `.trim()`), empty input, and abusively long values.
 */
export function parseSearchKeyword(raw: unknown): KeywordParseResult {
  if (typeof raw !== 'string') {
    return {
      ok: false,
      error: 'Missing or invalid "keyword" — expected a non-empty string.',
    };
  }

  const keyword = raw.trim();
  if (!keyword) {
    return { ok: false, error: 'Missing "keyword" in request body.' };
  }

  if (keyword.length > MAX_KEYWORD_LENGTH) {
    return {
      ok: false,
      error: `Keyword too long — maximum ${MAX_KEYWORD_LENGTH} characters.`,
    };
  }

  return { ok: true, keyword };
}

/**
 * Safely read a property from an unknown request body without throwing when the
 * body is null, a primitive, or otherwise not an object.
 */
export function readBodyField(body: unknown, key: string): unknown {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return (body as Record<string, unknown>)[key];
  }
  return undefined;
}
