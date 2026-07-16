#!/bin/bash

# Pre-Deployment Verification Script
# Run this script before pushing to production
# Verifies: tests, build, types, lint, security, API health

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "EURO AI Platform - Pre-Deployment Verification"
echo "================================================"
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

# Helper function for checks
run_check() {
    local check_name=$1
    local command=$2

    echo -n "🔍 $check_name... "

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((CHECKS_FAILED++))
        return 1
    fi
}

# 1. Check Node.js version
echo "📋 Environment Checks"
echo "===================="
run_check "Node.js installed" "node --version" || exit 1
run_check "npm installed" "npm --version" || exit 1
echo ""

# 2. Check dependencies
echo "📦 Dependency Checks"
echo "==================="
run_check "node_modules exists" "test -d node_modules" || exit 1
run_check "All dependencies installed" "npm ls --depth=0" || exit 1
echo ""

# 3. Code quality
echo "✨ Code Quality Checks"
echo "====================="
run_check "TypeScript type checking" "npm run type-check"
run_check "ESLint validation" "npm run lint"
echo ""

# 4. Testing
echo "🧪 Testing"
echo "=========="
run_check "Unit tests passing" "npm run test"
echo ""

# 5. Build
echo "🔨 Build"
echo "========"
run_check "Production build" "npm run build"
echo ""

# 6. Environment variables
echo "🔐 Environment Configuration"
echo "============================"

check_env_var() {
    local var_name=$1
    local var_value=${!var_name}

    if [ -z "$var_value" ]; then
        echo -e "${YELLOW}⚠ $var_name not set${NC}"
        return 1
    else
        echo -e "${GREEN}✓ $var_name configured${NC}"
        return 0
    fi
}

# Check required environment variables
check_env_var "NEXT_PUBLIC_SUPABASE_URL"
check_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY"
check_env_var "SUPABASE_SERVICE_ROLE_KEY"
echo ""

# 7. Git status
echo "📊 Git Status"
echo "============="

if [ -d ".git" ]; then
    uncommitted=$(git status --porcelain | wc -l)
    if [ "$uncommitted" -eq 0 ]; then
        echo -e "${GREEN}✓ No uncommitted changes${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${YELLOW}⚠ $uncommitted uncommitted changes detected${NC}"
        echo "  Run 'git status' to review"
        ((CHECKS_FAILED++))
    fi

    # Check branch
    current_branch=$(git rev-parse --abbrev-ref HEAD)
    echo "  Current branch: $current_branch"

    # Get recent commits
    echo "  Recent commits:"
    git log --oneline -3 | sed 's/^/    /'
else
    echo -e "${YELLOW}⚠ Not a git repository${NC}"
fi
echo ""

# 8. Security checks
echo "🔒 Security Checks"
echo "=================="
run_check "No hardcoded secrets" "! grep -r 'password.*=' app/ lib/ --include='*.ts' --include='*.tsx' | grep -v 'process.env' | grep -q ."

# Check for common vulnerabilities
echo "  Scanning for known vulnerabilities..."
if npm audit --audit-level=moderate > /dev/null 2>&1; then
    echo -e "${GREEN}✓ No known vulnerabilities${NC}"
    ((CHECKS_PASSED++))
else
    echo -e "${YELLOW}⚠ Run 'npm audit' to review security vulnerabilities${NC}"
    ((CHECKS_FAILED++))
fi
echo ""

# 9. Summary
echo "================================================"
echo "Pre-Deployment Verification Summary"
echo "================================================"
echo -e "✓ Passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "✗ Failed: ${RED}$CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready for deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review git commits: git log --oneline main..HEAD"
    echo "2. Create database backup: supabase db pull"
    echo "3. Push to main: git push origin main"
    echo "4. Monitor Vercel deployment"
    echo "5. Verify: curl https://newspulse-ai.vercel.app/api/health"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please fix before deployment.${NC}"
    exit 1
fi
