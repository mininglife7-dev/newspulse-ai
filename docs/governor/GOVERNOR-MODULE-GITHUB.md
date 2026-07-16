# GOVERNOR MODULE: GitHub Integration
**Module Name:** GitHub  
**Module Version:** 1.0  
**Part of:** GOVERNOR EXECUTION FABRIC v1  
**Date:** 2026-07-16

---

## EXECUTIVE SUMMARY

The GitHub module provides Governor with direct repository access, branch management, pull request automation, workflow orchestration, and secrets management. This module is critical for autonomous code deployment and CI/CD pipeline control.

**Capabilities:** Push code, create branches, manage PRs, merge verified PRs, trigger workflows, manage secrets, query issues.

**Permissions Required:** `repo:write`, `workflow:execute`, `secrets:manage`, `actions:read`

---

## MODULE INTERFACE

```python
class GitHubModule(Module):
    """GitHub integration for Governor"""
    
    name = "github"
    version = "1.0"
    dependencies = ["git", "curl", "jq"]
    permissions = ["repo:write", "workflow:execute", "secrets:manage"]
    
    async def init(self) -> bool:
        """Initialize GitHub module, verify credentials"""
        # Check GitHub token available
        # Verify credentials work
        # Detect repository settings
        # Load deployment policies
        return True
    
    async def health_check(self) -> HealthStatus:
        """Verify GitHub is accessible"""
        # Test API connectivity
        # Verify token validity
        # Check rate limits
        pass
```

---

## CAPABILITIES

### 1. Repository Operations

**Push Code**
```yaml
Capability: push_code
Input:
  branch: string
  commit_message: string
  files: {path: content}[]
  author: {name, email}
Output:
  commit_sha: string
  pushed_at: timestamp
  url: string
Requirements:
  - repo:write permission
  - Branch must exist or be created first
  - Commit message must follow convention
Automation: Autonomous (if verified by tests)
```

**Create Branch**
```yaml
Capability: create_branch
Input:
  branch_name: string
  base_branch: string (default: main)
  description: string
Output:
  branch_name: string
  created_at: timestamp
Requirements:
  - repo:write permission
  - Branch name valid (no special chars)
  - Base branch must exist
Automation: Autonomous
```

**List Branches**
```yaml
Capability: list_branches
Input:
  filter: string (optional)
Output:
  branches: {name, last_commit, last_updated}[]
Requirements:
  - repo:read permission
Automation: Autonomous
```

**Delete Branch**
```yaml
Capability: delete_branch
Input:
  branch_name: string
Output:
  deleted_at: timestamp
Requirements:
  - repo:write permission
  - Branch must not be main/master
Automation: Escalate (destructive)
```

### 2. Pull Request Operations

**Create Pull Request**
```yaml
Capability: create_pull_request
Input:
  title: string
  description: string
  head_branch: string
  base_branch: string (default: main)
  draft: bool (default: false)
Output:
  pr_number: int
  pr_url: string
  created_at: timestamp
Requirements:
  - repo:write permission
  - Head branch must exist
  - Base branch must exist
Automation: Autonomous
```

**Update Pull Request**
```yaml
Capability: update_pull_request
Input:
  pr_number: int
  title: string (optional)
  description: string (optional)
  state: "open" | "closed" (optional)
Output:
  pr_number: int
  updated_at: timestamp
Requirements:
  - repo:write permission
  - PR must exist
Automation: Autonomous
```

**Merge Pull Request**
```yaml
Capability: merge_pull_request
Input:
  pr_number: int
  merge_method: "squash" | "merge" | "rebase"
  commit_message: string (optional)
Output:
  merged_at: timestamp
  commit_sha: string
Requirements:
  - repo:write permission
  - PR must be approved (policy-dependent)
  - All checks must pass
Automation: Autonomous (if all gates pass)
Escalate: (if manual approval needed)
```

**Add PR Comment**
```yaml
Capability: add_pr_comment
Input:
  pr_number: int
  comment: string
Output:
  comment_id: int
  posted_at: timestamp
Requirements:
  - repo:write permission
Automation: Autonomous
```

**Request PR Review**
```yaml
Capability: request_pr_review
Input:
  pr_number: int
  reviewers: string[]
Output:
  requested_at: timestamp
  review_status: "requested"
Requirements:
  - repo:write permission
  - Reviewers must be valid users
Automation: Autonomous
```

### 3. Issue Operations

**Create Issue**
```yaml
Capability: create_issue
Input:
  title: string
  description: string
  labels: string[]
  assignee: string (optional)
Output:
  issue_number: int
  issue_url: string
Requirements:
  - repo:write permission
Automation: Autonomous
```

**Update Issue**
```yaml
Capability: update_issue
Input:
  issue_number: int
  title: string (optional)
  state: "open" | "closed" (optional)
  labels: string[] (optional)
Output:
  updated_at: timestamp
Requirements:
  - repo:write permission
Automation: Autonomous
```

**List Issues**
```yaml
Capability: list_issues
Input:
  state: "open" | "closed" | "all"
  labels: string[] (optional)
  assignee: string (optional)
Output:
  issues: {number, title, state, created_at}[]
Requirements:
  - repo:read permission
Automation: Autonomous
```

### 4. Workflow Automation

**Trigger Workflow**
```yaml
Capability: trigger_workflow
Input:
  workflow_file: string (e.g., "supabase-schema-deploy.yml")
  ref: string (branch reference)
  inputs: {key: value}[] (optional)
Output:
  run_id: int
  triggered_at: timestamp
  status_url: string
Requirements:
  - workflow:execute permission
  - Workflow must exist
  - Repository must have Actions enabled
Automation: Autonomous (for non-destructive workflows)
Escalate: (for critical infrastructure changes)
```

**Get Workflow Status**
```yaml
Capability: get_workflow_status
Input:
  workflow_run_id: int
Output:
  status: "queued" | "in_progress" | "completed"
  conclusion: "success" | "failure" | "skipped" (if completed)
  started_at: timestamp
  completed_at: timestamp (if completed)
  duration_ms: int
Requirements:
  - actions:read permission
Automation: Autonomous
```

**Get Workflow Logs**
```yaml
Capability: get_workflow_logs
Input:
  workflow_run_id: int
  job_name: string (optional)
Output:
  logs: string
  completed_steps: {name, status}[]
Requirements:
  - actions:read permission
Automation: Autonomous
```

**Wait for Workflow**
```yaml
Capability: wait_for_workflow
Input:
  workflow_run_id: int
  timeout_seconds: int (default: 3600)
Output:
  final_status: "success" | "failure"
  duration_seconds: int
Requirements:
  - actions:read permission
Automation: Autonomous (with timeout)
```

### 5. Secrets Management

**Set Repository Secret**
```yaml
Capability: set_secret
Input:
  secret_name: string
  secret_value: string
Output:
  set_at: timestamp
  expires_at: timestamp (optional)
Requirements:
  - secrets:manage permission
  - Secret name must be valid (uppercase, underscore only)
  - Value must not be logged
Automation: Escalate (always requires approval)
```

**Get Secret Metadata**
```yaml
Capability: get_secret_metadata
Input:
  secret_name: string
Output:
  name: string
  created_at: timestamp
  updated_at: timestamp
  requires_update: bool
Requirements:
  - secrets:read permission
Automation: Autonomous
```

**List Secrets**
```yaml
Capability: list_secrets
Input: (none)
Output:
  secrets: {name, updated_at}[]
Requirements:
  - secrets:read permission
Note: Values are never returned, only metadata
Automation: Autonomous
```

**Rotate Secret**
```yaml
Capability: rotate_secret
Input:
  secret_name: string
  new_value: string
Output:
  rotated_at: timestamp
  old_value_invalidated: bool
Requirements:
  - secrets:manage permission
Automation: Escalate (if production secret)
```

### 6. Repository Configuration

**Get Branch Protection Rules**
```yaml
Capability: get_branch_protection
Input:
  branch: string
Output:
  require_approvals: bool
  approval_count: int
  require_status_checks: bool
  require_dismissal_of_stale_reviews: bool
  allow_deletions: bool
Requirements:
  - repo:read permission
Automation: Autonomous
```

**Set Branch Protection**
```yaml
Capability: set_branch_protection
Input:
  branch: string
  require_approvals: bool
  approval_count: int
  require_status_checks: bool
  status_checks: string[]
Output:
  set_at: timestamp
Requirements:
  - repo:write permission
  - Admin/owner permission on repository
Automation: Escalate (infrastructure change)
```

---

## EXECUTION STRATEGY

### Tool Selection Priority
1. **GitHub API (preferred)** — Most reliable, best for automation
2. **GitHub CLI** — Available when token set up locally
3. **Git CLI** — Limited, only for local operations
4. **Web automation (Playwright)** — Last resort, slow

### Error Handling

```python
def execute_with_retry(operation, max_retries=3):
    """Execute GitHub operation with exponential backoff"""
    
    for attempt in range(max_retries):
        try:
            result = operation()
            return result
        except GitHubRateLimitError:
            # Wait for rate limit reset
            wait_time = get_rate_limit_reset()
            log(f"Rate limit hit, waiting {wait_time}s")
            sleep(wait_time)
        except GitHubAuthError:
            # Token invalid or expired
            escalate("GitHub authentication failed")
        except GitHubNotFoundError:
            # PR/branch/secret doesn't exist
            return None
        except Exception as e:
            # Exponential backoff
            wait_time = 2 ** attempt
            log(f"Attempt {attempt+1} failed, retrying in {wait_time}s")
            sleep(wait_time)
    
    raise GitHubOperationFailed(f"Failed after {max_retries} attempts")
```

### Verification

Every GitHub operation must be verified:

```python
def verify_push(branch, commit_sha):
    """Verify that code was successfully pushed"""
    # Fetch branch HEAD
    head = get_branch_head(branch)
    
    # Verify commit SHA matches
    if head != commit_sha:
        return False, f"Expected {commit_sha}, got {head}"
    
    # Verify commit is accessible
    commit = get_commit(commit_sha)
    if not commit:
        return False, f"Commit {commit_sha} not found"
    
    # Verify commit message
    if not commit.message.startswith("docs:") and not commit.message.startswith("fix:"):
        return False, f"Invalid commit message format"
    
    return True, "Verified"
```

---

## AUTHORIZATION MATRIX

| Operation | Autonomous | Escalate | Founder |
|-----------|-----------|----------|---------|
| Push code (tested) | ✅ | | |
| Push code (untested) | | ✅ | |
| Create branch | ✅ | | |
| Delete branch | | ✅ | |
| Create PR | ✅ | | |
| Merge PR (all checks pass) | ✅ | | |
| Merge PR (checks failed) | | ✅ | |
| Set secret | | ✅ | |
| Rotate secret | | ✅ | |
| Trigger deployment workflow | | ✅ | |
| Trigger test workflow | ✅ | | |
| Set branch protection | | ✅ | |

---

## IMPLEMENTATION EXAMPLES

### Example 1: Autonomous Code Push

```python
# Task: Push fix to verified code branch
async def push_bugfix():
    # 1. Create branch
    branch = await github.create_branch(
        branch_name="fix/parser-race-condition",
        base_branch="main",
        description="Fix race condition in event parser"
    )
    
    # 2. Push changes
    result = await github.push_code(
        branch=branch.name,
        commit_message="fix: eliminate race condition in parser\n\nRoot cause: concurrent map access without mutex",
        files={
            "lib/parser.ts": new_parser_code,
            "lib/parser.test.ts": test_code
        }
    )
    
    # 3. Verify push
    verified, msg = await verify_push(branch.name, result.commit_sha)
    if not verified:
        await github.delete_branch(branch.name)
        raise RuntimeError(msg)
    
    # 4. Create PR
    pr = await github.create_pull_request(
        title="Fix: parser race condition",
        description="...",
        head_branch=branch.name,
        base_branch="main"
    )
    
    return pr
```

### Example 2: Workflow Deployment with Verification

```python
async def deploy_schema():
    # 1. Trigger workflow
    run = await github.trigger_workflow(
        workflow_file="supabase-schema-deploy.yml",
        ref="main",
        inputs={"environment": "production"}
    )
    
    # 2. Wait for completion
    status = await github.wait_for_workflow(
        workflow_run_id=run.run_id,
        timeout_seconds=600
    )
    
    # 3. Get logs for verification
    logs = await github.get_workflow_logs(run.run_id)
    
    # 4. Verify deployment (parse logs, check for errors)
    if "ERROR" in logs or "FAILED" in logs:
        # Escalate
        await escalate(f"Workflow failed: {run.status_url}")
    
    # 5. Collect evidence
    return {
        "workflow_run": run.run_id,
        "status": status,
        "logs": logs,
        "verified_at": timestamp()
    }
```

### Example 3: PR Merge with Verification

```python
async def merge_verified_pr(pr_number):
    # 1. Get PR details
    pr = await github.get_pr(pr_number)
    
    # 2. Check all required conditions
    if pr.state != "open":
        return None, "PR not open"
    
    if not pr.mergeable:
        return None, "PR has merge conflicts"
    
    # 3. Check CI status
    checks = await github.get_pr_checks(pr_number)
    if any(c.status == "failure" for c in checks):
        return None, "CI checks failed"
    
    # 4. Merge
    merge_result = await github.merge_pull_request(
        pr_number=pr_number,
        merge_method="squash",
        commit_message=pr.title
    )
    
    # 5. Verify merge
    verified, msg = await verify_merge(pr_number, merge_result.commit_sha)
    if not verified:
        raise RuntimeError(f"Merge verification failed: {msg}")
    
    return merge_result, "Merged successfully"
```

---

## CREDENTIALS & SECURITY

**Token Storage:** Encrypted in credential vault, retrieved only when needed.

**Token Permissions:**
- `repo:write` — Create branches, push code, manage PRs
- `workflow:execute` — Trigger workflows
- `secrets:manage` — Manage repository secrets
- `actions:read` — Read workflow status and logs

**Audit Trail:**
- Every GitHub operation logged with timestamp
- Who (Governor role), What (action), When (UTC)
- Why (reason), Result (success/failure)
- Secrets never logged

**Secret Handling:**
- Secrets set via vault, never in code or prompts
- Secret names logged, values never logged
- Automatic secret rotation recommended quarterly

---

## MONITORING & OBSERVABILITY

```yaml
Metrics:
  - Push success rate (%)
  - PR merge latency (seconds)
  - Workflow trigger success rate (%)
  - Average workflow duration (seconds)
  - Rate limit remaining (%)
  - API error rate (%)

Logs:
  - Every GitHub API call with endpoint, parameters
  - Every push with branch, commit SHA
  - Every workflow trigger with inputs
  - Every error with status code, message

Alerts:
  - Rate limit approaching 80%
  - Push failures increase
  - Workflow failures increase
  - Token about to expire
  - Authentication failures
```

---

## TROUBLESHOOTING

### Problem: "403 Forbidden" on Secret Update

**Diagnosis:**
- Token doesn't have `secrets:manage` permission
- Repository is archived or deleted
- User is not owner/admin

**Solution:**
1. Verify token has correct permissions
2. Check repository is active
3. Verify Governor role is authorized

### Problem: Workflow Takes >30 Minutes

**Diagnosis:**
- Resources are constrained
- Workflow has long-running step
- GitHub Actions queue is backlogged

**Solution:**
1. Check workflow logs for slow step
2. Optimize or parallelize step
3. Consider scheduled deployment outside peak hours

### Problem: PR Merge Fails with "Protected Branch"

**Diagnosis:**
- Branch protection requires approvals
- Status checks haven't completed
- Branch is behind main

**Solution:**
1. Request review from protected branch reviewer
2. Wait for status checks
3. Sync branch with main

---

## REFERENCE

**GitHub API Documentation:** https://docs.github.com/en/rest  
**GitHub CLI Documentation:** https://cli.github.com/  
**GitHub Actions:** https://docs.github.com/en/actions

**See Also:**
- GOVERNOR-EXECUTION-FABRIC-v1-ARCHITECTURE.md (Layer 3: Execution Fabric)
- GOVERNOR-SECURITY-MODEL.md (Security policies)
- GOVERNOR-VERIFICATION-PROCEDURES.md (How to verify GitHub operations)

---

**Module Status:** PRODUCTION-READY  
**Last Updated:** 2026-07-16  
**Maintained by:** Governor Ω
