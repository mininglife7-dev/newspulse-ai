import { describe, it, expect } from 'vitest';
import {
  parseMigrationSQL as parseMigrationSQLFunc,
  validateMigration,
  isSafeForDeploy,
  generatePRReport,
  type SchemaChange,
} from '@/lib/schema-migration-validator';

// Alias for clarity
const parseMigrationSQL = parseMigrationSQLFunc;

describe('DNA-GOV-012: Schema Migration Validator', () => {
  describe('Migration Parsing', () => {
    it('should detect CREATE TABLE', () => {
      const sql = 'CREATE TABLE public.users (id UUID PRIMARY KEY);';
      const changes = parseMigrationSQL(sql);

      expect(changes).toContainEqual(
        expect.objectContaining({
          type: 'table_create',
          tableName: 'users',
          severity: 'safe',
        })
      );
    });

    it('should detect DROP TABLE as dangerous', () => {
      const sql = 'DROP TABLE IF EXISTS public.users;';
      const changes = parseMigrationSQL(sql);

      expect(changes).toContainEqual(
        expect.objectContaining({
          type: 'table_drop',
          tableName: 'users',
          severity: 'dangerous',
        })
      );
    });

    it('should detect safe ADD COLUMN (with default)', () => {
      const sql = 'ALTER TABLE users ADD COLUMN status TEXT DEFAULT active;';
      const changes = parseMigrationSQL(sql);

      expect(changes.length).toBeGreaterThan(0);
      expect(changes.some((c) => c.type === 'column_add')).toBe(true);
    });

    it('should detect dangerous ADD COLUMN NOT NULL without DEFAULT', () => {
      const sql = 'ALTER TABLE public.users ADD COLUMN email TEXT NOT NULL;';
      const changes = parseMigrationSQL(sql);

      expect(changes).toContainEqual(
        expect.objectContaining({
          type: 'column_add',
          tableName: 'users',
          columnName: 'email',
          severity: 'dangerous',
        })
      );
    });

    it('should detect DROP COLUMN as dangerous', () => {
      const sql = 'ALTER TABLE public.users DROP COLUMN deprecated_field;';
      const changes = parseMigrationSQL(sql);

      expect(changes).toContainEqual(
        expect.objectContaining({
          type: 'column_drop',
          tableName: 'users',
          columnName: 'deprecated_field',
          severity: 'dangerous',
        })
      );
    });

    it('should detect CREATE INDEX as safe', () => {
      const sql = 'CREATE INDEX users_email_idx ON public.users (email);';
      const changes = parseMigrationSQL(sql);

      expect(changes).toContainEqual(
        expect.objectContaining({
          type: 'index_create',
          severity: 'safe',
        })
      );
    });

    it('should detect DROP INDEX as warning', () => {
      const sql = 'DROP INDEX IF EXISTS users_email_idx;';
      const changes = parseMigrationSQL(sql);

      expect(changes).toContainEqual(
        expect.objectContaining({
          type: 'index_drop',
          severity: 'warning',
        })
      );
    });

    it('should ignore SQL comments', () => {
      const sql = `
        -- This is a comment
        CREATE TABLE public.users (id UUID);
        /* Multi-line
           comment */
        ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
      `;
      const changes = parseMigrationSQL(sql);

      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0].tableName).toBe('users');
    });
  });

  describe('Migration Validation', () => {
    it('should validate safe migration as valid', () => {
      const sql = `
        CREATE TABLE IF NOT EXISTS public.articles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          content TEXT
        );
        CREATE INDEX articles_title_idx ON public.articles (title);
      `;

      const report = validateMigration('001_create_articles.sql', sql, 'up');

      expect(report.valid).toBe(true);
      expect(report.riskLevel).toBe('safe');
      expect(report.issues).toHaveLength(0);
    });

    it('should mark dangerous migrations as invalid', () => {
      const sql = 'DROP TABLE users;';

      const report = validateMigration('999_drop_users.sql', sql, 'up');

      expect(report.valid).toBe(false);
      expect(report.riskLevel).toBe('dangerous');
      expect(report.issues.length).toBeGreaterThan(0);
    });

    it('should detect TRUNCATE as dangerous', () => {
      const sql = 'TRUNCATE TABLE users;';

      const report = validateMigration('bad_migration.sql', sql, 'up');

      expect(report.riskLevel).toBe('dangerous');
      expect(report.issues.some((i) => i.includes('TRUNCATE'))).toBe(true);
    });

    it('should detect DROP SCHEMA as dangerous', () => {
      const sql = 'DROP SCHEMA public;';

      const report = validateMigration('catastrophe.sql', sql, 'up');

      expect(report.riskLevel).toBe('dangerous');
      expect(report.issues.some((i) => i.includes('DROP SCHEMA'))).toBe(true);
    });

    it('should include direction in report', () => {
      const sql = 'CREATE TABLE users (id UUID);';

      const reportUp = validateMigration('001_up.sql', sql, 'up');
      const reportDown = validateMigration('001_down.sql', sql, 'down');

      expect(reportUp.direction).toBe('up');
      expect(reportDown.direction).toBe('down');
    });

    it('should provide remediations for dangerous changes', () => {
      const sql = 'ALTER TABLE users DROP COLUMN email;';

      const report = validateMigration('drop_column.sql', sql, 'up');

      expect(report.suggestions.length).toBeGreaterThan(0);
      expect(report.suggestions[0]).toContain('Deprecate');
    });
  });

  describe('Safety Checks', () => {
    it('should mark safe migrations as safe for deploy', () => {
      const sql = 'CREATE TABLE users (id UUID);';
      const report = validateMigration('safe.sql', sql, 'up');

      expect(isSafeForDeploy(report, false)).toBe(true);
      expect(isSafeForDeploy(report, true)).toBe(true);
    });

    it('should reject dangerous migrations regardless of mode', () => {
      const sql = 'DROP TABLE users;';
      const report = validateMigration('dangerous.sql', sql, 'up');

      expect(isSafeForDeploy(report, false)).toBe(false);
      expect(isSafeForDeploy(report, true)).toBe(false);
    });

    it('should handle warnings based on strict mode', () => {
      const sql = 'DROP INDEX idx_name;';
      const report = validateMigration('warning.sql', sql, 'up');

      expect(isSafeForDeploy(report, false)).toBe(true); // Warnings allowed
      expect(isSafeForDeploy(report, true)).toBe(false); // Strict mode rejects warnings
    });
  });

  describe('PR Report Generation', () => {
    it('should generate markdown for safe migrations', () => {
      const sql = 'CREATE TABLE users (id UUID);';
      const report = validateMigration('safe.sql', sql, 'up');

      const markdown = generatePRReport([report]);

      expect(markdown).toContain('✅');
      expect(markdown).toContain('Safe');
      expect(markdown).toContain('safe.sql');
    });

    it('should generate markdown for dangerous migrations', () => {
      const sql = 'DROP TABLE users;';
      const report = validateMigration('dangerous.sql', sql, 'up');

      const markdown = generatePRReport([report]);

      expect(markdown).toContain('🔴');
      expect(markdown).toContain('BLOCKED');
      expect(markdown).toContain('unsafe');
    });

    it('should include change details in markdown', () => {
      const sql = 'CREATE TABLE users (id UUID); ALTER TABLE users ADD COLUMN email TEXT;';
      const report = validateMigrationSQL('test.sql', sql, 'up');

      const markdown = generatePRReport([report]);

      expect(markdown).toContain('Changes Detected');
      expect(markdown).toContain('users');
    });

    it('should list multiple migrations in report', () => {
      const sql1 = 'CREATE TABLE users (id UUID);';
      const sql2 = 'CREATE TABLE posts (id UUID);';

      const reports = [
        validateMigration('001_users.sql', sql1, 'up'),
        validateMigration('002_posts.sql', sql2, 'up'),
      ];

      const markdown = generatePRReport(reports);

      expect(markdown).toContain('001_users.sql');
      expect(markdown).toContain('002_posts.sql');
      expect(markdown).toMatch(/migration/i);
    });

    it('should handle empty migrations', () => {
      const markdown = generatePRReport([]);

      expect(markdown).toContain('No migrations');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multi-statement migrations', () => {
      const sql = `
        CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX users_email_idx ON users (email);

        ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
      `;

      const report = validateMigration('complex.sql', sql, 'up');

      expect(report.changes.length).toBeGreaterThan(0);
      expect(report.riskLevel).toBe('safe');
    });

    it('should detect mixed safe and dangerous operations', () => {
      const sql = `
        CREATE TABLE new_table (id UUID);
        DROP TABLE old_table;
        ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
      `;

      const report = validateMigration('mixed.sql', sql, 'up');

      expect(report.riskLevel).toBe('dangerous');
      expect(report.issues.length).toBeGreaterThan(0);
    });

    it('should handle schema-qualified names', () => {
      const sql = `
        CREATE TABLE public.users (id UUID);
        ALTER TABLE public.users ADD COLUMN public.status TEXT;
        DROP TABLE IF EXISTS public.archive;
      `;

      const changes = parseMigrationSQL(sql);

      expect(changes.some((c) => c.tableName === 'users')).toBe(true);
      expect(changes.some((c) => c.tableName === 'archive')).toBe(true);
    });

    it('should handle case-insensitive SQL keywords', () => {
      const sqls = [
        'create table users (id uuid);',
        'CREATE TABLE users (id uuid);',
        'Create Table users (id uuid);',
      ];

      for (const sql of sqls) {
        const changes = parseMigrationSQL(sql);
        expect(changes.some((c) => c.type === 'table_create')).toBe(true);
      }
    });
  });

  describe('Report Structure', () => {
    it('should include all required fields in validation report', () => {
      const sql = 'CREATE TABLE users (id UUID);';
      const report = validateMigration('test.sql', sql, 'up');

      expect(report).toHaveProperty('filename');
      expect(report).toHaveProperty('valid');
      expect(report).toHaveProperty('direction');
      expect(report).toHaveProperty('changes');
      expect(report).toHaveProperty('riskLevel');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('suggestions');
      expect(report).toHaveProperty('summary');
    });

    it('should include remediation for dangerous changes', () => {
      const sql = 'ALTER TABLE users DROP COLUMN email;';
      const report = validateMigration('test.sql', sql, 'up');

      const dropChange = report.changes.find((c) => c.type === 'column_drop');
      expect(dropChange?.remediation).toBeDefined();
    });
  });
});

// Helper function for test suite
function validateMigrationSQL(filename: string, sql: string, direction: 'up' | 'down' = 'up') {
  return validateMigration(filename, sql, direction);
}
