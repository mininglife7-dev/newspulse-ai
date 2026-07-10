import { describe, it, expect } from 'vitest'
import {
  recordBaseline,
  detectRegressions,
  detectImprovements,
  generatePerformanceReport,
  formatPerformanceAlert,
  PerformanceMetric,
} from '@/lib/performance-baseline'

describe('Performance Baseline (DNA-GOV-009)', () => {
  const baselineMetrics: PerformanceMetric[] = [
    {
      name: 'build-time',
      value: 60000,
      unit: 'ms',
      timestamp: '2026-07-10T00:00:00Z',
      environment: 'production',
    },
    {
      name: 'page-load-lcp',
      value: 2500,
      unit: 'ms',
      timestamp: '2026-07-10T00:00:00Z',
      environment: 'production',
    },
    {
      name: 'api-workspace-response',
      value: 500,
      unit: 'ms',
      timestamp: '2026-07-10T00:00:00Z',
      environment: 'production',
    },
    {
      name: 'bundle-total',
      value: 500000,
      unit: 'bytes',
      timestamp: '2026-07-10T00:00:00Z',
      environment: 'production',
    },
  ]

  describe('recordBaseline', () => {
    it('records baseline with all fields', () => {
      const entry = recordBaseline(baselineMetrics, 'build-123', 'abc123', 45000)

      expect(entry.buildId).toBe('build-123')
      expect(entry.gitCommit).toBe('abc123')
      expect(entry.buildDuration).toBe(45000)
      expect(entry.metrics).toHaveLength(4)
    })

    it('includes timestamp in baseline entry', () => {
      const entry = recordBaseline(baselineMetrics, 'build-123', 'abc123', 45000)

      expect(entry.timestamp).toBeDefined()
      expect(new Date(entry.timestamp).getTime()).toBeGreaterThan(0)
    })
  })

  describe('detectRegressions', () => {
    it('detects when metric degrades beyond threshold', () => {
      const current: PerformanceMetric[] = [
        {
          name: 'build-time',
          value: 72000, // +20% - hits threshold
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'page-load-lcp',
          value: 2500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'api-workspace-response',
          value: 500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'bundle-total',
          value: 500000,
          unit: 'bytes',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
      ]

      const regressions = detectRegressions(current, baselineMetrics)

      expect(regressions).toHaveLength(1)
      expect(regressions[0].metric).toBe('build-time')
      expect(regressions[0].changePercent).toBe(20)
    })

    it('marks critical severity for large regressions', () => {
      const current: PerformanceMetric[] = [
        {
          name: 'build-time',
          value: 96000, // +60% - more than 2x threshold
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'page-load-lcp',
          value: 2500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'api-workspace-response',
          value: 500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'bundle-total',
          value: 500000,
          unit: 'bytes',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
      ]

      const regressions = detectRegressions(current, baselineMetrics)

      expect(regressions[0].severity).toBe('critical')
    })

    it('ignores small changes below threshold', () => {
      const current: PerformanceMetric[] = [
        {
          name: 'build-time',
          value: 61200, // +2% - below 20% threshold
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'page-load-lcp',
          value: 2500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'api-workspace-response',
          value: 500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'bundle-total',
          value: 500000,
          unit: 'bytes',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
      ]

      const regressions = detectRegressions(current, baselineMetrics)

      expect(regressions).toHaveLength(0)
    })

    it('handles missing baseline metrics gracefully', () => {
      const current: PerformanceMetric[] = [
        {
          name: 'new-metric',
          value: 1000,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
      ]

      const regressions = detectRegressions(current, baselineMetrics)

      expect(regressions).toHaveLength(0)
    })
  })

  describe('detectImprovements', () => {
    it('detects when metrics improve', () => {
      const current: PerformanceMetric[] = [
        {
          name: 'build-time',
          value: 48000, // -20% improvement
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'page-load-lcp',
          value: 2500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'api-workspace-response',
          value: 500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'bundle-total',
          value: 500000,
          unit: 'bytes',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
      ]

      const improvements = detectImprovements(current, baselineMetrics)

      expect(improvements).toHaveLength(1)
      expect(improvements[0].metric).toBe('build-time')
      expect(improvements[0].changePercent).toBe(20)
    })

    it('ignores improvements < 5%', () => {
      const current: PerformanceMetric[] = [
        {
          name: 'build-time',
          value: 58800, // -2% - below 5% threshold
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'page-load-lcp',
          value: 2500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'api-workspace-response',
          value: 500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'bundle-total',
          value: 500000,
          unit: 'bytes',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
      ]

      const improvements = detectImprovements(current, baselineMetrics)

      expect(improvements).toHaveLength(0)
    })
  })

  describe('generatePerformanceReport', () => {
    it('generates report with no regressions', () => {
      const current: PerformanceMetric[] = baselineMetrics.map((m) => ({
        ...m,
        timestamp: '2026-07-10T01:00:00Z',
      }))

      const report = generatePerformanceReport(current, baselineMetrics, 'build-123')

      expect(report.buildId).toBe('build-123')
      expect(report.regressionsFound).toBe(0)
      expect(report.summary).toContain('✅')
      expect(report.summary).toContain('stable')
    })

    it('generates report with regressions', () => {
      const current: PerformanceMetric[] = [
        {
          name: 'build-time',
          value: 78000, // +30% regression
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'page-load-lcp',
          value: 2500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'api-workspace-response',
          value: 500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'bundle-total',
          value: 550000, // +10% - above threshold
          unit: 'bytes',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
      ]

      const report = generatePerformanceReport(current, baselineMetrics, 'build-123')

      expect(report.regressionsFound).toBeGreaterThan(0)
      expect(report.summary).toContain('🔴')
    })

    it('includes improvements in report', () => {
      const current: PerformanceMetric[] = [
        {
          name: 'build-time',
          value: 48000, // -20% improvement
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'page-load-lcp',
          value: 2500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'api-workspace-response',
          value: 500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'bundle-total',
          value: 500000,
          unit: 'bytes',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
      ]

      const report = generatePerformanceReport(current, baselineMetrics, 'build-123')

      expect(report.improvements.length).toBeGreaterThan(0)
    })
  })

  describe('formatPerformanceAlert', () => {
    it('formats stable report', () => {
      const current: PerformanceMetric[] = baselineMetrics.map((m) => ({
        ...m,
        timestamp: '2026-07-10T01:00:00Z',
      }))

      const report = generatePerformanceReport(current, baselineMetrics, 'build-123')
      const alert = formatPerformanceAlert(report)

      expect(alert).toContain('✅')
      expect(alert).toContain('stable')
    })

    it('formats regression report', () => {
      const current: PerformanceMetric[] = [
        {
          name: 'build-time',
          value: 78000, // +30% regression
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'page-load-lcp',
          value: 2500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'api-workspace-response',
          value: 500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'bundle-total',
          value: 500000,
          unit: 'bytes',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
      ]

      const report = generatePerformanceReport(current, baselineMetrics, 'build-123')
      const alert = formatPerformanceAlert(report)

      expect(alert).toContain('🔴')
      expect(alert).toContain('Regressions')
    })

    it('includes improvement details', () => {
      const current: PerformanceMetric[] = [
        {
          name: 'build-time',
          value: 48000, // -20% improvement
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'page-load-lcp',
          value: 2500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'api-workspace-response',
          value: 500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'bundle-total',
          value: 500000,
          unit: 'bytes',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
      ]

      const report = generatePerformanceReport(current, baselineMetrics, 'build-123')
      const alert = formatPerformanceAlert(report)

      expect(alert).toContain('Improvements')
      expect(alert).toContain('build-time')
    })
  })

  describe('boundary conditions', () => {
    it('handles exactly at threshold correctly', () => {
      const current: PerformanceMetric[] = [
        {
          name: 'build-time',
          value: 72000, // Exactly +20%
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'page-load-lcp',
          value: 2500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'api-workspace-response',
          value: 500,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
        {
          name: 'bundle-total',
          value: 500000,
          unit: 'bytes',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
      ]

      const regressions = detectRegressions(current, baselineMetrics)

      expect(regressions.length).toBeGreaterThan(0)
    })

    it('handles zero value baseline gracefully', () => {
      const zeroBaseline: PerformanceMetric[] = [
        {
          name: 'test-metric',
          value: 0,
          unit: 'ms',
          timestamp: '2026-07-10T00:00:00Z',
          environment: 'production',
        },
      ]

      const current: PerformanceMetric[] = [
        {
          name: 'test-metric',
          value: 100,
          unit: 'ms',
          timestamp: '2026-07-10T01:00:00Z',
          environment: 'production',
        },
      ]

      // Should not throw, handles division by zero
      const regressions = detectRegressions(current, zeroBaseline)

      expect(Array.isArray(regressions)).toBe(true)
    })
  })
})
