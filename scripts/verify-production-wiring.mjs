#!/usr/bin/env node

/**
 * Production Wiring Verification
 * Validates all incident response endpoints are working
 * Usage: node scripts/verify-production-wiring.mjs [base-url]
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const ENDPOINTS = [
  {
    name: 'Health Check',
    method: 'GET',
    path: '/api/health',
    expected: { status: 'healthy' },
  },
  {
    name: 'Error Collection',
    method: 'POST',
    path: '/api/production-error-collection/cron',
    headers: { 'X-CRON-SECRET': process.env.CRON_SECRET || 'test-secret' },
    expected: { success: true },
  },
  {
    name: 'Production Wiring',
    method: 'POST',
    path: '/api/production-wiring',
    body: {
      incident: {
        incidentId: 'test-001',
        severity: 'high',
        category: 'database',
        description: 'Test incident',
      },
    },
    expected: { orchestrated: true },
  },
  {
    name: 'War Games',
    method: 'POST',
    path: '/api/war-games',
    body: { scenario: 'deployment-schema-mismatch' },
    expected: { scenarioId: true },
  },
];

async function verifyEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;

  try {
    const options = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        ...(endpoint.headers || {}),
      },
    };

    if (endpoint.body) {
      options.body = JSON.stringify(endpoint.body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    // Verify response structure
    let matches = true;
    for (const [key, value] of Object.entries(endpoint.expected)) {
      if (value === true) {
        // Just check if key exists
        if (!(key in data)) {
          matches = false;
          break;
        }
      } else if (data[key] !== value) {
        matches = false;
        break;
      }
    }

    if (matches) {
      console.log(`✓ ${endpoint.name} (${endpoint.method} ${endpoint.path})`);
      return true;
    } else {
      console.log(`❌ ${endpoint.name} - Response structure mismatch`);
      console.log(`   Expected: ${JSON.stringify(endpoint.expected)}`);
      console.log(`   Got: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${endpoint.name} - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('\n═'.repeat(80));
  console.log('PRODUCTION WIRING VERIFICATION');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('═'.repeat(80) + '\n');

  let passed = 0;
  let failed = 0;

  for (const endpoint of ENDPOINTS) {
    const result = await verifyEndpoint(endpoint);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(80) + '\n');

  if (failed === 0) {
    console.log('✅ All endpoints verified\n');
    return 0;
  } else {
    console.log(`❌ ${failed} endpoint(s) failed verification\n`);
    return 1;
  }
}

main().then(code => process.exit(code));
