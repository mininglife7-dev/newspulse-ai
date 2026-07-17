# Pre-Mission Environment Audit

**Authority**: Governor Ω (OPERATION WORKSHOP — Tool Mastery)  
**Purpose**: Detect environmental constraints and blockers BEFORE mission execution  
**Lesson Source**: E2E verification blocker discovery pattern (E2E blocked by network policy discovered too late)  
**DNA Reference**: DNA-1006 (Operation Workshop) — "Never ask Founder for work that can be done with tools"

---

## Why This Exists

**Problem**: During the verification mission, we discovered the HTTPS outbound blocker only after planning 6 E2E tests that couldn't run. This was preventable.

**Root Cause**: No environment audit checklist ran before mission planning. We assumed network access without verifying.

**Solution**: Execute this audit before every mission to identify:

- Network constraints (HTTPS outbound, proxies)
- Missing credentials (Supabase, Vercel, etc.)
- Tool availability and version requirements
- Available vs. blocked deployment targets
- Resource limitations (disk, memory, CPU)

**Impact**: Catch environmental blockers in 10 minutes instead of discovering them 2 hours into a mission.

---

## Pre-Mission Checklist

### STAGE 1: Network Connectivity (5 minutes)

```bash
# Check if HTTPS outbound is working
curl -sS https://www.example.com -I > /dev/null && echo "✅ HTTPS to external hosts works" || echo "🔴 HTTPS BLOCKED"

# Check proxy configuration (if applicable)
cat /root/.ccr/README.md 2>/dev/null && echo "✅ Proxy policy documented" || echo "⚠️ No proxy config found"

# Verify internal network (git)
git ls-remote https://github.com/mininglife7-dev/newspulse-ai HEAD > /dev/null && echo "✅ Git/GitHub accessible" || echo "🔴 Git BLOCKED"

# Verify package manager (npm registry)
npm ping > /dev/null 2>&1 && echo "✅ npm registry accessible" || echo "🔴 npm registry BLOCKED"
```

**Expected Results**:

- ✅ GitHub: Always works
- ✅ npm registry: Always works
- ❌ External HTTPS: May be blocked (known policy)
- ⚠️ Proxy config: May not exist if no outbound

**Mission Impact**: If Git/npm blocked → Mission cannot proceed. If external HTTPS blocked → E2E testing impossible (use Founder testing as workaround).

---

### STAGE 2: Tool Availability (5 minutes)

Reference: [WORKSHOP-REGISTRY.md](WORKSHOP-REGISTRY.md) — Core Development Tools

```bash
# Check critical tools
echo "=== Core Tools ===" && \
git --version && \
node --version && \
npm --version && \
npx tsc --version

# Check project-specific tools
echo "=== Project Tools ===" && \
npm list next vitest playwright typescript eslint prettier 2>&1 | grep -E "^(next|vitest|playwright|typescript|eslint|prettier)@" | sort

# Check available npm scripts
echo "=== Available Scripts ===" && \
grep '"[a-z:]*":' package.json | grep scripts -A 20 | grep '"' | wc -l && echo "scripts available"
```

**Expected Results**:

- Node 22+, npm 10+, Git 2.40+
- TypeScript, ESLint, Prettier, Next.js, Vitest, Playwright installed
- 8+ npm scripts: lint, type-check, test, build, dev, test:e2e, etc.

**Mission Impact**: If critical tools missing → Install before proceeding.

---

### STAGE 3: Authentication & Secrets (3 minutes)

**Non-Executable Checks** (Can't read secrets, but can verify presence):

```bash
# Check if environment variables are populated
echo "Environment variable status:" && \
env | grep -E '^(SUPABASE|VERCEL|GITHUB|OPENAI|ADMIN)' | cut -d= -f1 | sort && \
echo "---" && \
echo "Note: Can verify variables exist but not read values (by design)"

# Check Git configuration
git config user.email && echo "✅ Git user configured" || echo "🔴 Git user not configured"
git config user.name && echo "✅ Git name configured" || echo "🔴 Git name not configured"

# Check GitHub authentication
gh auth status 2>/dev/null || echo "⚠️ GitHub CLI not authenticated (may not be needed)"
```

**Expected Results**:

- Git user/email configured ✅
- SUPABASE_URL, VERCEL credentials may or may not be present (depends on mission)
- GitHub authentication optional but helpful
- Cannot directly test credentials (by design)

**Mission Impact**: If missing credentials needed for mission → Note blocker, proceed with read-only work, escalate to Founder if blocking.

---

### STAGE 4: Code Quality Baseline (3 minutes)

```bash
# Quick code quality check
echo "=== Code Quality ===" && \
npm run lint 2>&1 | tail -3 && \
npm run type-check 2>&1 | tail -3

# Build test (quick check, don't run full test suite)
echo "=== Build Status ===" && \
npm run build 2>&1 | tail -5

# Git status check
echo "=== Repository Status ===" && \
git status --short && \
git log --oneline -3
```

**Expected Results**:

- 0 linting violations
- 0 type errors
- Build success
- No uncommitted changes (except new files from mission)

**Mission Impact**: If existing code broken → Fix or escalate before starting mission work.

---

### STAGE 5: Deployment Readiness (2 minutes)

```bash
# Check current deployment status
echo "=== Deployment Status ===" && \
git branch -v && echo "---" && \
git log --oneline origin/main..HEAD | wc -l && echo "commits ahead of main"

# Preview URL availability (if on feature branch)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "Feature branch detected: $BRANCH"
  echo "Preview deployment will be created on next push"
fi

# Check if uncommitted changes exist
if [ -z "$(git status --short)" ]; then
  echo "✅ Clean working directory"
else
  echo "⚠️ Uncommitted changes exist"
  git status --short
fi
```

**Expected Results**:

- On feature branch (not main) ✅
- N commits ahead of main (documented)
- Clean working directory recommended before mission
- Preview deployment will be created on push

**Mission Impact**: If on main → Cannot push risky changes. If dirty → Stash or commit before mission.

---

## Automated Audit Script

**For Speed**: Save this as `scripts/pre-mission-audit.sh` and run before missions:

```bash
#!/bin/bash
set -e

echo "🔍 PRE-MISSION ENVIRONMENT AUDIT"
echo "=================================="
echo ""

# Stage 1: Network
echo "📡 STAGE 1: Network Connectivity"
echo "Testing: GitHub access (git), npm registry, external HTTPS"

git ls-remote https://github.com/mininglife7-dev/newspulse-ai HEAD > /dev/null 2>&1 && \
  echo "  ✅ GitHub: Available" || echo "  🔴 GitHub: BLOCKED"

npm ping > /dev/null 2>&1 && \
  echo "  ✅ npm registry: Available" || echo "  🔴 npm registry: BLOCKED"

if curl -sS https://www.google.com -I > /dev/null 2>&1; then
  echo "  ✅ External HTTPS: Available"
else
  echo "  ⚠️ External HTTPS: BLOCKED (expected in cloud environment)"
fi

echo ""

# Stage 2: Tools
echo "🔧 STAGE 2: Tool Availability"
echo "Checking: Node, npm, Git, TypeScript, ESLint, Vitest, Next.js"

node --version && npm --version && git --version | sed 's/^/  ✅ /'
npm list next vitest typescript eslint prettier 2>&1 | grep -E "^(next|vitest|typescript|eslint|prettier)@" | sed 's/^/  ✅ /'

echo ""

# Stage 3: Auth
echo "🔐 STAGE 3: Authentication Status"
echo "Git user: $(git config user.name)"
echo "Git email: $(git config user.email)"
echo ""

# Stage 4: Code Quality
echo "✨ STAGE 4: Code Quality Baseline"
npm run lint 2>&1 | grep -E "(error|warning)" | head -3 || echo "  ✅ Lint: Clean"
npm run type-check 2>&1 | grep -E "error" | head -3 || echo "  ✅ TypeScript: Clean"

echo ""

# Stage 5: Deployment
echo "🚀 STAGE 5: Deployment Readiness"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMITS_AHEAD=$(git log --oneline origin/main..HEAD 2>/dev/null | wc -l)
echo "  Branch: $BRANCH"
echo "  Commits ahead of main: $COMMITS_AHEAD"
if [ -z "$(git status --short)" ]; then
  echo "  ✅ Working directory: Clean"
else
  echo "  ⚠️ Working directory: Dirty (uncommitted changes)"
fi

echo ""
echo "=================================="
echo "✅ AUDIT COMPLETE"
echo ""
echo "Next steps:"
echo "1. If all green: Proceed with mission"
echo "2. If blockers found: Review mission scope vs. environment constraints"
echo "3. If code broken: Fix or escalate before starting"
```

**Usage**:

```bash
chmod +x scripts/pre-mission-audit.sh
./scripts/pre-mission-audit.sh
```

---

## Integration with Mission Planning

### When to Run

- **Before every autonomous mission**: Immediately after entering session
- **Before Founder-delegated tasks**: Before implementation begins
- **After environment changes**: If proxy/credentials/tools change
- **During troubleshooting**: If unexpected blocker appears

### What to Do With Findings

**All Green** (✅):

- Proceed with mission
- Blockers documented below don't apply
- No scope adjustments needed

**Warnings** (⚠️):

- Note for documentation
- Assess mission impact
- Plan workarounds if needed

**Blocked** (🔴):

- Escalate to Founder if critical
- Adjust mission scope
- Document blocker in EYES-OBSERVATION-LOG.md

### Output Format

```
AUDIT RESULT: [READY | READY_WITH_WARNINGS | BLOCKED]

BLOCKERS FOUND:
- [List blockers]

MITIGATION:
- [For each blocker, specify workaround or escalation]

MISSION SCOPE ADJUSTMENTS:
- [If any changes needed]

TIMESTAMP: [When audit ran]
CONFIDENCE: [HIGH | MEDIUM | LOW]
```

---

## Known Blockers (This Environment)

| Blocker                 | Status     | Blocker                                  | Impact                                          | Mitigation                                     |
| ----------------------- | ---------- | ---------------------------------------- | ----------------------------------------------- | ---------------------------------------------- |
| HTTPS to external hosts | 🔴 BLOCKED | Network policy at http://127.0.0.1:35881 | Cannot test Vercel preview URLs, E2E tests fail | Founder tests from external network            |
| Supabase credentials    | 🟡 Unknown | Not in env (by design)                   | Cannot query production database                | Use Founder's dashboard or provide credentials |
| VERCEL API token        | 🟡 Unknown | Not in env (by design)                   | Cannot call Vercel API directly                 | Use GitHub App deployment only                 |
| Production secrets      | 🔴 BLOCKED | Cannot read secret values                | Cannot verify they're set in Vercel             | Founder verifies in Vercel dashboard           |

---

## Learning Registry Entry

**Lesson**: Environment blockers should be discovered before mission planning, not during execution.

**Why**: The E2E verification plan took 2 hours to design and document before discovering the network blocker prevented all execution.

**How Fixed**: Created this pre-mission audit to catch blockers in 10 minutes.

**Prevention**: Run audit BEFORE planning any mission. Document blockers upfront.

**Pattern**: "Plan → Discover Blocker → Adapt" should become "Audit → Plan → Execute".

**Automation Opportunity**: Can be run as a shell script before every mission (future: GitHub Action or pre-commit hook).

---

## Next Steps

1. **Save this as reference**: Use before every mission
2. **Create executable script**: `scripts/pre-mission-audit.sh` (provided above)
3. **Add to deployment checklist**: Include in PRE_DEPLOYMENT.md
4. **Run after environment changes**: If tools/access changes
5. **Update as patterns emerge**: Add new checks based on future blockers

---

**Authority**: Governor Ω Workshop Module  
**Confidence**: 🟢 HIGH (designed from real blocker discovery)  
**Status**: Ready for use before next mission  
**Created**: 2026-07-17 16:35 UTC (Lesson from E2E verification blocker)
