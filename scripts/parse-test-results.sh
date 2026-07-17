#!/usr/bin/env node

/**
 * Parse test results from integration test log
 * Generates structured JSON evidence for workflow reporting
 *
 * Usage: node scripts/parse-test-results.sh <log-file>
 * Output: JSON to stdout
 */

const fs = require('fs');
const path = require('path');

const logFile = process.argv[2];

if (!logFile) {
  console.error('Usage: node scripts/parse-test-results.sh <log-file>');
  process.exit(1);
}

if (!fs.existsSync(logFile)) {
  console.error(`Error: Log file not found: ${logFile}`);
  process.exit(1);
}

const log = fs.readFileSync(logFile, 'utf8');

// Parse vitest output format:
// Test Files  1 passed | 1 skipped (2)
// Tests  5 passed | 1 failed | 2 skipped (8)

const evidence = {
  timestamp: new Date().toISOString(),
  test_counts: {
    executed: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  },
  execution: {
    integration_tests: 'PENDING',
  },
  rls_matrix: [],
  credentials_exposed: false,
  secrets_in_bundle: false,
  workflow_conclusion: 'PENDING',
};

// Extract test file counts
const testFilesMatch = log.match(/Test Files\s+(\d+)\s+passed\s*(?:\|\s*(\d+)\s+skipped)?/);
if (testFilesMatch) {
  const filesPassed = parseInt(testFilesMatch[1], 10);
  const filesSkipped = testFilesMatch[2] ? parseInt(testFilesMatch[2], 10) : 0;
  evidence.test_counts.executed = filesPassed;
}

// Extract test counts
const testsMatch = log.match(
  /Tests\s+(\d+)\s+passed\s*(?:\|\s*(\d+)\s+failed\s*)?(?:\|\s*(\d+)\s+skipped\s*)?/
);
if (testsMatch) {
  evidence.test_counts.passed = parseInt(testsMatch[1], 10);
  evidence.test_counts.failed = testsMatch[2] ? parseInt(testsMatch[2], 10) : 0;
  evidence.test_counts.skipped = testsMatch[3] ? parseInt(testsMatch[3], 10) : 0;
  evidence.test_counts.executed = evidence.test_counts.passed + evidence.test_counts.failed;
}

// Determine integration test status
if (evidence.test_counts.skipped > 0) {
  evidence.execution.integration_tests = 'SKIPPED (not allowed in CI)';
} else if (evidence.test_counts.failed > 0) {
  evidence.execution.integration_tests = 'FAILED';
} else if (evidence.test_counts.executed > 0) {
  evidence.execution.integration_tests = 'PASSED';
} else {
  evidence.execution.integration_tests = 'NOT_RUN';
}

// Check for credential leaks (quiet check - just count, don't print)
const patterns = ['sb_secret_', 'sb_publishable_', /eyJ[A-Za-z0-9_-]+\.eyJ/];
for (const pattern of patterns) {
  const regex = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
  const matches = log.match(regex);
  if (matches && matches.length > 0) {
    evidence.credentials_exposed = true;
    break;
  }
}

// Determine overall conclusion
if (evidence.test_counts.failed === 0 && evidence.test_counts.skipped === 0 && evidence.test_counts.executed > 0) {
  evidence.workflow_conclusion = 'PASSED';
} else {
  evidence.workflow_conclusion = 'FAILED';
}

// Extract RLS test results if present
const rlsMatches = log.matchAll(/✓.*RLS.*?(ALLOWED|BLOCKED|verified)/gi);
for (const match of rlsMatches) {
  evidence.rls_matrix.push({
    test: match[0],
    result: match[1],
  });
}

console.log(JSON.stringify(evidence, null, 2));
process.exit(evidence.workflow_conclusion === 'PASSED' ? 0 : 1);
