/**
 * Pure validation + normalization for the workspace-setup payload.
 *
 * Kept dependency-free (no server-only imports) so it can be unit-tested in
 * isolation and reused by the route handler. Enforces types, required fields,
 * and length caps so oversized or malformed input never reaches the database.
 */

export interface WorkspaceSetupBody {
  companyName: string;
  legalName?: string;
  country: string;
  industry: string;
  employees?: string;
  website?: string;
  description?: string;
}

/** Trimmed values; optional fields collapse to null when empty. */
export interface NormalizedWorkspace {
  companyName: string;
  legalName: string | null;
  country: string;
  industry: string;
  employees: string | null;
  website: string | null;
  description: string | null;
}

/** Per-field maximum lengths (characters, post-trim). */
export const FIELD_LIMITS = {
  companyName: 200,
  legalName: 200,
  country: 100,
  industry: 100,
  employees: 50,
  website: 300,
  description: 2000,
} as const;

type Result =
  | { ok: true; value: NormalizedWorkspace }
  | { ok: false; error: string };

function normalizeField(
  raw: unknown,
  name: keyof typeof FIELD_LIMITS,
  required: boolean
): { value: string | null } | { error: string } {
  if (raw === undefined || raw === null) {
    return required ? { error: `${name} is required` } : { value: null };
  }
  if (typeof raw !== 'string') {
    return { error: `${name} must be a string` };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return required ? { error: `${name} is required` } : { value: null };
  }
  if (trimmed.length > FIELD_LIMITS[name]) {
    return { error: `${name} must be at most ${FIELD_LIMITS[name]} characters` };
  }
  return { value: trimmed };
}

export function validateWorkspaceBody(raw: unknown): Result {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  const body = raw as Record<string, unknown>;

  const fields: Array<[keyof NormalizedWorkspace, keyof typeof FIELD_LIMITS, boolean]> =
    [
      ['companyName', 'companyName', true],
      ['legalName', 'legalName', false],
      ['country', 'country', true],
      ['industry', 'industry', true],
      ['employees', 'employees', false],
      ['website', 'website', false],
      ['description', 'description', false],
    ];

  const out = {} as NormalizedWorkspace;
  for (const [key, limitKey, required] of fields) {
    const result = normalizeField(body[key], limitKey, required);
    if ('error' in result) return { ok: false, error: result.error };
    (out[key] as string | null) = result.value;
  }

  return { ok: true, value: out };
}
