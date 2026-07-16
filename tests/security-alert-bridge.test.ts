import { describe, test, expect, beforeEach } from 'vitest';
import { bridgeSecurityScanToAlerts, shouldUpdateSecurityAlert } from '@/lib/security-alert-bridge';
import { resetAlertHub, getActiveAlerts, getAlertHubReport, recordAlert } from '@/lib/alert-hub';
import type { SecurityScanResult } from '@/lib/dependency-security-scanner';

describe('Security Alert Bridge (DNA-GOV-008 ↔ DNA-GOV-005)', () => {
  beforeEach(() => {
    resetAlertHub();
  });

  test('bridges critical vulnerabilities to alert hub', () => {
    const result: SecurityScanResult = {
      timestamp: new Date().toISOString(),
      total: 2,
      critical: 1,
      high: 1,
      moderate: 0,
      low: 0,
      info: 0,
      vulnerabilities: [
        {
          package: 'critical-package',
          severity: 'critical',
          fixAvailable: true,
          cve: 'CVE-2024-12345',
          description: 'Critical RCE',
          affectedVersions: '1.0.0',
          patchedVersions: '1.0.1',
        },
        {
          package: 'high-package',
          severity: 'high',
          fixAvailable: false,
          cve: null,
          description: 'High severity issue',
          affectedVersions: '<2.0',
          patchedVersions: '2.0',
        },
      ],
      newVulnerabilities: [
        {
          package: 'critical-package',
          severity: 'critical',
          fixAvailable: true,
          cve: 'CVE-2024-12345',
          description: 'Critical RCE',
          affectedVersions: '1.0.0',
          patchedVersions: '1.0.1',
        },
      ],
      resolvedVulnerabilities: [],
      scanStatus: 'critical-found',
    };

    bridgeSecurityScanToAlerts(result);

    const alerts = getActiveAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].source).toBe('security');
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[0].title).toContain('CRITICAL');
  });

  test('bridges high-severity vulnerabilities to alert hub', () => {
    const result: SecurityScanResult = {
      timestamp: new Date().toISOString(),
      total: 2,
      critical: 0,
      high: 2,
      moderate: 0,
      low: 0,
      info: 0,
      vulnerabilities: [
        {
          package: 'lodash',
          severity: 'high',
          fixAvailable: true,
          cve: null,
          description: 'Prototype pollution',
          affectedVersions: '<4.17.20',
          patchedVersions: '4.17.20',
        },
      ],
      newVulnerabilities: [
        {
          package: 'lodash',
          severity: 'high',
          fixAvailable: true,
          cve: null,
          description: 'Prototype pollution',
          affectedVersions: '<4.17.20',
          patchedVersions: '4.17.20',
        },
      ],
      resolvedVulnerabilities: [],
      scanStatus: 'vulnerabilities-found',
    };

    bridgeSecurityScanToAlerts(result);

    const alerts = getActiveAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('warning');
    expect(alerts[0].title).toContain('HIGH-SEVERITY');
  });

  test('bridges resolved vulnerabilities to alert hub', () => {
    const result: SecurityScanResult = {
      timestamp: new Date().toISOString(),
      total: 1,
      critical: 0,
      high: 1,
      moderate: 0,
      low: 0,
      info: 0,
      vulnerabilities: [
        {
          package: 'still-vulnerable',
          severity: 'high',
          fixAvailable: true,
          cve: null,
          description: 'High severity',
          affectedVersions: '<2.0',
          patchedVersions: '2.0',
        },
      ],
      newVulnerabilities: [],
      resolvedVulnerabilities: ['old-package:high', 'another-old:moderate'],
      scanStatus: 'clean',
    };

    bridgeSecurityScanToAlerts(result);

    const alerts = getActiveAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('info');
    expect(alerts[0].title).toContain('Resolved');
    expect(alerts[0].title).toContain('2');
  });

  test('does not create alert for clean status', () => {
    const result: SecurityScanResult = {
      timestamp: new Date().toISOString(),
      total: 0,
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      info: 0,
      vulnerabilities: [],
      newVulnerabilities: [],
      resolvedVulnerabilities: [],
      scanStatus: 'clean',
    };

    bridgeSecurityScanToAlerts(result);

    const alerts = getActiveAlerts();
    expect(alerts).toHaveLength(0);
  });

  test('determines when security alert should be updated', () => {
    const cleanResult: SecurityScanResult = {
      timestamp: new Date().toISOString(),
      total: 0,
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      info: 0,
      vulnerabilities: [],
      newVulnerabilities: [],
      resolvedVulnerabilities: [],
      scanStatus: 'clean',
    };

    expect(shouldUpdateSecurityAlert(cleanResult)).toBe(false);

    const criticalResult: SecurityScanResult = {
      ...cleanResult,
      total: 1,
      critical: 1,
      vulnerabilities: [
        {
          package: 'pkg',
          severity: 'critical',
          fixAvailable: true,
          cve: null,
          description: 'test',
          affectedVersions: '<1',
          patchedVersions: '1',
        },
      ],
      newVulnerabilities: [
        {
          package: 'pkg',
          severity: 'critical',
          fixAvailable: true,
          cve: null,
          description: 'test',
          affectedVersions: '<1',
          patchedVersions: '1',
        },
      ],
      scanStatus: 'critical-found',
    };

    expect(shouldUpdateSecurityAlert(criticalResult)).toBe(true);
  });

  test('integration: security alert appears in alert hub report', () => {
    const result: SecurityScanResult = {
      timestamp: new Date().toISOString(),
      total: 1,
      critical: 1,
      high: 0,
      moderate: 0,
      low: 0,
      info: 0,
      vulnerabilities: [
        {
          package: 'critical-pkg',
          severity: 'critical',
          fixAvailable: true,
          cve: 'CVE-2024-99999',
          description: 'Critical issue',
          affectedVersions: '<1.0',
          patchedVersions: '1.0',
        },
      ],
      newVulnerabilities: [
        {
          package: 'critical-pkg',
          severity: 'critical',
          fixAvailable: true,
          cve: 'CVE-2024-99999',
          description: 'Critical issue',
          affectedVersions: '<1.0',
          patchedVersions: '1.0',
        },
      ],
      resolvedVulnerabilities: [],
      scanStatus: 'critical-found',
    };

    bridgeSecurityScanToAlerts(result);

    const report = getAlertHubReport();
    expect(report.alertCount).toBe(1);
    expect(report.criticalCount).toBe(1);
    expect(report.alerts[0].source).toBe('security');
    expect(report.alerts[0].severity).toBe('critical');
  });

  test('multiple security alerts can coexist with other DNA alerts', () => {
    const securityResult: SecurityScanResult = {
      timestamp: new Date().toISOString(),
      total: 1,
      critical: 1,
      high: 0,
      moderate: 0,
      low: 0,
      info: 0,
      vulnerabilities: [
        {
          package: 'pkg',
          severity: 'critical',
          fixAvailable: true,
          cve: null,
          description: 'test',
          affectedVersions: '<1',
          patchedVersions: '1',
        },
      ],
      newVulnerabilities: [
        {
          package: 'pkg',
          severity: 'critical',
          fixAvailable: true,
          cve: null,
          description: 'test',
          affectedVersions: '<1',
          patchedVersions: '1',
        },
      ],
      resolvedVulnerabilities: [],
      scanStatus: 'critical-found',
    };

    bridgeSecurityScanToAlerts(securityResult);

    // Simulate other DNA systems recording alerts
    recordAlert('blocking-conditions', 'critical', 'GitHub Actions outage', 'No runs');
    recordAlert('deployment', 'warning', 'Deployment issue', 'Code not live');

    const report = getAlertHubReport();
    expect(report.alertCount).toBe(3);
    expect(report.criticalCount).toBe(2); // security + blocking-conditions
    expect(report.warningCount).toBe(1); // deployment

    const sources = report.alerts.map(a => a.source);
    expect(sources).toContain('security');
    expect(sources).toContain('blocking-conditions');
    expect(sources).toContain('deployment');
  });
});
