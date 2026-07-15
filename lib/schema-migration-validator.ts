/**
 * DNA-GOV-012: Schema Migration Validator
 *
 * Autonomously validates Supabase schema migrations for safety and provides
 * zero-downtime guidance. Prevents dangerous patterns from reaching production.
 *
 * Problem: Schema changes can lock tables, drop data, or break production if not
 * executed carefully. Manual review is error-prone and slows deployment.
 *
 * Solution: Analyze each migration for common anti-patterns; classify by risk;
 * recommend safe execution strategy. Integrates with CI to block unsafe migrations.
 */

export type MigrationRiskLevel = 'safe' | 'low-risk' | 'high-risk' | 'breaking';
export type MigrationPattern =
  | 'add-column-not-null-no-default'
  | 'drop-column'
  | 'rename-column'
  | 'drop-index'
  | 'add-unique-constraint'
  | 'modify-column-type'
  | 'drop-table'
  | 'alter-rls-policy'
  | 'enable-rls'
  | 'disable-rls'
  | 'unknown';

export interface MigrationIssue {
  pattern: MigrationPattern;
  riskLevel: MigrationRiskLevel;
  lineNumber: number;
  description: string;
  evidence: string;
  recommendation: string;
}

export interface MigrationReport {
  name: string;
  path: string;
  timestamp: string;
  analysisTimestamp: string;
  totalLines: number;
  issues: MigrationIssue[];
  riskLevel: MigrationRiskLevel;
  summary: string;
  safeExecutionStrategy: string;
  canAutoMerge: boolean;
}

export interface MigrationBatch {
  files: MigrationReport[];
  overallRisk: MigrationRiskLevel;
  blocksCI: boolean;
  timestamp: string;
}

/**
 * Detects dangerous patterns in a SQL migration string.
 */
export function detectMigrationPatterns(
  sql: string,
  fileName: string
): MigrationIssue[] {
  const issues: MigrationIssue[] = [];
  const lines = sql.split('\n');

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim().toUpperCase();

    // Pattern 1: Adding NOT NULL column without default
    // Only match ADD COLUMN, not ALTER COLUMN (which is modifying existing)
    if (trimmed.includes('ADD COLUMN')) {
      if (
        trimmed.includes('NOT NULL') &&
        !trimmed.includes('DEFAULT') &&
        !trimmed.includes('GENERATED')
      ) {
        issues.push({
          pattern: 'add-column-not-null-no-default',
          riskLevel: 'breaking',
          lineNumber,
          description:
            'Adding NOT NULL column without DEFAULT will fail on existing rows',
          evidence: line,
          recommendation:
            'Step 1: Add column nullable. Step 2: Backfill values. Step 3: Add NOT NULL constraint.',
        });
      }
    }

    // Pattern 2: Dropping column
    if (
      trimmed.includes('DROP COLUMN') ||
      trimmed.includes('DROP CONSTRAINT')
    ) {
      issues.push({
        pattern: 'drop-column',
        riskLevel: 'high-risk',
        lineNumber,
        description: 'Dropping column is not reversible without backup restore',
        evidence: line,
        recommendation:
          'Consider deprecation first (add "deprecated_" prefix, mark in RLS). Archive data before drop. Plan rollback.',
      });
    }

    // Pattern 3: Renaming column
    if (trimmed.includes('RENAME COLUMN')) {
      issues.push({
        pattern: 'rename-column',
        riskLevel: 'high-risk',
        lineNumber,
        description: 'Renaming breaks any code still using old name',
        evidence: line,
        recommendation:
          'Create new column, backfill, update code, drop old. Or use view alias for compatibility layer.',
      });
    }

    // Pattern 4: Dropping index
    if (trimmed.includes('DROP INDEX')) {
      issues.push({
        pattern: 'drop-index',
        riskLevel: 'high-risk',
        lineNumber,
        description: 'Dropping index may degrade query performance',
        evidence: line,
        recommendation:
          'Verify no active queries rely on this index. Monitor query performance after drop.',
      });
    }

    // Pattern 5: Adding unique constraint
    if (trimmed.includes('ADD CONSTRAINT') && trimmed.includes('UNIQUE')) {
      issues.push({
        pattern: 'add-unique-constraint',
        riskLevel: 'high-risk',
        lineNumber,
        description: 'Adding unique constraint fails if duplicates exist',
        evidence: line,
        recommendation:
          'First, find and resolve duplicates. Then add constraint. Plan for data cleanup.',
      });
    }

    // Pattern 6: Modifying column type
    if (trimmed.includes('ALTER TABLE') && trimmed.includes('TYPE')) {
      issues.push({
        pattern: 'modify-column-type',
        riskLevel: 'high-risk',
        lineNumber,
        description: 'Changing column type may fail on incompatible data',
        evidence: line,
        recommendation:
          'Create new column with new type, backfill with CAST, update code, drop old column.',
      });
    }

    // Pattern 7: Dropping table
    if (trimmed.includes('DROP TABLE')) {
      issues.push({
        pattern: 'drop-table',
        riskLevel: 'breaking',
        lineNumber,
        description:
          'Dropping table destroys all data — not recoverable without backup',
        evidence: line,
        recommendation:
          'Export data first. Plan full rollback procedure. Verify no dependent features exist.',
      });
    }

    // Pattern 8: Disabling RLS
    if (trimmed.includes('DISABLE ROW LEVEL SECURITY')) {
      issues.push({
        pattern: 'disable-rls',
        riskLevel: 'breaking',
        lineNumber,
        description:
          'Disabling RLS exposes all rows to all authenticated users',
        evidence: line,
        recommendation:
          'Never disable RLS in production. If needed, re-enable immediately after data fix.',
      });
    }

    // Pattern 9: Enabling RLS
    if (trimmed.includes('ENABLE ROW LEVEL SECURITY')) {
      issues.push({
        pattern: 'enable-rls',
        riskLevel: 'high-risk',
        lineNumber,
        description:
          'Enabling RLS may block existing queries that expect unrestricted access',
        evidence: line,
        recommendation:
          'Verify all RLS policies exist before enabling. Test against real app queries first.',
      });
    }

    // Pattern 10: Altering RLS policies
    if (trimmed.includes('ALTER POLICY') || trimmed.includes('CREATE POLICY')) {
      issues.push({
        pattern: 'alter-rls-policy',
        riskLevel: 'high-risk',
        lineNumber,
        description:
          'Changing RLS policy may grant or revoke access unexpectedly',
        evidence: line,
        recommendation:
          'Review policy logic carefully. Test against all expected user roles and tenants.',
      });
    }
  });

  return issues;
}

/**
 * Classify overall risk level based on issues found.
 */
function classifyRiskLevel(issues: MigrationIssue[]): MigrationRiskLevel {
  const hasBreaking = issues.some((i) => i.riskLevel === 'breaking');
  const hasHighRisk = issues.some((i) => i.riskLevel === 'high-risk');
  const hasLowRisk = issues.some((i) => i.riskLevel === 'low-risk');

  if (hasBreaking) return 'breaking';
  if (hasHighRisk) return 'high-risk';
  if (hasLowRisk) return 'low-risk';
  return 'safe';
}

/**
 * Generate safe execution strategy based on issues.
 */
function generateExecutionStrategy(issues: MigrationIssue[]): string {
  if (issues.length === 0) {
    return 'Direct execution. Zero downtime expected. Standard production safety checks apply.';
  }

  const recommendations = issues.map((i) => `- ${i.recommendation}`).join('\n');

  return `Recommended zero-downtime execution plan:

${recommendations}

Rollback: Review logs immediately after apply. Keep previous version deployed and ready for instant switch.`;
}

/**
 * Analyze a single migration file.
 */
export function analyzeMigration(
  sql: string,
  fileName: string,
  fileTimestamp?: string
): MigrationReport {
  const issues = detectMigrationPatterns(sql, fileName);
  const riskLevel = classifyRiskLevel(issues);
  const safeExecutionStrategy = generateExecutionStrategy(issues);
  const canAutoMerge = riskLevel === 'safe' || riskLevel === 'low-risk';

  const summary =
    issues.length === 0
      ? 'Migration is safe. Zero-downtime execution expected.'
      : `Found ${issues.length} potential issue(s). Review recommendations before deploying.`;

  return {
    name: fileName,
    path: fileName,
    timestamp: fileTimestamp || new Date().toISOString(),
    analysisTimestamp: new Date().toISOString(),
    totalLines: sql.split('\n').length,
    issues,
    riskLevel,
    summary,
    safeExecutionStrategy,
    canAutoMerge,
  };
}

/**
 * Analyze a batch of migration files.
 */
export function analyzeMigrationBatch(
  migrations: Array<{ name: string; sql: string; timestamp?: string }>
): MigrationBatch {
  const files = migrations.map((m) =>
    analyzeMigration(m.sql, m.name, m.timestamp)
  );

  const riskLevels = files.map((f) => f.riskLevel);
  const overallRisk: MigrationRiskLevel = riskLevels.some(
    (r) => r === 'breaking'
  )
    ? 'breaking'
    : riskLevels.some((r) => r === 'high-risk')
      ? 'high-risk'
      : riskLevels.some((r) => r === 'low-risk')
        ? 'low-risk'
        : 'safe';

  const blocksCI = overallRisk === 'breaking';

  return {
    files,
    overallRisk,
    blocksCI,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format migration report for human reading.
 */
export function formatMigrationReport(report: MigrationReport): string {
  const header = `Schema Migration: ${report.name}
Risk Level: ${report.riskLevel.toUpperCase()}
Safe to auto-merge: ${report.canAutoMerge ? 'YES' : 'NO'}
Lines analyzed: ${report.totalLines}
Issues found: ${report.issues.length}

Summary: ${report.summary}

`;

  if (report.issues.length === 0) {
    return header + 'Execution strategy: ' + report.safeExecutionStrategy;
  }

  const issuesText = report.issues
    .map(
      (issue, i) => `
Issue ${i + 1} (${issue.riskLevel}): ${issue.description}
  Line ${issue.lineNumber}: ${issue.evidence}
  Recommendation: ${issue.recommendation}
`
    )
    .join('\n');

  return (
    header +
    'Issues:\n' +
    issuesText +
    '\n\nExecution Strategy:\n' +
    report.safeExecutionStrategy
  );
}

/**
 * Format batch report for display.
 */
export function formatBatchReport(batch: MigrationBatch): string {
  const header = `Schema Migration Batch Analysis
Overall Risk: ${batch.overallRisk.toUpperCase()}
Blocks CI: ${batch.blocksCI ? 'YES - MANUAL REVIEW REQUIRED' : 'NO - Ready to merge'}
Files analyzed: ${batch.files.length}
Analysis completed: ${batch.timestamp}

`;

  const fileReports = batch.files
    .map((f) => `- ${f.name}: ${f.riskLevel} (${f.issues.length} issues)`)
    .join('\n');

  return header + '\nFiles:\n' + fileReports;
}
