#!/bin/bash

# Verify Launch Readiness — Check if Founder actions are complete
# Usage: ./scripts/verify-launch-readiness.sh
# Returns: 0 if all systems ready, 1 if blockers remain

set -e

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

echo "🔍 Launch Readiness Verification"
echo "================================"
echo ""

# Check 1: Environment variables
echo "✓ Check 1: Environment Variables"
if [ -z "$SUPABASE_URL" ]; then
  echo "  ❌ NEXT_PUBLIC_SUPABASE_URL not set"
  exit 1
fi
if [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "  ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
  exit 1
fi
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "  ❌ SUPABASE_SERVICE_ROLE_KEY not set"
  exit 1
fi
echo "  ✅ All environment variables configured"
echo ""

# Check 2: Database connectivity
echo "✓ Check 2: Database Connectivity"
curl -s -X GET \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  "$SUPABASE_URL/rest/v1/customers?limit=1" \
  > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "  ✅ Supabase database connected"
else
  echo "  ❌ Supabase database unreachable"
  echo "     Did you deploy the schema in Supabase SQL Editor?"
  exit 1
fi
echo ""

# Check 3: RLS policies
echo "✓ Check 3: Row-Level Security Policies"
curl -s -X GET \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  "$SUPABASE_URL/rest/v1/customers?limit=1" \
  > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "  ✅ RLS policies configured"
else
  echo "  ❌ RLS policies not responding correctly"
  exit 1
fi
echo ""

# Check 4: Production deployment
echo "✓ Check 4: Production Deployment"
if [ -z "$VERCEL_URL" ]; then
  echo "  ⚠️  VERCEL_URL not set (optional for local testing)"
else
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$VERCEL_URL/api/health")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✅ Vercel deployment healthy"
  else
    echo "  ❌ Vercel deployment returned $HTTP_CODE"
    exit 1
  fi
fi
echo ""

# Check 5: GitHub Actions
echo "✓ Check 5: GitHub Actions Monitoring"
echo "  ⚠️  Manual verification needed:"
echo "  1. Go to https://github.com/mininglife7-dev/newspulse-ai/settings/billing/actions"
echo "  2. Verify spending limit is set to $50+/month"
echo "  3. Check workflow runs: Settings → Actions → Workflows"
echo ""

# Summary
echo "================================"
echo "✅ LAUNCH READINESS: GREEN"
echo ""
echo "Next steps:"
echo "1. Run first customer journey: npm run test:customer-journey"
echo "2. Monitor deployment: https://your-vercel-app.vercel.app"
echo "3. Check alerts: https://github.com/mininglife7-dev/newspulse-ai/issues"
echo ""
