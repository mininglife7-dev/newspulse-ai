/**
 * DNS-025: Automated Regression Alerting
 *
 * Detects performance regressions in incident response metrics
 * and alerts when MTTR, MTTD, or success rate degrade.
 */

import { getIncidentMetrics } from './incident-metrics';

export interface RegressionMetric {
  name: 'mttr' | 'mttd' | 'successRate' | 'playbookEffectiveness';
  currentValue: number;
  baselineValue: number;
  changePercent: number;
  threshold: number;
  degraded: boolean;
}

export interface AffectedCategory {
  category: string;
  currentEffectiveness: number;
  baselineEffectiveness: number;
  changePercent: number;
}

export interface RegressionAlert {
  detected: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'none';
  timestamp: string;
  regressions: RegressionMetric[];
  affectedCategories: AffectedCategory[];
  recommendedActions: string[];
  details: string;
}

// Thresholds for regression detection
const REGRESSION_THRESHOLDS = {
  mttr: 15, // Alert if MTTR increases more than 15%
  mttd: 20, // Alert if MTTD increases more than 20%
  successRate: 10, // Alert if success rate drops more than 10%
  playbookEffectiveness: 15, // Alert if playbook effectiveness drops more than 15%
};

const SEVERITY_THRESHOLDS = {
  critical: 25, // Any metric degraded by 25%+
  high: 15, // Any metric degraded by 15-25%
  medium: 10, // Any metric degraded by 10-15%
  low: 5, // Any metric degraded by 5-10%
};

/**
 * Detect performance regressions in incident response system
 */
export function detectRegressions(
  currentMetrics: ReturnType<typeof getIncidentMetrics>,
  baselineMetrics: ReturnType<typeof getIncidentMetrics>
): RegressionAlert {
  const regressions: RegressionMetric[] = [];
  const affectedCategories: AffectedCategory[] = [];
  const recommendedActions: string[] = [];

  // Check MTTR regression
  const mttrChange = ((currentMetrics.averageMTTR - baselineMetrics.averageMTTR) / baselineMetrics.averageMTTR) * 100;
  if (mttrChange > REGRESSION_THRESHOLDS.mttr) {
    regressions.push({
      name: 'mttr',
      currentValue: currentMetrics.averageMTTR,
      baselineValue: baselineMetrics.averageMTTR,
      changePercent: mttrChange,
      threshold: REGRESSION_THRESHOLDS.mttr,
      degraded: true,
    });
    recommendedActions.push('Review recent playbook changes - incident resolution time has increased');
    recommendedActions.push('Check if system resources are constrained (CPU, memory, disk)');
    recommendedActions.push('Analyze recent high-MTTR incidents for common patterns');
  }

  // Check MTTD regression
  const mttdChange = ((currentMetrics.averageMTTD - baselineMetrics.averageMTTD) / baselineMetrics.averageMTTD) * 100;
  if (mttdChange > REGRESSION_THRESHOLDS.mttd) {
    regressions.push({
      name: 'mttd',
      currentValue: currentMetrics.averageMTTD,
      baselineValue: baselineMetrics.averageMTTD,
      changePercent: mttdChange,
      threshold: REGRESSION_THRESHOLDS.mttd,
      degraded: true,
    });
    recommendedActions.push('Check detection system (DNS-016) - alerts taking longer to trigger');
    recommendedActions.push('Review monitoring alert configuration - thresholds may be too lenient');
    recommendedActions.push('Investigate alert processing pipeline for bottlenecks');
  }

  // Check success rate regression
  const successRateChange = currentMetrics.successRate - baselineMetrics.successRate;
  if (successRateChange <= -REGRESSION_THRESHOLDS.successRate) {
    regressions.push({
      name: 'successRate',
      currentValue: currentMetrics.successRate,
      baselineValue: baselineMetrics.successRate,
      changePercent: (successRateChange / baselineMetrics.successRate) * 100,
      threshold: REGRESSION_THRESHOLDS.successRate,
      degraded: true,
    });
    recommendedActions.push('Fewer incidents resolved by playbook - manual intervention increasing');
    recommendedActions.push('Review playbook effectiveness by category (below)');
    recommendedActions.push('Consider playbook improvements or new patterns');
  }

  // Check per-category playbook effectiveness
  for (const [category, currentEff] of Object.entries(currentMetrics.playbookEffectiveness)) {
    const baselineEff = baselineMetrics.playbookEffectiveness[category] ?? 0;
    if (baselineEff > 0) {
      const effChange = ((currentEff - baselineEff) / baselineEff) * 100;
      if (effChange < -REGRESSION_THRESHOLDS.playbookEffectiveness) {
        affectedCategories.push({
          category,
          currentEffectiveness: currentEff,
          baselineEffectiveness: baselineEff,
          changePercent: effChange,
        });
      }
    }
  }

  // Determine severity
  let maxChange = 0;
  regressions.forEach((r) => {
    maxChange = Math.max(maxChange, Math.abs(r.changePercent));
  });
  affectedCategories.forEach((c) => {
    maxChange = Math.max(maxChange, Math.abs(c.changePercent));
  });

  let severity: 'critical' | 'high' | 'medium' | 'low' | 'none' = 'none';
  if (maxChange >= SEVERITY_THRESHOLDS.critical) {
    severity = 'critical';
  } else if (maxChange >= SEVERITY_THRESHOLDS.high) {
    severity = 'high';
  } else if (maxChange >= SEVERITY_THRESHOLDS.medium) {
    severity = 'medium';
  } else if (maxChange >= SEVERITY_THRESHOLDS.low) {
    severity = 'low';
  }

  // Build alert details
  let details = '';
  if (regressions.length > 0) {
    details += `**Metric Regressions Detected:**\n\n`;
    regressions.forEach((r) => {
      details += `- **${r.name.toUpperCase()}**: ${r.currentValue.toFixed(2)} (was ${r.baselineValue.toFixed(2)}) - ${r.changePercent > 0 ? '⬆️' : '⬇️'} ${Math.abs(r.changePercent).toFixed(1)}% change\n`;
    });
  }

  if (affectedCategories.length > 0) {
    details += `\n**Affected Playbook Categories:**\n\n`;
    affectedCategories.forEach((c) => {
      details += `- **${c.category}**: ${c.currentEffectiveness.toFixed(1)}% effective (was ${c.baselineEffectiveness.toFixed(1)}%) - ${c.changePercent.toFixed(1)}% decline\n`;
    });
  }

  if (currentMetrics.trendDirection === 'declining') {
    details += `\n⚠️ **Trend**: Metrics are ${currentMetrics.trendDirection} (${currentMetrics.trendMagnitude.toFixed(1)}% change over period)\n`;
  }

  return {
    detected: regressions.length > 0 || affectedCategories.length > 0,
    severity,
    timestamp: new Date().toISOString(),
    regressions,
    affectedCategories,
    recommendedActions,
    details,
  };
}

/**
 * Check if regression alert should be created
 * Returns true if regression is significant enough to warrant alert
 */
export function shouldCreateAlert(alert: RegressionAlert): boolean {
  return alert.detected && (alert.severity === 'critical' || alert.severity === 'high' || alert.severity === 'medium');
}

/**
 * Format regression alert for GitHub issue
 */
export function formatRegressionIssue(alert: RegressionAlert): { title: string; body: string; labels: string[] } {
  const severityIcon = {
    critical: '🚨',
    high: '⚠️',
    medium: '⚡',
    low: 'ℹ️',
    none: '✅',
  };

  const title = `${severityIcon[alert.severity]} Incident Response Performance Regression [${alert.severity.toUpperCase()}]`;

  let body = `## Regression Detected\n\n`;
  body += `**Severity**: ${alert.severity.toUpperCase()}\n`;
  body += `**Detected at**: ${alert.timestamp}\n\n`;

  body += alert.details;

  if (alert.affectedCategories.length > 0) {
    body += `\n\n## Affected Playbook Categories\n\n`;
    alert.affectedCategories.forEach((c) => {
      body += `- **${c.category}**: ${c.currentEffectiveness.toFixed(1)}% → ${c.baselineEffectiveness.toFixed(1)}% (${c.changePercent.toFixed(1)}% change)\n`;
    });
  }

  if (alert.recommendedActions.length > 0) {
    body += `\n\n## Recommended Actions\n\n`;
    alert.recommendedActions.forEach((action, i) => {
      body += `${i + 1}. ${action}\n`;
    });
  }

  body += `\n---\n`;
  body += `*This is an automated alert from DNS-025 (Automated Regression Alerting). Verify the metrics in the [Incident Observability Dashboard](/incident-observability).*\n`;

  return {
    title,
    body,
    labels: ['regression', 'incident-response', `severity-${alert.severity}`],
  };
}

/**
 * Calculate baseline metrics for comparison
 * Uses previous period of same length
 */
export function getBaselineMetrics(hours: number = 24): ReturnType<typeof getIncidentMetrics> {
  // For now, just call with same hours parameter
  // In production, would need to query historical data
  // This is a placeholder that can be enhanced when historical storage is added
  return getIncidentMetrics(hours);
}
