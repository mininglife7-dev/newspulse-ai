import fs from 'fs';
import path from 'path';

export interface MigrationFile {
  filename: string;
  path: string;
  timestamp: string;
  direction: 'up' | 'down';
  content: string;
}

export interface SchemaChange {
  type: 'table_create' | 'table_drop' | 'column_add' | 'column_drop' | 'column_modify' | 'index_create' | 'index_drop' | 'constraint_add' | 'constraint_drop';
  tableName: string;
  columnName?: string;
  severity: 'safe' | 'warning' | 'dangerous';
  description: string;
  remediation?: string;
}

export interface MigrationValidationReport {
  filename: string;
  valid: boolean;
  direction: 'up' | 'down';
  changes: SchemaChange[];
  riskLevel: 'safe' | 'warning' | 'dangerous';
  issues: string[];
  suggestions: string[];
  summary: string;
}

/**
 * Parse SQL migration file content and extract schema changes
 */
export function parseMigrationSQL(content: string): SchemaChange[] {
  const changes: SchemaChange[] = [];

  // Remove comments and normalize whitespace
  const normalized = content
    .replace(/--.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\s+/g, ' ')
    .trim();

  // Pattern: CREATE TABLE
  const createTableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/gi;
  for (const match of normalized.matchAll(createTableRegex)) {
    changes.push({
      type: 'table_create',
      tableName: match[1],
      severity: 'safe',
      description: `Creating table '${match[1]}'`,
    });
  }

  // Pattern: DROP TABLE
  const dropTableRegex = /drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?(\w+)/gi;
  for (const match of normalized.matchAll(dropTableRegex)) {
    changes.push({
      type: 'table_drop',
      tableName: match[1],
      severity: 'dangerous',
      description: `Dropping table '${match[1]}' (BREAKS EXISTING DATA)`,
      remediation: 'Use ALTER TABLE to deprecate columns instead of dropping tables',
    });
  }

  // Pattern: ALTER TABLE ... ADD COLUMN (without NOT NULL constraint)
  // Captures full definition including types with commas (e.g., NUMERIC(10,2) NOT NULL)
  // Uses lookahead to stop at semicolon/end, not intermediate commas
  const addColumnSafeRegex = /alter\s+table\s+(?:public\.)?(\w+)\s+add\s+(?:column\s+)?(\w+)\s+(.+?)(?=;|$)/gi;
  for (const match of normalized.matchAll(addColumnSafeRegex)) {
    // Check if column has NOT NULL without default
    const columnDef = match[0];
    const hasNotNull = /not\s+null/i.test(columnDef);
    const hasDefault = /default\s+/i.test(columnDef);

    if (hasNotNull && !hasDefault) {
      changes.push({
        type: 'column_add',
        tableName: match[1],
        columnName: match[2],
        severity: 'dangerous',
        description: `Adding NOT NULL column '${match[2]}' to '${match[1]}' without default (BREAKS EXISTING ROWS)`,
        remediation: 'Add DEFAULT clause or add column as nullable first, then backfill, then add constraint',
      });
    } else {
      changes.push({
        type: 'column_add',
        tableName: match[1],
        columnName: match[2],
        severity: 'safe',
        description: `Adding column '${match[2]}' to '${match[1]}'`,
      });
    }
  }

  // Pattern: ALTER TABLE ... DROP COLUMN
  const dropColumnRegex = /alter\s+table\s+(?:public\.)?(\w+)\s+drop\s+(?:column\s+)?(\w+)/gi;
  for (const match of normalized.matchAll(dropColumnRegex)) {
    changes.push({
      type: 'column_drop',
      tableName: match[1],
      columnName: match[2],
      severity: 'dangerous',
      description: `Dropping column '${match[2]}' from '${match[1]}' (BREAKS APPLICATION CODE)`,
      remediation: 'Deprecate column first (keep for 2+ releases), then remove',
    });
  }

  // Pattern: CREATE INDEX
  const createIndexRegex = /create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?(\w+)\s+on\s+(?:public\.)?(\w+)/gi;
  for (const match of normalized.matchAll(createIndexRegex)) {
    changes.push({
      type: 'index_create',
      tableName: match[2],
      severity: 'safe',
      description: `Creating index '${match[1]}' on '${match[2]}'`,
    });
  }

  // Pattern: DROP INDEX
  const dropIndexRegex = /drop\s+index\s+(?:if\s+exists\s+)?(?:public\.)?(\w+)/gi;
  for (const match of normalized.matchAll(dropIndexRegex)) {
    changes.push({
      type: 'index_drop',
      tableName: 'unknown',
      severity: 'warning',
      description: `Dropping index '${match[1]}' (may impact query performance)`,
    });
  }

  return changes;
}

/**
 * Validate a migration file for zero-downtime safety
 */export function validateMigration(
  filename: string,
  content: string,
  direction: 'up' | 'down' = 'up'
): MigrationValidationReport {
  const changes = parseMigrationSQL(content);
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check for dangerous changes
  for (const change of changes) {
    if (change.severity === 'dangerous') {
      issues.push(`❌ ${change.description}`);
      if (change.remediation) {
        suggestions.push(`→ ${change.remediation}`);
      }
    } else if (change.severity === 'warning') {
      issues.push(`⚠️  ${change.description}`);
    }
  }

  // Additional validations
  if (content.toLowerCase().includes('truncate')) {
    issues.push('❌ TRUNCATE found (destroys data without backup)');
    suggestions.push('→ Use DELETE instead to preserve audit logs and allow recovery');
  }

  if (content.toLowerCase().includes('drop schema')) {
    issues.push('❌ DROP SCHEMA found (catastrophic data loss)');
    suggestions.push('→ This should never be in a migration');
  }

  // Check for transaction safety
  if (!content.toLowerCase().includes('begin') && !content.toLowerCase().includes('start transaction')) {
    // Supabase handles transactions, but warn if explicit control expected
    suggestions.push('→ Ensure Supabase transaction safety: run as single batch or explicit tx');
  }

  const riskLevel =
    issues.some((i) => i.startsWith('❌'))
      ? 'dangerous'
      : issues.some((i) => i.startsWith('⚠️'))
        ? 'warning'
        : 'safe';

  const dangerousCount = issues.filter((i) => i.startsWith('❌')).length;
  const warningCount = issues.filter((i) => i.startsWith('⚠️')).length;
  const summary =
    dangerousCount > 0
      ? `${dangerousCount} dangerous change(s) found — migration BLOCKED`
      : warningCount > 0
        ? `${warningCount} warning(s) — manual review recommended`
        : `All checks passed — safe to deploy`;

  return {
    filename,
    valid: riskLevel !== 'dangerous',
    direction,
    changes,
    riskLevel,
    issues,
    suggestions,
    summary,
  };
}

/**
 * Scan migrations directory for all pending migrations
 */export function scanMigrations(migrationsDir: string): MigrationFile[] {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs.readdirSync(migrationsDir);
  const migrations: MigrationFile[] = [];

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;

    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Parse filename format: YYYYMMDD_HHmmss_description.sql or similar
    const timestamp = file.split('_').slice(0, 2).join('_');
    const direction = file.includes('.down.') ? 'down' : 'up';

    migrations.push({
      filename: file,
      path: filePath,
      timestamp,
      direction,
      content,
    });
  }

  return migrations.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * Validate all pending migrations
 */export function validateAllMigrations(
  migrationsDir: string
): MigrationValidationReport[] {
  const migrations = scanMigrations(migrationsDir);
  return migrations.map((m) => validateMigration(m.filename, m.content, m.direction));
}

/**
 * Check if migration is safe for automatic deployment
 * Safe = no dangerous changes, optionally no warnings
 */export function isSafeForDeploy(report: MigrationValidationReport, strictMode: boolean = false): boolean {
  if (report.riskLevel === 'dangerous') return false;
  if (strictMode && report.riskLevel === 'warning') return false;
  return true;
}

/**
 * Generate markdown report for GitHub PR review
 */export function generatePRReport(reports: MigrationValidationReport[]): string {
  if (reports.length === 0) {
    return '## 🔍 Schema Migrations\n\nNo migrations detected.\n';
  }

  const allSafe = reports.every((r) => r.riskLevel === 'safe');
  const anyDangerous = reports.some((r) => r.riskLevel === 'dangerous');
  const anyWarning = reports.some((r) => r.riskLevel === 'warning');

  let markdown = '';

  if (anyDangerous) {
    markdown += '## 🔴 Schema Migrations - BLOCKED\n\n';
    markdown += '⚠️ **This PR contains unsafe database migrations and cannot be merged.**\n\n';
  } else if (anyWarning) {
    markdown += '## 🟡 Schema Migrations - REVIEW REQUIRED\n\n';
    markdown += '⚠️ **This PR contains warnings that require manual review before merge.**\n\n';
  } else {
    markdown += '## ✅ Schema Migrations - Safe\n\n';
    markdown += '✓ All migrations pass safety checks.\n\n';
  }

  for (const report of reports) {
    const icon =
      report.riskLevel === 'dangerous' ? '🔴' : report.riskLevel === 'warning' ? '🟡' : '✅';
    markdown += `### ${icon} ${report.filename}\n\n`;
    markdown += `**Status:** ${report.summary}\n\n`;

    if (report.issues.length > 0) {
      markdown += '**Issues:**\n';
      for (const issue of report.issues) {
        markdown += `- ${issue}\n`;
      }
      markdown += '\n';
    }

    if (report.suggestions.length > 0) {
      markdown += '**Suggestions:**\n';
      for (const sugg of report.suggestions) {
        markdown += `- ${sugg}\n`;
      }
      markdown += '\n';
    }

    if (report.changes.length > 0) {
      markdown += '**Changes Detected:**\n';
      for (const change of report.changes) {
        const typeLabel = {
          table_create: '📊 CREATE TABLE',
          table_drop: '🗑️ DROP TABLE',
          column_add: '➕ ADD COLUMN',
          column_drop: '➖ DROP COLUMN',
          column_modify: '✏️ MODIFY COLUMN',
          index_create: '⚡ CREATE INDEX',
          index_drop: '❌ DROP INDEX',
          constraint_add: '🔐 ADD CONSTRAINT',
          constraint_drop: '🔓 DROP CONSTRAINT',
        }[change.type];
        markdown += `- ${typeLabel} \`${change.tableName}${change.columnName ? '.' + change.columnName : ''}\`\n`;
      }
      markdown += '\n';
    }
  }

  markdown += '\n---\n*Generated by DNA-GOV-012 Schema Migration Validator*\n';

  return markdown;
}
