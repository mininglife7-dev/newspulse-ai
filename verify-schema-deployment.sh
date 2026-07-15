#!/bin/bash
#
# Post-Deployment Schema Verification
# Run this immediately after deploy-schema.sh completes successfully
# Verifies all database objects exist and are functional
#

set -e

# Configuration
SUPABASE_URL="${SUPABASE_URL:-https://yrroytwfdrafvajdfkok.supabase.co}"
SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-}"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

check() {
  local name=$1
  local expected=$2
  local actual=$3

  if [ "$actual" -ge "$expected" ]; then
    echo -e "${GREEN}✓${NC} $name: $actual (expected: ≥$expected)"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $name: $actual (expected: ≥$expected)"
    ((FAILED++))
  fi
}

header() {
  echo ""
  echo -e "${BLUE}$1${NC}"
}

# Display header
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║               POST-DEPLOYMENT SCHEMA VERIFICATION                         ║"
echo "║                                                                            ║"
echo "║  Run this after deploy-schema.sh succeeds to verify schema deployed       ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Validate inputs
if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo -e "${YELLOW}⚠️  SERVICE_ROLE_KEY not set${NC}"
  echo ""
  echo "Set it from Supabase dashboard:"
  echo "  https://app.supabase.com → Project → Settings → API"
  echo ""
  echo "Usage:"
  echo "  SERVICE_ROLE_KEY='your-key' SUPABASE_URL='https://...' ./verify-schema-deployment.sh"
  echo ""
  echo "Or set as environment variables and try again."
  exit 1
fi

echo -e "${YELLOW}Connecting to Supabase...${NC}"
echo "URL: $SUPABASE_URL"
echo "Service role key: ${SERVICE_ROLE_KEY:0:20}..."

header "Table Verification"

# Check tables exist
TABLES=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/information_schema.tables?table_schema=eq.public&select=table_name" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" 2>/dev/null | jq 'length' 2>/dev/null || echo "0")

check "Tables created" "16" "$TABLES"

# List actual tables
if [ "$TABLES" -gt 0 ]; then
  echo ""
  echo "Tables found:"
  curl -s -X GET \
    "$SUPABASE_URL/rest/v1/information_schema.tables?table_schema=eq.public&select=table_name&order=table_name.asc" \
    -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" 2>/dev/null | jq -r '.[] | .table_name' 2>/dev/null | sed 's/^/  - /' || echo "  (could not retrieve)"
fi

header "Index Verification"

# Check indexes
INDEXES=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/pg_indexes?schemaname=eq.public&select=indexname" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" 2>/dev/null | jq 'length' 2>/dev/null || echo "0")

check "Indexes created" "30" "$INDEXES"

header "Policy Verification"

# Check RLS policies
POLICIES=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/pg_policies?schemaname=eq.public&select=policyname" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" 2>/dev/null | jq 'length' 2>/dev/null || echo "0")

check "RLS policies" "38" "$POLICIES"

header "Connection & Authentication"

# Test API connection
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$SUPABASE_URL/rest/v1/" \
  -H "apikey: $SERVICE_ROLE_KEY" 2>/dev/null | tail -1)

if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "204" ]; then
  echo -e "${GREEN}✓${NC} API connection successful"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} API connection failed (HTTP $RESPONSE)"
  ((FAILED++))
fi

header "Summary"

TOTAL=$((PASSED + FAILED))
echo ""
echo -e "  ${GREEN}Passed:${NC}  $PASSED/$TOTAL"
if [ $FAILED -gt 0 ]; then
  echo -e "  ${RED}Failed:${NC}   $FAILED/$TOTAL"
fi

echo ""
if [ $FAILED -eq 0 ] && [ $PASSED -ge 5 ]; then
  echo -e "${GREEN}✅ Schema deployment verified successfully!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Run E2E registration tests:"
  echo "   npm test tests/e2e-registration.integration.test.ts"
  echo "2. Test registration flow manually"
  echo "3. Merge PR #103: gh pr merge 103 --squash --auto"
  echo "4. Monitor Vercel production deployment"
  echo ""
  exit 0
else
  echo -e "${RED}❌ Schema verification incomplete${NC}"
  echo ""
  echo "Check:"
  echo "1. SERVICE_ROLE_KEY is correct and has full permissions"
  echo "2. Supabase project is responding correctly"
  echo "3. Schema deployment completed without errors"
  echo ""
  exit 1
fi
