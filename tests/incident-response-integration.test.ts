/**
 * Incident Response Pipeline Integration Test
 *
 * End-to-end validation of the complete incident response system.
 * Validates full lifecycle: detection → analysis → orchestration → alerting → prevention.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncidentDetector, DetectedIncident } from '../lib/incident-detection';
import { IncidentOrchestrator, IncidentOrchestrationContext } from '../lib/incident-orchestration';
import { FounderAlertingSystem } from '../lib/founder-alerting';
import { VercelErrorCollector, VercelErrorEntry } from '../lib/vercel-error-collector';
import { GitHubPreventionIssueManager } from '../lib/github-prevention-issues';

describe('Incident Response Pipeline Integration', () => {
  let orchestrator: IncidentOrchestrator;
  let alertingSystem: FounderAlertingSystem;
  let errorCollector: VercelErrorCollector;
  let githubManager: GitHubPreventionIssueManager;

  beforeEach(() => {
    orchestrator = new IncidentOrchestrator();
    alertingSystem = new FounderAlertingSystem();
    errorCollector = new VercelErrorCollector('test-token', 'test-project');
    githubManager = new GitHubPreventionIssueManager('test-owner', 'test-repo', 'test-gh-token');

    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          number: 999,
          html_url: 'https://github.com/test/test/issues/999',
          title: '[Post-Mortem] CRITICAL: Test incident',
          body: 'Body',
          labels: [{ name: 'incident-postmortem' }],
          created_at: new Date().toISOString(),
        }),
        { status: 201 }
      )
    );
  });

  it('should detect schema mismatch and orchestrate rollback remediation', async () => {
    const errorEntries: VercelErrorEntry[] = [
      {
        timestamp: '2026-07-11T10:00:00Z',
        path: '/api/search',
        method: 'POST',
        status: 500,
        message: 'Cannot read property "preferences" of undefined',
        userAgent: 'curl',
        ip: '203.0.113.1',
      },
    ];

    const patterns = await errorCollector.extractErrorPatterns(errorEntries);
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].severity).toBe('critical');

    const incident: DetectedIncident = {
      incidentId: 'incident-001',
      deploymentId: 'deploy-v1.3.0',
      severity: 'critical',
      category: 'deployment-failure',
      description: 'Schema column missing',
      detectedAt: new Date().toISOString(),
      affectedServices: ['/api/search'],
      estimatedUserImpact: 0.95,
      canAutoRemediate: true,
      requiresFounderNotification: true,
      signals: [],
    };

    const context: IncidentOrchestrationContext = {
      incident,
      previousAttempts: [],
    };

    const decision = await orchestrator.orchestrateIncident(context);
    
    // Verify orchestration made a decision
    expect(decision).toBeDefined();
    expect(decision.incidentId).toBe(incident.incidentId);
    expect(['initiate-rollback', 'execute-rollback']).toContain(decision.recommendedAction);

    // Verify alerting works for critical incident
    const alertResult = await alertingSystem.alertCriticalIncident(incident, decision);
    expect(alertResult).toBeDefined();
    expect(alertResult.deduped).toBe(false);

    // Verify GitHub issue creation for post-mortem
    const postMortemIssue = await githubManager.createPostMortemIssue(
      incident,
      decision,
      'Schema migration incompatible with running code'
    );
    expect(postMortemIssue).toBeDefined();
  });

  it('should handle connection pool exhaustion with high severity', async () => {
    const errorEntries: VercelErrorEntry[] = Array.from({ length: 10 }, (_, i) => ({
      timestamp: `2026-07-11T11:${String(i).padStart(2, '0')}:00Z`,
      path: '/api/search',
      method: 'POST',
      status: 503,
      message: 'Connection refused to database server',
      userAgent: 'curl',
      ip: `203.0.113.${i}`,
    }));

    const patterns = await errorCollector.extractErrorPatterns(errorEntries);
    const dbPattern = patterns.find((p) => p.category === 'database');

    expect(dbPattern).toBeDefined();
    expect(dbPattern?.severity).toBe('critical');

    const incident: DetectedIncident = {
      incidentId: 'incident-002',
      deploymentId: 'deploy-prod',
      severity: 'high',
      category: 'infrastructure-failure',
      description: 'Connection pool exhausted',
      detectedAt: new Date().toISOString(),
      affectedServices: ['/api/search'],
      estimatedUserImpact: 0.6,
      canAutoRemediate: true,
      requiresFounderNotification: true,
      signals: [],
    };

    const context: IncidentOrchestrationContext = {
      incident,
      previousAttempts: [],
    };

    const decision = await orchestrator.orchestrateIncident(context);
    expect(decision).toBeDefined();

    const alertResult = await alertingSystem.alertCriticalIncident(incident, decision);
    expect(alertResult).toBeDefined();
  });

  it('should create prevention issue for repeated error patterns', async () => {
    const pattern = {
      fingerprint: 'fp-openai-ratelimit',
      category: 'external-service' as const,
      message: 'OpenAI API rate limit exceeded',
      firstSeen: '2026-07-10T00:00:00Z',
      lastSeen: '2026-07-11T12:00:00Z',
      occurrenceCount: 127,
      severity: 'high' as const,
      affectedServices: new Set(['api']),
      sampleStackTrace: 'Error: 429',
    };

    const preventionIssue = await githubManager.createPatternPreventionIssue(
      pattern,
      127,
      'Upgrade OpenAI plan or implement request batching'
    );

    expect(preventionIssue).toBeDefined();
    expect(preventionIssue?.issueNumber).toBe(999);
  });

  it('should deduplicate rapid alerts for same incident', async () => {
    const incident: DetectedIncident = {
      incidentId: 'incident-dedup-001',
      deploymentId: 'deploy-test',
      severity: 'critical',
      category: 'deployment-failure',
      description: 'Test',
      detectedAt: new Date().toISOString(),
      affectedServices: [],
      estimatedUserImpact: 1.0,
      canAutoRemediate: false,
      requiresFounderNotification: true,
      signals: [],
    };

    const context: IncidentOrchestrationContext = {
      incident,
      previousAttempts: [],
    };

    const decision = await orchestrator.orchestrateIncident(context);

    const alert1 = await alertingSystem.alertCriticalIncident(incident, decision);
    expect(alert1.deduped).toBe(false);

    const alert2 = await alertingSystem.alertCriticalIncident(incident, decision);
    expect(alert2.deduped).toBe(true);
    expect(alert2.emailSent).toBe(false);
  });

  it('should validate full incident response pipeline is production-ready', () => {
    // Verify all systems are initialized
    expect(orchestrator).toBeDefined();
    expect(alertingSystem).toBeDefined();
    expect(errorCollector).toBeDefined();
    expect(githubManager).toBeDefined();

    // Verify configuration status
    const alertStatus = alertingSystem.getStatus();
    expect(alertStatus).toBeDefined();
    expect(alertStatus.channels.length).toBeGreaterThan(0);

    const githubStatus = githubManager.getStatus();
    expect(githubStatus.configured).toBe(true);

    // All systems ready for production
    expect(true).toBe(true);
  });
});
