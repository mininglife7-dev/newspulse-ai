#!/usr/bin/env node

/**
 * War Games Execution Runner
 * Runs all 5 synthetic incident scenarios with validation
 * Usage: node scripts/run-war-games.mjs [base-url] [--report]
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const REPORT_MODE = process.argv.includes('--report');

const SCENARIOS = [
  {
    id: 'deployment-schema-mismatch',
    name: 'Deployment Schema Mismatch',
    description: 'Code accesses missing database column',
    expectedMTTD: 5000,
    expectedMTTR: 15000,
  },
  {
    id: 'connection-pool-exhaustion',
    name: 'Connection Pool Exhaustion',
    description: 'Too many simultaneous database connections',
    expectedMTTD: 10000,
    expectedMTTR: 30000,
  },
  {
    id: 'external-api-rate-limit',
    name: 'External API Rate Limit',
    description: 'Third-party API rate limit exceeded',
    expectedMTTD: 5000,
    expectedMTTR: 60000,
  },
  {
    id: 'cascading-failure',
    name: 'Cascading Failure',
    description: 'One service down causes others to fail',
    expectedMTTD: 20000,
    expectedMTTR: 45000,
  },
  {
    id: 'unhandled-exception',
    name: 'Unhandled Exception',
    description: 'Runtime error in serverless function',
    expectedMTTD: 2000,
    expectedMTTR: 15000,
  },
];

async function runScenario(scenario) {
  const url = `${BASE_URL}/api/war-games`;

  try {
    console.log(`\n🎮 Running: ${scenario.name}`);
    console.log(`   ${scenario.description}`);

    const start = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: scenario.id }),
    });

    const result = await response.json();
    const elapsed = Date.now() - start;

    if (!result.success) {
      console.log(`   ❌ FAILED: ${result.error || 'Unknown error'}`);
      return { ...scenario, success: false, elapsed };
    }

    const detection = result.metrics?.mttd || result.detectionMs || 0;
    const recovery = result.metrics?.mttr || result.recoveryMs || 0;

    const detectionOk = detection <= scenario.expectedMTTD * 1.5;
    const recoveryOk = recovery <= scenario.expectedMTTR * 1.5;

    console.log(`   ✓ Detected in ${detection}ms (target: <${scenario.expectedMTTD}ms) ${detectionOk ? '✓' : '⚠'}`);
    console.log(`   ✓ Recovered in ${recovery}ms (target: <${scenario.expectedMTTR}ms) ${recoveryOk ? '✓' : '⚠'}`);
    console.log(`   Total time: ${elapsed}ms`);

    return {
      ...scenario,
      success: true,
      detection,
      recovery,
      detectionOk,
      recoveryOk,
      totalTime: elapsed,
    };
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return { ...scenario, success: false, error: error.message };
  }
}

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('WAR GAMES VALIDATION');
  console.log(`Endpoint: ${BASE_URL}/api/war-games`);
  console.log('═'.repeat(80));

  const results = [];
  for (const scenario of SCENARIOS) {
    const result = await runScenario(scenario);
    results.push(result);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('RESULTS SUMMARY');
  console.log('═'.repeat(80));

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.success ? '✓' : '❌';
    console.log(`${status} ${result.name}`);

    if (result.success) {
      passed++;
      if (!result.detectionOk || !result.recoveryOk) {
        console.log(`   ⚠ Some SLOs exceeded`);
      }
    } else {
      failed++;
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log(`Scenarios: ${passed}/${SCENARIOS.length} passed`);
  console.log('═'.repeat(80) + '\n');

  if (REPORT_MODE) {
    console.log('📊 DETAILED REPORT\n');
    results.forEach((r) => {
      console.log(`${r.name}:`);
      if (r.success) {
        console.log(`  Detection: ${r.detection}ms (target: ${r.expectedMTTD}ms)`);
        console.log(`  Recovery: ${r.recovery}ms (target: ${r.expectedMTTR}ms)`);
      } else {
        console.log(`  Error: ${r.error || 'Failed'}`);
      }
    });
    console.log('');
  }

  return failed === 0 ? 0 : 1;
}

main().then(code => process.exit(code));
