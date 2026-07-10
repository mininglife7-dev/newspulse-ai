import { describe, it, expect } from 'vitest';
import {
  analyzePatchability,
  classifyVulnerabilities,
  generatePatchCommand,
  type Vulnerability,
} from '@/lib/dependency-patch-analyzer';

describe('dependency-patch-analyzer', () => {
  describe('analyzePatchability', () => {
    it('marks critical vulnerabilities as not patchable', () => {
      const vuln: Vulnerability = {
        name: 'critical-vuln',
        severity: 'critical',
        isDirect: true,
        fixAvailable: {
          name: 'critical-vuln',
          version: '2.0.0',
          isSemVerMajor: false,
        },
        via: 'critical-vuln',
        range: '<1.5.0',
      };

      const result = analyzePatchability(vuln);
      expect(result.isPatchable).toBe(false);
      expect(result.recommendedAction).toBe('manual-review');
      expect(result.riskLevel).toBe('critical');
    });

    it('marks direct deps with minor/patch fixes as patchable', () => {
      const vuln: Vulnerability = {
        name: 'package-a',
        severity: 'high',
        isDirect: true,
        fixAvailable: {
          name: 'package-a',
          version: '1.2.5',
          isSemVerMajor: false,
        },
        via: 'package-a',
        range: '<1.2.5',
      };

      const result = analyzePatchability(vuln);
      expect(result.isPatchable).toBe(true);
      expect(result.recommendedAction).toBe('auto-patch');
    });

    it('marks vulns requiring major version bumps as not patchable', () => {
      const vuln: Vulnerability = {
        name: 'next',
        severity: 'moderate',
        isDirect: true,
        fixAvailable: {
          name: 'next',
          version: '17.0.0',
          isSemVerMajor: true,
        },
        via: 'next',
        range: '<17.0.0',
      };

      const result = analyzePatchability(vuln);
      expect(result.isPatchable).toBe(false);
      expect(result.recommendedAction).toBe('manual-review');
    });

    it('marks transitive deps as waiting on parent upgrade', () => {
      const vuln: Vulnerability = {
        name: 'postcss',
        severity: 'moderate',
        isDirect: false,
        fixAvailable: {
          name: 'postcss',
          version: '8.5.10',
          isSemVerMajor: false,
        },
        via: 'next',
        range: '<8.5.10',
      };

      const result = analyzePatchability(vuln);
      expect(result.isPatchable).toBe(false);
      expect(result.recommendedAction).toBe('wait-for-parent-upgrade');
    });

    it('marks vulns with no fix available as waiting', () => {
      const vuln: Vulnerability = {
        name: 'unfixed-vuln',
        severity: 'moderate',
        isDirect: true,
        fixAvailable: false,
        via: 'unfixed-vuln',
        range: '<2.0.0',
      };

      const result = analyzePatchability(vuln);
      expect(result.isPatchable).toBe(false);
      expect(result.recommendedAction).toBe('wait-for-parent-upgrade');
    });
  });

  describe('classifyVulnerabilities', () => {
    it('segregates vulnerabilities by action', () => {
      const vulns: Vulnerability[] = [
        {
          name: 'auto-patchable',
          severity: 'high',
          isDirect: true,
          fixAvailable: {
            name: 'auto-patchable',
            version: '1.2.0',
            isSemVerMajor: false,
          },
          via: 'auto-patchable',
          range: '<1.2.0',
        },
        {
          name: 'major-bump',
          severity: 'high',
          isDirect: true,
          fixAvailable: {
            name: 'major-bump',
            version: '2.0.0',
            isSemVerMajor: true,
          },
          via: 'major-bump',
          range: '<2.0.0',
        },
        {
          name: 'transitive',
          severity: 'moderate',
          isDirect: false,
          fixAvailable: {
            name: 'transitive',
            version: '1.1.0',
            isSemVerMajor: false,
          },
          via: 'parent',
          range: '<1.1.0',
        },
      ];

      const result = classifyVulnerabilities(vulns);
      expect(result.autoPatchable).toHaveLength(1);
      expect(result.needsReview).toHaveLength(1);
      expect(result.waitingOnParent).toHaveLength(1);
    });
  });

  describe('generatePatchCommand', () => {
    it('generates npm install command for auto-patchable vulns', () => {
      const vuln: Vulnerability = {
        name: 'package-a',
        severity: 'high',
        isDirect: true,
        fixAvailable: {
          name: 'package-a',
          version: '1.2.0',
          isSemVerMajor: false,
        },
        via: 'package-a',
        range: '<1.2.0',
      };

      const analysis = [analyzePatchability(vuln)];
      const cmd = generatePatchCommand(analysis);

      expect(cmd).toContain('npm install --save');
      expect(cmd).toContain('package-a@1.2.0');
    });

    it('returns empty string when no patchable vulns', () => {
      const vuln: Vulnerability = {
        name: 'transitive',
        severity: 'moderate',
        isDirect: false,
        fixAvailable: {
          name: 'transitive',
          version: '1.1.0',
          isSemVerMajor: false,
        },
        via: 'parent',
        range: '<1.1.0',
      };

      const analysis = [analyzePatchability(vuln)];
      const cmd = generatePatchCommand(analysis);

      expect(cmd).toBe('');
    });
  });
});
