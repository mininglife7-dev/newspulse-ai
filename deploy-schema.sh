#!/bin/bash
#
# Supabase Schema Deployment Script
# Usage: ./deploy-schema.sh <postgres-password>
#
# Prerequisites:
# - gh CLI installed and authenticated
# - Git repository at mininglife7-dev/newspulse-ai
# - On branch: claude/hercules-living-enterprise-oj7wyb
#
# This script triggers the deployment workflow and monitors execution.
#

set -e

# Configuration
PROJECT_ID="yrroytwfdrafvajdfkok"
ENVIRONMENT="production"
BRANCH="claude/hercules-living-enterprise-oj7wyb"
OWNER="mininglife7-dev"
REPO="newspulse-ai"
WORKFLOW="supabase-schema-deploy.yml"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Display header
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║           SUPABASE SCHEMA DEPLOYMENT - AUTONOMOUS EXECUTION                ║"
echo "║                                                                            ║"
echo "║  Project ID: $PROJECT_ID                                      ║"
echo "║  Environment: $ENVIRONMENT                                                   ║"
echo "║  Branch: $BRANCH           ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Validate input
if [ -z "$1" ]; then
  echo -e "${RED}❌ Error: Database password required${NC}"
  echo ""
  echo "Usage: $0 <postgres-password>"
  echo ""
  echo "Password source: https://app.supabase.com"
  echo "  → Project $PROJECT_ID"
  echo "  → Settings → Database → Password"
  exit 1
fi

DB_PASSWORD="$1"

# Validate password length (postgres passwords typically 20+ characters)
if [ ${#DB_PASSWORD} -lt 10 ]; then
  echo -e "${YELLOW}⚠️  Warning: Password appears short (${#DB_PASSWORD} characters)${NC}"
  read -p "Continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo ""
echo -e "${YELLOW}Step 1: Verifying workflow dispatch capability...${NC}"

# Check gh CLI
if ! command -v gh &> /dev/null; then
  echo -e "${RED}❌ Error: 'gh' CLI not found. Install from https://cli.github.com${NC}"
  exit 1
fi

echo -e "${GREEN}✓ gh CLI available${NC}"

# Verify branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
  echo -e "${YELLOW}⚠️  Current branch: $CURRENT_BRANCH${NC}"
  echo -e "${YELLOW}    Expected branch: $BRANCH${NC}"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo -e "${GREEN}✓ Branch verified${NC}"

echo ""
echo -e "${YELLOW}Step 2: Triggering deployment workflow...${NC}"

# Trigger workflow
DISPATCH_RESPONSE=$(gh workflow run "$WORKFLOW" \
  --repo "$OWNER/$REPO" \
  --ref "$BRANCH" \
  -f "environment=$ENVIRONMENT" \
  -f "project_id=$PROJECT_ID" \
  -f "db_password=$DB_PASSWORD" 2>&1)

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to trigger workflow${NC}"
  echo "Response: $DISPATCH_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Workflow dispatch sent${NC}"

echo ""
echo -e "${YELLOW}Step 3: Waiting for workflow run to appear...${NC}"

# Wait for workflow run to appear
sleep 5

# Get latest run
RUN_DATA=$(gh run list \
  --repo "$OWNER/$REPO" \
  --workflow "$WORKFLOW" \
  --branch "$BRANCH" \
  --limit 1 \
  --json "databaseId,number,status,conclusion,createdAt" 2>/dev/null | jq '.[0]' 2>/dev/null || echo "{}")

if [ "$RUN_DATA" = "{}" ] || [ "$RUN_DATA" = "null" ]; then
  echo -e "${RED}❌ Failed to get workflow run${NC}"
  echo "Check manually at: https://github.com/$OWNER/$REPO/actions/workflows/$WORKFLOW"
  exit 1
fi

RUN_ID=$(echo "$RUN_DATA" | jq -r '.databaseId // .number // empty')
if [ -z "$RUN_ID" ]; then
  echo -e "${RED}❌ Could not extract run ID${NC}"
  echo "$RUN_DATA"
  exit 1
fi

echo -e "${GREEN}✓ Workflow run #$RUN_ID created${NC}"
echo "  Dashboard: https://github.com/$OWNER/$REPO/actions/runs/$RUN_ID"

echo ""
echo -e "${YELLOW}Step 4: Monitoring deployment...${NC}"

# Monitor until completion
POLL_COUNT=0
MAX_POLLS=60  # 30 minutes
COMPLETED=false
RESULT="unknown"

while [ $POLL_COUNT -lt $MAX_POLLS ]; do
  POLL_COUNT=$((POLL_COUNT + 1))

  RUN_STATUS=$(gh run view "$RUN_ID" \
    --repo "$OWNER/$REPO" \
    --json "status,conclusion" 2>/dev/null | jq -r '.status // "unknown"' 2>/dev/null)

  RUN_CONCLUSION=$(gh run view "$RUN_ID" \
    --repo "$OWNER/$REPO" \
    --json "status,conclusion" 2>/dev/null | jq -r '.conclusion // "unknown"' 2>/dev/null)

  if [ "$RUN_STATUS" = "completed" ]; then
    COMPLETED=true
    RESULT="$RUN_CONCLUSION"
    echo ""
    break
  elif [ "$RUN_STATUS" = "in_progress" ]; then
    echo -ne "\r  ⏳ Deployment in progress... ($POLL_COUNT/$MAX_POLLS, ~$((($MAX_POLLS - $POLL_COUNT) * 30))s remaining)"
  else
    echo -ne "\r  ⏳ Waiting for workflow start... ($POLL_COUNT/$MAX_POLLS)"
  fi

  sleep 30
done

if [ "$COMPLETED" = false ]; then
  echo ""
  echo -e "${YELLOW}⚠️  Deployment monitoring timeout${NC}"
  echo "Check status at: https://github.com/$OWNER/$REPO/actions/runs/$RUN_ID"
  exit 1
fi

echo ""
echo -e "${YELLOW}Step 5: Deployment Summary${NC}"

if [ "$RESULT" = "success" ]; then
  echo -e "${GREEN}"
  echo "╔════════════════════════════════════════════════════════════════════════════╗"
  echo "║                                                                            ║"
  echo "║  ✅ DEPLOYMENT SUCCESSFUL                                                  ║"
  echo "║                                                                            ║"
  echo "║  Schema deployed to Supabase project: $PROJECT_ID                      ║"
  echo "║  Workflow Run: $RUN_ID                                           ║"
  echo "║  Status: SUCCESS                                                           ║"
  echo "║                                                                            ║"
  echo "║  Next Steps:                                                               ║"
  echo "║  1. Verify schema in Supabase SQL Editor                                   ║"
  echo "║  2. Run E2E integration tests:                                             ║"
  echo "║     npm test tests/e2e-registration.integration.test.ts                    ║"
  echo "║  3. Test registration flow manually                                        ║"
  echo "║  4. Merge PR #103: gh pr merge 103 --squash --auto                         ║"
  echo "║  5. Monitor Vercel production deployment                                   ║"
  echo "║                                                                            ║"
  echo "╚════════════════════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"

  echo ""
  echo "View logs: https://github.com/$OWNER/$REPO/actions/runs/$RUN_ID"

  exit 0
else
  echo -e "${RED}"
  echo "╔════════════════════════════════════════════════════════════════════════════╗"
  echo "║  ❌ DEPLOYMENT FAILED                                                      ║"
  echo "║  Status: $RESULT                                                           ║"
  echo "╚════════════════════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"

  echo ""
  echo "Troubleshooting:"
  echo "1. View full logs: https://github.com/$OWNER/$REPO/actions/runs/$RUN_ID"
  echo "2. Verify project ID is correct: $PROJECT_ID"
  echo "3. Verify password is correct"
  echo "4. Check Supabase project status: https://app.supabase.com"
  echo "5. Check Supabase dashboard for any errors"

  exit 1
fi
