import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPostMortem,
  addFinding,
  addActionItem,
  completeAction,
  addParticipant,
  schedulePostMortem,
  startPostMortemSession,
  completePostMortem,
  getPostMortem,
  getPostMortemByIncident,
  getActivePostMortems,
  getPostMortemsByStatus,
  generatePostMortemMetrics,
  formatPostMortemReport,
  resetPostMortemStore,
  getHighImpactTrends,
  type PostMortemSummary,
} from '@/lib/post-mortem';

describe('Post-Mortem Automation', () => {
  beforeEach(() => {
    resetPostMortemStore();
  });

  describe('createPostMortem', () => {
    it('should create post-mortem for resolved incident', () => {
      const summary: PostMortemSummary = {
        title: 'API Deployment Outage - July 10',
        incidentId: 'incident-123',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 45,
        affectedServices: ['api', 'web'],
        affectedUsers: 5000,
        rootCause: 'Database connection pool exhaustion',
        resolution: 'Rolled back to previous stable version',
        preventionSteps: ['Increase connection pool size', 'Add better monitoring'],
      };

      const pm = createPostMortem('incident-123', summary);

      expect(pm.incidentId).toBe('incident-123');
      expect(pm.status).toBe('pending');
      expect(pm.phase).toBe('drafted');
      expect(pm.summary.title).toBe('API Deployment Outage - July 10');
    });

    it('should create post-mortem with scheduled date', () => {
      const summary: PostMortemSummary = {
        title: 'Database Failure',
        incidentId: 'incident-456',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 30,
        affectedServices: ['database'],
        affectedUsers: 10000,
        rootCause: 'Disk space exhaustion',
        resolution: 'Purged old logs',
        preventionSteps: [],
      };

      const scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const pm = createPostMortem('incident-456', summary, scheduledDate);

      expect(pm.status).toBe('scheduled');
      expect(pm.scheduledFor).toBeDefined();
    });
  });

  describe('addFinding', () => {
    it('should add finding to post-mortem', () => {
      const summary: PostMortemSummary = {
        title: 'Outage',
        incidentId: 'incident-123',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 45,
        affectedServices: ['api'],
        affectedUsers: 5000,
        rootCause: 'Pool exhaustion',
        resolution: 'Rollback',
        preventionSteps: [],
      };

      const pm = createPostMortem('incident-123', summary);
      const updated = addFinding(
        pm.id,
        'monitoring-blind-spot',
        'Connection pool not monitored',
        'We did not have alerts on connection pool percentage',
        'high'
      );

      expect(updated?.findings).toHaveLength(1);
      expect(updated?.findings[0].category).toBe('monitoring-blind-spot');
      expect(updated?.findings[0].impact).toBe('high');
    });

    it('should add multiple findings', () => {
      const summary: PostMortemSummary = {
        title: 'Outage',
        incidentId: 'incident-123',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 45,
        affectedServices: ['api'],
        affectedUsers: 5000,
        rootCause: 'Pool exhaustion',
        resolution: 'Rollback',
        preventionSteps: [],
      };

      const pm = createPostMortem('incident-123', summary);

      addFinding(pm.id, 'monitoring-blind-spot', 'No alerts', 'Description 1', 'high');
      addFinding(pm.id, 'process-gap', 'No runbook', 'Description 2', 'medium');
      addFinding(pm.id, 'automation-opportunity', 'Manual recovery', 'Description 3', 'low');

      const updated = getPostMortem(pm.id);

      expect(updated?.findings).toHaveLength(3);
    });
  });

  describe('addActionItem', () => {
    it('should add action item to post-mortem', () => {
      const summary: PostMortemSummary = {
        title: 'Outage',
        incidentId: 'incident-123',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 45,
        affectedServices: ['api'],
        affectedUsers: 5000,
        rootCause: 'Pool exhaustion',
        resolution: 'Rollback',
        preventionSteps: [],
      };

      const pm = createPostMortem('incident-123', summary);
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const updated = addActionItem(pm.id, 'Increase connection pool size', 'Sarah', dueDate);

      expect(updated?.actionItems).toHaveLength(1);
      expect(updated?.actionItems[0].title).toBe('Increase connection pool size');
      expect(updated?.actionItems[0].owner).toBe('Sarah');
      expect(updated?.actionItems[0].completed).toBe(false);
    });
  });

  describe('completeAction', () => {
    it('should mark action as completed', () => {
      const summary: PostMortemSummary = {
        title: 'Outage',
        incidentId: 'incident-123',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 45,
        affectedServices: ['api'],
        affectedUsers: 5000,
        rootCause: 'Pool exhaustion',
        resolution: 'Rollback',
        preventionSteps: [],
      };

      const pm = createPostMortem('incident-123', summary);
      addActionItem(pm.id, 'Update monitoring rules', 'Sarah');

      const updated = getPostMortem(pm.id)!;
      const actionId = updated.actionItems[0].id;

      completeAction(pm.id, actionId);

      const final = getPostMortem(pm.id)!;
      expect(final.actionItems[0].completed).toBe(true);
    });
  });

  describe('addParticipant', () => {
    it('should add participant to post-mortem', () => {
      const summary: PostMortemSummary = {
        title: 'Outage',
        incidentId: 'incident-123',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 45,
        affectedServices: ['api'],
        affectedUsers: 5000,
        rootCause: 'Pool exhaustion',
        resolution: 'Rollback',
        preventionSteps: [],
      };

      const pm = createPostMortem('incident-123', summary);

      addParticipant(pm.id, 'Sarah', 'Engineering Lead', 'sarah@example.com');
      addParticipant(pm.id, 'John', 'On-call Engineer', 'john@example.com');

      const updated = getPostMortem(pm.id);

      expect(updated?.participants).toHaveLength(2);
    });

    it('should avoid duplicate participants', () => {
      const summary: PostMortemSummary = {
        title: 'Outage',
        incidentId: 'incident-123',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 45,
        affectedServices: ['api'],
        affectedUsers: 5000,
        rootCause: 'Pool exhaustion',
        resolution: 'Rollback',
        preventionSteps: [],
      };

      const pm = createPostMortem('incident-123', summary);

      addParticipant(pm.id, 'Sarah', 'Engineering Lead', 'sarah@example.com');
      addParticipant(pm.id, 'Sarah Different', 'Different Role', 'sarah@example.com');

      const updated = getPostMortem(pm.id);

      expect(updated?.participants).toHaveLength(1);
    });
  });

  describe('schedulePostMortem', () => {
    it('should schedule post-mortem meeting', () => {
      const summary: PostMortemSummary = {
        title: 'Outage',
        incidentId: 'incident-123',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 45,
        affectedServices: ['api'],
        affectedUsers: 5000,
        rootCause: 'Pool exhaustion',
        resolution: 'Rollback',
        preventionSteps: [],
      };

      const pm = createPostMortem('incident-123', summary);
      const scheduleDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const updated = schedulePostMortem(pm.id, scheduleDate);

      expect(updated?.status).toBe('scheduled');
      expect(updated?.scheduledFor).toBeDefined();
    });
  });

  describe('startPostMortemSession', () => {
    it('should start post-mortem session', () => {
      const summary: PostMortemSummary = {
        title: 'Outage',
        incidentId: 'incident-123',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 45,
        affectedServices: ['api'],
        affectedUsers: 5000,
        rootCause: 'Pool exhaustion',
        resolution: 'Rollback',
        preventionSteps: [],
      };

      const pm = createPostMortem('incident-123', summary);
      const updated = startPostMortemSession(pm.id);

      expect(updated?.status).toBe('in-progress');
      expect(updated?.phase).toBe('in-progress');
    });
  });

  describe('completePostMortem', () => {
    it('should complete post-mortem', () => {
      const summary: PostMortemSummary = {
        title: 'Outage',
        incidentId: 'incident-123',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 45,
        affectedServices: ['api'],
        affectedUsers: 5000,
        rootCause: 'Pool exhaustion',
        resolution: 'Rollback',
        preventionSteps: [],
      };

      const pm = createPostMortem('incident-123', summary);
      const completed = completePostMortem(pm.id, 'Session completed successfully with all findings documented');

      expect(completed?.status).toBe('completed');
      expect(completed?.phase).toBe('completed');
      expect(completed?.completedAt).toBeDefined();
    });
  });

  describe('getPostMortemByIncident', () => {
    it('should retrieve post-mortem by incident ID', () => {
      const summary: PostMortemSummary = {
        title: 'Outage',
        incidentId: 'incident-123',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 45,
        affectedServices: ['api'],
        affectedUsers: 5000,
        rootCause: 'Pool exhaustion',
        resolution: 'Rollback',
        preventionSteps: [],
      };

      createPostMortem('incident-123', summary);

      const retrieved = getPostMortemByIncident('incident-123');

      expect(retrieved).toBeDefined();
      expect(retrieved?.incidentId).toBe('incident-123');
    });
  });

  describe('getActivePostMortems', () => {
    it('should retrieve all active post-mortems sorted by date', () => {
      const summary1: PostMortemSummary = {
        title: 'Outage 1',
        incidentId: 'incident-123',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        severity: 'critical',
        duration: 45,
        affectedServices: ['api'],
        affectedUsers: 5000,
        rootCause: 'Pool exhaustion',
        resolution: 'Rollback',
        preventionSteps: [],
      };

      const summary2: PostMortemSummary = {
        title: 'Outage 2',
        incidentId: 'incident-456',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 30,
        affectedServices: ['database'],
        affectedUsers: 10000,
        rootCause: 'Disk space',
        resolution: 'Purge logs',
        preventionSteps: [],
      };

      createPostMortem('incident-123', summary1);
      // Add small delay to ensure different creation times
      const start = Date.now();
      while (Date.now() - start < 10) {} // ~10ms delay
      createPostMortem('incident-456', summary2);

      const active = getActivePostMortems();

      expect(active).toHaveLength(2);
      // Most recent (incident-456) should be first since it was created second
      const incidentIds = active.map((pm) => pm.incidentId);
      expect(incidentIds).toEqual(['incident-456', 'incident-123']);
    });
  });

  describe('getPostMortemsByStatus', () => {
    it('should retrieve post-mortems by status', () => {
      const summary1: PostMortemSummary = {
        title: 'Scheduled',
        incidentId: 'incident-123',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 45,
        affectedServices: ['api'],
        affectedUsers: 5000,
        rootCause: 'Pool exhaustion',
        resolution: 'Rollback',
        preventionSteps: [],
      };

      const summary2: PostMortemSummary = {
        title: 'In Progress',
        incidentId: 'incident-456',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 30,
        affectedServices: ['database'],
        affectedUsers: 10000,
        rootCause: 'Disk space',
        resolution: 'Purge logs',
        preventionSteps: [],
      };

      const pm1 = createPostMortem('incident-123', summary1);
      const pm2 = createPostMortem('incident-456', summary2);

      schedulePostMortem(pm1.id, new Date());
      startPostMortemSession(pm2.id);

      const scheduled = getPostMortemsByStatus('scheduled');
      const inProgress = getPostMortemsByStatus('in-progress');

      expect(scheduled).toHaveLength(1);
      expect(inProgress).toHaveLength(1);
    });
  });

  describe('generatePostMortemMetrics', () => {
    it('should calculate post-mortem metrics', () => {
      const summary: PostMortemSummary = {
        title: 'Outage',
        incidentId: 'incident-123',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 45,
        affectedServices: ['api'],
        affectedUsers: 5000,
        rootCause: 'Pool exhaustion',
        resolution: 'Rollback',
        preventionSteps: [],
      };

      const pm = createPostMortem('incident-123', summary);

      addFinding(pm.id, 'root-cause', 'Found root cause', 'Pool exhaustion', 'high');
      addFinding(pm.id, 'process-gap', 'No runbook', 'Missing procedures', 'high');
      addFinding(pm.id, 'monitoring-blind-spot', 'No alerts', 'No monitoring', 'medium');

      addActionItem(pm.id, 'Action 1');
      addActionItem(pm.id, 'Action 2');

      completePostMortem(pm.id, 'Completed');

      const metrics = generatePostMortemMetrics();

      expect(metrics.totalPostMortems).toBe(1);
      expect(metrics.completedPostMortems).toBe(1);
      expect(metrics.completionRate).toBe(100);
      expect(metrics.highImpactFindings).toBe(2);
      expect(metrics.avgActionsPerIncident).toBe(2);
    });
  });

  describe('formatPostMortemReport', () => {
    it('should format post-mortem as markdown', () => {
      const summary: PostMortemSummary = {
        title: 'API Deployment Outage',
        incidentId: 'incident-123',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 45,
        affectedServices: ['api', 'web'],
        affectedUsers: 5000,
        rootCause: 'Database connection pool exhaustion',
        resolution: 'Rolled back to previous stable version',
        preventionSteps: [
          'Increase connection pool size from 50 to 100',
          'Add connection pool monitoring alerts',
        ],
      };

      const pm = createPostMortem('incident-123', summary);

      addFinding(
        pm.id,
        'monitoring-blind-spot',
        'Connection pool not monitored',
        'No alerts on connection pool percentage',
        'high'
      );

      addActionItem(pm.id, 'Update monitoring rules', 'Sarah');
      addParticipant(pm.id, 'Sarah', 'Engineering Lead', 'sarah@example.com');

      const report = formatPostMortemReport(pm);

      expect(report).toContain('Post-Mortem Report');
      expect(report).toContain('API Deployment Outage');
      expect(report).toContain('Root Cause');
      expect(report).toContain('Database connection pool exhaustion');
      expect(report).toContain('Key Findings');
      expect(report).toContain('Connection pool not monitored');
      expect(report).toContain('Action Items');
      expect(report).toContain('Update monitoring rules');
      expect(report).toContain('Participants');
      expect(report).toContain('Sarah');
    });
  });

  describe('getHighImpactTrends', () => {
    it('should identify high-impact finding trends', () => {
      const summary1: PostMortemSummary = {
        title: 'Outage 1',
        incidentId: 'incident-123',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 45,
        affectedServices: ['api'],
        affectedUsers: 5000,
        rootCause: 'Pool exhaustion',
        resolution: 'Rollback',
        preventionSteps: [],
      };

      const summary2: PostMortemSummary = {
        title: 'Outage 2',
        incidentId: 'incident-456',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 30,
        affectedServices: ['database'],
        affectedUsers: 10000,
        rootCause: 'Disk space',
        resolution: 'Purge logs',
        preventionSteps: [],
      };

      const pm1 = createPostMortem('incident-123', summary1);
      const pm2 = createPostMortem('incident-456', summary2);

      addFinding(pm1.id, 'monitoring-blind-spot', 'Issue 1', 'Desc', 'high');
      addFinding(pm1.id, 'monitoring-blind-spot', 'Issue 2', 'Desc', 'high');

      addFinding(pm2.id, 'monitoring-blind-spot', 'Issue 3', 'Desc', 'high');
      addFinding(pm2.id, 'process-gap', 'Issue 4', 'Desc', 'high');

      completePostMortem(pm1.id, 'Done');
      completePostMortem(pm2.id, 'Done');

      const trends = getHighImpactTrends();

      expect(trends.length).toBeGreaterThan(0);
      expect(trends[0].category).toBe('monitoring-blind-spot');
      expect(trends[0].count).toBe(3);
    });
  });

  describe('integration: full post-mortem lifecycle', () => {
    it('should handle complete post-mortem workflow', () => {
      const summary: PostMortemSummary = {
        title: 'Critical Database Outage - July 10, 2026',
        incidentId: 'incident-123',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        duration: 45,
        affectedServices: ['api', 'database', 'web'],
        affectedUsers: 8500,
        rootCause: 'Database connection pool exhaustion due to memory leak in new query handler',
        resolution: 'Rolled back to v1.2.3, memory leak fixed in v1.2.4',
        preventionSteps: [
          'Increase connection pool monitoring',
          'Add automatic pool reset on threshold',
          'Implement query performance regression testing',
        ],
      };

      // Create post-mortem
      const pm = createPostMortem('incident-123', summary);
      expect(pm.status).toBe('pending');

      // Schedule meeting
      const meetingDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      schedulePostMortem(pm.id, meetingDate);
      expect(getPostMortem(pm.id)?.status).toBe('scheduled');

      // Add findings
      addFinding(pm.id, 'monitoring-blind-spot', 'No connection pool alerts', 'Missing monitoring', 'high');
      addFinding(pm.id, 'process-gap', 'No query performance test', 'Missing regression tests', 'high');
      addFinding(pm.id, 'automation-opportunity', 'Manual restart required', 'Could be automated', 'medium');

      // Add action items
      addActionItem(pm.id, 'Increase pool monitoring', 'Sarah', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      addActionItem(pm.id, 'Add regression tests', 'John', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));

      // Add participants
      addParticipant(pm.id, 'Sarah', 'Infrastructure Lead', 'sarah@example.com');
      addParticipant(pm.id, 'John', 'Engineering Manager', 'john@example.com');

      // Start session
      startPostMortemSession(pm.id);
      expect(getPostMortem(pm.id)?.status).toBe('in-progress');

      // Complete action item
      const updated = getPostMortem(pm.id)!;
      completeAction(pm.id, updated.actionItems[0].id);

      // Complete post-mortem
      completePostMortem(pm.id, 'Comprehensive review completed. All findings documented. Action items assigned.');

      // Verify metrics
      const metrics = generatePostMortemMetrics();
      expect(metrics.completedPostMortems).toBe(1);
      expect(metrics.highImpactFindings).toBe(2);

      // Get trends
      const trends = getHighImpactTrends();
      expect(trends.length).toBeGreaterThan(0);
    });
  });
});
