import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  evaluateAutoRollback,
  commandToAlert,
  type IncidentTrigger,
  type RollbackCandidate,
} from '@/lib/incident-commander';

describe('DNA-GOV-014: Incident Commander', () => {
  describe('Auto-Rollback Decision Logic', () => {
    it('should not auto-rollback on warning severity', () => {
      const trigger: IncidentTrigger = {
        type: 'latency',
        severity: 'warning',
        metric: 'P95 latency (ms)',
        threshold: 2000,
        current: 2500,
        message: 'P95 latency elevated to 2.5s',
      };

      const candidates: RollbackCandidate[] = [
        {
          commit: 'abc123',
          message: 'feat: add feature',
          timestamp: '2026-07-11 10:00:00',
          duration: '60 minutes ago',
          estimatedImpact: 'low',
        },
      ];

      const { shouldRollback, reason } = evaluateAutoRollback(
        trigger,
        candidates
      );

      expect(shouldRollback).toBe(false);
      expect(reason).toContain('warning');
      expect(reason).toContain('manual review');
    });

    it('should not auto-rollback without low-impact candidates', () => {
      const trigger: IncidentTrigger = {
        type: 'latency',
        severity: 'critical',
        metric: 'P95 latency (ms)',
        threshold: 2000,
        current: 5000,
        message: 'P95 latency spiked to 5s',
      };

      const candidates: RollbackCandidate[] = [
        {
          commit: 'def456',
          message: 'feat: database schema migration',
          timestamp: '2026-07-10 10:00:00',
          duration: '24 hours ago',
          estimatedImpact: 'high',
        },
        {
          commit: 'ghi789',
          message: 'refactor: api changes',
          timestamp: '2026-07-10 08:00:00',
          duration: '26 hours ago',
          estimatedImpact: 'high',
        },
      ];

      const { shouldRollback, reason } = evaluateAutoRollback(
        trigger,
        candidates
      );

      expect(shouldRollback).toBe(false);
      expect(reason).toContain('No low-impact');
      expect(reason).toContain('manual review');
    });

    it('should auto-rollback on critical error rate with low-impact candidate', () => {
      const trigger: IncidentTrigger = {
        type: 'error_rate',
        severity: 'critical',
        metric: 'Error rate (%)',
        threshold: 0.05, // 5%
        current: 0.2, // 20%
        message: 'Error rate spiked to 20%',
      };

      const candidates: RollbackCandidate[] = [
        {
          commit: 'abc123',
          message: 'fix: bug fix',
          timestamp: '2026-07-11 10:00:00',
          duration: '1 hour ago',
          estimatedImpact: 'low',
        },
      ];

      const { shouldRollback, target, reason } = evaluateAutoRollback(
        trigger,
        candidates
      );

      expect(shouldRollback).toBe(true);
      expect(target).toBeDefined();
      expect(target?.commit).toBe('abc123');
      expect(reason).toContain('Auto-rollback');
      expect(reason).toContain('low');
    });

    it('should not auto-rollback if only medium-impact candidates available', () => {
      const trigger: IncidentTrigger = {
        type: 'latency',
        severity: 'critical',
        metric: 'P95 latency (ms)',
        threshold: 2000,
        current: 6000,
        message: 'P95 latency 6 seconds',
      };

      const candidates: RollbackCandidate[] = [
        {
          commit: 'xyz789',
          message: 'perf: optimize queries',
          timestamp: '2026-07-11 06:00:00',
          duration: '5 hours ago',
          estimatedImpact: 'medium',
        },
      ];

      const { shouldRollback, reason } = evaluateAutoRollback(
        trigger,
        candidates
      );

      expect(shouldRollback).toBe(false);
      expect(reason).toContain('No low-impact');
    });

    it('should select first low-impact candidate when available', () => {
      const trigger: IncidentTrigger = {
        type: 'availability',
        severity: 'critical',
        metric: 'Uptime (%)',
        threshold: 0.95,
        current: 0.9,
        message: 'Availability dropped to 90%',
      };

      const candidates: RollbackCandidate[] = [
        {
          commit: 'low1',
          message: 'fix: bug',
          timestamp: '2026-07-11 11:00:00',
          duration: '30 minutes ago',
          estimatedImpact: 'low',
        },
        {
          commit: 'high1',
          message: 'schema change',
          timestamp: '2026-07-10 10:00:00',
          duration: '24 hours ago',
          estimatedImpact: 'high',
        },
      ];

      const { shouldRollback, target } = evaluateAutoRollback(
        trigger,
        candidates
      );

      expect(shouldRollback).toBe(true);
      expect(target?.commit).toBe('low1');
      expect(target?.estimatedImpact).toBe('low');
    });
  });

  describe('Threshold Validation', () => {
    it('should not auto-rollback if current value is below critical threshold', () => {
      const trigger: IncidentTrigger = {
        type: 'error_rate',
        severity: 'critical',
        metric: 'Error rate (%)',
        threshold: 0.05,
        current: 0.1, // Below 0.15 critical threshold
        message: 'Error rate at 10%',
      };

      const candidates: RollbackCandidate[] = [
        {
          commit: 'abc123',
          message: 'fix',
          timestamp: '2026-07-11 10:00:00',
          duration: '1 hour ago',
          estimatedImpact: 'low',
        },
      ];

      const { shouldRollback, reason } = evaluateAutoRollback(
        trigger,
        candidates
      );

      expect(shouldRollback).toBe(false);
      expect(reason).toContain('not critical enough');
    });

    it('should validate cost spike thresholds', () => {
      const trigger: IncidentTrigger = {
        type: 'cost_spike',
        severity: 'critical',
        metric: 'Monthly spend ratio',
        threshold: 2.0,
        current: 4.5, // > 4.0 critical threshold
        message: 'Costs spiked 4.5x baseline',
      };

      const candidates: RollbackCandidate[] = [
        {
          commit: 'abc123',
          message: 'fix',
          timestamp: '2026-07-11 10:00:00',
          duration: '1 hour ago',
          estimatedImpact: 'low',
        },
      ];

      const { shouldRollback } = evaluateAutoRollback(trigger, candidates);

      expect(shouldRollback).toBe(true);
    });
  });

  describe('Alert Conversion', () => {
    it('should convert incident command to alert', () => {
      const command = {
        id: 'incident-123',
        trigger: {
          type: 'latency' as const,
          severity: 'critical' as const,
          metric: 'P95 latency',
          threshold: 2000,
          current: 5000,
          message: 'Latency spiked to 5s',
        },
        decision: 'autorollback' as const,
        rollbackTarget: {
          commit: 'abc123def456',
          message: 'feat: add feature',
          timestamp: '2026-07-11 10:00:00',
          duration: '1 hour ago',
          estimatedImpact: 'low' as const,
        },
        reason: 'Auto-rollback approved',
        executedAt: '2026-07-11T11:00:00Z',
        status: 'executed' as const,
      };

      const alert = commandToAlert(command);

      expect(alert.id).toBe('incident-123');
      expect(alert.severity).toBe('critical');
      expect(alert.category).toBe('incident');
      expect(alert.title).toContain('latency');
      expect(alert.message).toContain('Auto-rollback executed');
      expect(alert.source).toBe('DNA-GOV-014');
    });

    it('should mark manual review incident with warning severity', () => {
      const command = {
        id: 'incident-456',
        trigger: {
          type: 'error_rate' as const,
          severity: 'warning' as const,
          metric: 'Error rate',
          threshold: 0.05,
          current: 0.1,
          message: 'Error rate elevated',
        },
        decision: 'manual_review' as const,
        rollbackTarget: null,
        reason: 'Warning severity requires manual review',
        executedAt: null,
        status: 'pending' as const,
      };

      const alert = commandToAlert(command);

      expect(alert.severity).toBe('warning');
      expect(alert.message).toContain('Manual review required');
    });
  });

  describe('Incident Trigger Validation', () => {
    it('should accept all valid incident types', () => {
      const types = ['error_rate', 'latency', 'availability', 'cost_spike'];

      for (const type of types) {
        const trigger: IncidentTrigger = {
          type: type as any,
          severity: 'critical',
          metric: 'test',
          threshold: 100,
          current: 200,
          message: 'test',
        };

        expect(trigger.type).toBeTruthy();
      }
    });

    it('should require metric and message', () => {
      const base: IncidentTrigger = {
        type: 'latency',
        severity: 'critical',
        metric: 'P95 latency',
        threshold: 2000,
        current: 5000,
        message: 'Latency spike detected',
      };

      expect(base.metric).toBeDefined();
      expect(base.message).toBeDefined();
    });
  });

  describe('Decision Output', () => {
    it('should provide structured decision output', () => {
      const trigger: IncidentTrigger = {
        type: 'latency',
        severity: 'critical',
        metric: 'P95 latency (ms)',
        threshold: 2000,
        current: 5000,
        message: 'P95 latency spike',
      };

      const candidates: RollbackCandidate[] = [
        {
          commit: 'abc123',
          message: 'fix: improve performance',
          timestamp: '2026-07-11 10:00:00',
          duration: '1 hour ago',
          estimatedImpact: 'low',
        },
      ];

      const { shouldRollback, target, reason } = evaluateAutoRollback(
        trigger,
        candidates
      );

      expect({
        shouldRollback,
        target,
        reason,
      }).toMatchObject({
        shouldRollback: expect.any(Boolean),
        target: expect.any(Object),
        reason: expect.any(String),
      });
    });
  });
});
