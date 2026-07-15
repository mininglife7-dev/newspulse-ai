#!/bin/bash

# Pre-Customer Launch Verification Script
# Verifies all critical systems before first customer signup
# Exit code 0 = all systems ready, non-zero = failures detected
#
# Usage: bash scripts/pre-customer-verification.sh [--verbose] [--fix]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

VERBOSE=${1:---verbose}
FIX=${2:-}
FAILURES=0
WARNINGS=0
PASSED=0

# Helper functions
log_pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASSED++))
}

log_fail() {
  echo -e "${RED}✗${NC} $1"
  ((FAILURES++))
}

log_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARNINGS++))
}

log_info() {
  if [[ "$VERBOSE" == "--verbose" ]]; then
    echo -e "${BLUE}ℹ${NC} $1"
  fi
}

header() {
  echo ""
  echo -e "${BLUE}━━━ $1 ━━━${NC}"
}

# ============================================================================
# SYSTEM CHECKS
# ============================================================================

header "Environment & Configuration"

# Check Node.js
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  log_pass "Node.js installed: $NODE_VERSION"
else
  log_fail "Node.js not found (required for build)"
fi

# Check npm
if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm -v)
  log_pass "npm installed: $NPM_VERSION"
else
  log_fail "npm not found"
fi

# Check git
if command -v git &> /dev/null; then
  log_pass "Git installed"
else
  log_fail "Git not found"
fi

# Check .env.local exists
header "Environment Variables"

if [[ -f ".env.local" ]]; then
  log_pass ".env.local file exists"

  # Check required vars
  REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
  )

  for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^$var=" .env.local; then
      log_pass "$var is set"
    else
      log_fail "$var is missing from .env.local"
    fi
  done
else
  log_fail ".env.local file missing (copy from .env.example and add Supabase credentials)"
fi

# ============================================================================
# DEPENDENCY CHECKS
# ============================================================================

header "Dependencies"

if [[ -d "node_modules" ]]; then
  log_pass "node_modules directory exists"
else
  log_warn "node_modules not installed (will install during build)"
fi

if [[ -f "package-lock.json" ]]; then
  log_pass "package-lock.json exists (reproducible installs)"
else
  log_warn "package-lock.json missing"
fi

# ============================================================================
# CODE QUALITY
# ============================================================================

header "Code Quality"

# TypeScript check
if npx --yes typescript --version &> /dev/null; then
  log_pass "TypeScript available"
else
  log_fail "TypeScript not available"
fi

# ESLint check
if [[ -f ".eslintrc.json" ]]; then
  log_pass "ESLint configuration found"
else
  log_warn "ESLint configuration not found"
fi

# Prettier check
if [[ -f ".prettierrc.json" ]]; then
  log_pass "Prettier configuration found"
else
  log_warn "Prettier configuration not found"
fi

# ============================================================================
# BUILD VERIFICATION
# ============================================================================

header "Build Verification"

log_info "Running npm run build..."
if npm run build > /tmp/build.log 2>&1; then
  log_pass "Build succeeds (npm run build)"
else
  log_fail "Build failed (see /tmp/build.log)"
fi

log_info "Running type check..."
if npx --yes tsc --noEmit > /tmp/typecheck.log 2>&1; then
  log_pass "TypeScript type check passes"
else
  log_fail "TypeScript type check failed (see /tmp/typecheck.log)"
fi

# ============================================================================
# TEST VERIFICATION
# ============================================================================

header "Test Coverage"

if [[ -d "tests" ]]; then
  TEST_COUNT=$(find tests -name "*.test.ts" -o -name "*.test.tsx" | wc -l)
  log_pass "Test files found: $TEST_COUNT files"

  log_info "Running tests..."
  if npm run test 2> /tmp/test.log; then
    log_pass "All tests pass (vitest suite)"
  else
    log_fail "Test suite failed (see /tmp/test.log)"
  fi
else
  log_warn "No tests directory found"
fi

# ============================================================================
# API ENDPOINT VERIFICATION
# ============================================================================

header "API Routes"

EXPECTED_ROUTES=(
  "app/api/health/route.ts"
  "app/api/search/route.ts"
  "app/api/history/route.ts"
  "app/api/alerts/route.ts"
  "app/api/production-health/route.ts"
)

for route in "${EXPECTED_ROUTES[@]}"; do
  if [[ -f "$route" ]]; then
    log_pass "Route exists: $route"
  else
    log_fail "Route missing: $route"
  fi
done

# ============================================================================
# DATABASE SCHEMA
# ============================================================================

header "Database Schema"

if [[ -d "supabase/migrations" ]] || [[ -f "supabase/schema.sql" ]]; then
  log_pass "Database schema files found"
else
  log_warn "Database schema not found locally"
fi

log_info "Note: Schema deployment is a Founder action (see SUPABASE-PRODUCTION-SETUP.md)"

# ============================================================================
# MONITORING SYSTEMS
# ============================================================================

header "Monitoring Infrastructure"

MONITORING_APIS=(
  "api/health"
  "api/alerts"
  "api/production-health"
  "api/verify-deployment"
  "api/error-rate"
  "api/performance-baseline"
  "api/customer-retention"
)

for api in "${MONITORING_APIS[@]}"; do
  ROUTE_FILE="app/${api}/route.ts"
  if [[ -f "$ROUTE_FILE" ]]; then
    log_pass "Monitoring endpoint: $api"
  else
    log_warn "Monitoring endpoint missing: $api"
  fi
done

# ============================================================================
# DEPLOYMENT CONFIGURATION
# ============================================================================

header "Deployment Configuration"

if [[ -f "vercel.json" ]]; then
  log_pass "vercel.json configuration found"
else
  log_info "No vercel.json (using default Vercel settings)"
fi

if [[ -f ".github/workflows/ci.yml" ]]; then
  log_pass "GitHub Actions CI workflow found"
else
  log_fail "GitHub Actions CI workflow missing"
fi

if [[ -f ".gitignore" ]]; then
  log_pass ".gitignore configured"
else
  log_warn ".gitignore not found"
fi

# ============================================================================
# DOCUMENTATION
# ============================================================================

header "Operational Documentation"

REQUIRED_DOCS=(
  "docs/infra/OPERATIONAL_READINESS.md"
  "docs/infra/INCIDENT_RESPONSE_RUNBOOKS.md"
  "docs/infra/FOUNDER_MONITORING_DASHBOARD.md"
  "docs/customer/FIRST_CUSTOMER_PLAYBOOK.md"
  "docs/customer/COMMUNICATION_TEMPLATES.md"
  "docs/governance/DNA-REGISTRY.md"
)

for doc in "${REQUIRED_DOCS[@]}"; do
  if [[ -f "$doc" ]]; then
    log_pass "Documentation: $(basename $doc)"
  else
    log_fail "Documentation missing: $doc"
  fi
done

# ============================================================================
# FINAL SUMMARY
# ============================================================================

echo ""
echo -e "${BLUE}━━━ VERIFICATION SUMMARY ━━━${NC}"
echo -e "${GREEN}Passed:  $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed:  $FAILURES${NC}"
echo ""

if [[ $FAILURES -eq 0 ]]; then
  echo -e "${GREEN}✓ All critical systems verified. Ready for first customer.${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Deploy Supabase schema (15-30 min)"
  echo "2. Increase GitHub Actions spending limit (5 min)"
  echo "3. Follow FIRST_CUSTOMER_PLAYBOOK.md"
  echo ""
  exit 0
else
  echo -e "${RED}✗ $FAILURES critical issue(s) found. Fix before launch.${NC}"
  echo ""
  echo "Failed checks:"
  exit 1
fi
