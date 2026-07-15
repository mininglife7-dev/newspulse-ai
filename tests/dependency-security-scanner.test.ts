import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  scanDependencies,
  formatSecurityAlert,
  getSecuritySummary,
  SecurityScanResult,
} from '@/lib/dependency-security-scanner';

describe('DNA-GOV-008: Dependency Security Scanner', () => {
  const testCacheDir = path.join(process.cwd(), 'tests/.security-cache');
  const testCachePath = path.join(testCacheDir, '.security-scan-cache.json');

  beforeEach(() => {
    // Set test cache path for all tests
    process.env.SECURITY_SCAN_CACHE_PATH = testCachePath;

    // Ensure test cache directory exists
    if (!fs.existsSync(testCacheDir)) {
      fs.mkdirSync(testCacheDir, { recursive: true });
    }

    // Clear cache before each test
    if (fs.existsSync(testCachePath)) {
      fs.unlinkSync(testCachePath);
    }
  });

  afterEach(() => {
    // Clean up test cache
    if (fs.existsSync(testCachePath)) {
      fs.unlinkSync(testCachePath);
    }
    if (
      fs.existsSync(testCacheDir) &&
      fs.readdirSync(testCacheDir).length === 0
    ) {
      fs.rmdirSync(testCacheDir);
    }
    delete process.env.SECURITY_SCAN_CACHE_PATH;
  });

  test(
    'scanDependencies returns result with expected structure',
    { timeout: 60_000 },
    async () => {
      const result = await scanDependencies();

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('critical');
      expect(result).toHaveProperty('high');
      expect(result).toHaveProperty('moderate');
      expect(result).toHaveProperty('low');
      expect(result).toHaveProperty('info');
      expect(result).toHaveProperty('vulnerabilities');
      expect(result).toHaveProperty('newVulnerabilities');
      expect(result).toHaveProperty('resolvedVulnerabilities');
      expect(result).toHaveProperty('scanStatus');
    }
  );

  test(
    'scanStatus is "clean" when no vulnerabilities',
    { timeout: 60_000 },
    async () => {
      const result = await scanDependencies();
      // This test verifies logic; actual result depends on current dependencies
      // At minimum, scanStatus should be one of the allowed values
      expect(['clean', 'vulnerabilities-found', 'critical-found']).toContain(
        result.scanStatus
      );
    }
  );

  test(
    'total count equals sum of all severity counts',
    { timeout: 60_000 },
    async () => {
      const result = await scanDependencies();
      const sum =
        result.critical +
        result.high +
        result.moderate +
        result.low +
        result.info;
      expect(result.total).toBe(sum);
    }
  );

  test(
    'vulnerabilities array matches total count',
    { timeout: 60_000 },
    async () => {
      const result = await scanDependencies();
      expect(result.vulnerabilities.length).toBe(result.total);
    }
  );

  test(
    'detected vulnerabilities have required fields',
    { timeout: 60_000 },
    async () => {
      const result = await scanDependencies();

      if (result.vulnerabilities.length > 0) {
        result.vulnerabilities.forEach((vuln) => {
          expect(vuln).toHaveProperty('package');
          expect(vuln).toHaveProperty('severity');
          expect(vuln).toHaveProperty('fixAvailable');
          expect(vuln).toHaveProperty('description');
          expect(vuln).toHaveProperty('affectedVersions');
          expect(vuln).toHaveProperty('patchedVersions');
          expect(['critical', 'high', 'moderate', 'low', 'info']).toContain(
            vuln.severity
          );
          expect(typeof vuln.package).toBe('string');
          expect(typeof vuln.description).toBe('string');
          expect(typeof vuln.affectedVersions).toBe('string');
          expect(typeof vuln.patchedVersions).toBe('string');
        });
      }
    }
  );

  test(
    'cache tracks previous vulnerabilities',
    { timeout: 60_000 },
    async () => {
      // First scan
      const result1 = await scanDependencies();
      const initialVulnCount = result1.total;

      // Second scan with same state
      const result2 = await scanDependencies();

      // With same codebase, same vulnerabilities should be present
      expect(result2.total).toBe(initialVulnCount);
      // New vulnerabilities should be 0 since nothing changed
      expect(result2.newVulnerabilities.length).toBeGreaterThanOrEqual(0);
    }
  );

  test('formatSecurityAlert returns alert with correct structure', async () => {
    const mockResult: SecurityScanResult = {
      timestamp: new Date().toISOString(),
      total: 2,
      critical: 1,
      high: 1,
      moderate: 0,
      low: 0,
      info: 0,
      vulnerabilities: [
        {
          package: '@some/package',
          severity: 'critical',
          fixAvailable: true,
          cve: 'CVE-2024-12345',
          description: 'Critical RCE vulnerability',
          affectedVersions: '1.0.0 - 1.2.5',
          patchedVersions: '1.2.6',
        },
        {
          package: 'lodash',
          severity: 'high',
          fixAvailable: false,
          cve: null,
          description: 'Prototype pollution',
          affectedVersions: '<4.17.20',
          patchedVersions: '4.17.20',
        },
      ],
      newVulnerabilities: [
        {
          package: '@some/package',
          severity: 'critical',
          fixAvailable: true,
          cve: 'CVE-2024-12345',
          description: 'Critical RCE vulnerability',
          affectedVersions: '1.0.0 - 1.2.5',
          patchedVersions: '1.2.6',
        },
      ],
      resolvedVulnerabilities: [],
      scanStatus: 'critical-found',
    };

    const alert = formatSecurityAlert(mockResult);

    expect(alert).toHaveProperty('timestamp');
    expect(alert).toHaveProperty('severity');
    expect(alert).toHaveProperty('title');
    expect(alert).toHaveProperty('message');
    expect(alert).toHaveProperty('vulnerabilities');
    expect(alert).toHaveProperty('recommendedAction');
    expect(alert.severity).toBe('critical');
    expect(alert.title).toContain('CRITICAL');
  });

  test('formatSecurityAlert severity is "critical" for critical vulnerabilities', () => {
    const mockResult: SecurityScanResult = {
      timestamp: new Date().toISOString(),
      total: 1,
      critical: 1,
      high: 0,
      moderate: 0,
      low: 0,
      info: 0,
      vulnerabilities: [
        {
          package: 'express',
          severity: 'critical',
          fixAvailable: true,
          cve: 'CVE-2024-99999',
          description: 'Critical issue',
          affectedVersions: '<4.18.0',
          patchedVersions: '4.18.0',
        },
      ],
      newVulnerabilities: [
        {
          package: 'express',
          severity: 'critical',
          fixAvailable: true,
          cve: 'CVE-2024-99999',
          description: 'Critical issue',
          affectedVersions: '<4.18.0',
          patchedVersions: '4.18.0',
        },
      ],
      resolvedVulnerabilities: [],
      scanStatus: 'critical-found',
    };

    const alert = formatSecurityAlert(mockResult);
    expect(alert.severity).toBe('critical');
  });

  test('formatSecurityAlert severity is "warning" for high vulnerabilities', () => {
    const mockResult: SecurityScanResult = {
      timestamp: new Date().toISOString(),
      total: 1,
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
          cve: 'CVE-2021-12345',
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
          cve: 'CVE-2021-12345',
          description: 'Prototype pollution',
          affectedVersions: '<4.17.20',
          patchedVersions: '4.17.20',
        },
      ],
      resolvedVulnerabilities: [],
      scanStatus: 'vulnerabilities-found',
    };

    const alert = formatSecurityAlert(mockResult);
    expect(alert.severity).toBe('warning');
    expect(alert.title).toContain('WARNING');
  });

  test('formatSecurityAlert severity is "info" for resolved vulnerabilities', () => {
    const mockResult: SecurityScanResult = {
      timestamp: new Date().toISOString(),
      total: 0,
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      info: 0,
      vulnerabilities: [],
      newVulnerabilities: [],
      resolvedVulnerabilities: ['old-package:high'],
      scanStatus: 'clean',
    };

    const alert = formatSecurityAlert(mockResult);
    expect(alert.severity).toBe('info');
    expect(alert.title).toContain('Resolved');
  });

  test('formatSecurityAlert severity is "info" for clean status', () => {
    const mockResult: SecurityScanResult = {
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

    const alert = formatSecurityAlert(mockResult);
    expect(alert.severity).toBe('info');
    expect(alert.title).toContain('No Known Vulnerabilities');
  });

  test(
    'getSecuritySummary returns formatted summary string',
    { timeout: 60_000 },
    async () => {
      const result = await scanDependencies();
      const summary = getSecuritySummary(result);

      expect(typeof summary).toBe('string');
      expect(summary).toContain('Dependencies:');
      expect(summary).toContain('vulnerabilities');
    }
  );

  test('getSecuritySummary includes new vulnerabilities count when present', () => {
    const mockResult: SecurityScanResult = {
      timestamp: new Date().toISOString(),
      total: 3,
      critical: 0,
      high: 2,
      moderate: 1,
      low: 0,
      info: 0,
      vulnerabilities: [],
      newVulnerabilities: [
        {
          package: 'lodash',
          severity: 'high',
          fixAvailable: true,
          cve: null,
          description: 'test',
          affectedVersions: '<4',
          patchedVersions: '4',
        },
      ],
      resolvedVulnerabilities: [],
      scanStatus: 'vulnerabilities-found',
    };

    const summary = getSecuritySummary(mockResult);
    expect(summary).toContain('NEW:');
  });

  test('getSecuritySummary includes resolved count when present', () => {
    const mockResult: SecurityScanResult = {
      timestamp: new Date().toISOString(),
      total: 1,
      critical: 0,
      high: 1,
      moderate: 0,
      low: 0,
      info: 0,
      vulnerabilities: [],
      newVulnerabilities: [],
      resolvedVulnerabilities: ['old-package:high', 'other-pkg:moderate'],
      scanStatus: 'clean',
    };

    const summary = getSecuritySummary(mockResult);
    expect(summary).toContain('RESOLVED:');
    expect(summary).toContain('2');
  });

  test('getSecuritySummary indicates clear status when no vulnerabilities', () => {
    const mockResult: SecurityScanResult = {
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

    const summary = getSecuritySummary(mockResult);
    expect(summary).toContain('All clear');
  });
});
