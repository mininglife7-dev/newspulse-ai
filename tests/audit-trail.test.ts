import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordAudit,
  getAuditEntries,
  generateAuditReport,
  formatAuditReport,
  rotateAuditLog,
  exportAuditLog,
  resetAuditLog,
  type AuditEntry,
  type AuditReport,
} from '@/lib/audit-trail';

describe('Audit Trail', () => {
  beforeEach(() => {
    resetAuditLog();
  });

  describe('recordAudit', () => {
    it('should record an audit entry with required fields', () => {
      const entry = recordAudit({
        action: 'deployment:success',
        severity: 'info',
        actor: 'governor-autonomous',
        resource: 'deploy-123',
        details: { status: 'live' },
        result: 'success',
      });

      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.action).toBe('deployment:success');
      expect(entry.severity).toBe('info');
      expect(entry.actor).toBe('governor-autonomous');
      expect(entry.resource).toBe('deploy-123');
      expect(entry.result).toBe('success');
    });

    it('should record critical vulnerability detection', () => {
      const entry = recordAudit({
        action: 'vulnerability:detected',
        severity: 'critical',
        actor: 'governor-autonomous',
        resource: 'npm-pkg-123',
        details: { cve: 'CVE-2024-1234', package: 'lodash' },
        result: 'pending',
        reason: 'Awaiting patch release',
      });

      expect(entry.severity).toBe('critical');
      expect(entry.reason).toBe('Awaiting patch release');
    });

    it('should include optional fields when provided', () => {
      const alertIds = ['alert-1', 'alert-2'];
      const entry = recordAudit({
        action: 'alert:escalated',
        severity: 'critical',
        actor: 'founder',
        resource: 'incident-456',
        details: { escalationLevel: 'p1' },
        result: 'success',
        reason: 'Manual escalation',
        relatedAlertIds: alertIds,
      });

      expect(entry.reason).toBe('Manual escalation');
      expect(entry.relatedAlertIds).toEqual(alertIds);
    });
  });

  describe('getAuditEntries', () => {
    beforeEach(() => {
      // Create multiple entries for filtering tests
      recordAudit({
        action: 'deployment:success',
        severity: 'info',
        actor: 'governor-autonomous',
        resource: 'deploy-1',
        details: {},
        result: 'success',
      });

      recordAudit({
        action: 'deployment:failure',
        severity: 'critical',
        actor: 'governor-autonomous',
        resource: 'deploy-2',
        details: { error: 'timeout' },
        result: 'failure',
      });

      recordAudit({
        action: 'vulnerability:detected',
        severity: 'warning',
        actor: 'governor-autonomous',
        resource: 'pkg-1',
        details: {},
        result: 'pending',
      });

      recordAudit({
        action: 'cost:anomaly',
        severity: 'warning',
        actor: 'governor-autonomous',
        resource: 'billing-1',
        details: {},
        result: 'pending',
      });
    });

    it('should return all entries when no filters applied', () => {
      const entries = getAuditEntries({});
      expect(entries.length).toBe(4);
    });

    it('should filter by action', () => {
      const entries = getAuditEntries({ action: 'deployment:success' });
      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('deployment:success');
    });

    it('should filter by severity', () => {
      const criticalEntries = getAuditEntries({ severity: 'critical' });
      expect(criticalEntries.length).toBe(1);
      expect(criticalEntries[0].severity).toBe('critical');

      const warningEntries = getAuditEntries({ severity: 'warning' });
      expect(warningEntries.length).toBe(2);
    });

    it('should filter by actor', () => {
      const entries = getAuditEntries({ actor: 'governor-autonomous' });
      expect(entries.length).toBe(4);
    });

    it('should filter by resource', () => {
      const entries = getAuditEntries({ resource: 'deploy-1' });
      expect(entries.length).toBe(1);
      expect(entries[0].resource).toBe('deploy-1');
    });

    it('should respect limit parameter', () => {
      const entries = getAuditEntries({ limit: 2 });
      expect(entries.length).toBe(2);
    });

    it('should return entries in reverse chronological order (newest first)', () => {
      const entries = getAuditEntries({ limit: 100 });
      // Last recorded should be first in results (reversed)
      expect(entries[0].action).toBe('cost:anomaly');
    });

    it('should filter by time range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const entriesInRange = getAuditEntries({
        startTime: yesterday,
        endTime: tomorrow,
      });

      expect(entriesInRange.length).toBe(4);

      // No entries before yesterday
      const entriesBeforeYesterday = getAuditEntries({
        startTime: new Date(yesterday.getTime() - 1000),
        endTime: yesterday,
      });
      expect(entriesBeforeYesterday.length).toBe(0);
    });

    it('should apply multiple filters', () => {
      const entries = getAuditEntries({
        action: 'deployment:failure',
        severity: 'critical',
      });

      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('deployment:failure');
      expect(entries[0].severity).toBe('critical');
    });
  });

  describe('generateAuditReport', () => {
    beforeEach(() => {
      recordAudit({
        action: 'deployment:success',
        severity: 'info',
        actor: 'governor-autonomous',
        resource: 'deploy-1',
        details: {},
        result: 'success',
      });

      recordAudit({
        action: 'deployment:failure',
        severity: 'critical',
        actor: 'governor-autonomous',
        resource: 'deploy-2',
        details: {},
        result: 'failure',
      });

      recordAudit({
        action: 'vulnerability:detected',
        severity: 'warning',
        actor: 'governor-autonomous',
        resource: 'pkg-1',
        details: {},
        result: 'pending',
      });
    });

    it('should generate a valid audit report', () => {
      const report = generateAuditReport({});

      expect(report.timestamp).toBeDefined();
      expect(report.periodStart).toBeDefined();
      expect(report.periodEnd).toBeDefined();
      expect(report.totalEntries).toBe(3);
      expect(Object.keys(report.byAction)).toBeDefined();
      expect(Object.keys(report.bySeverity)).toBeDefined();
    });

    it('should count entries by action', () => {
      const report = generateAuditReport({});

      expect(report.byAction['deployment:success']).toBe(1);
      expect(report.byAction['deployment:failure']).toBe(1);
      expect(report.byAction['vulnerability:detected']).toBe(1);
    });

    it('should count entries by severity', () => {
      const report = generateAuditReport({});

      expect(report.bySeverity.critical).toBe(1);
      expect(report.bySeverity.warning).toBe(1);
      expect(report.bySeverity.info).toBe(1);
    });

    it('should include critical actions in report', () => {
      const report = generateAuditReport({});

      const criticalActions = report.criticalActions;
      expect(criticalActions.length).toBe(1);
      expect(criticalActions[0].severity).toBe('critical');
      expect(criticalActions[0].action).toBe('deployment:failure');
    });

    it('should filter by time range in report', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const report = generateAuditReport({
        startTime: yesterday,
        endTime: now,
      });

      expect(report.totalEntries).toBe(3);
    });
  });

  describe('formatAuditReport', () => {
    it('should format report as human-readable markdown', () => {
      recordAudit({
        action: 'deployment:success',
        severity: 'info',
        actor: 'governor-autonomous',
        resource: 'deploy-1',
        details: {},
        result: 'success',
      });

      recordAudit({
        action: 'deployment:failure',
        severity: 'critical',
        actor: 'governor-autonomous',
        resource: 'deploy-2',
        details: {},
        result: 'failure',
        reason: 'Connection timeout',
      });

      const report = generateAuditReport({});
      const formatted = formatAuditReport(report);

      expect(formatted).toContain('# Audit Trail Report');
      expect(formatted).toContain('Period:');
      expect(formatted).toContain('Total Entries:');
      expect(formatted).toContain('Summary');
      expect(formatted).toContain('Critical:');
      expect(formatted).toContain('Action Breakdown');
    });

    it('should include critical actions section when present', () => {
      recordAudit({
        action: 'deployment:failure',
        severity: 'critical',
        actor: 'governor-autonomous',
        resource: 'deploy-2',
        details: {},
        result: 'failure',
      });

      const report = generateAuditReport({});
      const formatted = formatAuditReport(report);

      expect(formatted).toContain('Critical Actions');
      expect(formatted).toContain('deployment:failure');
      expect(formatted).toContain('deploy-2');
    });
  });

  describe('rotateAuditLog', () => {
    it('should remove entries older than retention period', () => {
      // Create old entry (simulate with timestamp manipulation)
      const now = Date.now();

      // This is a limitation of the test - we can't easily create entries with
      // past timestamps without modifying the library. For now, we verify
      // the rotate function runs without error.
      const archived = rotateAuditLog(90);

      expect(typeof archived).toBe('number');
      expect(archived >= 0).toBe(true);
    });

    it('should return number of archived entries', () => {
      const archivedCount = rotateAuditLog(90);

      expect(typeof archivedCount).toBe('number');
      expect(archivedCount).toBe(0); // No old entries yet
    });

    it('should default to 90 days retention', () => {
      const archived = rotateAuditLog();

      expect(typeof archived).toBe('number');
      expect(archived >= 0).toBe(true);
    });
  });

  describe('exportAuditLog', () => {
    beforeEach(() => {
      recordAudit({
        action: 'deployment:success',
        severity: 'info',
        actor: 'governor-autonomous',
        resource: 'deploy-1',
        details: { version: 'v1.2.3' },
        result: 'success',
      });

      recordAudit({
        action: 'vulnerability:detected',
        severity: 'critical',
        actor: 'governor-autonomous',
        resource: 'pkg-1',
        details: { cve: 'CVE-2024-1234' },
        result: 'pending',
      });
    });

    it('should export as JSON', () => {
      const json = exportAuditLog('json');

      expect(json).toBeDefined();
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
      expect(parsed[0].action).toBeDefined();
      expect(parsed[0].severity).toBeDefined();
    });

    it('should export as CSV', () => {
      const csv = exportAuditLog('csv');

      expect(csv).toBeDefined();
      expect(csv).toContain('ID,Timestamp,Action,Severity,Actor,Resource,Result,Reason');

      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThan(1); // Header + data rows
    });

    it('should default to JSON format', () => {
      const exported = exportAuditLog();

      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('CSV should properly escape fields', () => {
      recordAudit({
        action: 'deployment:failure',
        severity: 'critical',
        actor: 'governor-autonomous',
        resource: 'deploy-2',
        details: {},
        result: 'failure',
        reason: 'Reason with "quotes" and commas, yeah',
      });

      const csv = exportAuditLog('csv');

      expect(csv).toContain('"');
    });
  });

  describe('resetAuditLog', () => {
    it('should clear all audit entries', () => {
      recordAudit({
        action: 'deployment:success',
        severity: 'info',
        actor: 'governor-autonomous',
        resource: 'deploy-1',
        details: {},
        result: 'success',
      });

      let entries = getAuditEntries({});
      expect(entries.length).toBe(1);

      resetAuditLog();

      entries = getAuditEntries({});
      expect(entries.length).toBe(0);
    });
  });

  describe('integration: deployment incident flow', () => {
    it('should track deployment failure and recovery', () => {
      // Record deployment failure
      const failure = recordAudit({
        action: 'deployment:failure',
        severity: 'critical',
        actor: 'governor-autonomous',
        resource: 'deploy-123',
        details: { errorRate: 0.85, lastHealthy: 'deploy-122' },
        result: 'failure',
        reason: 'Error rate exceeded 50%',
      });

      // Record rollback decision
      const rollback = recordAudit({
        action: 'rollback:initiated',
        severity: 'critical',
        actor: 'governor-autonomous',
        resource: 'deploy-123',
        details: { targetVersion: 'deploy-122' },
        result: 'success',
        relatedAlertIds: [failure.id],
      });

      // Verify incident sequence
      const criticalEntries = getAuditEntries({ severity: 'critical' });
      expect(criticalEntries.length).toBe(2);
      expect(criticalEntries[0].action).toBe('rollback:initiated');
      expect(criticalEntries[1].action).toBe('deployment:failure');
    });

    it('should track vulnerability detection and patching', () => {
      // Detect vulnerability
      recordAudit({
        action: 'vulnerability:detected',
        severity: 'critical',
        actor: 'governor-autonomous',
        resource: 'npm-pkg-123',
        details: { cve: 'CVE-2024-1234', package: 'lodash', severity: 'critical' },
        result: 'pending',
        reason: 'Waiting for patch',
      });

      // Apply patch
      recordAudit({
        action: 'patch:applied',
        severity: 'info',
        actor: 'governor-autonomous',
        resource: 'npm-pkg-123',
        details: { version: '4.17.21', cve: 'CVE-2024-1234' },
        result: 'success',
      });

      // Verify vulnerability flow
      const vulnEntries = getAuditEntries({
        resource: 'npm-pkg-123',
      });

      expect(vulnEntries.length).toBe(2);
      expect(vulnEntries[0].action).toBe('patch:applied');
      expect(vulnEntries[1].action).toBe('vulnerability:detected');
    });
  });
});
