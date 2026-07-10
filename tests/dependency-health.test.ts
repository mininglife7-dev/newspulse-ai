import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { execSync } from 'child_process'
import {
  checkNpmVulnerabilities,
  checkOutdatedMajors,
  runDependencyHealthChecks,
  formatDependencyAlert,
} from '../lib/dependency-health'

vi.mock('child_process')

describe('Dependency Health Monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkNpmVulnerabilities', () => {
    it('should return empty array when no vulnerabilities', async () => {
      const mockExecSync = vi.mocked(execSync)
      mockExecSync.mockReturnValue('{"vulnerabilities":{}}')

      const result = await checkNpmVulnerabilities()

      expect(result).toEqual([])
    })

    it('should detect critical vulnerabilities', async () => {
      const mockExecSync = vi.mocked(execSync)
      mockExecSync.mockReturnValue(
        JSON.stringify({
          vulnerabilities: {
            'some-package': {
              severity: 'critical',
              installed_version: '1.0.0',
              range: '>=1.0.0 <1.2.0',
              fixed_in: '1.2.0',
              via: [{ id: 123, severity: 'critical', title: 'Critical vulnerability' }],
            },
          },
        })
      )

      const result = await checkNpmVulnerabilities()

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('critical_severity')
      expect(result[0].package).toBe('some-package')
      expect(result[0].currentVersion).toBe('1.0.0')
      expect(result[0].vulnerabilityCount).toBe(1)
    })

    it('should detect high-severity vulnerabilities', async () => {
      const mockExecSync = vi.mocked(execSync)
      mockExecSync.mockReturnValue(
        JSON.stringify({
          vulnerabilities: {
            'another-package': {
              severity: 'high',
              installed_version: '2.1.0',
              via: [{ severity: 'high' }],
            },
          },
        })
      )

      const result = await checkNpmVulnerabilities()

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('high_severity')
      expect(result[0].package).toBe('another-package')
    })

    it('should ignore low/moderate severity vulnerabilities', async () => {
      const mockExecSync = vi.mocked(execSync)
      mockExecSync.mockReturnValue(
        JSON.stringify({
          vulnerabilities: {
            'low-package': { severity: 'low', installed_version: '1.0.0' },
            'moderate-package': { severity: 'moderate', installed_version: '2.0.0' },
          },
        })
      )

      const result = await checkNpmVulnerabilities()

      expect(result).toHaveLength(0)
    })

    it('should handle npm audit error gracefully', async () => {
      const mockExecSync = vi.mocked(execSync)
      mockExecSync.mockImplementation(() => {
        throw new Error('npm audit failed')
      })

      const result = await checkNpmVulnerabilities()

      expect(result).toEqual([])
    })

    it('should handle invalid JSON gracefully', async () => {
      const mockExecSync = vi.mocked(execSync)
      mockExecSync.mockReturnValue('invalid json')

      const result = await checkNpmVulnerabilities()

      expect(result).toEqual([])
    })
  })

  describe('checkOutdatedMajors', () => {
    it('should return empty object when no outdated packages', async () => {
      const mockExecSync = vi.mocked(execSync)
      mockExecSync.mockReturnValue('{}')

      const result = await checkOutdatedMajors()

      expect(result).toEqual({})
    })

    it('should detect major version upgrades', async () => {
      const mockExecSync = vi.mocked(execSync)
      mockExecSync.mockReturnValue(
        JSON.stringify({
          'next': { current: '14.2.35', latest: '16.2.10' },
          'react': { current: '18.3.1', latest: '19.2.7' },
        })
      )

      const result = await checkOutdatedMajors()

      expect(result).toEqual({
        'next': { current: '14.2.35', latest: '16.2.10' },
        'react': { current: '18.3.1', latest: '19.2.7' },
      })
    })

    it('should ignore minor/patch upgrades', async () => {
      const mockExecSync = vi.mocked(execSync)
      mockExecSync.mockReturnValue(
        JSON.stringify({
          'clsx': { current: '2.1.0', latest: '2.1.1' },
          'typescript': { current: '5.6.0', latest: '5.7.0' },
        })
      )

      const result = await checkOutdatedMajors()

      expect(result).toEqual({})
    })

    it('should handle outdated command error', async () => {
      const mockExecSync = vi.mocked(execSync)
      mockExecSync.mockImplementation(() => {
        throw new Error('npm outdated failed')
      })

      const result = await checkOutdatedMajors()

      expect(result).toEqual({})
    })
  })

  describe('runDependencyHealthChecks', () => {
    it('should produce ok=true when no issues', async () => {
      const mockExecSync = vi.mocked(execSync)
      mockExecSync.mockReturnValue('{}')

      const result = await runDependencyHealthChecks()

      expect(result.ok).toBe(true)
      expect(result.vulnerabilities).toHaveLength(0)
      expect(result.outdatedMajors).toEqual({})
      expect(result.summary.vulnerablePackages).toBe(0)
      expect(result.summary.criticalCount).toBe(0)
    })

    it('should produce ok=false when critical vulnerabilities exist', async () => {
      const mockExecSync = vi.mocked(execSync)
      mockExecSync.mockReturnValue(
        JSON.stringify({
          vulnerabilities: {
            'critical-pkg': {
              severity: 'critical',
              installed_version: '1.0.0',
              via: [{ severity: 'critical' }],
            },
          },
        })
      )

      const result = await runDependencyHealthChecks()

      expect(result.ok).toBe(false)
      expect(result.summary.criticalCount).toBe(1)
    })

    it('should produce ok=false when high vulnerabilities exist', async () => {
      const mockExecSync = vi.mocked(execSync)
      mockExecSync.mockReturnValue(
        JSON.stringify({
          vulnerabilities: {
            'high-pkg': {
              severity: 'high',
              installed_version: '2.0.0',
              via: [{ severity: 'high' }],
            },
          },
        })
      )

      const result = await runDependencyHealthChecks()

      expect(result.ok).toBe(false)
      expect(result.summary.highCount).toBe(1)
    })

    it('should aggregate vulnerabilities and outdated majors', async () => {
      const mockExecSync = vi.mocked(execSync)

      let callCount = 0
      mockExecSync.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return JSON.stringify({
            vulnerabilities: {
              'pkg-a': { severity: 'critical', installed_version: '1.0.0', via: [{ severity: 'critical' }] },
            },
          })
        } else {
          return JSON.stringify({
            'next': { current: '14.2.35', latest: '16.2.10' },
          })
        }
      })

      const result = await runDependencyHealthChecks()

      expect(result.vulnerabilities).toHaveLength(1)
      expect(Object.keys(result.outdatedMajors)).toHaveLength(1)
      expect(result.summary.vulnerablePackages).toBe(1)
      expect(result.summary.outdatedMajors).toBe(1)
    })

    it('should include alerts for critical vulnerabilities', async () => {
      const mockExecSync = vi.mocked(execSync)
      mockExecSync.mockReturnValue(
        JSON.stringify({
          vulnerabilities: {
            'critical-pkg': {
              severity: 'critical',
              installed_version: '1.0.0',
              via: [{ severity: 'critical' }],
            },
          },
        })
      )

      const result = await runDependencyHealthChecks()

      expect(result.alerts.length).toBeGreaterThan(0)
      expect(result.alerts[0]).toContain('[CRITICAL]')
      expect(result.alerts[0]).toContain('critical-pkg')
    })

    it('should include alerts for outdated majors', async () => {
      const mockExecSync = vi.mocked(execSync)
      mockExecSync.mockReturnValue(
        JSON.stringify({
          'next': { current: '14.2.35', latest: '16.2.10' },
          'react': { current: '18.3.1', latest: '19.2.7' },
        })
      )

      const result = await runDependencyHealthChecks()

      expect(result.alerts.length).toBeGreaterThan(0)
      expect(result.alerts[0]).toContain('[WARNING]')
      expect(result.alerts[0]).toContain('major version upgrade')
    })
  })

  describe('formatDependencyAlert', () => {
    it('should format report with no issues', () => {
      const report = {
        ok: true,
        timestamp: '2026-07-10T12:00:00Z',
        vulnerabilities: [],
        outdatedMajors: {},
        summary: { vulnerablePackages: 0, criticalCount: 0, highCount: 0, outdatedMajors: 0 },
        alerts: [],
      }

      const formatted = formatDependencyAlert(report)

      expect(formatted).toContain('Dependency Health Report')
      expect(formatted).toContain('No security vulnerabilities')
    })

    it('should format report with vulnerabilities', () => {
      const report = {
        ok: false,
        timestamp: '2026-07-10T12:00:00Z',
        vulnerabilities: [
          {
            type: 'critical_severity' as const,
            package: 'critical-pkg',
            currentVersion: '1.0.0',
            vulnerabilityCount: 1,
            recommendedAction: 'Run "npm install critical-pkg@latest"',
          },
        ],
        outdatedMajors: {},
        summary: { vulnerablePackages: 1, criticalCount: 1, highCount: 0, outdatedMajors: 0 },
        alerts: ['[CRITICAL] 1 critical npm vulnerability(ies) detected: critical-pkg'],
      }

      const formatted = formatDependencyAlert(report)

      expect(formatted).toContain('SECURITY ISSUES DETECTED')
      expect(formatted).toContain('critical-pkg')
    })

    it('should format report with outdated majors', () => {
      const report = {
        ok: true,
        timestamp: '2026-07-10T12:00:00Z',
        vulnerabilities: [],
        outdatedMajors: {
          'next': { current: '14.2.35', latest: '16.2.10' },
        },
        summary: { vulnerablePackages: 0, criticalCount: 0, highCount: 0, outdatedMajors: 1 },
        alerts: [],
      }

      const formatted = formatDependencyAlert(report)

      expect(formatted).toContain('outdated major')
      expect(formatted).toContain('next')
    })
  })
})
