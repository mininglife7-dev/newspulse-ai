# GOVERNOR MODULE: Supabase Integration

**Module Name:** Supabase  
**Module Version:** 1.0  
**Part of:** GOVERNOR EXECUTION FABRIC v1  
**Date:** 2026-07-16

---

## EXECUTIVE SUMMARY

The Supabase module provides Governor with direct database access, schema management, migration execution, authentication control, and production monitoring. This module is critical for autonomous database deployments and compliance with production readiness standards.

**Capabilities:** Deploy schema, run migrations, query database, manage auth, backup/restore, monitor health.

**Permissions Required:** `db:write`, `schema:modify`, `backup:create`, `auth:manage`

---

## MODULE INTERFACE

```python
class SupabaseModule(Module):
    """Supabase integration for Governor"""

    name = "supabase"
    version = "1.0"
    dependencies = ["psql", "curl"]
    permissions = ["db:write", "schema:modify", "backup:create"]

    async def init(self) -> bool:
        """Initialize Supabase module"""
        # Load connection strings
        # Test connectivity to databases
        # Verify credentials
        # Detect regional availability
        return True

    async def health_check(self) -> HealthStatus:
        """Verify Supabase is accessible"""
        # Test database connectivity
        # Check auth service
        # Verify backup systems
        pass
```

---

## CAPABILITIES

### 1. Schema Management

**Deploy Schema**

```yaml
Capability: deploy_schema
Input:
  schema_file: string (path to SQL file)
  region: string ("tokyo" | "eu-central-1")
  verify: bool (run verification checks)
  dry_run: bool (test without applying)
Output:
  deployment_id: string
  tables_created: int
  tables_modified: int
  indexes_created: int
  triggers_created: int
  deployed_at: timestamp
  verification_result: {status: "passed" | "failed", details}
Requirements:
  - schema:modify permission
  - Database must be online
  - Schema file must be valid SQL
  - Must pass pre-flight checks
Automation: Autonomous (if verification passes)
Escalate: (if verification fails)
```

**Verify Schema**

```yaml
Capability: verify_schema
Input:
  region: string
  expected_tables: int
  expected_indexes: int
  expected_policies: int
Output:
  verification_passed: bool
  tables_found: int
  indexes_found: int
  policies_found: int
  missing_elements: string[]
  extra_elements: string[]
Requirements:
  - db:read permission
Automation: Autonomous
```

**Get Schema Status**

```yaml
Capability: get_schema_status
Input:
  region: string
Output:
  tables: {name, row_count, size_mb}[]
  indexes: {name, table, unique}[]
  functions: {name, args}[]
  triggers: {name, table, event}[]
  policies: {table, policy_count}[]
Requirements:
  - db:read permission
Automation: Autonomous
```

### 2. Migration Management

**Run Migration**

```yaml
Capability: run_migration
Input:
  migration_file: string
  region: string
  backup_first: bool (default: true)
  verify: bool (default: true)
Output:
  migration_id: string
  success: bool
  applied_at: timestamp
  duration_seconds: int
  backup_id: string (if backup_first=true)
  verification: {status, details}
Requirements:
  - schema:modify permission
  - Backup credentials available
  - Migration must be idempotent
Automation: Autonomous (if verified)
Escalate: (if destructive)
```

**Rollback Migration**

```yaml
Capability: rollback_migration
Input:
  migration_id: string
  region: string
  backup_id: string
Output:
  rollback_at: timestamp
  success: bool
  data_restored: bool
Requirements:
  - backup:restore permission
  - Backup must exist and be valid
Automation: Escalate (always requires approval)
```

**List Migrations**

```yaml
Capability: list_migrations
Input:
  region: string
  limit: int (default: 50)
Output:
  migrations: {id, status, applied_at, creator}[]
Requirements:
  - db:read permission
Automation: Autonomous
```

### 3. Database Queries

**Execute Query**

```yaml
Capability: execute_query
Input:
  sql: string
  region: string
  mode: "read" | "write" (default: read)
  timeout_seconds: int (default: 30)
Output:
  rows: object[]
  rows_affected: int
  duration_ms: int
  query_plan: string (if explain requested)
Requirements:
  - db:read or db:write (depending on mode)
  - Query must be safe (no DROP, no dangerous ops)
Automation: Autonomous (read), Escalate (write)
```

**Verify Data Integrity**

```yaml
Capability: verify_data_integrity
Input:
  region: string
  tables: string[]
  checks: "foreign_keys" | "uniqueness" | "not_null"[]
Output:
  tables_checked: int
  constraints_verified: int
  violations_found: int
  details: {table, violation_type, count}[]
Requirements:
  - db:read permission
Automation: Autonomous
```

**Export Data**

```yaml
Capability: export_data
Input:
  table: string
  region: string
  format: "csv" | "json" | "sql"
  where: string (SQL where clause, optional)
Output:
  export_file: string (path to exported data)
  rows_exported: int
  size_mb: float
Requirements:
  - db:read permission
  - Storage credentials available
Automation: Autonomous
```

### 4. Backup & Recovery

**Create Backup**

```yaml
Capability: create_backup
Input:
  region: string
  backup_name: string
  include_data: bool (default: true)
Output:
  backup_id: string
  backup_name: string
  created_at: timestamp
  size_mb: float
  status: "creating" | "ready"
Requirements:
  - backup:create permission
Automation: Autonomous
```

**List Backups**

```yaml
Capability: list_backups
Input:
  region: string
  limit: int (default: 20)
Output:
  backups: {id, name, created_at, size_mb, status}[]
Requirements:
  - backup:read permission
Automation: Autonomous
```

**Restore from Backup**

```yaml
Capability: restore_backup
Input:
  backup_id: string
  region: string
  target_region: string (optional, for DR)
  verify: bool (default: true)
Output:
  restored_at: timestamp
  success: bool
  verification_result: {status, details}
Requirements:
  - backup:restore permission
  - Target database must exist
Automation: Escalate (always)
```

### 5. Authentication Management

**Create Auth User**

```yaml
Capability: create_auth_user
Input:
  email: string
  password: string (or null for invite)
  metadata: {key: value}[]
Output:
  user_id: string (UUID)
  created_at: timestamp
  email_confirmed: bool
Requirements:
  - auth:manage permission
  - Email must be valid
Automation: Autonomous
```

**Reset User Password**

```yaml
Capability: reset_user_password
Input:
  user_id: string
  new_password: string (or null to send reset link)
Output:
  reset_at: timestamp
  reset_link_sent: bool
Requirements:
  - auth:manage permission
Automation: Escalate (if resetting another user)
```

**List Auth Users**

```yaml
Capability: list_auth_users
Input:
  region: string
  limit: int (default: 100)
  filter: string (optional)
Output:
  users: {id, email, created_at, last_sign_in}[]
  total_count: int
Requirements:
  - auth:read permission
Automation: Autonomous
```

### 6. Row-Level Security (RLS)

**Verify RLS**

```yaml
Capability: verify_rls
Input:
  region: string
  table: string (optional, verify all if omitted)
Output:
  tables_checked: int
  rls_enabled: int
  rls_disabled: int
  tables_without_rls: string[]
  policies_count: int
Requirements:
  - db:read permission
Automation: Autonomous
```

**List RLS Policies**

```yaml
Capability: list_rls_policies
Input:
  region: string
  table: string (optional)
Output:
  policies: {table, policy_name, permissive, definition}[]
  total_count: int
Requirements:
  - db:read permission
Automation: Autonomous
```

**Test RLS Policy**

```yaml
Capability: test_rls_policy
Input:
  region: string
  table: string
  user_id: string
  operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE"
  sample_row: object (optional)
Output:
  allowed: bool
  reason: string
Requirements:
  - db:read permission
Automation: Autonomous
```

### 7. Monitoring & Health

**Get Database Health**

```yaml
Capability: get_database_health
Input:
  region: string
Output:
  status: "healthy" | "degraded" | "down"
  connections: {current: int, max: int}
  disk_usage: {used_mb: float, total_mb: float}
  cpu_usage: float (0-100)
  memory_usage: float (0-100)
  replication_lag_seconds: float
  backup_status: "healthy" | "failed" | "none"
  last_backup: timestamp
Requirements:
  - monitoring:read permission
Automation: Autonomous
```

**Get Query Performance**

```yaml
Capability: get_query_performance
Input:
  region: string
  limit: int (default: 20)
Output:
  queries: {sql_pattern, execution_count, avg_time_ms, max_time_ms}[]
  slow_queries: {sql, execution_time_ms}[]
Requirements:
  - monitoring:read permission
Automation: Autonomous
```

**Monitor Replication**

```yaml
Capability: monitor_replication
Input:
  source_region: string
  target_region: string
Output:
  status: "in_sync" | "behind" | "failed"
  lag_seconds: float
  last_sync: timestamp
  bytes_replicated: int
Requirements:
  - monitoring:read permission
Automation: Autonomous
```

---

## EXECUTION STRATEGY

### Connection Methods (Priority Order)

1. **Session Pooler (Preferred)** — Recommended for automated deployments

   ```
   postgresql://project-ref.supabase.co:6543/postgres?connection_limit=10
   ```

2. **Direct Connection** — For long-running operations

   ```
   postgresql://user:password@host/database
   ```

3. **Supabase CLI** — For schema-specific operations

   ```
   supabase db push --linked
   ```

4. **API** — For auth and metadata operations
   ```
   https://project-ref.supabase.co/rest/v1/
   ```

### Error Handling

```python
def execute_with_verification(operation, region, verify_fn):
    """Execute database operation with verification"""

    # 1. Pre-flight check
    health = get_database_health(region)
    if health.status != "healthy":
        raise DatabaseNotHealthy(f"Database in {health.status} state")

    # 2. Backup (if destructive)
    if operation.is_destructive:
        backup = create_backup(region, f"pre-{operation.name}")
        log(f"Backup created: {backup.id}")

    # 3. Execute operation
    try:
        result = operation.execute()
    except Exception as e:
        if operation.is_destructive and backup:
            log(f"Operation failed, backup available: {backup.id}")
        raise

    # 4. Verify result
    if verify_fn:
        verified, details = verify_fn(result)
        if not verified:
            if operation.is_destructive and backup:
                restore_backup(backup.id)
            raise VerificationFailed(details)

    return result
```

### Pre-Deployment Checklist

```python
async def pre_deployment_check(region):
    """Run before any schema deployment"""
    checks = {
        "database_health": get_database_health(region),
        "available_disk": check_disk_space(region),
        "available_connections": check_connection_limit(region),
        "backup_ready": check_backup_system(region),
        "rls_policies": verify_rls(region),
        "auth_service": check_auth_service(region)
    }

    failed = [k for k, v in checks.items() if not v.passed]
    if failed:
        raise PreDeploymentCheckFailed(f"Checks failed: {failed}")

    return checks
```

---

## AUTHORIZATION MATRIX

| Operation               | Autonomous | Escalate | Founder |
| ----------------------- | ---------- | -------- | ------- |
| Query (read)            | ✅         |          |         |
| Query (write, tested)   | ✅         |          |         |
| Query (write, untested) |            | ✅       |         |
| Deploy schema           |            | ✅       |         |
| Run migration           |            | ✅       |         |
| Rollback migration      |            | ✅       |         |
| Create backup           | ✅         |          |         |
| Restore backup          |            | ✅       |         |
| Create auth user        | ✅         |          |         |
| Reset password          |            | ✅       |         |
| Verify RLS              | ✅         |          |         |
| Modify RLS policy       |            | ✅       |         |

---

## IMPLEMENTATION EXAMPLES

### Example 1: Schema Deployment with Full Verification

```python
async def deploy_production_schema():
    region = "eu-central-1"
    schema_file = "supabase/schema.sql"

    # 1. Pre-flight checks
    checks = await pre_deployment_check(region)
    log(f"Pre-flight checks passed: {checks}")

    # 2. Create backup
    backup = await create_backup(
        region=region,
        backup_name=f"pre-deploy-{datetime.now().isoformat()}"
    )
    log(f"Backup created: {backup.id}")

    # 3. Deploy schema
    deployment = await deploy_schema(
        schema_file=schema_file,
        region=region,
        verify=True,
        dry_run=False
    )
    log(f"Schema deployed: {deployment.deployment_id}")

    # 4. Verify deployment
    if not deployment.verification_result.passed:
        log(f"Verification failed: {deployment.verification_result.details}")
        # Backup is available for recovery
        raise DeploymentVerificationFailed(deployment.verification_result)

    # 5. Collect evidence
    schema_status = await get_schema_status(region)
    health = await get_database_health(region)

    return {
        "deployment_id": deployment.deployment_id,
        "backup_id": backup.id,
        "tables_created": deployment.tables_created,
        "verification": deployment.verification_result,
        "database_health": health,
        "schema_status": schema_status,
        "deployed_at": deployment.deployed_at
    }
```

### Example 2: RLS Verification for Multi-tenant Safety

```python
async def verify_multi_tenant_isolation():
    region = "eu-central-1"

    # 1. Verify RLS enabled on all tenant-sensitive tables
    rls_check = await verify_rls(region)
    if rls_check.rls_disabled > 0:
        raise RLSNotEnabled(f"Tables without RLS: {rls_check.tables_without_rls}")

    # 2. List all policies
    policies = await list_rls_policies(region)
    log(f"Found {policies.total_count} RLS policies")

    # 3. Test sample scenarios
    test_cases = [
        {"user_id": "user-1", "table": "obligations", "op": "SELECT"},
        {"user_id": "user-1", "table": "obligations", "op": "INSERT"},
        {"user_id": "user-2", "table": "obligations", "op": "SELECT"},
    ]

    for test in test_cases:
        result = await test_rls_policy(
            region=region,
            table=test["table"],
            user_id=test["user_id"],
            operation=test["op"]
        )
        log(f"RLS test {test}: allowed={result.allowed}")
        if not result.allowed and test["op"] == "SELECT":
            raise RLSPolicyFailed(f"User should have access: {result.reason}")

    return {
        "verified": True,
        "rls_enabled_tables": rls_check.rls_enabled,
        "policies_verified": len(test_cases),
        "isolation_confirmed": True
    }
```

### Example 3: Data Integrity Verification

```python
async def verify_data_integrity():
    region = "eu-central-1"

    # 1. Run integrity checks
    integrity = await verify_data_integrity(
        region=region,
        tables=["obligations", "assessments", "workspaces"],
        checks=["foreign_keys", "uniqueness", "not_null"]
    )

    # 2. Analyze results
    if integrity.violations_found > 0:
        log(f"Integrity violations found: {integrity.details}")
        # List specific violations
        for violation in integrity.details:
            log(f"  {violation.table}: {violation.violation_type} ({violation.count} violations)")
        raise DataIntegrityError("Constraints violated")

    # 3. Export sample data for audit
    sample = await export_data(
        table="obligations",
        region=region,
        format="json",
        where="LIMIT 10"
    )

    return {
        "tables_checked": integrity.tables_checked,
        "constraints_verified": integrity.constraints_verified,
        "violations": integrity.violations_found,
        "status": "verified"
    }
```

---

## CREDENTIALS & SECURITY

**Connection Details Storage:** Encrypted vault, region-specific.

**Required Credentials:**

- Supabase project URL
- Supabase service role key (for schema operations)
- Supabase anon key (for client operations)
- PostgreSQL connection string (for direct DB access)

**Audit Trail:**

- Every query logged with timestamp, region, user
- DDL operations (CREATE, ALTER, DROP) always logged
- DML operations (INSERT, UPDATE, DELETE) sampled
- Connection strings and passwords never logged

**Secret Handling:**

- Keys stored in credential vault
- Only decrypted when operation executes
- Auto-rotation recommended quarterly
- Access logged with who, when, why

---

## MONITORING & OBSERVABILITY

```yaml
Metrics:
  - Schema deployment success rate (%)
  - Average deployment duration (seconds)
  - Backup creation success rate (%)
  - Database health score (0-100)
  - Query latency (p50, p95, p99)
  - Replication lag (seconds)
  - Storage used (MB, % of quota)
  - Connection count (current/max)

Logs:
  - Every deployment with deployment ID
  - Every migration with details
  - Every backup with backup ID
  - Every RLS policy test
  - Every integrity check

Alerts:
  - Deployment failures
  - Replication lag >30 seconds
  - Storage usage >80% of quota
  - Connection limit exceeded
  - Backup failures
  - Auth service degradation
```

---

## TROUBLESHOOTING

### Problem: "Connection Refused" on Session Pooler

**Diagnosis:**

- Session pooler service down
- Credentials invalid
- Firewall blocking connection

**Solution:**

1. Check Supabase status page
2. Verify connection string
3. Test direct connection (if available)
4. Check IP allowlist

### Problem: Schema Deployment Takes >2 Minutes

**Diagnosis:**

- Large schema file
- Slow index creation
- Long-running migrations
- Heavy concurrent load

**Solution:**

1. Check deployment logs for slow operation
2. Consider splitting into smaller deployments
3. Schedule deployment during low-traffic window
4. Verify database resources available

### Problem: RLS Policy Test Shows "Denied" Unexpectedly

**Diagnosis:**

- User not in expected workspace
- RLS condition too restrictive
- Policy logic error

**Solution:**

1. Verify test user exists and has correct role
2. Review RLS policy definition
3. Check user's workspace membership
4. Test with sample data to understand policy

---

## REFERENCE

**Supabase Documentation:** https://supabase.com/docs  
**PostgreSQL Documentation:** https://www.postgresql.org/docs/  
**RLS Guide:** https://supabase.com/docs/guides/auth/row-level-security

**See Also:**

- GOVERNOR-EXECUTION-FABRIC-v1-ARCHITECTURE.md (Layer 3: Execution Fabric)
- GOVERNOR-VERIFICATION-PROCEDURES.md (Database migration verification)
- GOVERNOR-SECURITY-MODEL.md (Credential management)

---

**Module Status:** PRODUCTION-READY  
**Last Updated:** 2026-07-16  
**Maintained by:** Governor Ω
