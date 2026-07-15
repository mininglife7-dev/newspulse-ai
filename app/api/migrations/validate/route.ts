import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  analyzeMigration,
  formatBatchReport,
  type MigrationRiskLevel,
} from '@/lib/schema-migration-validator';

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

    // Scan migrations directory
    let migrationFiles: Array<{
      name: string;
      sql: string;
      timestamp?: string;
    }> = [];
    if (fs.existsSync(migrationsDir)) {
      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'));
      migrationFiles = files.map((file) => ({
        name: file,
        sql: fs.readFileSync(path.join(migrationsDir, file), 'utf-8'),
        timestamp: file.split('_').slice(0, 2).join('_'),
      }));
    }

    // Analyze all migrations
    const reports = migrationFiles.map((m) =>
      analyzeMigration(m.sql, m.name, m.timestamp)
    );

    // Determine if safe for deployment
    const anyBreaking = reports.some((r) => r.riskLevel === 'breaking');
    const anyHighRisk = reports.some((r) => r.riskLevel === 'high-risk');

    // Generate batch report
    const overallRisk: MigrationRiskLevel = anyBreaking
      ? 'breaking'
      : anyHighRisk
        ? 'high-risk'
        : 'safe';
    const batchReport = {
      files: reports,
      overallRisk,
      blocksCI: anyBreaking,
      timestamp: new Date().toISOString(),
    };

    const markdown = formatBatchReport(batchReport);

    // Determine response status
    const status = anyBreaking ? 400 : 200;
    const ok = !anyBreaking;

    console.log(
      `[schema-validator] Scanned ${reports.length} migration(s): ${ok ? 'SAFE' : 'BLOCKED'}`
    );

    return NextResponse.json(
      {
        ok,
        timestamp: new Date().toISOString(),
        summary: `${reports.length} migration(s) scanned: ${reports.filter((r) => r.riskLevel === 'safe').length} safe, ${reports.filter((r) => r.riskLevel === 'low-risk').length} low-risk, ${reports.filter((r) => r.riskLevel === 'high-risk').length} high-risk, ${reports.filter((r) => r.riskLevel === 'breaking').length} breaking`,
        migrations: reports.map((r) => ({
          name: r.name,
          riskLevel: r.riskLevel,
          canAutoMerge: r.canAutoMerge,
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
