#!/usr/bin/env node

/**
 * Performance Baseline Collection Script
 *
 * Runs synthetic load against key endpoints and collects performance metrics.
 * Generates a baseline JSON file for regression detection and CI/CD validation.
 *
 * Usage:
 *   node scripts/baseline-collection.mjs [environment] [concurrency] [output-file]
 *
 * Examples:
 *   node scripts/baseline-collection.mjs development 10 baselines/dev.json
 *   node scripts/baseline-collection.mjs production 50 baselines/prod.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Configuration
const environment = process.argv[2] || process.env.NODE_ENV || 'development';
const concurrency = parseInt(process.argv[3] || '10', 10);
const outputFile = process.argv[4] || `baselines/${environment}-${new Date().toISOString().split('T')[0]}.json`;
const outputDir = path.dirname(path.resolve(rootDir, outputFile));

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Load environment variables if .env exists
const envFile = path.resolve(rootDir, '.env.local');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf-8');
  envContent.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

// Base URL - use environment variable or localhost
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Simple metrics collector for baseline generation
 */
class SimpleMetricsCollector {
  constructor() {
    this.measurements = new Map();
  }

  record(name, value) {
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name).push(value);
  }

  getMetrics() {
    const metrics = {};
    for (const [name, values] of this.measurements) {
      if (values.length === 0) continue;

      const sorted = [...values].sort((a, b) => a - b);
      const len = sorted.length;

      metrics[name] = {
        name,
        unit: 'ms',
        measurements: values,
        min: sorted[0],
        max: sorted[len - 1],
        mean: Math.round(values.reduce((a, b) => a + b, 0) / len),
        median: sorted[Math.floor(len / 2)],
        p95: sorted[Math.floor(len * 0.95)],
        p99: sorted[Math.floor(len * 0.99)],
      };
    }
    return metrics;
  }

  exportBaseline(environment, requestCount) {
    return {
      timestamp: new Date().toISOString(),
      environment,
      nodeVersion: process.version,
      testDuration: Date.now() - this.startTime,
      requestCount,
      metrics: this.getMetrics(),
    };
  }

  reset() {
    this.measurements.clear();
    this.startTime = Date.now();
  }
}

/**
 * Synthetic load generator
 */
class LoadGenerator {
  constructor(baseUrl, concurrency = 10) {
    this.baseUrl = baseUrl;
    this.concurrency = concurrency;
    this.metrics = new SimpleMetricsCollector();
    this.totalRequests = 0;
    this.successCount = 0;
    this.errorCount = 0;
  }

  async request(method, path, body = null, headers = {}) {
    const start = Date.now();
    const url = `${this.baseUrl}${path}`;

    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const latency = Date.now() - start;
      const statusCode = response.status;

      this.metrics.record('latency', latency);
      this.metrics.record(`status_${statusCode}`, latency);
      this.totalRequests++;

      if (statusCode >= 200 && statusCode < 300) {
        this.successCount++;
      } else if (statusCode >= 400) {
        this.errorCount++;
        this.metrics.record('errors', 1);
      }

      return { status: statusCode, latency, url };
    } catch (err) {
      const latency = Date.now() - start;
      this.metrics.record('errors', 1);
      this.metrics.record('latency', latency);
      this.errorCount++;
      this.totalRequests++;
      return { status: 0, latency, url, error: err.message };
    }
  }

  async runConcurrent(requests) {
    const batches = [];
    for (let i = 0; i < requests.length; i += this.concurrency) {
      batches.push(requests.slice(i, i + this.concurrency));
    }

    for (const batch of batches) {
      await Promise.all(batch.map(req => this.request(req.method, req.path, req.body, req.headers)));
    }
  }

  getMetrics() {
    return this.metrics.getMetrics();
  }

  exportBaseline(environment) {
    return this.metrics.exportBaseline(environment, this.totalRequests);
  }

  getReport() {
    const metrics = this.getMetrics();
    const latencyMetrics = metrics.latency || {};

    return {
      summary: {
        totalRequests: this.totalRequests,
        successCount: this.successCount,
        errorCount: this.errorCount,
        successRate: (this.successCount / this.totalRequests * 100).toFixed(2) + '%',
      },
      latency: {
        min: latencyMetrics.min,
        max: latencyMetrics.max,
        mean: latencyMetrics.mean,
        median: latencyMetrics.median,
        p95: latencyMetrics.p95,
        p99: latencyMetrics.p99,
      },
      metrics,
    };
  }
}

/**
 * Main baseline collection routine
 */
async function collectBaseline() {
  console.log(`\n📊 Performance Baseline Collection`);
  console.log(`Environment: ${environment}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Base URL: ${baseUrl}\n`);

  const generator = new LoadGenerator(baseUrl, concurrency);

  // Synthetic load requests - representative of real usage
  // These endpoints are the highest-priority for monitoring
  const requests = [];

  // Health check (low-latency baseline)
  for (let i = 0; i < 10; i++) {
    requests.push({ method: 'GET', path: '/api/health' });
  }

  // Dashboard (read-heavy, multi-query aggregation)
  for (let i = 0; i < 20; i++) {
    requests.push({ method: 'GET', path: '/api/dashboard' });
  }

  // Compliance Dashboard (complex calculations)
  for (let i = 0; i < 15; i++) {
    requests.push({ method: 'GET', path: '/api/compliance-dashboard' });
  }

  // Note: These would require authentication - in a real setup, you'd inject auth headers
  // For now, we'll focus on unauthenticated endpoints.
  // Production baseline should include:
  // - /api/assessments (GET/POST)
  // - /api/obligations (GET/PUT)
  // - /api/evidence (GET/POST)

  console.log(`🚀 Running ${requests.length} synthetic requests with concurrency ${concurrency}...\n`);

  const startTime = Date.now();
  await generator.runConcurrent(requests);
  const duration = Date.now() - startTime;

  const report = generator.getReport();
  const baseline = generator.exportBaseline(environment);

  // Print report
  console.log(`\n✅ Baseline Collection Complete (${duration}ms)\n`);
  console.log(`Summary:`);
  console.log(`  Total Requests: ${report.summary.totalRequests}`);
  console.log(`  Successful: ${report.summary.successCount}`);
  console.log(`  Errors: ${report.summary.errorCount}`);
  console.log(`  Success Rate: ${report.summary.successRate}\n`);

  console.log(`Latency (ms):`);
  console.log(`  Min: ${report.latency.min}ms`);
  console.log(`  Mean: ${report.latency.mean}ms`);
  console.log(`  Median: ${report.latency.median}ms`);
  console.log(`  P95: ${report.latency.p95}ms`);
  console.log(`  P99: ${report.latency.p99}ms`);
  console.log(`  Max: ${report.latency.max}ms\n`);

  // Save baseline
  const outputPath = path.resolve(rootDir, outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(baseline, null, 2));
  console.log(`📁 Baseline saved to: ${outputPath}\n`);

  // Return baseline for CI/CD validation
  return baseline;
}

// Run if invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
  collectBaseline()
    .then(baseline => {
      console.log(`✨ Baseline collection successful\n`);
      process.exit(0);
    })
    .catch(err => {
      console.error(`\n❌ Baseline collection failed:`, err);
      process.exit(1);
    });
}

export { LoadGenerator, SimpleMetricsCollector, collectBaseline };
