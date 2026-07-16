#!/bin/bash
#
# Deployment Readiness Verification
# Verifies all components are ready for Supabase schema deployment
#

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

check() {
  local name=$1
  local cmd=$2

  if eval "$cmd" &>/dev/null; then
    echo -e "${GREEN}✓${NC} $name"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $name"
    ((FAILED++))
  fi
}

warn() {
  local name=$1
  echo -e "${YELLOW}⚠${NC} $name"
  ((WARNINGS++))
}

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║              DEPLOYMENT READINESS VERIFICATION                            ║"
echo "║                                                                            ║"
echo "║  This script verifies all components are ready for Supabase deployment.   ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo -e "${YELLOW}Repository Setup${NC}"
check "Git repository" "git rev-parse --git-dir >/dev/null 2>&1"
check "On correct branch" "[ '$(git rev-parse --abbrev-ref HEAD)' = 'claude/hercules-living-enterprise-oj7wyb' ]"
check "Working tree clean" "git diff-index --quiet HEAD --"
check "Branch up to date" "git diff --quiet @{u}"

echo ""
echo -e "${YELLOW}Code Quality${NC}"
check "Node.js installed" "command -v node"
check "npm installed" "command -v npm"
check "Dependencies installed" "[ -d node_modules ]"
check "package.json exists" "[ -f package.json ]"

echo ""
echo -e "${YELLOW}Schema Files${NC}"
check "Schema file exists" "[ -f supabase/schema.sql ]"
check "Schema idempotent patterns" "grep -c 'IF NOT EXISTS' supabase/schema.sql >/dev/null"
check "Verification script exists" "[ -f supabase/POST_DEPLOYMENT_VERIFICATION.sql ]"
check "Security tests exist" "[ -f supabase/SECURITY_TESTS.sql ]"

echo ""
echo -e "${YELLOW}Workflow Configuration${NC}"
check "Workflow file exists" "[ -f .github/workflows/supabase-schema-deploy.yml ]"
check "Workflow has project_id input" "grep -q 'project_id' .github/workflows/supabase-schema-deploy.yml"
check "Workflow has db_password input" "grep -q 'db_password' .github/workflows/supabase-schema-deploy.yml"
check "Workflow has fallback logic" "grep -q 'PROJECT_ID_VAR' .github/workflows/supabase-schema-deploy.yml"

echo ""
echo -e "${YELLOW}Deployment Tools${NC}"
check "Deployment script exists" "[ -f deploy-schema.sh ]"
check "Deployment script executable" "[ -x deploy-schema.sh ]"
check "gh CLI installed" "command -v gh"
check "gh CLI authenticated" "gh auth status >/dev/null 2>&1"

echo ""
echo -e "${YELLOW}Testing${NC}"
check "Test files exist" "[ -f tests/e2e-registration.integration.test.ts ]"
warn "Unit tests (run separately with: npm test)"

echo ""
echo -e "${YELLOW}Documentation${NC}"
check "Deployment summary exists" "[ -f /tmp/claude-0/-home-user-newspulse-ai/898cd40d-02e9-5908-9a9a-3dbe507c369b/scratchpad/DEPLOYMENT_EXECUTION_SUMMARY.md ] || [ -f scratchpad/DEPLOYMENT_EXECUTION_SUMMARY.md ]"
check "Quickstart guide exists" "[ -f /tmp/claude-0/-home-user-newspulse-ai/898cd40d-02e9-5908-9a9a-3dbe507c369b/scratchpad/DEPLOYMENT_QUICKSTART.md ] || [ -f scratchpad/DEPLOYMENT_QUICKSTART.md ]"

echo ""
echo -e "${YELLOW}GitHub / PR${NC}"
check "PR #103 exists" "gh pr view 103 --repo mininglife7-dev/newspulse-ai >/dev/null 2>&1"
if gh pr view 103 --repo mininglife7-dev/newspulse-ai --json state --jq .state 2>/dev/null | grep -q "OPEN"; then
  echo -e "${GREEN}✓${NC} PR #103 is open"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠${NC} PR #103 is not open"
  ((WARNINGS++))
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                            SUMMARY                                        ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"

TOTAL=$((PASSED + FAILED + WARNINGS))
echo ""
echo -e "  ${GREEN}Passed:${NC}   $PASSED/$TOTAL"
if [ $FAILED -gt 0 ]; then
  echo -e "  ${RED}Failed:${NC}   $FAILED/$TOTAL"
fi
if [ $WARNINGS -gt 0 ]; then
  echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS/$TOTAL"
fi

echo ""
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed - deployment ready!${NC}"
  echo ""
  echo "To deploy, run:"
  echo "  ./deploy-schema.sh \"<postgres-password>\""
  echo ""
  exit 0
else
  echo -e "${RED}❌ Some checks failed - review above${NC}"
  echo ""
  exit 1
fi
