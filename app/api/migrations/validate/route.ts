import { NextResponse } from 'next/server';
import { validateAllMigrations, generatePRReport, isSafeForDeploy } from '@/lib/schema-migration-validator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/migrations/validate
 *
 * DNA-GOV-012 endpoint: Schema Migration Validator.
 *
 * Scans supabase/migrations directory for pending migrations
 * and validates each for zero-downtime safety.
 *
 * Returns:
 * - 200 + report: All migrations safe for deployment
 * - 400 + report: Dangerous migrations found (merge blocked)
 *
 * Checks:
 * - ❌ DROP TABLE (breaks existing data)
 * - ❌ DROP COLUMN (breaks application code)
 * - ❌ ADD NOT NULL without DEFAULT (breaks existing rows)
 * - ⚠️ DROP INDEX (may impact performance)
 * - ✅ ADD COLUMN (with default or nullable)
 * - ✅ CREATE INDEX
 * - ✅ CREATE TABLE
 *
 * Used by: CI/CD pipeline (merge gate), GitHub PR comments, Founder dashboard
 */
export async function GET(req: Request) {
  try {
    const migrationsDir = './supabase/migrations';

    // Validate all migrations
    const reports = validateAllMigrations(migrationsDir);

    // Determine if safe for deployment
    const allSafe = reports.every((r) => isSafeForDeploy(r, false)); // strictMode=false allows warnings
    const anyDangerous = reports.some((r) => r.riskLevel === 'dangerous');

    // Generate markdown report
    const markdown = generatePRReport(reports);

    // Determine response status
    const status = anyDangerous ? 400 : 200;
    const ok = !anyDangerous;

    console.log(`[schema-validator] Scanned ${reports.length} migration(s): ${ok ? 'SAFE' : 'BLOCKED'}`);

    return NextResponse.json(
      {
        ok,
        timestamp: new Date().toISOString(),
        summary: `${reports.length} migration(s) scanned: ${reports.filter((r) => r.riskLevel === 'safe').length} safe, ${reports.filter((r) => r.riskLevel === 'warning').length} warning, ${reports.filter((r) => r.riskLevel === 'dangerous').length} dangerous`,
        migrations: reports.map((r) => ({
          filename: r.filename,
          riskLevel: r.riskLevel,
          valid: r.valid,
          summary: r.summary,
          issueCount: r.issues.length,
        })),
        markdown,
        details: reports,
      },
      { status, headers: { 'X-Migration-Status': ok ? 'safe' : 'blocked' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[schema-validator] Validation failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Schema migration validation failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
