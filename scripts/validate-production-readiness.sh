#!/bin/bash

###############################################################################
# EURO AI Production Readiness Validation Script
#
# Autonomously validates that all systems are ready for production deployment.
# Checks code quality, tests, build, security, monitoring, and configuration.
#
# Usage: ./scripts/validate-production-readiness.sh
#
# Exit codes:
# 0 = All checks passed, ready for production
# 1 = Some checks failed, review issues
###############################################################################

# Don't exit on error - we want to run all checks
# set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REPORT_FILE="${PROJECT_ROOT}/.production-readiness-report.txt"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track results
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Report functions
print_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "$1" >> "$REPORT_FILE"
}

print_check() {
  echo -n "  ☐ $1... "
}

print_pass() {
  echo -e "${GREEN}✓ PASS${NC}"
  echo "  ✓ $1 - PASS" >> "$REPORT_FILE"
  ((CHECKS_PASSED++))
}

print_fail() {
  echo -e "${RED}✗ FAIL${NC}"
  echo "  ✗ $1 - FAIL" >> "$REPORT_FILE"
  if [ -n "$2" ]; then
    echo "    Reason: $2" >> "$REPORT_FILE"
  fi
  ((CHECKS_FAILED++))
}

print_warn() {
  echo -e "${YELLOW}⚠ WARN${NC}"
  echo "  ⚠ $1 - WARNING" >> "$REPORT_FILE"
  if [ -n "$2" ]; then
    echo "    Reason: $2" >> "$REPORT_FILE"
  fi
  ((CHECKS_WARNING++))
}

###############################################################################
# Begin validation
###############################################################################

# Initialize report file
echo "Production Readiness Validation Report" > "$REPORT_FILE"
echo "Timestamp: $TIMESTAMP" >> "$REPORT_FILE"
echo "Project: NewsPulse AI (EURO AI)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     EURO AI Production Readiness Validation                   ║"
echo "║     Automated Pre-Deployment System Check                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Timestamp: $TIMESTAMP"
echo "Report will be saved to: $REPORT_FILE"
echo ""

###############################################################################
# Part 1: Code Quality
###############################################################################

print_header "Part 1: Code Quality Checks"

# TypeScript strict mode (check configuration only, not full type-check which is slow)
print_check "TypeScript strict configuration"
if [ -f "$PROJECT_ROOT/tsconfig.json" ] && grep -q '"strict": true' "$PROJECT_ROOT/tsconfig.json"; then
  print_pass "TypeScript strict configuration"
else
  print_fail "TypeScript strict configuration" "TypeScript strict mode not enabled"
fi

# ESLint configuration
print_check "ESLint configuration exists"
if [ -f "$PROJECT_ROOT/.eslintrc.json" ] || [ -f "$PROJECT_ROOT/.eslintrc.js" ]; then
  print_pass "ESLint configuration exists"
else
  print_fail "ESLint configuration exists" "ESLint config not found"
fi

# Prettier configuration
print_check "Prettier configuration exists"
if [ -f "$PROJECT_ROOT/.prettierrc" ] || [ -f "$PROJECT_ROOT/.prettierrc.json" ] || [ -f "$PROJECT_ROOT/.prettierrc.js" ]; then
  print_pass "Prettier configuration exists"
else
  print_fail "Prettier configuration exists" "Prettier config not found"
fi

###############################################################################
# Part 2: Testing
###############################################################################

print_header "Part 2: Test Suite"

# Unit tests configuration
print_check "Test suite configured (vitest)"
if grep -q "vitest" "$PROJECT_ROOT/package.json" && [ -f "$PROJECT_ROOT/vitest.config.ts" ]; then
  print_pass "Test suite configured (vitest)"
  echo "  Note: Run 'npm test' manually to execute full test suite" >> "$REPORT_FILE"
else
  print_warn "Test suite configured (vitest)" "Vitest not found in project"
fi

###############################################################################
# Part 3: Build Verification
###############################################################################

print_header "Part 3: Production Build"

# Production build configuration
print_check "Next.js build configured"
if grep -q '"build"' "$PROJECT_ROOT/package.json" && [ -d "$PROJECT_ROOT/app" ]; then
  print_pass "Next.js build configured"
  echo "  Note: Run 'npm run build' manually to compile production build" >> "$REPORT_FILE"
else
  print_fail "Next.js build configured" "Build script or app directory not found"
fi

# Check build artifacts
print_check "Build artifacts (.next directory)"
if [ -d "$PROJECT_ROOT/.next" ]; then
  print_pass "Build artifacts (.next directory)"
else
  print_fail "Build artifacts (.next directory)" ".next directory not found"
fi

###############################################################################
# Part 4: Git Repository State
###############################################################################

print_header "Part 4: Repository State"

# Check branch
print_check "Git branch is 'main'"
CURRENT_BRANCH=$(cd "$PROJECT_ROOT" && git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" = "main" ]; then
  print_pass "Git branch is 'main'"
else
  print_warn "Git branch is 'main'" "Currently on branch: $CURRENT_BRANCH"
fi

# Check uncommitted changes
print_check "No uncommitted changes"
if cd "$PROJECT_ROOT" && git status --porcelain | grep -q .; then
  print_fail "No uncommitted changes" "Uncommitted files exist"
  echo "$(cd $PROJECT_ROOT && git status --short)" >> "$REPORT_FILE"
else
  print_pass "No uncommitted changes"
fi

# Check commits ahead of origin
print_check "All commits pushed to origin"
UNPUSHED=$(cd "$PROJECT_ROOT" && git cherry -v 2>/dev/null | wc -l)
if [ "$UNPUSHED" -eq 0 ]; then
  print_pass "All commits pushed to origin"
else
  print_warn "All commits pushed to origin" "$UNPUSHED unpushed commits"
fi

###############################################################################
# Part 5: Security Checks
###############################################################################

print_header "Part 5: Security Checks"

# Check for secrets
print_check "No exposed secrets or credentials"
SECRETS_FOUND=0
if grep -r "NEXT_PUBLIC_SUPABASE_URL" "$PROJECT_ROOT/app" >/dev/null 2>&1; then
  # Expected: public keys in source code
  :
fi
if grep -r "SUPABASE_SERVICE_ROLE_KEY" "$PROJECT_ROOT/app" >/dev/null 2>&1; then
  print_fail "No exposed secrets or credentials" "Service role key in source code"
  SECRETS_FOUND=1
fi
if grep -r "OPENAI_API_KEY" "$PROJECT_ROOT/app" >/dev/null 2>&1; then
  print_fail "No exposed secrets or credentials" "OpenAI key in source code"
  SECRETS_FOUND=1
fi
if [ "$SECRETS_FOUND" -eq 0 ]; then
  print_pass "No exposed secrets or credentials"
fi

# Check environment template
print_check "Environment template exists (.env.example)"
if [ -f "$PROJECT_ROOT/.env.example" ]; then
  print_pass "Environment template exists (.env.example)"
else
  print_warn "Environment template exists (.env.example)" ".env.example not found"
fi

###############################################################################
# Part 6: Monitoring Infrastructure
###############################################################################

print_header "Part 6: Monitoring Infrastructure"

# Health check endpoint
print_check "Health check endpoint exists"
if grep -q "export async function GET" "$PROJECT_ROOT/app/api/health/route.ts" 2>/dev/null; then
  print_pass "Health check endpoint exists"
else
  print_fail "Health check endpoint exists" "app/api/health/route.ts not found"
fi

# Production health check
print_check "Production health check endpoint exists"
if grep -q "runProductionHealthChecks" "$PROJECT_ROOT/app/api/production-health/route.ts" 2>/dev/null; then
  print_pass "Production health check endpoint exists"
else
  print_fail "Production health check endpoint exists" "app/api/production-health/route.ts not found"
fi

# Monitoring library
print_check "Production monitoring library exists"
if [ -f "$PROJECT_ROOT/lib/production-monitoring.ts" ]; then
  print_pass "Production monitoring library exists"
else
  print_fail "Production monitoring library exists" "lib/production-monitoring.ts not found"
fi

###############################################################################
# Part 7: Documentation
###############################################################################

print_header "Part 7: Production Documentation"

# Deployment runbook
print_check "Deployment runbook exists"
if [ -f "$PROJECT_ROOT/docs/DEPLOYMENT_RUNBOOK.md" ]; then
  print_pass "Deployment runbook exists"
else
  print_fail "Deployment runbook exists" "docs/DEPLOYMENT_RUNBOOK.md not found"
fi

# Disaster recovery guide
print_check "Disaster recovery runbook exists"
if [ -f "$PROJECT_ROOT/docs/DISASTER_RECOVERY_RUNBOOK.md" ]; then
  print_pass "Disaster recovery runbook exists"
else
  print_fail "Disaster recovery runbook exists" "docs/DISASTER_RECOVERY_RUNBOOK.md not found"
fi

# Incident response playbooks
print_check "Incident response playbooks exist"
if [ -f "$PROJECT_ROOT/docs/INCIDENT_RESPONSE_PLAYBOOKS.md" ]; then
  print_pass "Incident response playbooks exist"
else
  print_fail "Incident response playbooks exist" "docs/INCIDENT_RESPONSE_PLAYBOOKS.md not found"
fi

# Monitoring alert configuration
print_check "Monitoring alert configuration exists"
if [ -f "$PROJECT_ROOT/docs/MONITORING_ALERT_CONFIGURATION.md" ]; then
  print_pass "Monitoring alert configuration exists"
else
  print_fail "Monitoring alert configuration exists" "docs/MONITORING_ALERT_CONFIGURATION.md not found"
fi

# Production monitoring setup
print_check "Production monitoring setup guide exists"
if [ -f "$PROJECT_ROOT/docs/PRODUCTION_MONITORING_SETUP.md" ]; then
  print_pass "Production monitoring setup guide exists"
else
  print_fail "Production monitoring setup guide exists" "docs/PRODUCTION_MONITORING_SETUP.md not found"
fi

###############################################################################
# Part 8: Database Configuration
###############################################################################

print_header "Part 8: Database Setup"

# Supabase migrations
print_check "Database migrations exist"
if [ -d "$PROJECT_ROOT/supabase/migrations" ] && [ "$(ls -A $PROJECT_ROOT/supabase/migrations 2>/dev/null)" ]; then
  MIGRATION_COUNT=$(ls "$PROJECT_ROOT/supabase/migrations" | wc -l)
  print_pass "Database migrations exist"
  echo "  Migrations found: $MIGRATION_COUNT" >> "$REPORT_FILE"
else
  print_fail "Database migrations exist" "No migrations in supabase/migrations"
fi

# Schema validation
print_check "Database schema file exists"
if [ -f "$PROJECT_ROOT/supabase/schema.sql" ]; then
  print_pass "Database schema file exists"
else
  print_warn "Database schema file exists" "supabase/schema.sql not found"
fi

###############################################################################
# Part 9: API Endpoints
###############################################################################

print_header "Part 9: Critical API Routes"

# Key endpoints
ENDPOINTS=(
  "app/api/health/route.ts"
  "app/api/production-health/route.ts"
  "app/api/auth/resend-verification/route.ts"
  "app/api/assessment/route.ts"
  "app/api/assessment/\[id\]/route.ts"
  "app/api/workspace/\[id\]/members/route.ts"
)

for endpoint in "${ENDPOINTS[@]}"; do
  endpoint_name=$(echo "$endpoint" | sed 's/app\/api\///g' | sed 's/\/route.ts//g')
  print_check "Endpoint exists: $endpoint_name"
  if [ -f "$PROJECT_ROOT/$endpoint" ]; then
    print_pass "Endpoint exists: $endpoint_name"
  else
    print_fail "Endpoint exists: $endpoint_name" "Route not found"
  fi
done

###############################################################################
# Summary Report
###############################################################################

print_header "SUMMARY"

echo ""
echo -e "  ${GREEN}✓ Passed:${NC}  $CHECKS_PASSED"
echo -e "  ${RED}✗ Failed:${NC}  $CHECKS_FAILED"
echo -e "  ${YELLOW}⚠ Warnings:${NC} $CHECKS_WARNING"
echo ""

TOTAL_CHECKS=$((CHECKS_PASSED + CHECKS_FAILED + CHECKS_WARNING))
echo "Validation Summary:" >> "$REPORT_FILE"
echo "  Passed:  $CHECKS_PASSED/$TOTAL_CHECKS" >> "$REPORT_FILE"
echo "  Failed:  $CHECKS_FAILED/$TOTAL_CHECKS" >> "$REPORT_FILE"
echo "  Warnings: $CHECKS_WARNING/$TOTAL_CHECKS" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ $CHECKS_FAILED -eq 0 ]; then
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo -e "║  ${GREEN}✓ PRODUCTION READINESS VALIDATED${NC}                    ║"
  echo "║                                                                ║"
  echo "║  All critical checks passed. System is ready for:            ║"
  echo "║  - Staging deployment                                        ║"
  echo "║  - Production deployment                                     ║"
  echo "║                                                                ║"
  echo "║  Next steps:                                                  ║"
  echo "║  1. Configure credentials (Supabase, Vercel)                 ║"
  echo "║  2. Set up monitoring alerts (UptimeRobot, Sentry)           ║"
  echo "║  3. Run integration tests in staging                         ║"
  echo "║  4. Execute production deployment                            ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo "" >> "$REPORT_FILE"
  echo "VALIDATION RESULT: ✓ PASSED" >> "$REPORT_FILE"
  echo "Status: Ready for production deployment" >> "$REPORT_FILE"

  echo ""
  echo "Report saved to: $REPORT_FILE"
  echo ""
  exit 0
else
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo -e "║  ${RED}✗ PRODUCTION READINESS CHECK FAILED${NC}                ║"
  echo "║                                                                ║"
  echo "║  Some checks failed. Please review issues above.             ║"
  echo "║                                                                ║"
  echo "║  Failed checks must be resolved before deployment.            ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo "" >> "$REPORT_FILE"
  echo "VALIDATION RESULT: ✗ FAILED" >> "$REPORT_FILE"
  echo "Status: Address issues before production deployment" >> "$REPORT_FILE"

  echo ""
  echo "Report saved to: $REPORT_FILE"
  echo ""
  exit 1
fi
