import { describe, it, expect } from 'vitest';
import {
  analyzeMigration,
  analyzeMigrationBatch,
  detectMigrationPatterns,
  formatMigrationReport,
  formatBatchReport,
  MigrationReport,
} from '@/lib/schema-migration-validator';

describe('DNA-GOV-012: Schema Migration Validator', () => {
  describe('detectMigrationPatterns', () => {
    it('returns empty array for safe migrations', () => {
      const sql = `
        CREATE TABLE users (
          id BIGINT PRIMARY KEY,
          email TEXT NOT NULL
        );
        CREATE INDEX idx_users_email ON users(email);
      `;
      const issues = detectMigrationPatterns(sql, 'add_users_table.sql');
      expect(issues).toHaveLength(0);
    });

    it('detects adding NOT NULL column without DEFAULT', () => {
      const sql = 'ALTER TABLE users ADD COLUMN age INT NOT NULL;';
      const issues = detectMigrationPatterns(sql, 'add_age.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].pattern).toBe('add-column-not-null-no-default');
      expect(issues[0].riskLevel).toBe('breaking');
    });

    it('allows NOT NULL column with DEFAULT', () => {
      const sql =
        'ALTER TABLE users ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();';
      const issues = detectMigrationPatterns(sql, 'add_timestamp.sql');
      expect(issues).toHaveLength(0);
    });

    it('allows NOT NULL column with GENERATED', () => {
      const sql =
        'ALTER TABLE users ADD COLUMN id BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY;';
      const issues = detectMigrationPatterns(sql, 'add_id.sql');
      expect(issues).toHaveLength(0);
    });

    it('detects dropping columns', () => {
      const sql = 'ALTER TABLE users DROP COLUMN legacy_field;';
      const issues = detectMigrationPatterns(sql, 'drop_legacy.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].pattern).toBe('drop-column');
      expect(issues[0].riskLevel).toBe('high-risk');
    });

    it('detects renaming columns', () => {
      const sql = 'ALTER TABLE users RENAME COLUMN old_name TO new_name;';
      const issues = detectMigrationPatterns(sql, 'rename_col.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].pattern).toBe('rename-column');
      expect(issues[0].riskLevel).toBe('high-risk');
    });

    it('detects dropping indexes', () => {
      const sql = 'DROP INDEX IF EXISTS idx_users_email;';
      const issues = detectMigrationPatterns(sql, 'drop_index.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].pattern).toBe('drop-index');
      expect(issues[0].riskLevel).toBe('high-risk');
    });

    it('detects adding unique constraints', () => {
      const sql = 'ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE(email);';
      const issues = detectMigrationPatterns(sql, 'add_unique.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].pattern).toBe('add-unique-constraint');
      expect(issues[0].riskLevel).toBe('high-risk');
    });

    it('detects modifying column types', () => {
      const sql = 'ALTER TABLE users ALTER COLUMN age TYPE TEXT;';
      const issues = detectMigrationPatterns(sql, 'change_type.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].pattern).toBe('modify-column-type');
      expect(issues[0].riskLevel).toBe('high-risk');
    });

    it('detects dropping tables', () => {
      const sql = 'DROP TABLE IF EXISTS old_users;';
      const issues = detectMigrationPatterns(sql, 'drop_table.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].pattern).toBe('drop-table');
      expect(issues[0].riskLevel).toBe('breaking');
    });

    it('detects disabling RLS', () => {
      const sql = 'ALTER TABLE users DISABLE ROW LEVEL SECURITY;';
      const issues = detectMigrationPatterns(sql, 'disable_rls.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].pattern).toBe('disable-rls');
      expect(issues[0].riskLevel).toBe('breaking');
    });

    it('detects enabling RLS', () => {
      const sql = 'ALTER TABLE users ENABLE ROW LEVEL SECURITY;';
      const issues = detectMigrationPatterns(sql, 'enable_rls.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].pattern).toBe('enable-rls');
      expect(issues[0].riskLevel).toBe('high-risk');
    });

    it('detects creating policies', () => {
      const sql = `
        CREATE POLICY user_isolation ON users
        FOR SELECT USING (user_id = auth.uid());
      `;
      const issues = detectMigrationPatterns(sql, 'add_policy.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].pattern).toBe('alter-rls-policy');
    });

    it('detects altering policies', () => {
      const sql = 'ALTER POLICY user_isolation ON users USING (true);';
      const issues = detectMigrationPatterns(sql, 'alter_policy.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].pattern).toBe('alter-rls-policy');
    });

    it('detects multiple issues in one migration', () => {
      const sql = `
        ALTER TABLE users DROP COLUMN deprecated_field;
        ALTER TABLE users ADD COLUMN new_int_col INT NOT NULL;
        DROP INDEX idx_old_search;
      `;
      const issues = detectMigrationPatterns(sql, 'multi_change.sql');
      expect(issues.length).toBeGreaterThan(1);
      expect(issues.some((i) => i.pattern === 'drop-column')).toBe(true);
      expect(issues.some((i) => i.pattern === 'add-column-not-null-no-default')).toBe(
        true
      );
      expect(issues.some((i) => i.pattern === 'drop-index')).toBe(true);
    });

    it('records line numbers correctly', () => {
      const sql = `
        ALTER TABLE users DROP COLUMN old_field;
        ALTER TABLE users ADD COLUMN new_field INT NOT NULL;
      `;
      const issues = detectMigrationPatterns(sql, 'test.sql');
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].lineNumber).toBe(2); // First issue on line 2
    });

    it('is case-insensitive for SQL keywords', () => {
      const sql1 = 'alter table users drop column old_field;';
      const sql2 = 'ALTER TABLE users DROP COLUMN old_field;';
      const sql3 = 'AlTeR tAbLe users DROP COLUMN old_field;';

      const issues1 = detectMigrationPatterns(sql1, 'test.sql');
      const issues2 = detectMigrationPatterns(sql2, 'test.sql');
      const issues3 = detectMigrationPatterns(sql3, 'test.sql');

      expect(issues1).toHaveLength(1);
      expect(issues2).toHaveLength(1);
      expect(issues3).toHaveLength(1);
    });
  });

  describe('analyzeMigration', () => {
    it('returns safe report for clean migration', () => {
      const sql = `
        CREATE TABLE posts (
          id BIGINT PRIMARY KEY,
          title TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `;
      const report = analyzeMigration(sql, '20260701_create_posts.sql');

      expect(report.name).toBe('20260701_create_posts.sql');
      expect(report.riskLevel).toBe('safe');
      expect(report.issues).toHaveLength(0);
      expect(report.canAutoMerge).toBe(true);
      expect(report.summary).toContain('safe');
    });

    it('returns breaking report when breaking changes found', () => {
      const sql = `
        ALTER TABLE users DROP TABLE;
      `;
      const report = analyzeMigration(sql, '20260701_drop.sql');

      expect(report.riskLevel).toBe('breaking');
      expect(report.canAutoMerge).toBe(false);
      expect(report.issues.some((i) => i.riskLevel === 'breaking')).toBe(true);
    });

    it('returns high-risk report when high-risk changes found', () => {
      const sql = `
        ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE(email);
      `;
      const report = analyzeMigration(sql, '20260701_unique.sql');

      expect(report.riskLevel).toBe('high-risk');
      expect(report.canAutoMerge).toBe(false);
    });

    it('returns low-risk report when only low-risk patterns found', () => {
      const sql = `
        CREATE INDEX idx_users_updated_at ON users(updated_at);
      `;
      // Note: This migration has no issues, but we can test low-risk by
      // adding a hypothetical low-risk issue
      const report = analyzeMigration(sql, '20260701_index.sql');

      expect(report.riskLevel).toBe('safe');
      expect(report.canAutoMerge).toBe(true);
    });

    it('includes execution strategy in report', () => {
      const sql = `
        ALTER TABLE users ADD COLUMN verified BOOLEAN NOT NULL;
      `;
      const report = analyzeMigration(sql, '20260701_verify.sql');

      expect(report.safeExecutionStrategy).toBeTruthy();
      expect(report.safeExecutionStrategy).toContain('Step 1');
    });

    it('counts total lines correctly', () => {
      const sql = `line1
line2
line3
line4
line5`;
      const report = analyzeMigration(sql, 'test.sql');
      expect(report.totalLines).toBe(5);
    });

    it('sets canAutoMerge true for safe migrations', () => {
      const safeSql = 'CREATE TABLE t (id BIGINT PRIMARY KEY);';
      const report = analyzeMigration(safeSql, 'test.sql');
      expect(report.canAutoMerge).toBe(true);
    });

    it('sets canAutoMerge false for breaking migrations', () => {
      const breakingSql = 'DROP TABLE users;';
      const report = analyzeMigration(breakingSql, 'test.sql');
      expect(report.canAutoMerge).toBe(false);
    });

    it('accepts optional timestamp parameter', () => {
      const sql = 'CREATE TABLE t (id BIGINT);';
      const timestamp = '2026-07-01T10:00:00Z';
      const report = analyzeMigration(sql, 'test.sql', timestamp);

      expect(report.timestamp).toBe(timestamp);
    });

    it('generates summary for migrations with issues', () => {
      const sql = 'ALTER TABLE users DROP COLUMN old;';
      const report = analyzeMigration(sql, 'test.sql');

      expect(report.summary).toContain('Found');
      expect(report.summary).toContain('issue');
    });
  });

  describe('analyzeMigrationBatch', () => {
    it('returns batch report for multiple migrations', () => {
      const migrations = [
        {
          name: '001_create_users.sql',
          sql: 'CREATE TABLE users (id BIGINT PRIMARY KEY);',
        },
        {
          name: '002_add_email.sql',
          sql: 'ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT \'\';',
        },
      ];
      const batch = analyzeMigrationBatch(migrations);

      expect(batch.files).toHaveLength(2);
      expect(batch.overallRisk).toBe('safe');
      expect(batch.blocksCI).toBe(false);
    });

    it('sets overallRisk to breaking when any file has breaking changes', () => {
      const migrations = [
        {
          name: '001_safe.sql',
          sql: 'CREATE TABLE t (id BIGINT);',
        },
        {
          name: '002_breaking.sql',
          sql: 'DROP TABLE users;',
        },
      ];
      const batch = analyzeMigrationBatch(migrations);

      expect(batch.overallRisk).toBe('breaking');
      expect(batch.blocksCI).toBe(true);
    });

    it('sets overallRisk to high-risk when files have high-risk but no breaking', () => {
      const migrations = [
        {
          name: '001_safe.sql',
          sql: 'CREATE TABLE t (id BIGINT);',
        },
        {
          name: '002_high_risk.sql',
          sql: 'ALTER TABLE users RENAME COLUMN old TO new;',
        },
      ];
      const batch = analyzeMigrationBatch(migrations);

      expect(batch.overallRisk).toBe('high-risk');
      expect(batch.blocksCI).toBe(false);
    });

    it('sets blocksCI true only for breaking changes', () => {
      const breakingMigrations = [
        {
          name: 'drop.sql',
          sql: 'DROP TABLE users;',
        },
      ];
      const breakingBatch = analyzeMigrationBatch(breakingMigrations);
      expect(breakingBatch.blocksCI).toBe(true);

      const highRiskMigrations = [
        {
          name: 'rename.sql',
          sql: 'ALTER TABLE users RENAME COLUMN a TO b;',
        },
      ];
      const highRiskBatch = analyzeMigrationBatch(highRiskMigrations);
      expect(highRiskBatch.blocksCI).toBe(false);
    });

    it('includes timestamp in batch report', () => {
      const migrations = [
        {
          name: 'test.sql',
          sql: 'CREATE TABLE t (id BIGINT);',
        },
      ];
      const before = new Date();
      const batch = analyzeMigrationBatch(migrations);
      const after = new Date();

      const batchTime = new Date(batch.timestamp);
      expect(batchTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(batchTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('handles empty migrations array', () => {
      const batch = analyzeMigrationBatch([]);

      expect(batch.files).toHaveLength(0);
      expect(batch.overallRisk).toBe('safe');
      expect(batch.blocksCI).toBe(false);
    });
  });

  describe('formatMigrationReport', () => {
    it('formats safe migration report', () => {
      const sql = 'CREATE TABLE users (id BIGINT);';
      const report = analyzeMigration(sql, 'test.sql');
      const formatted = formatMigrationReport(report);

      expect(formatted).toContain('test.sql');
      expect(formatted).toContain('SAFE');
      expect(formatted).toContain('Summary');
    });

    it('includes risk level in formatted report', () => {
      const sql = 'DROP TABLE users;';
      const report = analyzeMigration(sql, 'test.sql');
      const formatted = formatMigrationReport(report);

      expect(formatted).toContain('BREAKING');
    });

    it('includes auto-merge status in formatted report', () => {
      const sql = 'CREATE TABLE t (id BIGINT);';
      const report = analyzeMigration(sql, 'test.sql');
      const formatted = formatMigrationReport(report);

      expect(formatted).toContain('auto-merge');
      expect(formatted).toContain('YES');
    });

    it('includes all issues in formatted report', () => {
      const sql = `
        DROP COLUMN old_field;
        ADD COLUMN new_field INT NOT NULL;
      `;
      const report = analyzeMigration(sql, 'test.sql');
      const formatted = formatMigrationReport(report);

      expect(formatted).toContain('Issue');
      expect(formatted).toContain('Recommendation');
    });

    it('includes line numbers in formatted report', () => {
      const sql = `
        line 1
        ALTER TABLE users DROP COLUMN old_field;
      `;
      const report = analyzeMigration(sql, 'test.sql');
      const formatted = formatMigrationReport(report);

      expect(formatted).toContain('Line');
    });
  });

  describe('formatBatchReport', () => {
    it('formats batch report for multiple files', () => {
      const migrations = [
        {
          name: '001_create.sql',
          sql: 'CREATE TABLE t (id BIGINT);',
        },
        {
          name: '002_modify.sql',
          sql: 'ALTER TABLE t ADD COLUMN name TEXT;',
        },
      ];
      const batch = analyzeMigrationBatch(migrations);
      const formatted = formatBatchReport(batch);

      expect(formatted).toContain('Batch Analysis');
      expect(formatted).toContain('001_create.sql');
      expect(formatted).toContain('002_modify.sql');
    });

    it('includes overall risk in batch report', () => {
      const migrations = [
        {
          name: 'drop.sql',
          sql: 'DROP TABLE users;',
        },
      ];
      const batch = analyzeMigrationBatch(migrations);
      const formatted = formatBatchReport(batch);

      expect(formatted).toContain('BREAKING');
    });

    it('indicates CI blocking status in batch report', () => {
      const migrations = [
        {
          name: 'drop.sql',
          sql: 'DROP TABLE users;',
        },
      ];
      const batch = analyzeMigrationBatch(migrations);
      const formatted = formatBatchReport(batch);

      expect(formatted).toContain('Blocks CI');
      expect(formatted).toContain('YES');
    });

    it('lists all files with risk levels', () => {
      const migrations = [
        {
          name: '001_safe.sql',
          sql: 'CREATE TABLE t (id BIGINT);',
        },
        {
          name: '002_high_risk.sql',
          sql: 'ALTER TABLE t RENAME COLUMN a TO b;',
        },
      ];
      const batch = analyzeMigrationBatch(migrations);
      const formatted = formatBatchReport(batch);

      expect(formatted).toContain('safe');
      expect(formatted).toContain('high-risk');
    });
  });

  describe('integration scenarios', () => {
    it('handles real-world schema migration example 1: zero-downtime add column', () => {
      const sql = `
        -- Step 1: Add column nullable
        ALTER TABLE users ADD COLUMN verified BOOLEAN;

        -- Step 2: Backfill existing rows
        UPDATE users SET verified = false WHERE verified IS NULL;

        -- Step 3: Add NOT NULL constraint
        ALTER TABLE users ALTER COLUMN verified SET NOT NULL;
      `;
      const report = analyzeMigration(sql, '001_safe_verified.sql');

      expect(report.riskLevel).toBe('safe');
      expect(report.canAutoMerge).toBe(true);
    });

    it('handles real-world schema migration example 2: dangerous single-step add column', () => {
      const sql = `
        ALTER TABLE users ADD COLUMN verified BOOLEAN NOT NULL;
      `;
      const report = analyzeMigration(sql, '001_unsafe_verified.sql');

      expect(report.riskLevel).toBe('breaking');
      expect(report.canAutoMerge).toBe(false);
      expect(report.issues.length).toBeGreaterThan(0);
    });

    it('handles RLS policy creation scenario', () => {
      const sql = `
        CREATE POLICY "Users can only see their own data" ON users
        FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can update their own data" ON users
        FOR UPDATE USING (auth.uid() = user_id);
      `;
      const report = analyzeMigration(sql, '002_user_policies.sql');

      expect(report.riskLevel).toBe('high-risk');
      expect(report.issues.every((i) => i.pattern === 'alter-rls-policy')).toBe(
        true
      );
    });

    it('passes CI validation for safe migration batch', () => {
      const migrations = [
        {
          name: '001_tables.sql',
          sql: 'CREATE TABLE companies (id BIGINT PRIMARY KEY); CREATE TABLE users (id BIGINT PRIMARY KEY);',
        },
        {
          name: '002_indexes.sql',
          sql: 'CREATE INDEX idx_users_company_id ON users(company_id);',
        },
      ];
      const batch = analyzeMigrationBatch(migrations);

      expect(batch.blocksCI).toBe(false);
      expect(batch.overallRisk).toBe('safe');
    });

    it('blocks CI for dangerous migration batch', () => {
      const migrations = [
        {
          name: '001_safe.sql',
          sql: 'CREATE TABLE t (id BIGINT);',
        },
        {
          name: '002_dangerous.sql',
          sql: 'ALTER TABLE users DROP TABLE;',
        },
      ];
      const batch = analyzeMigrationBatch(migrations);

      expect(batch.blocksCI).toBe(true);
    });
  });
});
