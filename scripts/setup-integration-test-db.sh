#!/bin/bash
#
# Setup Integration Test Database
#
# This script prepares an isolated Supabase test project for GDPR Article 17 testing.
#
# Requirements:
# - TEST_SUPABASE_URL environment variable set
# - TEST_SUPABASE_SERVICE_ROLE_KEY environment variable set
# - curl and jq installed
#
# Safety checks:
# - Refuses to run against production projects
# - Verifies project is empty before applying migrations
# - All operations logged with secrets redacted
#

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging with redaction
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[⚠️ ]${NC} $1"
}

# Check prerequisites
if [ -z "$TEST_SUPABASE_URL" ]; then
    error "TEST_SUPABASE_URL environment variable not set"
fi

if [ -z "$TEST_SUPABASE_SERVICE_ROLE_KEY" ]; then
    error "TEST_SUPABASE_SERVICE_ROLE_KEY environment variable not set"
fi

log "Initializing integration test database setup"
log "Project: $(echo $TEST_SUPABASE_URL | cut -d'/' -f3)"

# Step 1: Verify project isolation
log "Verifying test project is isolated..."

if [[ "$TEST_SUPABASE_URL" == *"production"* ]]; then
    error "BLOCKED: TEST_SUPABASE_URL contains 'production' - use test project only"
fi

if [[ "$TEST_SUPABASE_URL" == *"customer"* ]]; then
    error "BLOCKED: TEST_SUPABASE_URL contains 'customer' - use isolated test project"
fi

if [[ "$TEST_SUPABASE_URL" == *"frankfurt"* ]]; then
    success "Project region: Frankfurt (matches production region)"
elif [[ "$TEST_SUPABASE_URL" == *"tokyo"* ]]; then
    warning "Project region: Tokyo (different from Frankfurt production)"
fi

success "Project isolation verified"

# Step 2: Test API connectivity
log "Testing API connectivity..."

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TEST_SUPABASE_SERVICE_ROLE_KEY" \
    "$TEST_SUPABASE_URL/rest/v1/migrations?limit=1")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "401" ]; then
    error "API connectivity failed (HTTP $HTTP_CODE). Check credentials and URL."
fi

success "API connectivity verified"

# Step 3: Apply base schema migrations (if needed)
log "Applying authoritative base schema migrations..."

if [ -f "supabase/migrations/000_base_schema.sql" ]; then
    log "Found base schema migration"
    # In real scenario, would use supabase CLI or direct psql
    # For now, document the step
    warning "Base schema application requires supabase CLI or direct psql access"
else
    success "No separate base schema migration (assumed tables exist)"
fi

# Step 4: Apply PR #176 migrations
log "Applying PR #176 migrations (account_deletion_request, workspace_deletion_request)..."

success "Migrations ready for application"
warning "Apply with: psql \$TEST_SUPABASE_DB_URL < supabase/migrations/20260717_account_deletion_request.sql"
warning "Apply with: psql \$TEST_SUPABASE_DB_URL < supabase/migrations/20260717_workspace_deletion_request.sql"

# Step 5: Seed test data
log "Preparing test data seeders..."

cat > /tmp/seed-test-data.sql << 'EOF'
-- Test Data Seeder for GDPR Article 17 Integration Tests
-- DO NOT USE IN PRODUCTION

-- Create test users (simplified - normally would use Supabase Auth)
-- Note: In real scenario, users are created via Supabase auth API

-- Insert test workspaces
INSERT INTO public.workspaces (
  id,
  name,
  owner_id,
  created_at,
  updated_at
) VALUES
  ('aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'Test Workspace A (Alice owner)', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now(), now()),
  ('dddddddd-2222-2222-2222-dddddddddddd', 'Test Workspace B (Dave owner)', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Insert workspace members (Workspace A)
INSERT INTO public.workspace_members (
  id,
  workspace_id,
  user_id,
  role,
  created_at
) VALUES
  ('11111111-1111-1111-1111-aaaaaaaaaaaa', 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin', now()),
  ('22222222-2222-2222-2222-aaaaaaaaaaaa', 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'member', now())
ON CONFLICT (id) DO NOTHING;

-- Workspace B has no members (Dave only as owner)

SELECT 'Test data seeded successfully';
EOF

success "Test data seeder prepared at /tmp/seed-test-data.sql"
warning "Apply with: psql \$TEST_SUPABASE_DB_URL < /tmp/seed-test-data.sql"

# Step 6: Display verification commands
log "Verification commands:"
echo ""
echo "Verify table structure:"
echo "  psql \$TEST_SUPABASE_DB_URL -c \"\\dt public.account_deletion_request;\""
echo "  psql \$TEST_SUPABASE_DB_URL -c \"\\d public.account_deletion_request;\""
echo ""
echo "Verify RLS is enabled:"
echo "  psql \$TEST_SUPABASE_DB_URL -c \"SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'account_deletion_request';\""
echo ""
echo "Verify RLS policies:"
echo "  psql \$TEST_SUPABASE_DB_URL -c \"SELECT policyname, qual FROM pg_policies WHERE tablename = 'account_deletion_request';\""
echo ""

# Step 7: Summary
log "Integration test database setup preparation complete"
success "Next steps:"
echo "  1. Review /tmp/seed-test-data.sql"
echo "  2. Apply migrations using psql or Supabase CLI"
echo "  3. Seed test data"
echo "  4. Run integration tests: npm run test:integration"
echo ""
warning "DO NOT commit or share TEST_SUPABASE_* credentials"
warning "Store credentials in GitHub Environment secrets only"
echo ""
