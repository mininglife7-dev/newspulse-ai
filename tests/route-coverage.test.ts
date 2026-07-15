import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Route-coverage guard.
 *
 * Every internal `fetch('/api/…')` the UI makes must resolve to an App Router
 * route file (`app/api/…/route.ts`). A mismatch means a customer workflow
 * silently 404s — exactly the class of bug where PUT/DELETE handlers lived on
 * a collection route and read the id from `pathname.split('/').pop()` (which
 * yields the collection name, never an id), so member/evidence/obligation/
 * assessment mutations never routed anywhere.
 *
 * This test statically extracts every `fetch('/api/…')` in the UI and asserts
 * a matching route file exists, treating `${…}` interpolations and literal
 * ids alike as dynamic `[segment]` matches.
 */

const REPO_ROOT = join(__dirname, '..');
const API_ROOT = join(REPO_ROOT, 'app', 'api');
const SCAN_DIRS = ['app', 'components'];
const SOURCE_EXT = /\.(tsx?|jsx?)$/;

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

/** Pull the first string/template argument out of every fetch(...) call. */
function extractFetchPaths(source: string): string[] {
  const paths: string[] = [];
  // Matches fetch( `...` | '...' | "..." ) capturing the literal text up to the
  // closing quote. Template interpolations (${…}) contain no bare quotes in our
  // codebase, so they are captured verbatim.
  const re = /fetch\(\s*([`'"])([^`'"]*)\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    paths.push(m[2]);
  }
  return paths;
}

/**
 * Resolve an internal API path against the app/api tree. A literal segment
 * matches a directory of that name, or — failing that — a dynamic `[x]`
 * directory. A `${…}` interpolation only matches a dynamic `[x]` directory.
 * Returns true when resolution reaches a directory containing route.ts.
 */
function resolvesToRoute(apiPath: string): boolean {
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
    // Fall back to a dynamic [x] directory at this level.
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
    return false;
  }
  return existsSync(join(dir, 'route.ts'));
}

describe('API route coverage', () => {
  const uiPaths = Array.from(
    new Set(
      SCAN_DIRS.flatMap((d) => walk(join(REPO_ROOT, d)))
        .flatMap((f) => extractFetchPaths(readFileSync(f, 'utf8')))
        .filter((p) => p.startsWith('/api/'))
    )
  ).sort();

  it('discovers the UI fetch surface (sanity check)', () => {
    // If this drops to zero the extractor has silently broken and every
    // assertion below would vacuously pass.
    expect(uiPaths.length).toBeGreaterThan(5);
  });

  it.each(uiPaths)('has a route file backing %s', (apiPath) => {
    expect(resolvesToRoute(apiPath)).toBe(true);
  });
});
