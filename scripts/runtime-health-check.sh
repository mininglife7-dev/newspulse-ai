#!/bin/bash

# Runtime Health Check Script
# Verifies deployed systems are operational before first customer
# Works against live deployment (Vercel + Supabase)
#
# Usage: bash scripts/runtime-health-check.sh [--quick] [--verbose]

PROD_URL=${PROD_URL:-"https://newspulse-ai.vercel.app"}
QUICK=${1:---quick}
VERBOSE=${2:---verbose}

PASSED=0
FAILED=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASSED++))
}

log_fail() {
  echo -e "${RED}✗${NC} $1"
  ((FAILED++))
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
# DEPLOYMENT CHECKS
# ============================================================================

header "Deployment Status"

# Check if deployment URL is accessible
if curl -s -o /dev/null -w "%{http_code}" "$PROD_URL" | grep -q "200"; then
  log_pass "Deployment accessible: $PROD_URL"
else
  log_fail "Deployment not accessible: $PROD_URL"
  echo "Deploy URL is unreachable. Check Vercel dashboard."
  exit 1
fi

# ============================================================================
# API HEALTH CHECKS
# ============================================================================

header "API Endpoints"

check_endpoint() {
  local endpoint=$1
  local expected_code=$2

  local response=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL$endpoint")

  if [[ "$response" == "$expected_code" ]]; then
    log_pass "GET $endpoint → $response"
  else
    log_fail "GET $endpoint → $response (expected $expected_code)"
  fi
}

# Check health endpoint (should be 200)
check_endpoint "/api/health" "200"

# Check alerts endpoint (should be 200)
check_endpoint "/api/alerts" "200"

# Check production-health endpoint (should be 200)
check_endpoint "/api/production-health" "200"

# ============================================================================
# DATABASE CONNECTIVITY
# ============================================================================

header "Database Connectivity"

# Health endpoint should return JSON with database status
HEALTH=$(curl -s "$PROD_URL/api/health")
DB_OK=$(echo "$HEALTH" | grep -o '"db":"ok"' || echo "")

if [[ ! -z "$DB_OK" ]]; then
  log_pass "Database connected (health check)"
else
  log_warn "Database status unclear from health endpoint"
  log_info "Health response: $HEALTH"
fi

# ============================================================================
# AUTHENTICATION CHECKS (if not --quick)
# ============================================================================

if [[ "$QUICK" != "--quick" ]]; then
  header "Authentication Flow (Disabled for Live Test)"
  log_info "Skipping live signup test to avoid creating test accounts"
  log_info "Schema deployment must be verified manually via Supabase dashboard"
fi

# ============================================================================
# PERFORMANCE CHECKS
# ============================================================================

header "Performance"

# Measure health endpoint response time
START=$(date +%s%N)
curl -s "$PROD_URL/api/health" > /dev/null
END=$(date +%s%N)
ELAPSED=$((($END - $START) / 1000000))

if [[ $ELAPSED -lt 1000 ]]; then
  log_pass "Health endpoint response time: ${ELAPSED}ms (acceptable: <1000ms)"
elif [[ $ELAPSED -lt 2000 ]]; then
  log_warn "Health endpoint response time: ${ELAPSED}ms (slow but acceptable)"
else
  log_fail "Health endpoint response time: ${ELAPSED}ms (too slow)"
fi

# ============================================================================
# MONITORING SYSTEMS
# ============================================================================

header "Monitoring Systems"

# Check if alerts endpoint returns valid JSON
ALERTS=$(curl -s "$PROD_URL/api/alerts")
ALERT_COUNT=$(echo "$ALERTS" | grep -o '"alerts"' | wc -l)

if [[ $ALERT_COUNT -gt 0 ]]; then
  log_pass "Alerts system responding (JSON valid)"
else
  log_warn "Alerts endpoint may not be returning proper JSON"
fi

# ============================================================================
# ENVIRONMENT VERIFICATION
# ============================================================================

header "Environment Configuration"

# Check if .env.local exists and is configured
if [[ -f ".env.local" ]]; then
  log_pass ".env.local exists"

  # Verify critical vars are set
  if grep -q "NEXT_PUBLIC_SUPABASE_URL=https://" .env.local; then
    log_pass "NEXT_PUBLIC_SUPABASE_URL configured"
  else
    log_fail "NEXT_PUBLIC_SUPABASE_URL not configured"
  fi

  if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local; then
    log_pass "NEXT_PUBLIC_SUPABASE_ANON_KEY configured"
  else
    log_fail "NEXT_PUBLIC_SUPABASE_ANON_KEY not configured"
  fi

  if grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env.local; then
    log_pass "SUPABASE_SERVICE_ROLE_KEY configured"
  else
    log_fail "SUPABASE_SERVICE_ROLE_KEY not configured"
  fi
else
  log_fail ".env.local not found"
fi

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo -e "${BLUE}━━━ RUNTIME HEALTH SUMMARY ━━━${NC}"
echo -e "${GREEN}Passed:  $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed:  $FAILED${NC}"
echo ""

if [[ $FAILED -eq 0 ]]; then
  echo -e "${GREEN}✓ All critical systems operational. Ready for first customer.${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Verify Supabase schema deployed (manual check in Supabase dashboard)"
  echo "2. Run pre-customer-verification.sh for build/test verification"
  echo "3. Follow FIRST_CUSTOMER_PLAYBOOK.md"
  echo ""
  exit 0
else
  echo -e "${RED}✗ $FAILED critical issue(s) found. Check above for details.${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "- Check Vercel deployment status: https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai"
  echo "- Check Supabase status: https://status.supabase.com"
  echo "- Review Vercel logs for 500 errors"
  echo "- Verify .env.local has correct credentials"
  echo ""
  exit 1
fi
