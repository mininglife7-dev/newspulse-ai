#!/usr/bin/env npx ts-node
/**
 * Load Testing & Performance Validation
 *
 * Tests critical API endpoints under concurrent load to validate baseline
 * performance measurements hold under realistic production conditions.
 *
 * Usage: npx ts-node scripts/load-test-endpoints.ts
 */

interface LoadTestResult {
  endpoint: string;
  method: string;
  concurrent_users: number;
  total_requests: number;
  successful: number;
  failed: number;
  error_rate: number;
  latency_min: number;
  latency_max: number;
  latency_avg: number;
  latency_p50: number;
  latency_p95: number;
  latency_p99: number;
  throughput_rps: number;
  memory_mb: number;
  duration_ms: number;
}

interface LoadTestConfig {
  base_url: string;
  endpoints: Array<{
    method: 'GET' | 'POST';
    path: string;
    concurrent_users: number;
    duration_seconds: number;
    payload?: Record<string, unknown>;
  }>;
}

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function log(color: string, message: string) {
  console.log(`${color}${message}${RESET}`);
}

function formatBytes(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function loadTest(config: LoadTestConfig): Promise<LoadTestResult[]> {
  const results: LoadTestResult[] = [];

  for (const endpoint of config.endpoints) {
    log(BLUE, `\n🧪 Load Testing: ${endpoint.method} ${endpoint.path}`);
    log(BLUE, `   Concurrent users: ${endpoint.concurrent_users}, Duration: ${endpoint.duration_seconds}s`);

    const latencies: number[] = [];
    let successful = 0;
    let failed = 0;
    const startTime = Date.now();
    const memBefore = process.memoryUsage().heapUsed;

    // Run concurrent requests for specified duration
    const endTime = startTime + endpoint.duration_seconds * 1000;
    let requestCount = 0;

    const concurrentRequests = async () => {
      while (Date.now() < endTime) {
        const reqStart = Date.now();
        try {
          const url = `${config.base_url}${endpoint.path}`;
          const options: RequestInit = {
            method: endpoint.method,
            headers: {
              'Content-Type': 'application/json',
            },
          };

          if (endpoint.method === 'POST' && endpoint.payload) {
            options.body = JSON.stringify(endpoint.payload);
          }

          const response = await fetch(url, options);
          const latency = Date.now() - reqStart;

          if (response.ok || response.status < 500) {
            successful++;
          } else {
            failed++;
          }
          latencies.push(latency);
          requestCount++;
        } catch (error) {
          failed++;
          const latency = Date.now() - reqStart;
          latencies.push(latency);
          requestCount++;
        }
      }
    };

    // Run concurrent requests
    const promises = Array(endpoint.concurrent_users)
      .fill(null)
      .map(() => concurrentRequests());

    await Promise.all(promises);

    const totalDuration = Date.now() - startTime;
    const memAfter = process.memoryUsage().heapUsed;
    const memMB = (memAfter - memBefore) / 1024 / 1024;

    // Calculate percentiles
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    const result: LoadTestResult = {
      endpoint: endpoint.path,
      method: endpoint.method,
      concurrent_users: endpoint.concurrent_users,
      total_requests: successful + failed,
      successful,
      failed,
      error_rate: (failed / (successful + failed)) * 100,
      latency_min: Math.min(...latencies),
      latency_max: Math.max(...latencies),
      latency_avg: avg,
      latency_p50: p50,
      latency_p95: p95,
      latency_p99: p99,
      throughput_rps: (successful + failed) / (totalDuration / 1000),
      memory_mb: memMB,
      duration_ms: totalDuration,
    };

    results.push(result);

    // Print results
    log(GREEN, `✓ Completed`);
    console.log(`  Requests: ${result.successful}/${result.total_requests} successful`);
    console.log(`  Error rate: ${result.error_rate.toFixed(2)}%`);
    console.log(`  Latency: ${formatDuration(result.latency_min)} - ${formatDuration(result.latency_max)}`);
    console.log(`    P50: ${formatDuration(result.latency_p50)}`);
    console.log(`    P95: ${formatDuration(result.latency_p95)} (target: < 1000ms)`);
    console.log(`    P99: ${formatDuration(result.latency_p99)}`);
    console.log(`  Throughput: ${result.throughput_rps.toFixed(1)} req/s`);
    console.log(`  Memory delta: ${result.memory_mb.toFixed(1)} MB`);
  }

  return results;
}

async function main() {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  log(BLUE, `
╔════════════════════════════════════════════════════════════════╗
║       EURO AI Load Testing & Performance Validation           ║
║       Validates production performance under concurrent load  ║
╚════════════════════════════════════════════════════════════════╝
  `);

  log(BLUE, `Base URL: ${baseUrl}\n`);

  const config: LoadTestConfig = {
    base_url: baseUrl,
    endpoints: [
      {
        method: 'GET',
        path: '/api/health',
        concurrent_users: 20,
        duration_seconds: 10,
      },
      {
        method: 'GET',
        path: '/api/production-health',
        concurrent_users: 5,
        duration_seconds: 10,
      },
      {
        method: 'GET',
        path: '/api/assessment',
        concurrent_users: 15,
        duration_seconds: 10,
      },
    ],
  };

  try {
    const results = await loadTest(config);

    log(BLUE, `\n\n${'='.repeat(64)}`);
    log(BLUE, `PERFORMANCE VALIDATION REPORT`);
    log(BLUE, `${'='.repeat(64)}\n`);

    let allPassed = true;

    for (const result of results) {
      const p95Target = 1000;
      const errorRateTarget = 0.5;
      const p95Pass = result.latency_p95 <= p95Target;
      const errorPass = result.error_rate <= errorRateTarget;

      const overallStatus = p95Pass && errorPass;

      if (!overallStatus) {
        allPassed = false;
      }

      console.log(`\n${result.method} ${result.endpoint}`);
      console.log(`  Concurrent users: ${result.concurrent_users}`);
      console.log(`  ${p95Pass ? GREEN : RED}P95 Latency: ${formatDuration(result.latency_p95)} (target: < ${p95Target}ms)${RESET}`);
      console.log(`  ${errorPass ? GREEN : RED}Error rate: ${result.error_rate.toFixed(2)}% (target: < ${errorRateTarget}%)${RESET}`);
      console.log(`  Throughput: ${result.throughput_rps.toFixed(1)} req/s`);
    }

    log(BLUE, `\n${'='.repeat(64)}`);

    if (allPassed) {
      log(GREEN, `✓ LOAD TEST PASSED`);
      log(GREEN, `  All endpoints validated under concurrent load.`);
      log(GREEN, `  Performance targets maintained across all tests.`);
      process.exit(0);
    } else {
      log(RED, `✗ LOAD TEST FAILED`);
      log(RED, `  Some endpoints exceeded performance targets.`);
      process.exit(1);
    }
  } catch (error) {
    log(RED, `\n✗ Load test error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
