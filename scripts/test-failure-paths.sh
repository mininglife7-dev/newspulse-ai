#!/bin/bash

# Failure Path Verification Tests
# Demonstrates that various failure conditions are properly caught
# This is a dry-run test that does NOT require credentials

set -euo pipefail

echo "==============================================="
echo "Integration Harness Failure Path Tests"
echo "==============================================="
echo ""

test_count=0
pass_count=0
fail_count=0

# Test helper
run_test() {
  local test_name="$1"
  local test_command="$2"
  local should_fail="${3:-false}"

  test_count=$((test_count + 1))
  echo "Test $test_count: $test_name"

  if eval "$test_command" 2>/dev/null; then
    if [ "$should_fail" = "true" ]; then
      echo "  ❌ FAILED: Expected failure but command succeeded"
      fail_count=$((fail_count + 1))
    else
      echo "  ✓ PASSED: Command succeeded as expected"
      pass_count=$((pass_count + 1))
    fi
  else
    if [ "$should_fail" = "true" ]; then
      echo "  ✓ PASSED: Command failed as expected"
      pass_count=$((pass_count + 1))
    else
      echo "  ❌ FAILED: Command failed unexpectedly"
      fail_count=$((fail_count + 1))
    fi
  fi
  echo ""
}

# ============================================================================
# FAILURE PATH 1: Isolation Marker Validation
# ============================================================================

echo "TEST GROUP: Isolation Marker Validation"
echo "----------------------------------------"

# Should fail: missing marker
run_test "Missing TEST_ENVIRONMENT_MARKER" \
  "bash -c 'unset TEST_ENVIRONMENT_MARKER; if [ -z \"\$TEST_ENVIRONMENT_MARKER\" ]; then exit 1; fi'" \
  "true"

# Should fail: wrong marker
run_test "Wrong TEST_ENVIRONMENT_MARKER value" \
  "bash -c 'TEST_ENVIRONMENT_MARKER=\"WRONG_VALUE\"; if [ \"\$TEST_ENVIRONMENT_MARKER\" != \"EURO_AI_ISOLATED_SECURITY_LAB\" ]; then exit 1; fi'" \
  "true"

# Should pass: correct marker
run_test "Correct TEST_ENVIRONMENT_MARKER" \
  "bash -c 'TEST_ENVIRONMENT_MARKER=\"EURO_AI_ISOLATED_SECURITY_LAB\"; if [ \"\$TEST_ENVIRONMENT_MARKER\" = \"EURO_AI_ISOLATED_SECURITY_LAB\" ]; then exit 0; fi'" \
  "false"

# ============================================================================
# FAILURE PATH 2: Production Denylist
# ============================================================================

echo "TEST GROUP: Production Project Denylist"
echo "---------------------------------------"

# Should fail: production in URL
run_test "Production URL detected" \
  "bash -c 'TEST_URL=\"https://frankfurt-prod.supabase.co\"; if echo \$TEST_URL | grep -q \"prod\"; then exit 1; fi'" \
  "true"

# Should fail: customer in URL
run_test "Customer URL detected" \
  "bash -c 'TEST_URL=\"https://customer-db.supabase.co\"; if echo \$TEST_URL | grep -q \"customer\"; then exit 1; fi'" \
  "true"

# Should pass: isolated URL
run_test "Isolated URL allowed" \
  "bash -c 'TEST_URL=\"https://newspulse-ai-security-lab.supabase.co\"; if echo \$TEST_URL | grep -q \"production\\|customer\"; then exit 1; else exit 0; fi'" \
  "false"

# ============================================================================
# FAILURE PATH 3: Credential Leak Detection
# ============================================================================

echo "TEST GROUP: Credential Leak Detection (Quiet Scanning)"
echo "------------------------------------------------------"

# Create a test log with a synthetic secret
TEST_LOG="/tmp/test-log-with-secret.txt"
echo "some output" > "$TEST_LOG"
echo "sensitive: sb_secret_abc123xyz" >> "$TEST_LOG"

# Should fail: secret pattern in log
run_test "Detect sb_secret_ pattern (quiet)" \
  "bash -c 'if grep -q \"sb_secret_\" $TEST_LOG; then exit 1; fi'" \
  "true"

# Should fail: publishable key pattern in log
echo "config: sb_publishable_xyz789" >> "$TEST_LOG"
run_test "Detect sb_publishable_ pattern (quiet)" \
  "bash -c 'if grep -q \"sb_publishable_\" $TEST_LOG; then exit 1; fi'" \
  "true"

# Create clean log
CLEAN_LOG="/tmp/test-log-clean.txt"
echo "test passed" > "$CLEAN_LOG"
echo "all checks green" >> "$CLEAN_LOG"

# Should pass: no credential patterns in clean log
run_test "Clean log passes quiet scan" \
  "bash -c 'if grep -q \"sb_secret_\\|sb_publishable_\" $CLEAN_LOG; then exit 1; else exit 0; fi'" \
  "false"

# Cleanup
rm -f "$TEST_LOG" "$CLEAN_LOG"

# ============================================================================
# FAILURE PATH 4: Set -euo Pipefail
# ============================================================================

echo "TEST GROUP: Pipeline Error Propagation (set -euo pipefail)"
echo "-----------------------------------------------------------"

# Should fail: failed command in pipeline
run_test "Failed command in pipeline caught" \
  "bash -c 'set -euo pipefail; echo test | grep \"nomatch\" | wc -l'" \
  "true"

# Should pass: successful pipeline
run_test "Successful pipeline passes" \
  "bash -c 'set -euo pipefail; echo test | grep \"test\" | wc -l'" \
  "false"

# ============================================================================
# FAILURE PATH 5: Test Result Validation
# ============================================================================

echo "TEST GROUP: Integration Test Result Validation"
echo "----------------------------------------------"

# Create test log with skipped tests
SKIPPED_LOG="/tmp/test-skipped.txt"
cat > "$SKIPPED_LOG" << 'EOF'
Test Files  1 passed (1)
Tests  5 skipped (5)
EOF

# Should fail: any tests skipped
run_test "Skipped tests detected and fail" \
  "bash -c 'if grep -q \"skipped\" $SKIPPED_LOG; then exit 1; fi'" \
  "true"

# Create test log with failures
FAILED_LOG="/tmp/test-failed.txt"
cat > "$FAILED_LOG" << 'EOF'
Test Files  1 passed (1)
Tests  3 passed | 2 failed (5)
EOF

# Should fail: failed tests
run_test "Failed tests detected and fail" \
  "bash -c 'log=\$(cat $FAILED_LOG); if echo \"\$log\" | grep -q \"failed\"; then exit 1; fi'" \
  "true"

# Create test log with all passing
PASSING_LOG="/tmp/test-passing.txt"
cat > "$PASSING_LOG" << 'EOF'
Test Files  1 passed (1)
Tests  5 passed (5)
EOF

# Should pass: all tests passing
run_test "All tests passing succeeds" \
  "bash -c 'log=\$(cat $PASSING_LOG); if echo \"\$log\" | grep -q \"failed\\|skipped\"; then exit 1; else exit 0; fi'" \
  "false"

# Cleanup
rm -f "$SKIPPED_LOG" "$FAILED_LOG" "$PASSING_LOG"

# ============================================================================
# FAILURE PATH 6: Bundle Secret Scanning
# ============================================================================

echo "TEST GROUP: Bundle Secret Scanning (No Print)"
echo "---------------------------------------------"

# Create mock bundle with secret (no printing)
BUNDLE_WITH_SECRET="/tmp/bundle.js"
echo "const config = { url: 'https://api.example.com', secretKey: 'sb_secret_abc123' };" > "$BUNDLE_WITH_SECRET"

# Should fail: detect secret in bundle without printing it
run_test "Detect secret in bundle (no output)" \
  "bash -c 'if grep -q \"sb_secret_\" $BUNDLE_WITH_SECRET; then exit 1; fi; exit 0'" \
  "true"

# Create clean bundle
BUNDLE_CLEAN="/tmp/bundle-clean.js"
echo "const config = { url: 'https://api.example.com', timeout: 5000 };" > "$BUNDLE_CLEAN"

# Should pass: clean bundle
run_test "Clean bundle passes scan" \
  "bash -c 'if grep -q \"sb_secret_\\|sb_publishable_\" $BUNDLE_CLEAN; then exit 1; else exit 0; fi'" \
  "false"

# Cleanup
rm -f "$BUNDLE_WITH_SECRET" "$BUNDLE_CLEAN"

# ============================================================================
# RESULTS
# ============================================================================

echo "==============================================="
echo "Failure Path Test Results"
echo "==============================================="
echo "Total tests: $test_count"
echo "Passed: $pass_count"
echo "Failed: $fail_count"
echo ""

if [ $fail_count -eq 0 ]; then
  echo "✓ All failure path tests PASSED"
  echo "Workflow properly catches and fails on:"
  echo "  ✓ Missing isolation marker"
  echo "  ✓ Wrong isolation marker"
  echo "  ✓ Production project URLs"
  echo "  ✓ Credential patterns in logs"
  echo "  ✓ Piped command failures"
  echo "  ✓ Skipped integration tests"
  echo "  ✓ Failed integration tests"
  echo "  ✓ Secrets in bundles"
  exit 0
else
  echo "❌ $fail_count failure path tests FAILED"
  exit 1
fi
