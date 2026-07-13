/**
 * DNA-012: Schema Migration Validator
 *
 * Zero-downtime database schema changes with backward compatibility verification.
 * Prevents silent data loss, downtime, and impossible rollbacks during migrations.
 *
 * Validation checks:
 * 1. Backward compatibility: Old queries still work on new schema
 * 2. Data loss detection: No implicit column/data deletion
 * 3. Rollback safety: Schema can be restored to previous version
 */

/**
 * Schema version for tracking migrations
 */
export interface SchemaVersion {
  version: number;
  timestamp: string;
  description: string;
  changes: SchemaChange[];
  status: 'pending' | 'complete' | 'failed' | 'rolled_back';
  appliedAt?: string;
  rollbackAt?: string;
}

/**
 * Individual schema change (column, index, constraint, etc.)
 */
export interface SchemaChange {
  type: 'add_column' | 'drop_column' | 'modify_column' | 'add_index' | 'drop_index' | 'add_constraint' | 'drop_constraint';
  table: string;
  column?: string;
  details: Record<string, unknown>;
}

/**
 * Validation result with detailed findings
 */
export interface ValidationResult {
  valid: boolean;
  version: number;
  checks: {
    backwardCompatibility: CompatibilityCheck;
    dataLossDetection: DataLossCheck;
    rollbackSafety: RollbackCheck;
  };
  risks: MigrationRisk[];
  summary: string;
}

export interface CompatibilityCheck {
  pass: boolean;
  details: string;
  oldQueries: string[]; // Example queries that must still work
  failedQueries?: string[]; // Queries that fail on new schema
}

export interface DataLossCheck {
  pass: boolean;
  details: string;
  droppedColumns?: string[];
  truncatedColumns?: string[]; // ALTER ... TRUNCATE without data migration
  implicitCasts?: string[]; // Changes that may lose precision
}

export interface RollbackCheck {
  pass: boolean;
  details: string;
  rollbackScript?: string;
  canRestore: boolean;
}

export interface MigrationRisk {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
  description: string;
  mitigation?: string;
}

/**
 * Schema Migration Validator
 *
 * Validates database schema changes before applying to production.
 */
export class SchemaMigrationValidator {
  private static instance: SchemaMigrationValidator;

  private constructor() {}

  static getInstance(): SchemaMigrationValidator {
    if (!SchemaMigrationValidator.instance) {
      SchemaMigrationValidator.instance = new SchemaMigrationValidator();
    }
    return SchemaMigrationValidator.instance;
  }

  /**
   * Validate a schema migration before applying to production
   *
   * Returns validation result with detailed checks:
   * - Backward compatibility (old queries work)
   * - Data loss detection (no silent data deletion)
   * - Rollback safety (can restore to previous state)
   */
  async validateMigration(
    version: number,
    oldSchema: SchemaDefinition,
    newSchema: SchemaDefinition,
    changes: SchemaChange[]
  ): Promise<ValidationResult> {
    const risks: MigrationRisk[] = [];

    // Check 1: Backward Compatibility
    const compatCheck = await this.checkBackwardCompatibility(oldSchema, newSchema, changes);
    if (!compatCheck.pass) {
      risks.push({
        severity: 'CRITICAL',
        type: 'BACKWARD_COMPATIBILITY',
        description: `Old queries will fail on new schema: ${compatCheck.failedQueries?.join(', ')}`,
        mitigation: 'Add compatibility layer or update query patterns',
      });
    }

    // Check 2: Data Loss Detection
    const dataLossCheck = await this.checkDataLoss(oldSchema, newSchema, changes);
    if (!dataLossCheck.pass) {
      risks.push({
        severity: 'CRITICAL',
        type: 'DATA_LOSS',
        description: `Migration would drop or truncate data: ${dataLossCheck.droppedColumns?.join(', ')}`,
        mitigation: 'Create backup before migration; add data migration script',
      });
    }

    // Check 3: Rollback Safety
    const rollbackCheck = await this.checkRollbackSafety(oldSchema, newSchema, changes);
    if (!rollbackCheck.pass) {
      risks.push({
        severity: 'CRITICAL',
        type: 'ROLLBACK_UNSAFE',
        description: 'Schema cannot be rolled back to previous version',
        mitigation: 'Ensure all changes are reversible; add rollback script',
      });
    }

    const valid = compatCheck.pass && dataLossCheck.pass && rollbackCheck.pass && risks.every((r) => r.severity !== 'CRITICAL');

    return {
      valid,
      version,
      checks: {
        backwardCompatibility: compatCheck,
        dataLossDetection: dataLossCheck,
        rollbackSafety: rollbackCheck,
      },
      risks,
      summary: valid ? 'Migration safe to apply ✅' : `Migration has ${risks.filter((r) => r.severity === 'CRITICAL').length} critical issues ❌`,
    };
  }

  /**
   * Check backward compatibility
   *
   * Ensures old query patterns still work on new schema.
   * Example: Renaming a column breaks existing queries.
   */
  private async checkBackwardCompatibility(
    oldSchema: SchemaDefinition,
    newSchema: SchemaDefinition,
    changes: SchemaChange[]
  ): Promise<CompatibilityCheck> {
    const failedQueries: string[] = [];

    // Common backward-compatibility breaking changes
    for (const change of changes) {
      if (change.type === 'drop_column') {
        // Any query selecting this column will fail
        failedQueries.push(`SELECT ${change.column} FROM ${change.table}`);
      }

      if (change.type === 'modify_column') {
        const oldType = this.getColumnType(oldSchema, change.table, change.column!);
        const newType = this.getColumnType(newSchema, change.table, change.column!);

        // Type changes that break compatibility
        if (this.isTypeBreakingChange(oldType, newType)) {
          failedQueries.push(`SELECT CAST(${change.column} AS ${newType}) FROM ${change.table}`);
        }
      }

      if (change.type === 'add_constraint') {
        // New NOT NULL constraint breaks inserts with null values
        if ((change.details.constraint_type as string) === 'NOT NULL') {
          failedQueries.push(`INSERT INTO ${change.table} (${change.column}) VALUES (NULL)`);
        }
      }
    }

    const pass = failedQueries.length === 0;
    return {
      pass,
      details: pass ? 'All backward compatibility checks passed' : `${failedQueries.length} queries will fail`,
      oldQueries: [
        `SELECT * FROM ${oldSchema.tables[0]?.name}`,
        `SELECT id, name FROM ${oldSchema.tables[0]?.name} WHERE id = ?`,
      ],
      failedQueries: failedQueries.length > 0 ? failedQueries : undefined,
    };
  }

  /**
   * Check for data loss
   *
   * Detects schema changes that would silently drop or truncate data.
   */
  private async checkDataLoss(
    oldSchema: SchemaDefinition,
    newSchema: SchemaDefinition,
    changes: SchemaChange[]
  ): Promise<DataLossCheck> {
    const droppedColumns: string[] = [];
    const truncatedColumns: string[] = [];
    const implicitCasts: string[] = [];

    for (const change of changes) {
      // Dropped columns = data loss
      if (change.type === 'drop_column') {
        droppedColumns.push(`${change.table}.${change.column}`);
      }

      // TRUNCATE without data migration = data loss
      if (change.type === 'modify_column' && (change.details.truncate as boolean)) {
        truncatedColumns.push(`${change.table}.${change.column}`);
      }

      // Type changes that lose precision (e.g., VARCHAR(255) → VARCHAR(50))
      if (change.type === 'modify_column') {
        const sizeReduction = (change.details.size_reduction as boolean) || false;
        if (sizeReduction) {
          implicitCasts.push(`${change.table}.${change.column} may lose data if column value > new size`);
        }
      }
    }

    const pass = droppedColumns.length === 0 && truncatedColumns.length === 0 && implicitCasts.length === 0;

    return {
      pass,
      details: pass ? 'No data loss detected' : `Migration would lose data: ${droppedColumns.length} dropped, ${truncatedColumns.length} truncated, ${implicitCasts.length} implicit casts`,
      droppedColumns: droppedColumns.length > 0 ? droppedColumns : undefined,
      truncatedColumns: truncatedColumns.length > 0 ? truncatedColumns : undefined,
      implicitCasts: implicitCasts.length > 0 ? implicitCasts : undefined,
    };
  }

  /**
   * Check rollback safety
   *
   * Ensures schema can be restored to previous version.
   * DROP statements are harder to reverse than ADD statements.
   */
  private async checkRollbackSafety(
    oldSchema: SchemaDefinition,
    newSchema: SchemaDefinition,
    changes: SchemaChange[]
  ): Promise<RollbackCheck> {
    const rollbackScripts: string[] = [];
    let canRestore = true;

    for (const change of changes) {
      // ADD operations are reversible
      if (change.type === 'add_column') {
        rollbackScripts.push(`ALTER TABLE ${change.table} DROP COLUMN ${change.column};`);
      }

      if (change.type === 'add_index') {
        rollbackScripts.push(`DROP INDEX idx_${change.table}_${change.column} ON ${change.table};`);
      }

      if (change.type === 'add_constraint') {
        rollbackScripts.push(`ALTER TABLE ${change.table} DROP CONSTRAINT ${change.details.name};`);
      }

      // DROP operations are NOT reversible without backup
      if (change.type === 'drop_column' || change.type === 'drop_index') {
        canRestore = false; // Cannot auto-restore dropped data
      }
    }

    const pass = canRestore;
    const rollbackScript = rollbackScripts.join('\n');

    return {
      pass,
      details: pass ? 'Schema migration is reversible' : 'Schema migration requires backup for rollback',
      rollbackScript: rollbackScript || undefined,
      canRestore,
    };
  }

  /**
   * Check if column type change breaks backward compatibility
   */
  private isTypeBreakingChange(oldType: string, newType: string): boolean {
    // VARCHAR → INT is breaking (string to int conversion)
    if (oldType.includes('VARCHAR') && newType === 'INT') return true;
    // BOOLEAN → VARCHAR might work but is questionable
    if (oldType === 'BOOLEAN' && newType.includes('VARCHAR')) return true;
    // Same type = not breaking
    if (oldType === newType) return false;
    // Default: assume breaking
    return true;
  }

  /**
   * Get column type from schema definition
   */
  private getColumnType(schema: SchemaDefinition, table: string, column: string): string {
    const tbl = schema.tables.find((t) => t.name === table);
    if (!tbl) return 'UNKNOWN';
    const col = tbl.columns.find((c) => c.name === column);
    return col?.type || 'UNKNOWN';
  }

  /**
   * Generate rollback script to restore schema to previous version
   */
  async generateRollbackScript(version: number, changes: SchemaChange[]): Promise<string> {
    const rollbackSteps: string[] = [
      `-- Rollback script for schema version ${version}`,
      `-- Apply in reverse order of changes`,
      '',
    ];

    // Reverse the order of changes (last change first)
    for (let i = changes.length - 1; i >= 0; i--) {
      const change = changes[i];

      if (change.type === 'add_column') {
        rollbackSteps.push(`ALTER TABLE ${change.table} DROP COLUMN ${change.column};`);
      }

      if (change.type === 'drop_column') {
        // Cannot auto-restore dropped column; requires backup
        rollbackSteps.push(`-- WARNING: Cannot restore dropped column ${change.table}.${change.column} without backup`);
      }

      if (change.type === 'add_index') {
        rollbackSteps.push(`DROP INDEX idx_${change.table}_${change.column} ON ${change.table};`);
      }

      if (change.type === 'drop_index') {
        rollbackSteps.push(`-- WARNING: Cannot restore dropped index ${change.table}.${change.column} without backup`);
      }
    }

    return rollbackSteps.join('\n');
  }
}

/**
 * Schema definition (for validation purposes)
 */
export interface SchemaDefinition {
  version: number;
  tables: Table[];
}

export interface Table {
  name: string;
  columns: Column[];
  indexes: Index[];
  constraints: Constraint[];
}

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: unknown;
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface Constraint {
  name: string;
  type: string;
  columns: string[];
}
