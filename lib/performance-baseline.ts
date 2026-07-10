import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface PerformanceMetric {
  timestamp: string;
  bundleSize: number; // in bytes
  gzipSize: number; // in bytes
  pageLatency: number; // in milliseconds
  apiLatency: number; // in milliseconds
}

export interface PerformanceBaseline {
  bundleSize: {
    current: number;
    baseline: number;
    change: number; // percentage
    regressionThreshold: number; // percentage
  };
  gzipSize: {
    current: number;
    baseline: number;
    change: number;
    regressionThreshold: number;
  };
  pageLatency: {
    current: number;
    baseline: number;
    change: number;
    regressionThreshold: number;
  };
  apiLatency: {
    current: number;
    baseline: number;
    change: number;
    regressionThreshold: number;
  };
  hasRegression: boolean;
  regressions: string[];
}

const BASELINE_FILE = '.performance-baseline.json';
const REGRESSION_THRESHOLD = 5; // 5% increase is considered regression

function getNextJsBundleSize(): number {
  try {
    const buildDir = path.join(process.cwd(), '.next');
    if (!fs.existsSync(buildDir)) {
      return 0;
    }

    let totalSize = 0;
    const walkDir = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (file.endsWith('.js')) {
          totalSize += stat.size;
        }
      }
    };
    walkDir(buildDir);
    return totalSize;
  } catch {
    return 0;
  }
}

function getGzipSize(filePath: string): number {
  try {
    // Note: requires gzip to be available
    const result = execSync(`gzip -c "${filePath}" | wc -c`, { encoding: 'utf-8' });
    return parseInt(result.trim(), 10);
  } catch {
    return 0;
  }
}

function getPageLatency(): number {
  // Simulated baseline: measure page load time
  // In production, this would use real monitoring data
  return Math.random() * 1000 + 500; // 500-1500ms
}

function getApiLatency(): number {
  // Simulated baseline: measure API response time
  // In production, this would use real monitoring data
  return Math.random() * 300 + 50; // 50-350ms
}

function saveBaseline(metrics: PerformanceMetric): void {
  try {
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(metrics, null, 2));
  } catch (err) {
    console.error('[performance-baseline] failed to save baseline:', err);
  }
}

function loadBaseline(): PerformanceMetric | null {
  try {
    if (!fs.existsSync(BASELINE_FILE)) {
      return null;
    }
    const data = fs.readFileSync(BASELINE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('[performance-baseline] failed to load baseline:', err);
    return null;
  }
}

function calculateChange(current: number, baseline: number): number {
  if (baseline === 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

export async function measurePerformanceMetrics(): Promise<PerformanceMetric> {
  return {
    timestamp: new Date().toISOString(),
    bundleSize: getNextJsBundleSize(),
    gzipSize: getGzipSize('package.json'), // Placeholder; would measure actual JS files
    pageLatency: getPageLatency(),
    apiLatency: getApiLatency(),
  };
}

export async function detectPerformanceRegressions(): Promise<PerformanceBaseline> {
  const currentMetrics = await measurePerformanceMetrics();
  const baseline = loadBaseline();

  if (!baseline) {
    // First run: save metrics as baseline
    saveBaseline(currentMetrics);
    return {
      bundleSize: {
        current: currentMetrics.bundleSize,
        baseline: currentMetrics.bundleSize,
        change: 0,
        regressionThreshold: REGRESSION_THRESHOLD,
      },
      gzipSize: {
        current: currentMetrics.gzipSize,
        baseline: currentMetrics.gzipSize,
        change: 0,
        regressionThreshold: REGRESSION_THRESHOLD,
      },
      pageLatency: {
        current: currentMetrics.pageLatency,
        baseline: currentMetrics.pageLatency,
        change: 0,
        regressionThreshold: REGRESSION_THRESHOLD,
      },
      apiLatency: {
        current: currentMetrics.apiLatency,
        baseline: currentMetrics.apiLatency,
        change: 0,
        regressionThreshold: REGRESSION_THRESHOLD,
      },
      hasRegression: false,
      regressions: [],
    };
  }

  const bundleSizeChange = calculateChange(currentMetrics.bundleSize, baseline.bundleSize);
  const gzipSizeChange = calculateChange(currentMetrics.gzipSize, baseline.gzipSize);
  const pageLatencyChange = calculateChange(currentMetrics.pageLatency, baseline.pageLatency);
  const apiLatencyChange = calculateChange(currentMetrics.apiLatency, baseline.apiLatency);

  const regressions: string[] = [];

  if (bundleSizeChange > REGRESSION_THRESHOLD) {
    regressions.push(`Bundle size regression: +${bundleSizeChange.toFixed(1)}% (${currentMetrics.bundleSize} bytes)`);
  }

  if (gzipSizeChange > REGRESSION_THRESHOLD) {
    regressions.push(`Gzip size regression: +${gzipSizeChange.toFixed(1)}%`);
  }

  if (pageLatencyChange > REGRESSION_THRESHOLD) {
    regressions.push(`Page latency regression: +${pageLatencyChange.toFixed(1)}% (${currentMetrics.pageLatency.toFixed(0)}ms)`);
  }

  if (apiLatencyChange > REGRESSION_THRESHOLD) {
    regressions.push(`API latency regression: +${apiLatencyChange.toFixed(1)}% (${currentMetrics.apiLatency.toFixed(0)}ms)`);
  }

  return {
    bundleSize: {
      current: currentMetrics.bundleSize,
      baseline: baseline.bundleSize,
      change: bundleSizeChange,
      regressionThreshold: REGRESSION_THRESHOLD,
    },
    gzipSize: {
      current: currentMetrics.gzipSize,
      baseline: baseline.gzipSize,
      change: gzipSizeChange,
      regressionThreshold: REGRESSION_THRESHOLD,
    },
    pageLatency: {
      current: currentMetrics.pageLatency,
      baseline: baseline.pageLatency,
      change: pageLatencyChange,
      regressionThreshold: REGRESSION_THRESHOLD,
    },
    apiLatency: {
      current: currentMetrics.apiLatency,
      baseline: baseline.apiLatency,
      change: apiLatencyChange,
      regressionThreshold: REGRESSION_THRESHOLD,
    },
    hasRegression: regressions.length > 0,
    regressions,
  };
}

export async function alertIfPerformanceRegression(): Promise<boolean> {
  const result = await detectPerformanceRegressions();

  if (result.hasRegression) {
    console.error('[performance-baseline] ⚠️ Performance regressions detected:');
    for (const regression of result.regressions) {
      console.error(`  - ${regression}`);
    }
    return true;
  }

  return false;
}
