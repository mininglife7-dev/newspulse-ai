# GOVERNOR VERIFICATION PROCEDURES
**Version:** 1.0  
**Part of:** GOVERNOR EXECUTION FABRIC v1  
**Date:** 2026-07-16

---

## EXECUTIVE SUMMARY

Verification is Governor's mechanism for ensuring claims are supported by objective evidence. This document specifies verification procedures for each action type, from code changes to production deployments.

**Core Rule:** Never claim success without evidence. Every material claim requires objective verification.

---

## VERIFICATION HIERARCHY

```
Level 6: CERTIFICATION
  ↑
Level 5: PRODUCTION VERIFICATION
  ↑
Level 4: INTEGRATION VERIFICATION
  ↑
Level 3: SECURITY VERIFICATION
  ↑
Level 2: FUNCTIONAL VERIFICATION
  ↑
Level 1: EXECUTION VERIFICATION
```

---

## LEVEL 1: EXECUTION VERIFICATION

**Question:** Did the command execute?

**Procedure:**

```python
def verify_execution(operation_result) -> (bool, str):
    """Verify command actually executed"""
    
    # 1. Check for execution errors
    if operation_result.error:
        return False, f"Execution error: {operation_result.error}"
    
    # 2. Check return code (if applicable)
    if hasattr(operation_result, 'return_code'):
        if operation_result.return_code != 0:
            return False, f"Non-zero exit code: {operation_result.return_code}"
    
    # 3. Check for expected output
    if hasattr(operation_result, 'stdout'):
        if not operation_result.stdout:
            return False, "No output received"
    
    # 4. Timestamp execution
    if not hasattr(operation_result, 'timestamp'):
        return False, "No timestamp recorded"
    
    return True, "Execution verified"
```

**Evidence Collection:**
- Command executed (yes/no)
- Return code (0 for success)
- Output captured
- Error messages (if any)
- Timestamp (UTC)
- Duration (milliseconds)

**Example:**
```yaml
Action: push_code
Execution:
  command: "git push origin fix/parser"
  return_code: 0
  stdout: "Enumerating objects: 10..."
  stderr: ""
  duration_ms: 2345
  timestamp: 2026-07-16T10:00:00Z
Status: ✅ VERIFIED
```

---

## LEVEL 2: FUNCTIONAL VERIFICATION

**Question:** Does the result actually do what was intended?

### Code Push

```python
def verify_code_push(branch: str, commit_sha: str) -> (bool, str):
    """Verify code was actually pushed"""
    
    # 1. Fetch branch HEAD
    remote_head = get_branch_head(f"origin/{branch}")
    if remote_head != commit_sha:
        return False, f"Expected {commit_sha}, got {remote_head}"
    
    # 2. Verify commit exists in remote
    commit = get_commit(commit_sha)
    if not commit:
        return False, f"Commit {commit_sha} not found in remote"
    
    # 3. Verify commit message
    if not commit.message:
        return False, "Commit has no message"
    
    # 4. Verify files changed
    files = get_changed_files(commit_sha)
    if not files:
        return False, "No files changed in commit"
    
    # 5. Verify author correct
    if commit.author != "Governor":
        return False, f"Author is {commit.author}, expected Governor"
    
    return True, "Push verified"

# Evidence
evidence = {
    "remote_head": remote_head,
    "commit_sha": commit_sha,
    "message": commit.message,
    "files_changed": len(files),
    "author": commit.author,
    "verified_at": now()
}
```

### Pull Request

```python
def verify_pull_request(pr_number: int) -> (bool, str):
    """Verify PR was created correctly"""
    
    # 1. PR exists
    pr = get_pull_request(pr_number)
    if not pr:
        return False, f"PR #{pr_number} not found"
    
    # 2. Title present
    if not pr.title:
        return False, "PR has no title"
    
    # 3. Description present
    if not pr.description:
        return False, "PR has no description"
    
    # 4. Branches valid
    if not pr.head_branch or not pr.base_branch:
        return False, "PR branches not set"
    
    # 5. No conflicts
    if pr.merge_conflict:
        return False, "PR has merge conflicts"
    
    return True, "PR verified"

# Evidence
evidence = {
    "pr_number": pr_number,
    "pr_url": pr.url,
    "title": pr.title,
    "state": pr.state,
    "mergeable": pr.mergeable,
    "verified_at": now()
}
```

### Database Schema

```python
def verify_schema_deployment(region: str, expected_state: dict) -> (bool, str):
    """Verify schema deployed correctly"""
    
    # 1. Get current schema state
    current_state = get_schema_state(region)
    
    # 2. Verify table count
    if current_state.table_count != expected_state.table_count:
        return False, f"Expected {expected_state.table_count} tables, got {current_state.table_count}"
    
    # 3. Verify all expected tables exist
    for table in expected_state.tables:
        if table not in current_state.tables:
            return False, f"Table {table} not found"
    
    # 4. Verify RLS policies
    if current_state.rls_policy_count != expected_state.rls_policy_count:
        return False, f"Expected {expected_state.rls_policy_count} policies, got {current_state.rls_policy_count}"
    
    # 5. Verify indexes
    if current_state.index_count != expected_state.index_count:
        return False, f"Expected {expected_state.index_count} indexes, got {current_state.index_count}"
    
    # 6. Verify triggers
    if current_state.trigger_count != expected_state.trigger_count:
        return False, f"Expected {expected_state.trigger_count} triggers, got {current_state.trigger_count}"
    
    return True, "Schema verified"

# Evidence
evidence = {
    "tables": current_state.table_count,
    "indexes": current_state.index_count,
    "policies": current_state.rls_policy_count,
    "triggers": current_state.trigger_count,
    "verified_at": now()
}
```

---

## LEVEL 3: SECURITY VERIFICATION

**Question:** Did security rules hold? Are permissions enforced?

### RLS Policy Verification

```python
def verify_rls_enforcement(region: str) -> (bool, str):
    """Verify Row-Level Security is enabled and working"""
    
    # 1. Verify RLS enabled on all tenant tables
    rls_tables = get_tables_with_rls(region)
    required_tables = ["obligations", "assessments", "evidence", "workspace_members"]
    
    missing = set(required_tables) - set(rls_tables)
    if missing:
        return False, f"RLS not enabled on: {missing}"
    
    # 2. Verify policies exist for each table
    for table in required_tables:
        policies = get_rls_policies(region, table)
        required_operations = ["SELECT", "INSERT", "UPDATE", "DELETE"]
        
        policy_operations = set()
        for policy in policies:
            if "USING" in policy.definition:
                policy_operations.add(policy.operation)
        
        missing_ops = set(required_operations) - policy_operations
        if missing_ops:
            return False, f"Missing policies on {table} for: {missing_ops}"
    
    # 3. Test sample RLS scenario
    user_1_id = "test-user-1"
    user_2_id = "test-user-2"
    
    # User 1 should see their own obligations
    result = execute_as_user(
        user_1_id,
        f"SELECT COUNT(*) FROM obligations WHERE user_id='{user_1_id}'"
    )
    if result.error:
        return False, f"RLS query error: {result.error}"
    
    # User 1 should NOT see user 2's obligations
    result = execute_as_user(
        user_1_id,
        f"SELECT COUNT(*) FROM obligations WHERE user_id='{user_2_id}'"
    )
    if result.count > 0:
        return False, "RLS not enforced: user can see other user's data"
    
    return True, "RLS enforcement verified"

# Evidence
evidence = {
    "rls_enabled_tables": len(rls_tables),
    "policies_verified": len(required_tables),
    "test_scenarios": 2,
    "all_passed": True,
    "verified_at": now()
}
```

### Secrets Not Logged

```python
def verify_secrets_not_logged() -> (bool, str):
    """Verify secrets are not appearing in logs"""
    
    # 1. Get all recent logs
    logs = get_recent_logs(hours=24)
    
    # 2. List sensitive patterns
    patterns = [
        r"password\s*[:=]\s*[^,\s]+",
        r"api[_-]key\s*[:=]\s*[^,\s]+",
        r"secret\s*[:=]\s*[^,\s]+",
        r"token\s*[:=]\s*[^,\s]+",
        r"\*\*\*",  # Should only see masked values
    ]
    
    # 3. Scan logs for sensitive data
    found_secrets = []
    for log_entry in logs:
        content = log_entry.message
        for pattern in patterns:
            if re.search(pattern, content, re.IGNORECASE):
                # Check if it's actually masked
                if "***" not in content:
                    found_secrets.append({
                        "log_id": log_entry.id,
                        "pattern": pattern,
                        "timestamp": log_entry.timestamp
                    })
    
    if found_secrets:
        return False, f"Found {len(found_secrets)} logs with potential secrets"
    
    return True, "Logs verified safe"

# Evidence
evidence = {
    "logs_scanned": len(logs),
    "patterns_checked": len(patterns),
    "secrets_found": 0,
    "verified_at": now()
}
```

---

## LEVEL 4: INTEGRATION VERIFICATION

**Question:** Does this work with existing systems?

### Deployment Integration

```python
def verify_deployment_integration(deployment_id: str) -> (bool, str):
    """Verify deployment works with existing systems"""
    
    # 1. Verify dependencies available
    dependencies = get_deployment_dependencies(deployment_id)
    for dep in dependencies:
        if not check_health(dep):
            return False, f"Dependency {dep} unhealthy"
    
    # 2. Verify environment variables
    env_vars = get_required_env_vars()
    deployed_vars = get_deployment_env_vars(deployment_id)
    
    missing = set(env_vars) - set(deployed_vars)
    if missing:
        return False, f"Missing env vars: {missing}"
    
    # 3. Verify database connectivity
    if not test_db_connection(deployment_id):
        return False, "Database connection failed"
    
    # 4. Verify external service integration
    external_services = get_external_services()
    for service in external_services:
        if not test_service_integration(deployment_id, service):
            return False, f"Integration with {service} failed"
    
    return True, "Integration verified"

# Evidence
evidence = {
    "dependencies_checked": len(dependencies),
    "dependencies_healthy": len(dependencies),
    "env_vars_verified": len(env_vars),
    "services_tested": len(external_services),
    "verified_at": now()
}
```

---

## LEVEL 5: PRODUCTION VERIFICATION

**Question:** Is production healthy? Are customers impacted?

### Health Check

```python
def verify_production_health(deployment_id: str) -> (bool, str):
    """Verify production is healthy after deployment"""
    
    # 1. API health check
    health_response = call_api("/api/health", timeout=5)
    if health_response.status != 200:
        return False, f"Health check failed: {health_response.status}"
    
    if health_response.body.status != "ok":
        return False, f"Health status: {health_response.body.status}"
    
    # 2. Check key endpoints
    critical_endpoints = [
        "/api/auth/status",
        "/api/workspaces",
        "/api/obligations"
    ]
    
    for endpoint in critical_endpoints:
        response = call_api(endpoint, timeout=5)
        if response.status >= 500:
            return False, f"Endpoint {endpoint} returning {response.status}"
    
    # 3. Monitor error rates (last 5 minutes)
    errors = get_error_rate(deployment_id, minutes=5)
    if errors.rate > 1.0:  # > 1%
        return False, f"Error rate elevated: {errors.rate}%"
    
    # 4. Check latency (p99)
    latency = get_response_latency(deployment_id, minutes=5)
    if latency.p99 > 1000:  # > 1 second
        return False, f"P99 latency high: {latency.p99}ms"
    
    # 5. Check database performance
    db_latency = get_db_query_latency(deployment_id, minutes=5)
    if db_latency.p99 > 500:  # > 500ms
        return False, f"DB latency high: {db_latency.p99}ms"
    
    return True, "Production health verified"

# Evidence
evidence = {
    "api_health": "ok",
    "critical_endpoints": 3,
    "endpoints_responding": 3,
    "error_rate": errors.rate,
    "p99_latency": latency.p99,
    "uptime": "100%",
    "verified_at": now()
}
```

### Customer Impact

```python
def verify_customer_impact(deployment_id: str) -> (bool, str):
    """Verify deployment doesn't negatively impact customers"""
    
    # 1. Get pre-deployment baseline
    baseline = get_deployment_metrics(previous_deployment_id)
    
    # 2. Get current metrics
    current = get_deployment_metrics(deployment_id)
    
    # 3. Compare metrics
    checks = {
        "error_rate_increased": current.error_rate > baseline.error_rate * 1.1,
        "latency_increased": current.p99_latency > baseline.p99_latency * 1.2,
        "uptime_decreased": current.uptime < baseline.uptime * 0.99,
        "requests_dropped": current.requests_per_minute < baseline.requests_per_minute * 0.9
    }
    
    failed = [k for k, v in checks.items() if v]
    if failed:
        return False, f"Customer impact detected: {failed}"
    
    # 4. Check for new errors
    new_errors = get_new_error_types(deployment_id)
    if new_errors:
        return False, f"New error types: {len(new_errors)}"
    
    # 5. User satisfaction metrics
    user_complaints = get_user_complaints(last_minutes=30)
    if user_complaints > 5:
        return False, f"User complaints: {user_complaints}"
    
    return True, "Customer impact verified minimal"

# Evidence
evidence = {
    "error_rate": current.error_rate,
    "baseline_error_rate": baseline.error_rate,
    "latency_p99": current.p99_latency,
    "baseline_latency": baseline.p99_latency,
    "uptime": current.uptime,
    "new_errors": len(new_errors),
    "user_complaints": user_complaints,
    "verified_at": now()
}
```

---

## LEVEL 6: CERTIFICATION

**Question:** Can we certify this is ready for production?

### GO/NO-GO Criteria

```python
async def issue_certification(deployment_id: str) -> Certification:
    """Issue GO or NO-GO certification"""
    
    all_evidence = []
    
    # 1. Collect all verification evidence
    for level in range(1, 6):  # Levels 1-5
        evidence = await run_level_verification(level, deployment_id)
        all_evidence.append(evidence)
    
    # 2. Check GO criteria
    go_criteria = {
        "execution_verified": all_evidence[0].passed,
        "functional_verified": all_evidence[1].passed,
        "security_verified": all_evidence[2].passed,
        "integration_verified": all_evidence[3].passed,
        "production_healthy": all_evidence[4].passed,
        "no_customer_impact": not all_evidence[4].customer_impact_detected,
    }
    
    all_passed = all(go_criteria.values())
    
    if all_passed:
        certification = Certification(
            status="GO",
            deployment_id=deployment_id,
            timestamp=now(),
            evidence=all_evidence,
            authority="Governor Ω",
            valid_until="permanent"  # Until next issue
        )
    else:
        failed = [k for k, v in go_criteria.items() if not v]
        certification = Certification(
            status="NO-GO",
            deployment_id=deployment_id,
            timestamp=now(),
            evidence=all_evidence,
            blockers=failed,
            authority="Governor Ω"
        )
    
    # 3. Log certification
    audit_log.append({
        "action": "certification_issued",
        "deployment_id": deployment_id,
        "status": certification.status,
        "criteria_passed": sum(go_criteria.values()),
        "criteria_total": len(go_criteria),
        "timestamp": now()
    })
    
    return certification
```

### Certification Evidence Package

```yaml
Certification:
  id: CERT-2026-07-16-001
  status: GO
  deployment_id: d1e2f3g
  issued_at: 2026-07-16T10:00:00Z
  issued_by: Governor Ω
  valid_until: permanent (until superseded)
  
  evidence_summary:
    execution_verified: ✅
    functional_verified: ✅
    security_verified: ✅
    integration_verified: ✅
    production_verified: ✅
  
  detailed_evidence:
    level_1:
      command: git push origin main
      return_code: 0
      timestamp: 2026-07-16T09:55:00Z
    
    level_2:
      tables_deployed: 22
      rls_policies: 43
      verified_at: 2026-07-16T09:56:00Z
    
    level_3:
      rls_enforcement: ✅
      secrets_logged: 0
      verified_at: 2026-07-16T09:57:00Z
    
    level_4:
      dependencies: healthy
      env_vars: configured
      verified_at: 2026-07-16T09:58:00Z
    
    level_5:
      api_health: ok
      error_rate: 0.1%
      p99_latency: 145ms
      verified_at: 2026-07-16T09:59:00Z
  
  approval_chain:
    - issued_by: Governor Ω
      issued_at: 2026-07-16T10:00:00Z
      authority: GOVERNANCE-ANCHOR-2026-07-16
```

---

## VERIFICATION FOR EACH ACTION TYPE

### Push to Main

```yaml
Verification Checklist:
  Level 1 (Execution):
    - ✅ Command executed successfully
    - ✅ Commit visible in remote
  
  Level 2 (Functional):
    - ✅ Commit SHA matches local
    - ✅ Files changed as expected
    - ✅ Author is Governor
  
  Level 3 (Security):
    - ✅ No secrets in commit
    - ✅ Commit signed
  
  Level 4 (Integration):
    - ✅ CI pipeline triggered
  
  Level 5 (Production):
    - N/A (code in staging until deployed)

Claim: "Code pushed to main successfully"
Status: ✅ VERIFIED
Evidence ID: EXEC-2026-07-16-001
```

### Schema Deployment

```yaml
Verification Checklist:
  Level 1 (Execution):
    - ✅ Deployment script ran without errors
    - ✅ All DDL statements executed
  
  Level 2 (Functional):
    - ✅ All tables created (22/22)
    - ✅ All indexes created (62/62)
    - ✅ All RLS policies created (43/43)
  
  Level 3 (Security):
    - ✅ RLS enabled on sensitive tables
    - ✅ Policies tested (isolation verified)
    - ✅ No unencrypted PII in logs
  
  Level 4 (Integration):
    - ✅ Application can connect to DB
    - ✅ Queries execute successfully
  
  Level 5 (Production):
    - ✅ Database healthy
    - ✅ Query latency normal
    - ✅ No customer errors

Claim: "EU database schema deployed and production-ready"
Status: ✅ VERIFIED
Evidence ID: SCHEMA-2026-07-16-001
Certification: 🟢 GO
```

### Production Deployment

```yaml
Verification Checklist:
  Level 1 (Execution):
    - ✅ Build completed successfully
    - ✅ Deployment to production executed
  
  Level 2 (Functional):
    - ✅ All URLs responding
    - ✅ Database queries work
    - ✅ Auth system functioning
  
  Level 3 (Security):
    - ✅ HTTPS enforced
    - ✅ Secrets not exposed
    - ✅ CSRF tokens valid
  
  Level 4 (Integration):
    - ✅ External APIs responding
    - ✅ Email service connected
    - ✅ Payment gateway ready
  
  Level 5 (Production):
    - ✅ API health check: ok
    - ✅ Error rate <1%
    - ✅ P99 latency <500ms
    - ✅ Uptime 100%
    - ✅ No customer complaints

Claim: "Production deployment successful and healthy"
Status: ✅ VERIFIED
Evidence ID: DEPLOY-2026-07-16-001
Certification: 🟢 GO
```

---

## EVIDENCE RETENTION

**Retention Policy:**
- Execution logs: 7 days (searchable)
- Verification results: 90 days (searchable)
- Certifications: permanent (immutable)
- Audit trail: permanent

**Storage:**
- Local logs: `/var/log/governor/`
- Central log aggregation: External SIEM
- Certifications: Git repo `/docs/certifications/`
- Evidence: Long-term storage (S3/GCS)

---

## REFERENCE

**See Also:**
- GOVERNOR-EXECUTION-FABRIC-v1-ARCHITECTURE.md (Layer 5: Verification Engine)
- GOVERNOR-SECURITY-MODEL.md (Security verification)
- GOVERNOR-MODULE-*.md (Module-specific verification)

---

**Status:** PRODUCTION-READY  
**Last Updated:** 2026-07-16  
**Maintained by:** Governor Ω
