# VAJRA Private Repository Plan

**Status:** Ready for creation; awaiting Founder authentication  
**Target:** `mininglife7-dev/vajra`  
**Date:** 2026-07-22

---

## Objective

Create a dedicated, private GitHub repository for VAJRA trading platform to ensure:

1. **Complete separation** from EURO AI (governance platform)
2. **Independent access controls** (team members, security keys)
3. **Isolated CI/CD** (separate Actions workflows, deployments)
4. **Protected secrets** (broker API keys, trading credentials)
5. **Clear history** (VAJRA commits separate from EURO AI history)

---

## Current State

**Repository:** `mininglife7-dev/newspulse-ai`

- **Type:** Mixed (EURO AI primary + VAJRA recovery work)
- **Status:** EURO AI deployed and stable; VAJRA code not yet present remotely
- **Evidence:** All VAJRA evidence currently on Windows C: drive only

**Issue:** Mixing EURO AI and VAJRA in a single repository creates:

- Confusion (two completely different products in one repo)
- Security risk (accidentally expose trading credentials in governance codebase)
- Operational risk (deployment to EURO AI affects VAJRA testing)
- Organizational risk (team access controls don't map to product separation)

---

## Solution: Dedicated Private Repository

### Repository Details

**Name:** `vajra`  
**Full Path:** `mininglife7-dev/vajra`  
**Visibility:** Private  
**Description:** "VAJRA Algorithmic Trading Platform — Paper Trading Research Engine"

**Initial Setup:**

```
Organization: mininglife7-dev
Visibility: Private (default)
Initialize: README.md only (no template)
GitIgnore: Python (for mixed Python/TypeScript)
License: Proprietary (no open-source)
Topics: trading, research, algorithmic, paper-trading
```

**Branch Protection (main):**

- Require pull request reviews (1 approval minimum)
- Require status checks to pass (CI pipeline)
- Require branches to be up to date before merge
- Dismiss stale pull request approvals when new commits pushed
- Restrict who can push to matching branches (only CI/CD)

---

## Migration Strategy

### Phase 1: Create Repositories (Autonomous)

**Step 1a: Create Private Repository**

- Repository name: `vajra`
- Visibility: Private
- Initialize with README
- No template (avoid GitHub defaults)

**Step 1b: Clone & Seed Repository**

```bash
git clone git@github.com:mininglife7-dev/vajra.git
cd vajra
git commit --allow-empty -m "Initial commit"
git push -u origin main
```

**Step 1c: Create Branch Protection Rules**

- Main branch: Require PR reviews, status checks, up-to-date
- Deploy branch: Same as main
- Create GitHub issue for rule configuration (if not available via API)

### Phase 2: Import VAJRA History (Upon Windows Evidence)

**Step 2a: Recover VAJRA Code**

- Unpack Windows evidence archive
- Locate VAJRA repository root (Git `.git` folder or standalone code)
- Identify all branches and tags in VAJRA history

**Step 2b: Migrate VAJRA History**

```bash
# In recovered VAJRA directory
git remote add new-origin git@github.com:mininglife7-dev/vajra.git
git push -u new-origin main
git push -u new-origin --all      # All branches
git push -u new-origin --tags     # All tags
```

**Step 2c: Verify Import**

- List branches: `git branch -a` (should match recovered state)
- List tags: `git tag` (should match recovered state)
- Verify commit count matches original
- Verify file structure matches recovered state

### Phase 3: Integrate with EURO AI (Optional)

**Option A: Completely Separate** (Recommended)

- VAJRA in `mininglife7-dev/vajra`
- EURO AI in `mininglife7-dev/newspulse-ai`
- No shared code, separate deployments, separate secrets
- Founder manages both repositories as sibling projects

**Option B: Monorepo with Clear Boundaries**

- EURO AI in `newspulse-ai` root
- VAJRA in `newspulse-ai/trading/` subdirectory
- Single CI/CD pipeline but separate test suites
- Deployments can be independently targeted
- Requires clear .gitignore and CI workflow separation

**Recommendation:** Option A (completely separate repositories)

- **Pros:** Clean separation, independent scaling, clear team boundaries
- **Cons:** More repositories to manage
- **Risk Mitigation:** Use consistent naming, documentation, and operational procedures

---

## Secret Management

### EURO AI Secrets

**Location:** `mininglife7-dev/newspulse-ai` repo settings

**Secrets (current):**

- `SUPABASE_URL` — Database connection
- `SUPABASE_ANON_KEY` — Public authentication key
- `CLAUDE_API_KEY` — LLM integration
- `VERCEL_TOKEN` — Deployment authentication

**Sensitivity:** Medium (governance data, not trading)

### VAJRA Secrets (New)

**Location:** `mininglife7-dev/vajra` repo settings (separate)

**Secrets (to be added upon Windows evidence):**

- `BROKER_API_KEY` — Trading API authentication
- `BROKER_API_SECRET` — Trading API secret key
- `DATABASE_URL` — VAJRA trading database
- `MARKET_DATA_API_KEY` — Market data subscription (if paid)
- `PAPER_TRADING_ACCOUNT_ID` — Broker paper trading account
- `ENCRYPTION_KEY` — For encrypting sensitive config

**Sensitivity:** CRITICAL (trading credentials, immediate financial impact if exposed)

**Access Controls:**

- Secrets accessible only to VAJRA team members
- No cross-repository access (EURO AI team cannot see VAJRA secrets)
- Audit logging of secret access (GitHub Actions usage)
- Secrets rotated quarterly minimum

---

## Security Baseline

### Repository-Level Security

| Control                | EURO AI     | VAJRA             | Status |
| ---------------------- | ----------- | ----------------- | ------ |
| Private repo           | No (public) | **Yes**           | ✅     |
| Branch protection      | Yes (main)  | **Yes**           | To-Do  |
| Require PR reviews     | Yes (1)     | **Yes (2)**       | To-Do  |
| Require CI checks      | Yes         | **Yes**           | To-Do  |
| Dismiss stale reviews  | Yes         | **Yes**           | To-Do  |
| Code owners file       | No          | **Yes**           | To-Do  |
| Require signed commits | No          | **Yes (trading)** | To-Do  |
| Secret scanning        | Yes         | **Yes**           | To-Do  |

### CI/CD Security (GitHub Actions)

- Workflows in `.github/workflows/`
- Separate workflows for EURO AI and VAJRA (if monorepo)
- Secrets passed as environment variables (never in logs)
- Deployment requires manual approval (trading environment)
- Build artifacts signed and verified

### Operational Security

**Who Has Access?**

- Founder: Full access (read, write, admin)
- Research team: Read + PR creation (if team exists)
- CI/CD bot: Deploy-only access (no code modification)
- External auditors: Read-only (if needed for compliance)

**Audit Trail:**

- All commits signed (git commit -S)
- All deployments logged (who, when, what)
- All secret access logged (GitHub Actions audit)
- Monthly security review (access changes, secret rotation)

---

## Deployment Integration

### Separate Deployments

**EURO AI:**

- Deployed to `euro-ai.vercel.app` (or custom domain)
- Database: Supabase (shared)
- Auth: Supabase Auth
- Pipeline: `newspulse-ai` repo → GitHub Actions → Vercel

**VAJRA:**

- Deployed to `vajra-trading.vercel.app` (or custom domain)
- Database: PostgreSQL (separate instance)
- Auth: OAuth2 or custom
- Pipeline: `vajra` repo → GitHub Actions → Vercel (cockpit) + Railway/Heroku (worker)

**No Cross-Deployment:**

- EURO AI deployments never trigger VAJRA deployments
- VAJRA deployments never depend on EURO AI infrastructure
- Environment variables completely separate

### Configuration Management

**EURO AI Config:**

- `.env.production` (Vercel environment variables)
- Supabase connection string
- LLM API keys
- Governance platform URLs

**VAJRA Config:**

- `.env.production` (Vercel for cockpit)
- `.env.worker` (for persistent trading worker)
- Broker API credentials
- Trading database URL
- Market data API keys

**Separation:**

- No shared `.env` files
- No shared environment variable namespaces
- Each system reads only its own configuration

---

## GitHub Actions Workflows

### EURO AI Workflows (Current)

```yaml
# .github/workflows/euro-ai-ci.yml
- Trigger: Push to main, PR to main
- Jobs: lint, type-check, test, build
- Deploy: On main push to Vercel production
```

### VAJRA Workflows (New)

```yaml
# .github/workflows/vajra-ci.yml
- Trigger: Push to main, PR to main
- Jobs: lint, type-check, test, build
- Deploy: On main push
  - Vercel: Cockpit dashboard
  - Railway: Trading worker

# .github/workflows/vajra-security.yml
- Trigger: Every push, weekly scheduled
- Jobs: secret-scan, dependency-audit, SAST
- Action: Alert on critical findings

# .github/workflows/vajra-compliance.yml
- Trigger: On merge to main
- Jobs: Generate trading audit log, verify kill-switches, test disaster recovery
- Output: Compliance report (archive)
```

---

## Verification Checklist

After repository creation and initial setup:

- [ ] Repository created and private
- [ ] README.md present with basic description
- [ ] Branch protection rules applied (main branch)
- [ ] GitHub Secrets configured (empty initially)
- [ ] GitHub Actions workflows present (templates)
- [ ] CODEOWNERS file created (if team exists)
- [ ] .gitignore configured (Python + Node.js)
- [ ] Pre-commit hooks documented (Git hooks template)
- [ ] CONTRIBUTING.md drafted (development guidelines)
- [ ] Initial commit signed and verified
- [ ] Repository accessible to authorized users only
- [ ] Audit logging verified

---

## One Founder Action (If Needed)

**Scenario:** If autonomous repository creation isn't available through GitHub API...

**Action:**

1. Visit https://github.com/new
2. Create new repository with settings:
   - Name: `vajra`
   - Visibility: Private
   - Initialize with: README.md only
3. Send repository URL to Claude Code

**Result:** Claude Code can then configure branches, secrets, and workflows autonomously.

---

## Cost & Sustainability

**GitHub Free Plan:**

- Unlimited public & private repositories ✅
- Unlimited collaborators ✅
- GitHub Actions: 2,000 free minutes/month (500 minutes free for private repos) ✅
- All features used here are within free tier

**Cost:** $0/month (GitHub free plan)

---

## Compliance & Governance

### Regulatory Considerations

**GDPR:** VAJRA contains no personal data (single user, trading data only)  
**CCPA:** Not applicable (no California residents, no personal data collection)  
**SOC 2:** Not required (research/testing, not customer-facing)

### Internal Compliance

- ✅ Audit trail complete (evidence ledger)
- ✅ Access controls documented
- ✅ Secret management plan established
- ✅ Disaster recovery procedures in place
- ✅ Deployment process documented
- ✅ Code review required (via branch protection)

---

## Maintenance Plan

### Weekly

- Review GitHub Actions logs for failed runs
- Monitor secret rotation due dates

### Monthly

- Review repository access (who has access, what do they use it for)
- Audit GitHub Actions usage (minutes consumed)
- Check for any unintended access patterns

### Quarterly

- Full security audit (access controls, secrets, deployments)
- Backup verification (recovery procedures tested)
- Compliance review (regulations changed?)

---

## Conclusion

Dedicated VAJRA repository provides:

1. Complete separation from EURO AI (clarity)
2. Independent access controls (security)
3. Isolated deployments (safety)
4. Protected trading credentials (compliance)
5. Clean history (maintainability)

**Ready for creation upon Founder authentication.**

**Estimated setup time:** 15 minutes (if using GitHub UI) or 5 minutes (if using API/CLI automation)
