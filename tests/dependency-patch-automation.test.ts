import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import {
  getPatchableVulnerabilities,
  applyPatch,
  generatePatchPullRequest,
  runAutomatedPatchCycle,
  formatPatchReport,
  type PatchableVulnerability,
  type PatchResult,
  type AutoPatchReport,
} from '@/lib/dependency-patch-automation';

vi.mock('child_process');

describe('Dependency Patch Automation', () => {
  const mockExecSync = vi.mocked(execSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getPatchableVulnerabilities', () => {
    it('should return empty array when no vulnerabilities', () => {
      mockExecSync.mockReturnValue(JSON.stringify({
        vulnerabilities: {},
      }));

      const vulns = getPatchableVulnerabilities();
      expect(vulns).toEqual([]);
    });

    it('should parse npm audit output correctly', () => {
      const auditOutput = {
        vulnerabilities: {
          'lodash': {
            installed: '4.17.19',
            fixAvailable: {
              version: '4.17.21',
            },
            severity: 'high',
            title: 'Prototype Pollution in lodash',
            cves: ['CVE-2021-23337'],
          },
        },
      };

      mockExecSync.mockReturnValue(JSON.stringify(auditOutput));

      const vulns = getPatchableVulnerabilities();

      expect(vulns).toHaveLength(1);
      expect(vulns[0]).toEqual({
        package: 'lodash',
        current_version: '4.17.19',
        patched_version: '4.17.21',
        severity: 'high',
        cve: 'CVE-2021-23337',
        description: 'Prototype Pollution in lodash',
      });
    });

    it('should filter out vulnerabilities without fixes', () => {
      const auditOutput = {
        vulnerabilities: {
          'unfixed-pkg': {
            installed: '1.0.0',
            severity: 'critical',
            title: 'No fix available',
          },
          'fixable-pkg': {
            installed: '1.0.0',
            fixAvailable: {
              version: '1.0.1',
            },
            severity: 'high',
            title: 'Fixed vulnerability',
          },
        },
      };

      mockExecSync.mockReturnValue(JSON.stringify(auditOutput));

      const vulns = getPatchableVulnerabilities();

      expect(vulns).toHaveLength(1);
      expect(vulns[0].package).toBe('fixable-pkg');
    });

    it('should handle multiple critical vulnerabilities', () => {
      const auditOutput = {
        vulnerabilities: {
          'express': {
            installed: '4.17.1',
            fixAvailable: { version: '4.18.0' },
            severity: 'critical',
            title: 'Express vulnerability',
          },
          'react': {
            installed: '17.0.0',
            fixAvailable: { version: '17.0.2' },
            severity: 'critical',
            title: 'React vulnerability',
          },
        },
      };

      mockExecSync.mockReturnValue(JSON.stringify(auditOutput));

      const vulns = getPatchableVulnerabilities();

      expect(vulns).toHaveLength(2);
      expect(vulns.filter(v => v.severity === 'critical')).toHaveLength(2);
    });

    it('should handle execSync errors gracefully', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('npm audit failed');
      });

      const vulns = getPatchableVulnerabilities();

      expect(vulns).toEqual([]);
    });

    it('should handle missing cves field', () => {
      const auditOutput = {
        vulnerabilities: {
          'pkg-without-cve': {
            installed: '1.0.0',
            fixAvailable: { version: '1.0.1' },
            severity: 'moderate',
            title: 'Vulnerability without CVE',
          },
        },
      };

      mockExecSync.mockReturnValue(JSON.stringify(auditOutput));

      const vulns = getPatchableVulnerabilities();

      expect(vulns).toHaveLength(1);
      expect(vulns[0].cve).toBeUndefined();
    });
  });

  describe('applyPatch', () => {
    const testVuln: PatchableVulnerability = {
      package: 'test-pkg',
      current_version: '1.0.0',
      patched_version: '1.0.1',
      severity: 'high',
      cve: 'CVE-2024-1234',
      description: 'Test vulnerability',
    };

    it('should successfully apply patch when tests pass', () => {
      mockExecSync.mockReturnValue('');

      const result = applyPatch(testVuln);

      expect(result.package).toBe('test-pkg');
      expect(result.old_version).toBe('1.0.0');
      expect(result.new_version).toBe('1.0.1');
      expect(result.applied).toBe(true);
      expect(result.testsPassed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should revert patch when tests fail', () => {
      const calls: string[] = [];
      mockExecSync.mockImplementation((cmd: string) => {
        calls.push(cmd);
        if (cmd.includes('npm test')) {
          throw new Error('Tests failed');
        }
        return '';
      });

      const result = applyPatch(testVuln);

      expect(result.applied).toBe(false);
      expect(result.testsPassed).toBe(false);
      expect(result.error).toContain('Tests failed after patching');
      // Verify revert was attempted
      expect(calls.some(c => c.includes('npm install test-pkg@1.0.0'))).toBe(true);
    });

    it('should handle patch application failure', () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('npm update')) {
          throw new Error('Package not found');
        }
        return '';
      });

      const result = applyPatch(testVuln);

      expect(result.applied).toBe(false);
      expect(result.testsPassed).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should record patch details in result', () => {
      mockExecSync.mockReturnValue('');

      const result = applyPatch(testVuln);

      expect(result.package).toBe(testVuln.package);
      expect(result.old_version).toBe(testVuln.current_version);
      expect(result.new_version).toBe(testVuln.patched_version);
    });

    it('should timeout tests after 60 seconds', () => {
      mockExecSync.mockImplementation((cmd: string, opts: any) => {
        if (cmd.includes('npm test')) {
          expect(opts.timeout).toBe(60000);
        }
        return '';
      });

      applyPatch(testVuln);

      expect(mockExecSync).toHaveBeenCalled();
    });
  });

  describe('generatePatchPullRequest', () => {
    it('should not create PR if no successful patches', async () => {
      const failedPatches: PatchResult[] = [
        {
          package: 'pkg1',
          old_version: '1.0.0',
          new_version: '1.0.1',
          applied: false,
          testsPassed: false,
          error: 'Application failed',
        },
      ];

      const prName = await generatePatchPullRequest(failedPatches);

      expect(prName).toBeNull();
    });

    it('should create PR for critical patches', async () => {
      const patches: PatchResult[] = [
        {
          package: 'critical-pkg',
          old_version: '1.0.0',
          new_version: '1.0.1',
          applied: true,
          testsPassed: true,
        },
      ];

      mockExecSync.mockReturnValue('');

      const prName = await generatePatchPullRequest(patches, 'critical');

      expect(prName).toBe('security/critical-patch-auto');
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('git checkout -b security/critical-patch-auto'),
        expect.any(Object)
      );
    });

    it('should create PR for high-severity patches', async () => {
      const patches: PatchResult[] = [
        {
          package: 'high-pkg',
          old_version: '1.0.0',
          new_version: '1.0.1',
          applied: true,
          testsPassed: true,
        },
      ];

      mockExecSync.mockReturnValue('');

      const prName = await generatePatchPullRequest(patches, 'high');

      expect(prName).toBe('security/dependency-patch-auto');
    });

    it('should include patch summary in commit message', async () => {
      const patches: PatchResult[] = [
        {
          package: 'pkg1',
          old_version: '1.0.0',
          new_version: '1.0.1',
          applied: true,
          testsPassed: true,
        },
        {
          package: 'pkg2',
          old_version: '2.0.0',
          new_version: '2.0.1',
          applied: true,
          testsPassed: true,
        },
      ];

      mockExecSync.mockReturnValue('');

      await generatePatchPullRequest(patches);

      const commitCalls = mockExecSync.mock.calls.filter(call =>
        call[0].includes('git commit')
      );

      expect(commitCalls.length).toBeGreaterThan(0);
      expect(commitCalls[0][0]).toContain('pkg1: 1.0.0 → 1.0.1');
      expect(commitCalls[0][0]).toContain('pkg2: 2.0.0 → 2.0.1');
    });

    it('should handle existing branch gracefully', async () => {
      const patches: PatchResult[] = [
        {
          package: 'pkg',
          old_version: '1.0.0',
          new_version: '1.0.1',
          applied: true,
          testsPassed: true,
        },
      ];

      let checkoutAttempts = 0;
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git checkout -b')) {
          checkoutAttempts++;
          throw new Error('Branch exists');
        }
        return '';
      });

      const prName = await generatePatchPullRequest(patches);

      expect(prName).toBe('security/dependency-patch-auto');
      expect(checkoutAttempts).toBe(1);
    });

    it('should handle git errors gracefully', async () => {
      const patches: PatchResult[] = [
        {
          package: 'pkg',
          old_version: '1.0.0',
          new_version: '1.0.1',
          applied: true,
          testsPassed: true,
        },
      ];

      mockExecSync.mockImplementation(() => {
        throw new Error('Git push failed');
      });

      const prName = await generatePatchPullRequest(patches);

      expect(prName).toBeNull();
    });
  });

  describe('runAutomatedPatchCycle', () => {
    beforeEach(() => {
      mockExecSync.mockReturnValue('');
    });

    it('should prioritize critical vulnerabilities', async () => {
      const auditOutput = {
        vulnerabilities: {
          'critical-pkg': {
            installed: '1.0.0',
            fixAvailable: { version: '1.0.1' },
            severity: 'critical',
            title: 'Critical issue',
          },
          'high-pkg': {
            installed: '1.0.0',
            fixAvailable: { version: '1.0.1' },
            severity: 'high',
            title: 'High issue',
          },
        },
      };

      mockExecSync.mockReturnValue(JSON.stringify(auditOutput));

      const report = await runAutomatedPatchCycle();

      expect(report.total_patchable).toBe(2);
      expect(report.patches_attempted).toBeGreaterThan(0);
    });

    it('should track patch results correctly', async () => {
      const auditOutput = {
        vulnerabilities: {
          'pkg1': {
            installed: '1.0.0',
            fixAvailable: { version: '1.0.1' },
            severity: 'high',
            title: 'Issue 1',
          },
          'pkg2': {
            installed: '1.0.0',
            fixAvailable: { version: '1.0.1' },
            severity: 'high',
            title: 'Issue 2',
          },
        },
      };

      mockExecSync.mockReturnValue(JSON.stringify(auditOutput));

      const report = await runAutomatedPatchCycle();

      expect(report.results).toBeDefined();
      expect(report.results.length).toBeGreaterThan(0);
    });

    it('should include timestamp in report', async () => {
      const beforeTime = new Date().toISOString();
      mockExecSync.mockReturnValue(JSON.stringify({ vulnerabilities: {} }));

      const report = await runAutomatedPatchCycle();

      const reportTime = new Date(report.timestamp);
      const beforeCheck = new Date(beforeTime);

      expect(reportTime.getTime()).toBeGreaterThanOrEqual(beforeCheck.getTime());
    });

    it('should set patches_tested to true when all pass', async () => {
      const auditOutput = {
        vulnerabilities: {
          'pkg': {
            installed: '1.0.0',
            fixAvailable: { version: '1.0.1' },
            severity: 'high',
            title: 'Issue',
          },
        },
      };

      mockExecSync.mockReturnValue(JSON.stringify(auditOutput));

      const report = await runAutomatedPatchCycle();

      expect(report.patches_tested).toBe(true);
    });

    it('should not attempt high-severity patches if critical PR created', async () => {
      const auditOutput = {
        vulnerabilities: {
          'critical-pkg': {
            installed: '1.0.0',
            fixAvailable: { version: '1.0.1' },
            severity: 'critical',
            title: 'Critical issue',
          },
          'high-pkg': {
            installed: '1.0.0',
            fixAvailable: { version: '1.0.1' },
            severity: 'high',
            title: 'High issue',
          },
        },
      };

      mockExecSync.mockReturnValue(JSON.stringify(auditOutput));

      const report = await runAutomatedPatchCycle();

      // When critical PR is created, high-severity patches are skipped
      if (report.pr_created && report.pr_created.includes('critical')) {
        // Only critical patches should be attempted
        expect(report.results.some(r => r.package === 'critical-pkg')).toBe(true);
        // High-severity patches should not be attempted
        expect(report.results.filter(r => r.package === 'high-pkg')).toHaveLength(0);
      }
    });
  });

  describe('formatPatchReport', () => {
    it('should format basic report structure', () => {
      const report: AutoPatchReport = {
        timestamp: '2024-01-01T12:00:00Z',
        total_patchable: 2,
        patches_attempted: 2,
        patches_applied: 2,
        patches_tested: true,
        results: [],
      };

      const formatted = formatPatchReport(report);

      expect(formatted).toContain('Dependency Patch Automation Report');
      expect(formatted).toContain('Total Patchable: 2');
      expect(formatted).toContain('Patches Attempted: 2');
      expect(formatted).toContain('Patches Applied: 2');
      expect(formatted).toContain('All Tests Passed: Yes');
    });

    it('should indicate PR created status', () => {
      const report: AutoPatchReport = {
        timestamp: '2024-01-01T12:00:00Z',
        total_patchable: 1,
        patches_attempted: 1,
        patches_applied: 1,
        patches_tested: true,
        pr_created: 'security/dependency-patch-auto',
        results: [],
      };

      const formatted = formatPatchReport(report);

      expect(formatted).toContain('✅ Pull Request Created: security/dependency-patch-auto');
    });

    it('should warn when patches applied but no PR', () => {
      const report: AutoPatchReport = {
        timestamp: '2024-01-01T12:00:00Z',
        total_patchable: 1,
        patches_attempted: 1,
        patches_applied: 1,
        patches_tested: true,
        results: [],
      };

      const formatted = formatPatchReport(report);

      expect(formatted).toContain('⚠️ Patches applied but no PR created');
    });

    it('should indicate no patchable vulnerabilities', () => {
      const report: AutoPatchReport = {
        timestamp: '2024-01-01T12:00:00Z',
        total_patchable: 0,
        patches_attempted: 0,
        patches_applied: 0,
        patches_tested: true,
        results: [],
      };

      const formatted = formatPatchReport(report);

      expect(formatted).toContain('ℹ️ No patchable vulnerabilities applied');
    });

    it('should detail patch results', () => {
      const report: AutoPatchReport = {
        timestamp: '2024-01-01T12:00:00Z',
        total_patchable: 2,
        patches_attempted: 2,
        patches_applied: 1,
        patches_tested: false,
        results: [
          {
            package: 'lodash',
            old_version: '4.17.19',
            new_version: '4.17.21',
            applied: true,
            testsPassed: true,
          },
          {
            package: 'express',
            old_version: '4.17.1',
            new_version: '4.18.0',
            applied: false,
            testsPassed: false,
            error: 'Tests failed after patching express',
          },
        ],
      };

      const formatted = formatPatchReport(report);

      expect(formatted).toContain('✅ lodash: 4.17.19 → 4.17.21');
      expect(formatted).toContain('❌ express: 4.17.1 → 4.18.0');
      expect(formatted).toContain('Error: Tests failed after patching express');
    });

    it('should handle empty results array', () => {
      const report: AutoPatchReport = {
        timestamp: '2024-01-01T12:00:00Z',
        total_patchable: 0,
        patches_attempted: 0,
        patches_applied: 0,
        patches_tested: true,
        results: [],
      };

      const formatted = formatPatchReport(report);

      expect(formatted).toBeDefined();
      expect(formatted).not.toContain('Patch Details:');
    });

    it('should handle test failure status', () => {
      const report: AutoPatchReport = {
        timestamp: '2024-01-01T12:00:00Z',
        total_patchable: 1,
        patches_attempted: 1,
        patches_applied: 1,
        patches_tested: false,
        results: [
          {
            package: 'test-pkg',
            old_version: '1.0.0',
            new_version: '1.0.1',
            applied: true,
            testsPassed: false,
            error: 'Unit tests failed',
          },
        ],
      };

      const formatted = formatPatchReport(report);

      expect(formatted).toContain('All Tests Passed: No');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle workflow with no vulnerabilities', async () => {
      mockExecSync.mockReturnValue(JSON.stringify({ vulnerabilities: {} }));

      const report = await runAutomatedPatchCycle();

      expect(report.total_patchable).toBe(0);
      expect(report.patches_attempted).toBe(0);
      expect(report.patches_applied).toBe(0);
      expect(report.pr_created).toBeUndefined();
    });

    it('should complete full workflow with mixed results', async () => {
      const auditOutput = {
        vulnerabilities: {
          'critical-pkg': {
            installed: '1.0.0',
            fixAvailable: { version: '1.0.1' },
            severity: 'critical',
            title: 'Critical issue',
          },
          'high-pkg': {
            installed: '1.0.0',
            fixAvailable: { version: '1.0.1' },
            severity: 'high',
            title: 'High issue',
          },
        },
      };

      mockExecSync.mockReturnValue(JSON.stringify(auditOutput));

      const report = await runAutomatedPatchCycle();
      const formatted = formatPatchReport(report);

      expect(report).toBeDefined();
      expect(report.results).toBeDefined();
      expect(formatted).toBeDefined();
    });

    it('should handle patch report formatting after automation cycle', async () => {
      mockExecSync.mockReturnValue(JSON.stringify({
        vulnerabilities: {
          'pkg': {
            installed: '1.0.0',
            fixAvailable: { version: '1.0.1' },
            severity: 'high',
            title: 'Test issue',
          },
        },
      }));

      const report = await runAutomatedPatchCycle();
      const formatted = formatPatchReport(report);

      expect(formatted).toContain('Dependency Patch Automation Report');
      expect(formatted).toContain(report.timestamp);
    });
  });
});
