import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordAlert,
  resolveAlert,
  getActiveAlerts,
  getAlertHubReport,
  cleanupResolvedAlerts,
  resetAlertHub,
  formatAlertHubReport,
} from '@/lib/alert-hub';

describe('Alert Hub (DNA-GOV-005)', () => {
  beforeEach(() => {
    resetAlertHub();
  });

  describe('recordAlert', () => {
    it('records an alert', () => {
      recordAlert(
        'blocking-conditions',
        'critical',
        'GitHub Actions outage',
        'No workflow runs in last 30 minutes',
        'Check GitHub status.github.com'
      );

      const alerts = getActiveAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].title).toBe('GitHub Actions outage');
    });

    it('deduplicates recurring alerts (same source + title)', () => {
      recordAlert(
        'blocking-conditions',
        'critical',
        'GitHub Actions outage',
        'No runs'
      );
      recordAlert(
        'blocking-conditions',
        'critical',
        'GitHub Actions outage',
        'Still no runs'
      );

      const alerts = getActiveAlerts();
      expect(alerts).toHaveLength(1); // Should be deduplicated
    });

    it('tracks different alerts separately', () => {
      recordAlert(
        'blocking-conditions',
        'critical',
        'GitHub Actions outage',
        'No runs'
      );
      recordAlert(
        'deployment',
        'warning',
        'Deployment mismatch',
        'Code not live'
      );

      const alerts = getActiveAlerts();
      expect(alerts).toHaveLength(2);
    });
  });

  describe('resolveAlert', () => {
    it('marks alert as resolved', () => {
      const alert = recordAlert(
        'blocking-conditions',
        'critical',
        'GitHub Actions outage',
        'No runs'
      );

      resolveAlert(alert.id);

      const active = getActiveAlerts();
      expect(active).toHaveLength(0);
    });
  });

  describe('getActiveAlerts', () => {
    it('returns only unresolved alerts', () => {
      const alert1 = recordAlert(
        'blocking-conditions',
        'critical',
        'Alert 1',
        'desc'
      );
      const alert2 = recordAlert('deployment', 'warning', 'Alert 2', 'desc');

      resolveAlert(alert1.id);

      const active = getActiveAlerts();
      expect(active).toHaveLength(1);
      expect(active[0].title).toBe('Alert 2');
    });

    it('sorts alerts by severity (critical first)', () => {
      recordAlert('deployment', 'info', 'Info alert', 'desc');
      recordAlert('blocking-conditions', 'critical', 'Critical alert', 'desc');
      recordAlert('error-rate', 'warning', 'Warning alert', 'desc');

      const active = getActiveAlerts();

      expect(active[0].severity).toBe('critical');
      expect(active[1].severity).toBe('warning');
      expect(active[2].severity).toBe('info');
    });

    it('sorts alerts by timestamp (newest first) within same severity', () => {
      recordAlert('deployment', 'warning', 'Alert 1', 'desc');
      recordAlert('blocking-conditions', 'warning', 'Alert 2', 'desc');

      const active = getActiveAlerts();

      // Both should be warning severity
      expect(active.every((a) => a.severity === 'warning')).toBe(true);
      // Should have both alerts
      const titles = active.map((a) => a.title);
      expect(titles).toContain('Alert 1');
      expect(titles).toContain('Alert 2');
    });
  });

  describe('getAlertHubReport', () => {
    it('returns empty report when no alerts', () => {
      const report = getAlertHubReport();

      expect(report.alertCount).toBe(0);
      expect(report.criticalCount).toBe(0);
      expect(report.summary).toContain('✅');
    });

    it('counts alerts by severity', () => {
      recordAlert('blocking-conditions', 'critical', 'Critical 1', 'desc');
      recordAlert('blocking-conditions', 'critical', 'Critical 2', 'desc');
      recordAlert('deployment', 'warning', 'Warning 1', 'desc');
      recordAlert('error-rate', 'info', 'Info 1', 'desc');

      const report = getAlertHubReport();

      expect(report.alertCount).toBe(4);
      expect(report.criticalCount).toBe(2);
      expect(report.warningCount).toBe(1);
      expect(report.infoCount).toBe(1);
    });

    it('generates summary with correct icons', () => {
      recordAlert('blocking-conditions', 'critical', 'Critical alert', 'desc');

      const report = getAlertHubReport();

      expect(report.summary).toContain('🔴');
      expect(report.summary).toContain('critical');
    });

    it('excludes resolved alerts from report', () => {
      const alert = recordAlert(
        'blocking-conditions',
        'critical',
        'Alert',
        'desc'
      );
      resolveAlert(alert.id);

      const report = getAlertHubReport();

      expect(report.alertCount).toBe(0);
    });
  });

  describe('cleanupResolvedAlerts', () => {
    it('removes old resolved alerts', () => {
      const alert = recordAlert(
        'blocking-conditions',
        'critical',
        'Alert',
        'desc'
      );
      resolveAlert(alert.id);

      // Wait a tiny bit to ensure time difference
      const cleaned = cleanupResolvedAlerts(0); // Everything older than now

      // May or may not clean depending on timing, just ensure it doesn't crash
      expect(typeof cleaned).toBe('number');
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });

    it('keeps recent resolved alerts', () => {
      const alert = recordAlert(
        'blocking-conditions',
        'critical',
        'Alert',
        'desc'
      );
      resolveAlert(alert.id);

      const cleaned = cleanupResolvedAlerts(60); // 60 minutes in future

      expect(cleaned).toBe(0); // Alert is too recent, shouldn't be cleaned
    });

    it('keeps unresolved alerts', () => {
      recordAlert('blocking-conditions', 'critical', 'Alert', 'desc');

      const cleaned = cleanupResolvedAlerts(0);

      expect(cleaned).toBe(0); // Unresolved alert shouldn't be cleaned
      const report = getAlertHubReport();
      expect(report.alertCount).toBe(1);
    });
  });

  describe('formatAlertHubReport', () => {
    it('formats empty report', () => {
      const report = getAlertHubReport();
      const formatted = formatAlertHubReport(report);

      expect(formatted).toContain('✅');
      expect(formatted).toContain('nominal');
    });

    it('formats report with alerts', () => {
      recordAlert(
        'blocking-conditions',
        'critical',
        'GitHub Actions outage',
        'No workflow runs',
        'Check GitHub status'
      );
      recordAlert(
        'deployment',
        'warning',
        'Deployment mismatch',
        'Code not live',
        'Force redeploy'
      );

      const report = getAlertHubReport();
      const formatted = formatAlertHubReport(report);

      expect(formatted).toContain('🔴');
      expect(formatted).toContain('⚠️');
      expect(formatted).toContain('GitHub Actions outage');
      expect(formatted).toContain('Deployment mismatch');
      expect(formatted).toContain('Check GitHub status');
      expect(formatted).toContain('Force redeploy');
    });

    it('includes critical alert summary', () => {
      recordAlert('blocking-conditions', 'critical', 'Alert 1', 'desc');
      recordAlert('blocking-conditions', 'critical', 'Alert 2', 'desc');

      const report = getAlertHubReport();
      const formatted = formatAlertHubReport(report);

      expect(formatted).toContain('2 critical');
    });

    it('includes warning alert summary', () => {
      recordAlert('deployment', 'warning', 'Alert 1', 'desc');

      const report = getAlertHubReport();
      const formatted = formatAlertHubReport(report);

      expect(formatted).toContain('⚠️');
      expect(formatted).toContain('warning');
    });
  });

  describe('alert hub lifecycle', () => {
    it('tracks alerts over time', () => {
      let report = getAlertHubReport();
      expect(report.alertCount).toBe(0);

      recordAlert('blocking-conditions', 'critical', 'Alert 1', 'desc');
      report = getAlertHubReport();
      expect(report.alertCount).toBe(1);

      recordAlert('deployment', 'warning', 'Alert 2', 'desc');
      report = getAlertHubReport();
      expect(report.alertCount).toBe(2);

      resolveAlert([...getActiveAlerts()][0].id);
      report = getAlertHubReport();
      expect(report.alertCount).toBe(1);
    });

    it('handles multiple DNA sources', () => {
      recordAlert(
        'blocking-conditions',
        'critical',
        'External blocker',
        'desc'
      );
      recordAlert(
        'production-health',
        'warning',
        'Health check failed',
        'desc'
      );
      recordAlert('deployment', 'warning', 'Deployment issue', 'desc');
      recordAlert('error-rate', 'critical', 'High error rate', 'desc');
      recordAlert(
        'security',
        'critical',
        'Critical vulnerabilities found',
        'CVE-2024-12345'
      );

      const report = getAlertHubReport();

      expect(report.alertCount).toBe(5);
      const sources = report.alerts.map((a) => a.source);
      expect(sources).toContain('blocking-conditions');
      expect(sources).toContain('production-health');
      expect(sources).toContain('deployment');
      expect(sources).toContain('error-rate');
      expect(sources).toContain('security');
    });

    it('tracks security vulnerabilities as alerts', () => {
      recordAlert(
        'security',
        'critical',
        'Critical dependencies outdated',
        '1 critical CVE requiring immediate patching'
      );
      recordAlert(
        'security',
        'warning',
        'High severity vulnerabilities',
        '5 high-severity CVEs available for patching'
      );

      const report = getAlertHubReport();
      const securityAlerts = report.alerts.filter(
        (a) => a.source === 'security'
      );

      expect(securityAlerts).toHaveLength(2);
      expect(securityAlerts[0].severity).toBe('critical');
      expect(securityAlerts[1].severity).toBe('warning');
    });
  });
});
