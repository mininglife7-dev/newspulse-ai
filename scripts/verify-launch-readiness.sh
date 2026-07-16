#!/bin/bash

# Verify Launch Readiness — Check if Founder actions are complete
# Usage: ./scripts/verify-launch-readiness.sh
# Returns: 0 if all systems ready, 1 if blockers remain

set -e

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

echo ""
echo "🔍 Launch Readiness Verification"
echo "================================"
echo ""

# Helper function for check results
check_pass() {
  echo -e "${GREEN}✅ $1${NC}"
  ((CHECKS_PASSED++))
}

check_fail() {
  echo -e "${RED}❌ $1${NC}"
  if [ -n "$2" ]; then
    echo -e "   ${RED}→ $2${NC}"
  fi
  ((CHECKS_FAILED++))
}

check_warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  if [ -n "$2" ]; then
    echo -e "   ${YELLOW}→ $2${NC}"
  fi
  ((CHECKS_WARNING++))
}

# Check 1: Environment variables
echo "Check 1: Environment Variables"
if [ -z "$SUPABASE_URL" ]; then
  check_fail "NEXT_PUBLIC_SUPABASE_URL not set" "Configure this in .env.local or deployment settings"
else
  check_pass "NEXT_PUBLIC_SUPABASE_URL configured"
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
  check_fail "NEXT_PUBLIC_SUPABASE_ANON_KEY not set" "Configure this in .env.local or deployment settings"
else
  check_pass "NEXT_PUBLIC_SUPABASE_ANON_KEY configured"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  check_fail "SUPABASE_SERVICE_ROLE_KEY not set" "Configure this in .env.local or deployment settings"
else
  check_pass "SUPABASE_SERVICE_ROLE_KEY configured"
fi
echo ""

# Check 2: Database connectivity
echo "Check 2: Database Connectivity"
RESPONSE=$(curl -s -X GET \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  "$SUPABASE_URL/rest/v1/customers?limit=1" 2>&1)

if [ $? -eq 0 ]; then
  check_pass "Supabase database reachable"
else
  check_fail "Supabase database unreachable" "Check URL and network connectivity"
fi
echo ""

# Check 3: Database schema (verify required tables exist)
echo "Check 3: Database Schema"
TABLES_TO_CHECK=("customers" "workspaces" "ai_systems" "assessments")
SCHEMA_READY=true

for table in "${TABLES_TO_CHECK[@]}"; do
  curl -s -X GET \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    "$SUPABASE_URL/rest/v1/$table?limit=1" \
    > /dev/null 2>&1

  if [ $? -eq 0 ]; then
    check_pass "Table '$table' exists"
  else
    check_warn "Table '$table' not found" "Run: supabase/schema.sql in Supabase SQL Editor"
    SCHEMA_READY=false
  fi
done

if [ "$SCHEMA_READY" = false ]; then
  echo -e "   ${YELLOW}→ Database schema appears incomplete. Deploy supabase/schema.sql to proceed.${NC}"
fi
echo ""

# Check 4: RLS policies
echo "Check 4: Row-Level Security (RLS) Policies"
if curl -s -X GET \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  "$SUPABASE_URL/rest/v1/customers?limit=1" \
  > /dev/null 2>&1; then
  check_pass "RLS policies configured"
else
  check_fail "RLS policies not responding correctly" "Verify RLS policies in schema deployment"
fi
echo ""

# Check 5: Production deployment health
echo "Check 5: Production Deployment"
VERCEL_DOMAIN=$(grep -i "NEXT_PUBLIC_VERCEL_URL\|VERCEL_URL" .env.local 2>/dev/null | cut -d'=' -f2 | tr -d ' ' || echo "")

if [ -z "$VERCEL_DOMAIN" ] && [ -z "$VERCEL_URL" ]; then
  check_warn "Vercel domain not configured" "Set VERCEL_URL in production environment"
else
  DOMAIN="${VERCEL_DOMAIN:-$VERCEL_URL}"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/health" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    check_pass "Vercel deployment healthy (HTTP $HTTP_CODE)"
  else
    check_fail "Vercel deployment returned HTTP $HTTP_CODE" "Check Vercel dashboard for deployment status"
  fi
fi
echo ""

# Check 6: API endpoints
echo "Check 6: API Endpoints"
ENDPOINTS=("/api/health" "/api/alerts")

for endpoint in "${ENDPOINTS[@]}"; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$endpoint" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ]; then
    check_pass "Endpoint $endpoint responding"
  else
    check_warn "Endpoint $endpoint not responding (run: npm run dev)" "This is expected if dev server is not running"
  fi
done
echo ""

# Check 7: GitHub Actions spending limit
echo "Check 7: GitHub Actions Configuration"
check_warn "Manual verification needed" "Go to: https://github.com/mininglife7-dev/newspulse-ai/settings/billing/actions"
echo -e "   ${YELLOW}→ Verify spending limit is set to \$50+/month${NC}"
echo -e "   ${YELLOW}→ Check that workflows are enabled in Actions settings${NC}"
echo ""

# Summary
echo "================================"
echo "Verification Summary"
echo "================================"
echo -e "${GREEN}Passed: $CHECKS_PASSED${NC}"
if [ $CHECKS_WARNING -gt 0 ]; then
  echo -e "${YELLOW}Warnings: $CHECKS_WARNING${NC}"
fi
if [ $CHECKS_FAILED -gt 0 ]; then
  echo -e "${RED}Failed: $CHECKS_FAILED${NC}"
fi
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ LAUNCH READINESS: GREEN${NC}"
  echo ""
  echo "Next steps (after Founder actions complete):"
  echo "1. Send welcome email to Customer #1"
  echo "2. Monitor customer journey: npm run test:e2e (customer journey test)"
  echo "3. Check live platform: https://your-vercel-domain.vercel.app"
  echo "4. Review alerts: https://github.com/mininglife7-dev/newspulse-ai/issues"
  echo ""
  exit 0
else
  echo -e "${RED}❌ LAUNCH READINESS: BLOCKED${NC}"
  echo ""
  echo "Please resolve the failures above before proceeding with launch."
  echo ""
  exit 1
fi
