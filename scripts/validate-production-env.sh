#!/bin/bash

# Production Environment Validation
# Run this before any production deployment to catch missing/invalid env vars
# Usage: ./scripts/validate-production-env.sh [environment]
# Examples:
#   ./scripts/validate-production-env.sh vercel  (check Vercel dashboard vars)
#   ./scripts/validate-production-env.sh local   (check .env.local file)

set -e

ENVIRONMENT="${1:-.env.example}"
CHECKS_PASSED=0
CHECKS_FAILED=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((CHECKS_PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((CHECKS_FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "================================"
echo "Production Environment Validation"
echo "Environment: $ENVIRONMENT"
echo "================================"
echo ""

# Array of required production variables
REQUIRED_VARS=(
    "FIRECRAWL_API_KEY:Firecrawl API authentication"
    "OPENAI_API_KEY:OpenAI API authentication"
    "NEXT_PUBLIC_SUPABASE_URL:Supabase project URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY:Supabase anonymous key"
    "SUPABASE_SERVICE_ROLE_KEY:Supabase service role (admin access)"
)

OPTIONAL_VARS=(
    "NEXT_PUBLIC_SITE_URL:Site URL for redirects"
    "ENABLE_RATE_LIMITING:Enable request rate limiting"
    "LOG_LEVEL:Logging level (debug, info, warn, error)"
)

# Load environment based on input
load_env() {
    if [ "$ENVIRONMENT" = "vercel" ]; then
        check_warn "Cannot read Vercel env vars from CLI (use Vercel dashboard)"
        echo ""
        echo "To verify Vercel env vars:"
        echo "1. Go to: https://vercel.com/projects/newspulse-ai/settings/environment-variables"
        echo "2. Verify all REQUIRED variables are listed"
        echo "3. All should show 'Production' scope"
        return 1
    elif [ "$ENVIRONMENT" = "local" ]; then
        if [ -f ".env.local" ]; then
            export $(cat .env.local | grep -v '^#' | xargs)
        else
            check_warn ".env.local not found"
            return 1
        fi
    elif [ -f "$ENVIRONMENT" ]; then
        export $(cat "$ENVIRONMENT" | grep -v '^#' | xargs)
    else
        check_fail "Environment file not found: $ENVIRONMENT"
        return 1
    fi
}

echo "1. Loading environment variables"
echo "--------------------------------"

if ! load_env; then
    echo ""
    echo "Note: Some environments cannot be validated from CLI."
    echo "Follow manual steps below for complete validation."
fi

echo ""
echo "2. Checking required variables"
echo "------------------------------"

for var_pair in "${REQUIRED_VARS[@]}"; do
    VAR_NAME="${var_pair%:*}"
    VAR_DESC="${var_pair#*:}"

    if [ -z "${!VAR_NAME}" ]; then
        check_fail "$VAR_NAME not set ($VAR_DESC)"
    else
        # Check for minimum length (most API keys are at least 20 chars)
        VAR_VALUE="${!VAR_NAME}"
        if [ ${#VAR_VALUE} -lt 10 ]; then
            check_fail "$VAR_NAME too short (looks invalid)"
        else
            check_pass "$VAR_NAME set (${#VAR_VALUE} chars)"
        fi
    fi
done

echo ""
echo "3. Checking optional variables"
echo "------------------------------"

for var_pair in "${OPTIONAL_VARS[@]}"; do
    VAR_NAME="${var_pair%:*}"
    VAR_DESC="${var_pair#*:}"

    if [ -z "${!VAR_NAME}" ]; then
        check_warn "$VAR_NAME not set (optional: $VAR_DESC)"
    else
        check_pass "$VAR_NAME set (${!VAR_NAME})"
    fi
done

echo ""
echo "4. Validating variable formats"
echo "------------------------------"

# Supabase URL format check
if [ ! -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    if [[ $NEXT_PUBLIC_SUPABASE_URL == *"supabase.co"* ]]; then
        check_pass "Supabase URL format valid"
    else
        check_fail "Supabase URL doesn't look like supabase.co (check value)"
    fi
fi

# API Key format checks (should start with common prefixes)
if [ ! -z "$OPENAI_API_KEY" ]; then
    if [[ $OPENAI_API_KEY == sk-* ]] || [[ $OPENAI_API_KEY == sk_* ]]; then
        check_pass "OpenAI key format valid (starts with sk-)"
    else
        check_warn "OpenAI key doesn't start with sk- (might still be valid)"
    fi
fi

if [ ! -z "$FIRECRAWL_API_KEY" ]; then
    if [ ${#FIRECRAWL_API_KEY} -gt 30 ]; then
        check_pass "Firecrawl key length reasonable"
    else
        check_warn "Firecrawl key looks short (verify in Firecrawl dashboard)"
    fi
fi

echo ""
echo "5. Connectivity tests (requires valid credentials)"
echo "-------------------------------------------------"

# Only run connectivity tests if we have actual values
if [ ! -z "$OPENAI_API_KEY" ] && [ ! -z "$FIRECRAWL_API_KEY" ]; then
    # Test OpenAI connectivity
    if curl -s -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models 2>/dev/null | grep -q "object"; then
        check_pass "OpenAI API is reachable"
    else
        check_warn "OpenAI API connectivity test inconclusive (check key validity)"
    fi

    # Test Firecrawl connectivity
    if curl -s -f "https://api.firecrawl.dev/v0/health" >/dev/null 2>&1; then
        check_pass "Firecrawl API is reachable"
    else
        check_warn "Firecrawl API health check inconclusive"
    fi
else
    check_warn "Skipping connectivity tests (credentials needed)"
fi

# Test Supabase if we have the URL
if [ ! -z "$NEXT_PUBLIC_SUPABASE_URL" ] && [ ! -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    if curl -s -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
            "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/workspaces?limit=1" 2>/dev/null | grep -q ""; then
        check_pass "Supabase API is reachable"
    else
        check_warn "Supabase API test inconclusive"
    fi
else
    check_warn "Skipping Supabase test (credentials needed)"
fi

echo ""
echo "================================"
echo "Validation Summary"
echo "================================"
echo -e "Passed:  ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Failed:  ${RED}$CHECKS_FAILED${NC}"
echo ""

# Special instructions for Vercel
if [ "$ENVIRONMENT" = "vercel" ]; then
    echo "VERCEL ENVIRONMENT VALIDATION"
    echo ""
    echo "Go to: https://vercel.com/projects/newspulse-ai/settings/environment-variables"
    echo ""
    echo "Verify these variables exist and are set to Production:"
    echo "  ☐ FIRECRAWL_API_KEY"
    echo "  ☐ OPENAI_API_KEY"
    echo "  ☐ NEXT_PUBLIC_SUPABASE_URL"
    echo "  ☐ NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  ☐ SUPABASE_SERVICE_ROLE_KEY"
    echo ""
fi

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical environment variables validated${NC}"
    echo ""
    echo "You can safely deploy to production."
    exit 0
else
    echo -e "${RED}✗ $CHECKS_FAILED environment variables failed validation${NC}"
    echo ""
    echo "Fix the issues above before deploying."
    echo ""
    echo "Need help? Check:"
    echo "  1. docs/FOUNDER-DEPLOYMENT-CHECKLIST.md (Action 4: Set Vercel Environment Variables)"
    echo "  2. docs/BETA-FIRST-24-HOURS.md (Emergency Response section)"
    exit 1
fi
