/**
 * DNA-012: Schema Migration Validator Tests
 *
 * Verify zero-downtime database schema migration validation:
 * - Backward compatibility checking
 * - Data loss detection
 * - Rollback safety analysis
 * - Real migration scenarios
 *
 * Total: 12 tests covering safe and unsafe migrations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SchemaMigrationValidator,
  SchemaDefinition,
  SchemaChange,
  Table,
  Column,
  ValidationResult,
} from '@/lib/schema-migration-validator';

describe('DNA-012: Schema Migration Validator', () => {
  let validator: SchemaMigrationValidator;

  beforeEach(() => {
    validator = SchemaMigrationValidator.getInstance();
  });

  // =========================================================================
  // Test Suite 1: Backward Compatibility (Safe Migrations)
  // =========================================================================

  describe('Backward Compatibility', () => {
    it('should allow adding a nullable column (backward compatible)', async () => {
      const oldSchema = createSchema(1, [
        createTable('users', [createColumn('id', 'INT', false), createColumn('name', 'VARCHAR(255)', false)]),
      ]);

      const newSchema = createSchema(2, [
        createTable('users', [
          createColumn('id', 'INT', false),
          createColumn('name', 'VARCHAR(255)', false),
          createColumn('email', 'VARCHAR(255)', true), // NEW: nullable
        ]),
      ]);

      const changes: SchemaChange[] = [
        {
          type: 'add_column',
          table: 'users',
          column: 'email',
          details: { nullable: true },
        },
      ];

      const result = await validator.validateMigration(2, oldSchema, newSchema, changes);

      expect(result.valid).toBe(true);
      expect(result.checks.backwardCompatibility.pass).toBe(true);
      expect(result.checks.dataLossDetection.pass).toBe(true);
      expect(result.checks.rollbackSafety.pass).toBe(true);
    });

    it('should allow adding an index (backward compatible)', async () => {
      const oldSchema = createSchema(1, [
        createTable('users', [createColumn('id', 'INT', false), createColumn('email', 'VARCHAR(255)', false)]),
      ]);

      const newSchema = createSchema(2, [
        createTable('users', [createColumn('id', 'INT', false), createColumn('email', 'VARCHAR(255)', false)]),
      ]);

      const changes: SchemaChange[] = [
        {
          type: 'add_index',
          table: 'users',
          column: 'email',
          details: { unique: true },
        },
      ];

      const result = await validator.validateMigration(2, oldSchema, newSchema, changes);

      expect(result.valid).toBe(true);
      expect(result.checks.backwardCompatibility.pass).toBe(true);
    });

    it('should allow adding a constraint to nullable column', async () => {
      const oldSchema = createSchema(1, [
        createTable('users', [createColumn('id', 'INT', false), createColumn('status', 'VARCHAR(50)', true)]),
      ]);

      const newSchema = createSchema(2, [
        createTable('users', [createColumn('id', 'INT', false), createColumn('status', 'VARCHAR(50)', true)]),
      ]);

      const changes: SchemaChange[] = [
        {
          type: 'add_constraint',
          table: 'users',
          column: 'status',
          details: { constraint_type: 'CHECK', expression: "status IN ('active', 'inactive')" },
        },
      ];

      const result = await validator.validateMigration(2, oldSchema, newSchema, changes);

      expect(result.valid).toBe(true);
    });
  });

  // =========================================================================
  // Test Suite 2: Data Loss Detection (Unsafe Migrations)
  // =========================================================================

  describe('Data Loss Detection', () => {
    it('should detect dropping a column (data loss)', async () => {
      const oldSchema = createSchema(1, [
        createTable('users', [
          createColumn('id', 'INT', false),
          createColumn('name', 'VARCHAR(255)', false),
          createColumn('legacy_field', 'VARCHAR(255)', true),
        ]),
      ]);

      const newSchema = createSchema(2, [
        createTable('users', [createColumn('id', 'INT', false), createColumn('name', 'VARCHAR(255)', false)]),
      ]);

      const changes: SchemaChange[] = [
        {
          type: 'drop_column',
          table: 'users',
          column: 'legacy_field',
          details: {},
        },
      ];

      const result = await validator.validateMigration(2, oldSchema, newSchema, changes);

      expect(result.valid).toBe(false);
      expect(result.checks.dataLossDetection.pass).toBe(false);
      expect(result.checks.dataLossDetection.droppedColumns).toContain('users.legacy_field');
      expect(result.risks.some((r) => r.type === 'DATA_LOSS')).toBe(true);
    });

    it('should detect truncating a column (data loss)', async () => {
      const oldSchema = createSchema(1, [
        createTable('users', [createColumn('id', 'INT', false), createColumn('description', 'VARCHAR(1000)', false)]),
      ]);

      const newSchema = createSchema(2, [
        createTable('users', [createColumn('id', 'INT', false), createColumn('description', 'VARCHAR(50)', false)]),
      ]);

      const changes: SchemaChange[] = [
        {
          type: 'modify_column',
          table: 'users',
          column: 'description',
          details: { size_reduction: true },
        },
      ];

      const result = await validator.validateMigration(2, oldSchema, newSchema, changes);

      expect(result.valid).toBe(false);
      expect(result.checks.dataLossDetection.pass).toBe(false);
    });

    it('should detect adding NOT NULL constraint without migration script (potential data loss)', async () => {
      const oldSchema = createSchema(1, [
        createTable('users', [createColumn('id', 'INT', false), createColumn('email', 'VARCHAR(255)', true)]),
      ]);

      const newSchema = createSchema(2, [
        createTable('users', [createColumn('id', 'INT', false), createColumn('email', 'VARCHAR(255)', false)]),
      ]);

      const changes: SchemaChange[] = [
        {
          type: 'add_constraint',
          table: 'users',
          column: 'email',
          details: { constraint_type: 'NOT NULL' },
        },
      ];

      const result = await validator.validateMigration(2, oldSchema, newSchema, changes);

      expect(result.valid).toBe(false);
      expect(result.checks.backwardCompatibility.pass).toBe(false);
    });
  });

  // =========================================================================
  // Test Suite 3: Rollback Safety (Reversibility)
  // =========================================================================

  describe('Rollback Safety', () => {
    it('should allow rollback of ADD COLUMN', async () => {
      const oldSchema = createSchema(1, [
        createTable('users', [createColumn('id', 'INT', false)]),
      ]);

      const newSchema = createSchema(2, [
        createTable('users', [createColumn('id', 'INT', false), createColumn('email', 'VARCHAR(255)', true)]),
      ]);

      const changes: SchemaChange[] = [
        {
          type: 'add_column',
          table: 'users',
          column: 'email',
          details: { nullable: true },
        },
      ];

      const result = await validator.validateMigration(2, oldSchema, newSchema, changes);

      expect(result.checks.rollbackSafety.pass).toBe(true);
      expect(result.checks.rollbackSafety.canRestore).toBe(true);
      expect(result.checks.rollbackSafety.rollbackScript).toContain('DROP COLUMN email');
    });

    it('should flag DROP COLUMN as not safely reversible', async () => {
      const oldSchema = createSchema(1, [
        createTable('users', [createColumn('id', 'INT', false), createColumn('email', 'VARCHAR(255)', false)]),
      ]);

      const newSchema = createSchema(2, [
        createTable('users', [createColumn('id', 'INT', false)]),
      ]);

      const changes: SchemaChange[] = [
        {
          type: 'drop_column',
          table: 'users',
          column: 'email',
          details: {},
        },
      ];

      const result = await validator.validateMigration(2, oldSchema, newSchema, changes);

      expect(result.checks.rollbackSafety.pass).toBe(false);
      expect(result.checks.rollbackSafety.canRestore).toBe(false);
      expect(result.risks.some((r) => r.type === 'ROLLBACK_UNSAFE')).toBe(true);
    });

    it('should generate correct rollback script for multi-step migration', async () => {
      const oldSchema = createSchema(1, [
        createTable('users', [createColumn('id', 'INT', false)]),
      ]);

      const newSchema = createSchema(3, [
        createTable('users', [
          createColumn('id', 'INT', false),
          createColumn('email', 'VARCHAR(255)', true),
          createColumn('phone', 'VARCHAR(20)', true),
        ]),
      ]);

      const changes: SchemaChange[] = [
        {
          type: 'add_column',
          table: 'users',
          column: 'email',
          details: { nullable: true },
        },
        {
          type: 'add_column',
          table: 'users',
          column: 'phone',
          details: { nullable: true },
        },
      ];

      const rollbackScript = await validator.generateRollbackScript(3, changes);

      expect(rollbackScript).toContain('DROP COLUMN phone');
      expect(rollbackScript).toContain('DROP COLUMN email');
      // Verify reverse order
      expect(rollbackScript.indexOf('DROP COLUMN phone')).toBeLessThan(rollbackScript.indexOf('DROP COLUMN email'));
    });
  });

  // =========================================================================
  // Test Suite 4: Real Migration Scenarios
  // =========================================================================

  describe('Real Migration Scenarios', () => {
    it('should validate Cathedral adding audit_timestamp column (safe)', async () => {
      const oldSchema = createSchema(1, [
        createTable('missions', [
          createColumn('id', 'UUID', false),
          createColumn('title', 'VARCHAR(255)', false),
          createColumn('created_at', 'TIMESTAMPTZ', false),
        ]),
      ]);

      const newSchema = createSchema(2, [
        createTable('missions', [
          createColumn('id', 'UUID', false),
          createColumn('title', 'VARCHAR(255)', false),
          createColumn('created_at', 'TIMESTAMPTZ', false),
          createColumn('audit_timestamp', 'TIMESTAMPTZ', false),
        ]),
      ]);

      const changes: SchemaChange[] = [
        {
          type: 'add_column',
          table: 'missions',
          column: 'audit_timestamp',
          details: { default: 'CURRENT_TIMESTAMP', nullable: false },
        },
      ];

      const result = await validator.validateMigration(2, oldSchema, newSchema, changes);

      expect(result.valid).toBe(true);
      expect(result.summary).toContain('safe');
    });

    it('should reject removing compliance_status column (data loss)', async () => {
      const oldSchema = createSchema(1, [
        createTable('enterprises', [
          createColumn('id', 'UUID', false),
          createColumn('name', 'VARCHAR(255)', false),
          createColumn('compliance_status', 'VARCHAR(50)', false),
        ]),
      ]);

      const newSchema = createSchema(2, [
        createTable('enterprises', [
          createColumn('id', 'UUID', false),
          createColumn('name', 'VARCHAR(255)', false),
        ]),
      ]);

      const changes: SchemaChange[] = [
        {
          type: 'drop_column',
          table: 'enterprises',
          column: 'compliance_status',
          details: {},
        },
      ];

      const result = await validator.validateMigration(2, oldSchema, newSchema, changes);

      expect(result.valid).toBe(false);
      expect(result.summary).toContain('critical');
    });

    it('should validate adding unique index on email (safe)', async () => {
      const oldSchema = createSchema(1, [
        createTable('users', [
          createColumn('id', 'UUID', false),
          createColumn('email', 'VARCHAR(255)', false),
        ]),
      ]);

      const newSchema = createSchema(2, [
        createTable('users', [
          createColumn('id', 'UUID', false),
          createColumn('email', 'VARCHAR(255)', false),
        ]),
      ]);

      const changes: SchemaChange[] = [
        {
          type: 'add_index',
          table: 'users',
          column: 'email',
          details: { unique: true },
        },
      ];

      const result = await validator.validateMigration(2, oldSchema, newSchema, changes);

      expect(result.valid).toBe(true);
    });

    it('should validate complex migration with add + index (safe)', async () => {
      const oldSchema = createSchema(1, [
        createTable('tasks', [
          createColumn('id', 'UUID', false),
          createColumn('title', 'VARCHAR(255)', false),
        ]),
      ]);

      const newSchema = createSchema(2, [
        createTable('tasks', [
          createColumn('id', 'UUID', false),
          createColumn('title', 'VARCHAR(255)', false),
          createColumn('priority', 'INT', false),
          createColumn('assigned_to', 'UUID', true),
        ]),
      ]);

      const changes: SchemaChange[] = [
        {
          type: 'add_column',
          table: 'tasks',
          column: 'priority',
          details: { default: 1 },
        },
        {
          type: 'add_column',
          table: 'tasks',
          column: 'assigned_to',
          details: { nullable: true },
        },
        {
          type: 'add_index',
          table: 'tasks',
          column: 'assigned_to',
          details: { unique: false },
        },
      ];

      const result = await validator.validateMigration(2, oldSchema, newSchema, changes);

      expect(result.valid).toBe(true);
      expect(result.checks.backwardCompatibility.pass).toBe(true);
      expect(result.checks.dataLossDetection.pass).toBe(true);
      expect(result.checks.rollbackSafety.pass).toBe(true);
    });
  });

  // =========================================================================
  // Test Suite 5: Validation Results & Reporting
  // =========================================================================

  describe('Validation Results & Reporting', () => {
    it('should include all risk details in validation result', async () => {
      const oldSchema = createSchema(1, [
        createTable('users', [createColumn('id', 'INT', false), createColumn('email', 'VARCHAR(255)', true)]),
      ]);

      const newSchema = createSchema(2, [
        createTable('users', [createColumn('id', 'INT', false)]),
      ]);

      const changes: SchemaChange[] = [
        {
          type: 'drop_column',
          table: 'users',
          column: 'email',
          details: {},
        },
      ];

      const result = await validator.validateMigration(2, oldSchema, newSchema, changes);

      expect(result.valid).toBe(false);
      expect(result.risks.length).toBeGreaterThan(0);
      expect(result.risks.every((r) => r.severity && r.type && r.description)).toBe(true);
    });

    it('should provide mitigation suggestions for risks', async () => {
      const oldSchema = createSchema(1, [
        createTable('users', [createColumn('id', 'INT', false), createColumn('legacy', 'VARCHAR(255)', true)]),
      ]);

      const newSchema = createSchema(2, [
        createTable('users', [createColumn('id', 'INT', false)]),
      ]);

      const changes: SchemaChange[] = [
        {
          type: 'drop_column',
          table: 'users',
          column: 'legacy',
          details: {},
        },
      ];

      const result = await validator.validateMigration(2, oldSchema, newSchema, changes);

      const dataLossRisk = result.risks.find((r) => r.type === 'DATA_LOSS');
      expect(dataLossRisk).toBeDefined();
      expect(dataLossRisk?.mitigation).toBeDefined();
    });

    it('should generate meaningful validation summary', async () => {
      const oldSchema = createSchema(1, [
        createTable('users', [createColumn('id', 'INT', false)]),
      ]);

      const newSchema = createSchema(2, [
        createTable('users', [
          createColumn('id', 'INT', false),
          createColumn('email', 'VARCHAR(255)', true),
        ]),
      ]);

      const changes: SchemaChange[] = [
        {
          type: 'add_column',
          table: 'users',
          column: 'email',
          details: { nullable: true },
        },
      ];

      const result = await validator.validateMigration(2, oldSchema, newSchema, changes);

      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.summary).toContain(result.valid ? 'safe' : 'critical');
    });
  });
});

// =========================================================================
// Test Helpers
// =========================================================================

function createSchema(version: number, tables: Table[]): SchemaDefinition {
  return {
    version,
    tables,
  };
}

function createTable(name: string, columns: Column[]): Table {
  return {
    name,
    columns,
    indexes: [],
    constraints: [],
  };
}

function createColumn(name: string, type: string, nullable: boolean): Column {
  return {
    name,
    type,
    nullable,
  };
}
