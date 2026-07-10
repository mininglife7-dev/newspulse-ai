import { recordAlert, resolveAlert } from '@/lib/alert-hub';
import { detectPerformanceRegressions, type PerformanceBaseline } from '@/lib/performance-baseline';

/**
 * Bridge between performance baseline measurements and the unified alert hub (DNA-GOV-005).
 * Translates performance regressions into alerts that appear in the Founder dashboard.
 */

const PERFORMANCE_REGRESSION_ALERT_ID = 'perf-regression-detected';

export async function checkPerformanceAndAlert(): Promise<void> {
  try {
    const result = await detectPerformanceRegressions();

    if (result.hasRegression) {
      // Create alert for performance regression
      recordAlert(
        'performance',
        'critical',
        '⚡ Performance Regression Detected',
        `${result.regressions.length} performance metric(s) exceeded regression threshold (5%)\n\n${result.regressions.join('\n')}`,
        'Review deployment and consider rollback if regression is significant. Bundle size and latency impact customer experience.'
      );
    } else {
      // Resolve performance regression alert if it existed
      resolveAlert(PERFORMANCE_REGRESSION_ALERT_ID);
    }
  } catch (err) {
    recordAlert(
      'performance',
      'warning',
      '⚠️ Performance Measurement Failed',
      `Could not measure performance metrics: ${(err as any).message || 'Unknown error'}`,
      'Check application logs for details'
    );
  }
}

export async function formatPerformanceReport(baseline: PerformanceBaseline): Promise<string> {
  const lines = ['Performance Baseline Report'];
  lines.push('='.repeat(40));
  lines.push('');

  // Bundle Size
  lines.push(`Bundle Size:`);
  lines.push(`  Current:  ${(baseline.bundleSize.current / 1024).toFixed(2)} KB`);
  lines.push(`  Baseline: ${(baseline.bundleSize.baseline / 1024).toFixed(2)} KB`);
  lines.push(`  Change:   ${baseline.bundleSize.change > 0 ? '+' : ''}${baseline.bundleSize.change.toFixed(2)}%`);
  lines.push('');

  // Gzip Size
  lines.push(`Gzip Size:`);
  lines.push(`  Current:  ${(baseline.gzipSize.current / 1024).toFixed(2)} KB`);
  lines.push(`  Baseline: ${(baseline.gzipSize.baseline / 1024).toFixed(2)} KB`);
  lines.push(`  Change:   ${baseline.gzipSize.change > 0 ? '+' : ''}${baseline.gzipSize.change.toFixed(2)}%`);
  lines.push('');

  // Page Latency
  lines.push(`Page Latency:`);
  lines.push(`  Current:  ${baseline.pageLatency.current.toFixed(0)}ms`);
  lines.push(`  Baseline: ${baseline.pageLatency.baseline.toFixed(0)}ms`);
  lines.push(`  Change:   ${baseline.pageLatency.change > 0 ? '+' : ''}${baseline.pageLatency.change.toFixed(2)}%`);
  lines.push('');

  // API Latency
  lines.push(`API Latency:`);
  lines.push(`  Current:  ${baseline.apiLatency.current.toFixed(0)}ms`);
  lines.push(`  Baseline: ${baseline.apiLatency.baseline.toFixed(0)}ms`);
  lines.push(`  Change:   ${baseline.apiLatency.change > 0 ? '+' : ''}${baseline.apiLatency.change.toFixed(2)}%`);
  lines.push('');

  // Regression Status
  if (baseline.hasRegression) {
    lines.push(`⚠️ Regressions Detected:`);
    baseline.regressions.forEach((reg) => {
      lines.push(`  - ${reg}`);
    });
  } else {
    lines.push(`✅ No regressions detected (threshold: ${baseline.bundleSize.regressionThreshold}%)`);
  }

  return lines.join('\n');
}
