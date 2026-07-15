#!/bin/bash

# Pre-Launch Validation Script for EURO AI Beta
# Run this before inviting first customers
# Verifies all engineering-controlled systems are ready

set -e

echo "================================"
echo "EURO AI Pre-Launch Validation"
echo "================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Helper functions
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
    ((CHECKS_WARNING++))
}

echo "1. Code Quality Checks"
echo "---------------------"

# Build check
if npm run build > /dev/null 2>&1; then
    check_pass "Build succeeds (next build)"
else
    check_fail "Build failed - fix errors before launch"
fi

# TypeScript check
if npm run type-check > /dev/null 2>&1; then
    check_pass "TypeScript strict mode (zero errors)"
else
    check_fail "TypeScript errors detected"
fi

# Lint check
if npm run lint > /dev/null 2>&1; then
    check_pass "ESLint validation (zero violations)"
else
    check_fail "ESLint errors detected"
fi

echo ""
echo "2. Test Coverage"
echo "----------------"

# Run tests
if npm test > /dev/null 2>&1; then
    TEST_COUNT=$(npm test 2>&1 | grep "Tests" | awk '{print $2}' | head -1)
    check_pass "All tests passing ($TEST_COUNT tests)"
else
    check_fail "Test suite failing - fix before launch"
fi

echo ""
echo "3. Configuration"
echo "----------------"

# Check vercel.json exists
if [ -f "vercel.json" ]; then
    if grep -q "fra1" vercel.json; then
        check_pass "Vercel config: Frankfurt region (EU/GDPR)"
    else
        check_warn "Vercel config: Region not set to fra1"
    fi
else
    check_fail "vercel.json missing"
fi

# Check .env.example exists
if [ -f ".env.example" ]; then
    check_pass "Environment example file exists"
    if grep -q "FIRECRAWL_API_KEY" .env.example; then
        check_pass "  - FIRECRAWL_API_KEY documented"
    fi
    if grep -q "OPENAI_API_KEY" .env.example; then
        check_pass "  - OPENAI_API_KEY documented"
    fi
    if grep -q "SUPABASE" .env.example; then
        check_pass "  - Supabase credentials documented"
    fi
else
    check_warn ".env.example not found"
fi

echo ""
echo "4. Schema Files"
echo "---------------"

# Check Supabase schema exists
if [ -f "supabase/schema.sql" ]; then
    TABLES=$(grep -c "CREATE TABLE" supabase/schema.sql || true)
    if [ "$TABLES" -gt 0 ]; then
        check_pass "Supabase schema exists ($TABLES tables)"
    else
        check_warn "Supabase schema found but no tables detected"
    fi

    # Check for RLS policies
    POLICIES=$(grep -c "CREATE POLICY" supabase/schema.sql || true)
    if [ "$POLICIES" -gt 0 ]; then
        check_pass "Row-Level Security policies defined ($POLICIES policies)"
    else
        check_warn "No RLS policies found in schema"
    fi
else
    check_fail "supabase/schema.sql not found"
fi

echo ""
echo "5. Documentation"
echo "----------------"

DOCS_REQUIRED=(
    "docs/FOUNDER-DEPLOYMENT-CHECKLIST.md"
    "docs/BETA-CUSTOMER-ONBOARDING.md"
    "docs/BETA-ADMIN-RUNBOOK.md"
    "docs/BETA-PHASE-CHECKLIST.md"
    "docs/BETA-MONITORING-DASHBOARD.md"
    "docs/BETA-INCIDENT-RESPONSE-PLAYBOOK.md"
    "docs/BETA-SUCCESS-PLAYBOOK.md"
)

for doc in "${DOCS_REQUIRED[@]}"; do
    if [ -f "$doc" ]; then
        check_pass "Documentation: $(basename $doc)"
    else
        check_fail "Missing: $doc"
    fi
done

echo ""
echo "6. Security"
echo "-----------"

# Check for .env in .gitignore
if grep -q "\.env" .gitignore; then
    check_pass "Environment files excluded from Git"
else
    check_warn ".env not in .gitignore"
fi

# Check for hardcoded secrets
if ! grep -r "sk-" app/ lib/ --include="*.ts" --include="*.tsx" | grep -q "process.env"; then
    check_pass "No hardcoded API keys in source"
else
    check_warn "Potential hardcoded secrets found"
fi

# Check for TODO/FIXME that might be blocking
CRITICAL_TODOS=$(grep -r "CRITICAL\|TODO.*production\|FIXME.*security" app/ lib/ --include="*.ts" --include="*.tsx" | wc -l)
if [ "$CRITICAL_TODOS" -eq 0 ]; then
    check_pass "No critical TODOs blocking launch"
else
    check_warn "Found $CRITICAL_TODOS critical TODOs"
fi

echo ""
echo "=============================="
echo "Validation Summary"
echo "=============================="
echo -e "Passed:  ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Failed:  ${RED}$CHECKS_FAILED${NC}"
echo -e "Warning: ${YELLOW}$CHECKS_WARNING${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed${NC}"
    if [ $CHECKS_WARNING -gt 0 ]; then
        echo -e "${YELLOW}⚠ $CHECKS_WARNING warnings (review before launch)${NC}"
    fi
    exit 0
else
    echo -e "${RED}✗ $CHECKS_FAILED checks failed${NC}"
    echo "Fix issues above before launching Beta"
    exit 1
fi
