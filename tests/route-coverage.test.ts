import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Route-coverage guard.
 *
 * Every internal `fetch('/api/…')` the UI makes must resolve to an App Router
 * route file (`app/api/…/route.ts`) that actually exports the HTTP method the
 * UI calls. Both halves matter:
 *
 *  - Missing file — the class of bug where PUT/DELETE handlers lived on a
 *    collection route and read the id from `pathname.split('/').pop()` (which
 *    yields the collection name, never an id), so member/evidence/obligation/
 *    assessment mutations never routed anywhere.
 *  - Missing method — a subtler variant: the route file exists but doesn't
 *    export the verb the UI uses, so the call 405s instead of 404s.
 *
 * This test statically extracts every `fetch('/api/…')` call in the UI, treats
 * `${…}` interpolations and literal ids alike as dynamic `[segment]` matches,
 * and asserts both a backing route file and a matching method export exist.
 */

const REPO_ROOT = join(__dirname, '..');
const API_ROOT = join(REPO_ROOT, 'app', 'api');
const SCAN_DIRS = ['app', 'components'];
const SOURCE_EXT = /\.(tsx?|jsx?)$/;
const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS',
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (SOURCE_EXT.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

interface FetchCall {
  paths: string[]; // candidate URLs (a ternary URL yields more than one)
  methods: string[]; // verbs used (a ternary method yields more than one)
}

/**
 * Extract every fetch(...) call with its candidate paths and methods. Uses a
 * paren-matching scan (string-aware) so multi-line option objects and ternary
 * arguments are captured whole.
 */
function extractFetchCalls(source: string): FetchCall[] {
  const calls: FetchCall[] = [];
  let idx = 0;
  while ((idx = source.indexOf('fetch(', idx)) !== -1) {
    let i = idx + 'fetch('.length;
    let depth = 1;
    let inStr: string | null = null;
    while (i < source.length && depth > 0) {
      const c = source[i];
      if (inStr) {
        if (c === '\\') {
          i += 2;
          continue;
        }
        if (c === inStr) inStr = null;
      } else if (c === '"' || c === "'" || c === '`') {
        inStr = c;
      } else if (c === '(') {
        depth++;
      } else if (c === ')') {
        depth--;
      }
      i++;
    }
    const callText = source.slice(idx + 'fetch('.length, i - 1);
    idx = i;

    const paths = Array.from(
      callText.matchAll(/[`'"](\/api[^`'"]*)[`'"]/g)
    ).map((m) => m[1]);
    if (paths.length === 0) continue; // dynamic/computed URL — not statically checkable

    calls.push({ paths, methods: extractMethods(callText) });
  }
  return calls;
}

/**
 * Verbs a fetch call uses. No `method:` property means fetch's GET default. A
 * `method:` whose value carries string literals (including a ternary like
 * `cond ? 'PATCH' : 'POST'`) yields every literal verb. A `method:` set from a
 * non-literal variable is unknowable statically → empty (skips the check
 * rather than silently asserting GET, which would pass vacuously).
 */
function extractMethods(callText: string): string[] {
  const prop = callText.match(/method:\s*([^,\n}]+)/);
  if (!prop) return ['GET'];
  const literals = Array.from(prop[1].matchAll(/[`'"](\w+)[`'"]/g)).map((m) =>
    m[1].toUpperCase()
  );
  return literals; // empty when the method is a bare variable — unverifiable
}

/**
 * Resolve an internal API path to its route.ts file. A literal segment matches
 * a directory of that name, or — failing that — a dynamic `[x]` directory. A
 * `${…}` interpolation only matches a dynamic `[x]` directory. Returns the
 * route file path, or null when no route backs the URL.
 */
function resolveRouteFile(apiPath: string): string | null {
  const withoutQuery = apiPath.split('?')[0].split('#')[0];
  const segments = withoutQuery
    .replace(/^\/api\/?/, '')
    .split('/')
    .filter(Boolean);

  let dir = API_ROOT;
  for (const segment of segments) {
    const isDynamicValue = segment.includes('${');
    if (
      !isDynamicValue &&
      existsSync(join(dir, segment)) &&
      statSync(join(dir, segment)).isDirectory()
    ) {
      dir = join(dir, segment);
      continue;
    }
    const dynamicDir = readdirSync(dir).find(
      (e) =>
        e.startsWith('[') &&
        e.endsWith(']') &&
        statSync(join(dir, e)).isDirectory()
    );
    if (dynamicDir) {
      dir = join(dir, dynamicDir);
      continue;
    }
    return null;
  }
  const routeFile = join(dir, 'route.ts');
  return existsSync(routeFile) ? routeFile : null;
}

/** HTTP verbs a route file exports, whether as a function or a const. */
function routeMethods(routeFile: string): Set<string> {
  const src = readFileSync(routeFile, 'utf8');
  const methods = new Set<string>();
  const group = HTTP_METHODS.join('|');
  for (const m of src.matchAll(
    new RegExp(`export\\s+(?:async\\s+)?function\\s+(${group})\\b`, 'g')
  )) {
    methods.add(m[1]);
  }
  for (const m of src.matchAll(
    new RegExp(`export\\s+const\\s+(${group})\\s*=`, 'g')
  )) {
    methods.add(m[1]);
  }
  return methods;
}

const allCalls = SCAN_DIRS.flatMap((d) => walk(join(REPO_ROOT, d)))
  .flatMap((f) => extractFetchCalls(readFileSync(f, 'utf8')))
  .filter((c) => c.paths.some((p) => p.startsWith('/api/')));

describe('API route coverage', () => {
  const uiPaths = Array.from(
    new Set(
      allCalls.flatMap((c) => c.paths).filter((p) => p.startsWith('/api/'))
    )
  ).sort();

  it('discovers the UI fetch surface (sanity check)', () => {
    // If this drops to zero the extractor has silently broken and every
    // assertion below would vacuously pass.
    expect(uiPaths.length).toBeGreaterThan(5);
  });

  it.each(uiPaths)('has a route file backing %s', (apiPath) => {
    expect(resolveRouteFile(apiPath)).not.toBeNull();
  });

  // Build one method-coverage case per (verb → candidate paths) the UI uses.
  // A ternary URL/method pairs each verb with every candidate path; the verb
  // is satisfied when *any* candidate route exports it (so `PATCH /api/x/[id]`
  // and `POST /api/x` from one editing-vs-creating call both pass).
  const methodCases = Array.from(
    new Set(
      allCalls.flatMap((c) => {
        const apiPaths = c.paths.filter((p) => p.startsWith('/api/'));
        return c.methods.map((method) => `${method} ${apiPaths.join(' | ')}`);
      })
    )
  ).sort();

  it.each(methodCases)('has a handler for %s', (label) => {
    const method = label.slice(0, label.indexOf(' '));
    const rest = label.slice(method.length + 1);
    const candidatePaths = rest.split(' | ');
    const served = candidatePaths.some((p) => {
      const file = resolveRouteFile(p);
      return file !== null && routeMethods(file).has(method);
    });
    expect(served, `${method} not exported by any of: ${rest}`).toBe(true);
  });
});
