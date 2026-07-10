import { describe, it, expect, vi, beforeEach } from 'vitest'
import { execSync } from 'child_process'
import {
  scanDependencies,
  formatDependencySecurityAlert,
  isCriticalSecurityIssue,
} from '../lib/dependency-security-scanner'

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

describe('dependency-security-scanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('scanDependencies', () => {
    it('returns healthy status when no vulnerabilities', () => {
      const execSyncMock = execSync as unknown as ReturnType<typeof vi.fn>
      execSyncMock.mockReturnValue(
        JSON.stringify({
          vulnerabilities: {},
        })
      )

      const report = scanDependencies()

      expect(report.ok).toBe(true)
      expect(report.vulnerabilityCount.total).toBe(0)
      expect(report.alerts.length).toBe(0)
    })

    it('detects critical vulnerabilities', () => {
      const execSyncMock = execSync as unknown as ReturnType<typeof vi.fn>
      execSyncMock.mockReturnValue(
        JSON.stringify({
          vulnerabilities: {
            'vulnerable-pkg': {
              severity: 'critical',
              installedVersion: '1.0.0',
              fixAvailable: true,
              via: [
                {
                  title: 'Critical remote code execution',
                  url: 'https://github.com/advisories/GHSA-xxxx-xxxx-xxxx',
                  range: '<2.0.0',
                },
              ],
            },
          },
        })
      )

      const report = scanDependencies()

      expect(report.ok).toBe(false)
      expect(report.vulnerabilityCount.critical).toBe(1)
      expect(report.vulnerabilityCount.total).toBe(1)
      expect(report.alerts[0]).toContain('CRITICAL')
    })

    it('detects high-severity vulnerabilities', () => {
      const execSyncMock = execSync as unknown as ReturnType<typeof vi.fn>
      execSyncMock.mockReturnValue(
        JSON.stringify({
          vulnerabilities: {
            'pkg-a': {
              severity: 'high',
              installedVersion: '1.0.0',
              fixAvailable: true,
              via: [
                {
                  title: 'Authorization bypass',
                  range: '<1.5.0',
                },
              ],
            },
            'pkg-b': {
              severity: 'high',
              installedVersion: '2.0.0',
              fixAvailable: false,
              via: [
                {
                  title: 'Denial of service',
                  range: '<2.1.0',
                },
              ],
            },
          },
        })
      )

      const report = scanDependencies()

      expect(report.ok).toBe(false)
      expect(report.vulnerabilityCount.high).toBe(2)
      expect(report.vulnerabilityCount.total).toBe(2)
      expect(report.alerts[0]).toContain('HIGH')
    })

    it('detects moderate-severity vulnerabilities', () => {
      const execSyncMock = execSync as unknown as ReturnType<typeof vi.fn>
      execSyncMock.mockReturnValue(
        JSON.stringify({
          vulnerabilities: {
            'pkg-a': {
              severity: 'moderate',
              installedVersion: '1.0.0',
              via: [
                {
                  title: 'Information disclosure',
                  range: '<1.2.0',
                },
              ],
            },
            'pkg-b': {
              severity: 'moderate',
              installedVersion: '2.0.0',
              via: [
                {
                  title: 'Race condition',
                  range: '<2.0.5',
                },
              ],
            },
          },
        })
      )

      const report = scanDependencies()

      expect(report.ok).toBe(true) // OK when no critical/high
      expect(report.vulnerabilityCount.moderate).toBe(2)
    })

    it('counts vulnerabilities by severity correctly', () => {
      const execSyncMock = execSync as unknown as ReturnType<typeof vi.fn>
      execSyncMock.mockReturnValue(
        JSON.stringify({
          vulnerabilities: {
            critical: {
              severity: 'critical',
              via: [{ title: 'RCE' }],
            },
            high1: {
              severity: 'high',
              via: [{ title: 'Auth bypass' }],
            },
            high2: {
              severity: 'high',
              via: [{ title: 'DoS' }],
            },
            moderate: {
              severity: 'moderate',
              via: [{ title: 'Info leak' }],
            },
            low: {
              severity: 'low',
              via: [{ title: 'Minor' }],
            },
          },
        })
      )

      const report = scanDependencies()

      expect(report.vulnerabilityCount.critical).toBe(1)
      expect(report.vulnerabilityCount.high).toBe(2)
      expect(report.vulnerabilityCount.moderate).toBe(1)
      expect(report.vulnerabilityCount.low).toBe(1)
      expect(report.vulnerabilityCount.total).toBe(5)
    })

    it('extracts advisory details', () => {
      const execSyncMock = execSync as unknown as ReturnType<typeof vi.fn>
      execSyncMock.mockReturnValue(
        JSON.stringify({
          vulnerabilities: {
            'next': {
              severity: 'high',
              installedVersion: '14.2.35',
              fixAvailable: true,
              via: [
                {
                  title: 'DoS in Image Optimizer',
                  url: 'https://github.com/advisories/GHSA-xxxx-xxxx-xxxx',
                  range: '>=10.0.0 <15.5.10',
                },
              ],
            },
          },
        })
      )

      const report = scanDependencies()

      expect(report.vulnerabilities).toHaveLength(1)
      const vuln = report.vulnerabilities[0]
      expect(vuln.name).toBe('next')
      expect(vuln.severity).toBe('high')
      expect(vuln.title).toBe('DoS in Image Optimizer')
      expect(vuln.url).toBe('https://github.com/advisories/GHSA-xxxx-xxxx-xxxx')
      expect(vuln.range).toBe('>=10.0.0 <15.5.10')
      expect(vuln.installedVersion).toBe('14.2.35')
      expect(vuln.fixAvailable).toBe(true)
    })

    it('handles npm audit command failure gracefully', () => {
      const execSyncMock = execSync as unknown as ReturnType<typeof vi.fn>
      execSyncMock.mockImplementation(() => {
        throw new Error('Network error')
      })

      const report = scanDependencies()

      expect(report.ok).toBe(false)
      expect(report.alerts[0]).toContain('Could not run dependency scan')
      expect(report.alerts[0]).toContain('Network error')
    })

    it('includes timestamp in report', () => {
      const execSyncMock = execSync as unknown as ReturnType<typeof vi.fn>
      execSyncMock.mockReturnValue(
        JSON.stringify({
          vulnerabilities: {},
        })
      )

      const report = scanDependencies()

      expect(report.timestamp).toBeTruthy()
      expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('handles multiple vulnerabilities in same package', () => {
      const execSyncMock = execSync as unknown as ReturnType<typeof vi.fn>
      execSyncMock.mockReturnValue(
        JSON.stringify({
          vulnerabilities: {
            'vulnerable-lib': {
              severity: 'high',
              via: [
                {
                  title: 'First CVE',
                  url: 'https://example.com/cve1',
                },
                {
                  title: 'Second CVE',
                  url: 'https://example.com/cve2',
                },
              ],
            },
          },
        })
      )

      const report = scanDependencies()

      expect(report.vulnerabilities).toHaveLength(2)
      expect(report.vulnerabilities[0].name).toBe('vulnerable-lib')
      expect(report.vulnerabilities[1].name).toBe('vulnerable-lib')
    })
  })

  describe('formatDependencySecurityAlert', () => {
    it('formats healthy report', () => {
      const report = {
        ok: true,
        timestamp: '2026-07-10T12:00:00Z',
        vulnerabilityCount: { critical: 0, high: 0, moderate: 0, low: 0, total: 0 },
        vulnerabilities: [],
        alerts: [],
      }

      const formatted = formatDependencySecurityAlert(report)

      expect(formatted).toContain('✅')
      expect(formatted).toContain('All clear')
    })

    it('formats critical alert with recommendations', () => {
      const report = {
        ok: false,
        timestamp: '2026-07-10T12:00:00Z',
        vulnerabilityCount: { critical: 1, high: 0, moderate: 0, low: 0, total: 1 },
        vulnerabilities: [
          {
            name: 'critical-pkg',
            severity: 'critical' as const,
            title: 'Remote code execution',
            url: 'https://github.com/advisories/GHSA-xxxx',
            range: '<2.0.0',
            fixAvailable: true,
            installedVersion: '1.0.0',
          },
        ],
        alerts: ['🔴 **CRITICAL: 1 critical vulnerability(ies) detected**'],
        recommendation: 'Update dependencies immediately before next deployment',
      }

      const formatted = formatDependencySecurityAlert(report)

      expect(formatted).toContain('CRITICAL')
      expect(formatted).toContain('critical-pkg')
      expect(formatted).toContain('Remote code execution')
      expect(formatted).toContain('immediately before next deployment')
      expect(formatted).toContain('https://github.com/advisories/GHSA-xxxx')
    })

    it('formats high-severity alert', () => {
      const report = {
        ok: false,
        timestamp: '2026-07-10T12:00:00Z',
        vulnerabilityCount: { critical: 0, high: 2, moderate: 0, low: 0, total: 2 },
        vulnerabilities: [
          {
            name: 'high-pkg-1',
            severity: 'high' as const,
            title: 'Authorization bypass',
            fixAvailable: false,
          },
          {
            name: 'high-pkg-2',
            severity: 'high' as const,
            title: 'Denial of service',
            fixAvailable: true,
          },
        ],
        alerts: ['🟠 **HIGH: 2 high-severity vulnerability(ies) detected**'],
        recommendation: 'Schedule security update within next business cycle',
      }

      const formatted = formatDependencySecurityAlert(report)

      expect(formatted).toContain('HIGH')
      expect(formatted).toContain('within next business cycle')
      expect(formatted).toContain('high-pkg-1')
      expect(formatted).toContain('high-pkg-2')
    })

    it('includes timestamp in formatted output', () => {
      const report = {
        ok: true,
        timestamp: '2026-07-10T12:00:00Z',
        vulnerabilityCount: { critical: 0, high: 0, moderate: 0, low: 0, total: 0 },
        vulnerabilities: [],
        alerts: [],
      }

      const formatted = formatDependencySecurityAlert(report)

      expect(formatted).toContain('2026-07-10T12:00:00Z')
    })
  })

  describe('isCriticalSecurityIssue', () => {
    it('returns true for critical vulnerabilities', () => {
      const report = {
        ok: false,
        timestamp: '2026-07-10T12:00:00Z',
        vulnerabilityCount: { critical: 1, high: 0, moderate: 0, low: 0, total: 1 },
        vulnerabilities: [],
        alerts: [],
      }

      expect(isCriticalSecurityIssue(report)).toBe(true)
    })

    it('returns true for high-severity vulnerabilities', () => {
      const report = {
        ok: false,
        timestamp: '2026-07-10T12:00:00Z',
        vulnerabilityCount: { critical: 0, high: 2, moderate: 0, low: 0, total: 2 },
        vulnerabilities: [],
        alerts: [],
      }

      expect(isCriticalSecurityIssue(report)).toBe(true)
    })

    it('returns false for moderate-only vulnerabilities', () => {
      const report = {
        ok: true,
        timestamp: '2026-07-10T12:00:00Z',
        vulnerabilityCount: { critical: 0, high: 0, moderate: 3, low: 1, total: 4 },
        vulnerabilities: [],
        alerts: [],
      }

      expect(isCriticalSecurityIssue(report)).toBe(false)
    })

    it('returns false for no vulnerabilities', () => {
      const report = {
        ok: true,
        timestamp: '2026-07-10T12:00:00Z',
        vulnerabilityCount: { critical: 0, high: 0, moderate: 0, low: 0, total: 0 },
        vulnerabilities: [],
        alerts: [],
      }

      expect(isCriticalSecurityIssue(report)).toBe(false)
    })

    it('returns true when both critical and high exist', () => {
      const report = {
        ok: false,
        timestamp: '2026-07-10T12:00:00Z',
        vulnerabilityCount: { critical: 1, high: 2, moderate: 1, low: 0, total: 4 },
        vulnerabilities: [],
        alerts: [],
      }

      expect(isCriticalSecurityIssue(report)).toBe(true)
    })
  })
})
