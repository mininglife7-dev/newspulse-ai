import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GitHubPreventionIssueManager,
  getGitHubPreventionIssueManager,
  PreventionIssue,
} from '../lib/github-prevention-issues';
import { DetectedIncident } from '../lib/incident-detection';
import { OrchestrationDecision } from '../lib/incident-orchestration';
import { ErrorPattern } from '../lib/error-tracking';

describe('DNS-022: GitHub Prevention Issues', () => {
  let manager: GitHubPreventionIssueManager;

  const mockIncident: DetectedIncident = {
    incidentId: 'incident-001',
    deploymentId: 'deploy-001',
    severity: 'critical',
    category: 'deployment-failure',
    description: 'Database schema mismatch detected',
    detectedAt: new Date().toISOString(),
    affectedServices: ['/api/search', '/api/history'],
    estimatedUserImpact: 0.8,
    canAutoRemediate: false,
    requiresFounderNotification: true,
    signals: [],
  };

  const mockDecision: OrchestrationDecision = {
    incidentId: 'incident-001',
    deploymentId: 'deploy-001',
    currentState: 'analyzing',
    recommendedAction: 'execute-rollback',
    shouldEscalateToFounder: true,
    reason: 'Critical schema mismatch requires manual verification',
    evidence: ['Column preferences does not exist'],
    estimatedRecoveryTime: 120,
    riskOfAction: 'low',
    timestamp: new Date().toISOString(),
  };

  const mockPattern: ErrorPattern = {
    fingerprint: 'fp-db-connection-001',
    category: 'database',
    message: 'Database connection refused',
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    occurrenceCount: 42,
    severity: 'critical',
    affectedServices: new Set(['api', 'worker']),
    sampleStackTrace: 'Error: ECONNREFUSED 127.0.0.1:5432',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment variables
    delete process.env.GITHUB_OWNER;
    delete process.env.GITHUB_REPO;
    delete process.env.GITHUB_TOKEN;
    // Create manager with explicit token
    manager = new GitHubPreventionIssueManager('mininglife7-dev', 'newspulse-ai', 'test-token-12345');
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.GITHUB_OWNER;
    delete process.env.GITHUB_REPO;
    delete process.env.GITHUB_TOKEN;
  });

  describe('Initialization', () => {
    it('should initialize with owner and repo', () => {
      expect(manager).toBeDefined();
      expect(manager.getStatus().owner).toBe('mininglife7-dev');
      expect(manager.getStatus().repo).toBe('newspulse-ai');
    });

    it('should use environment variables for defaults', () => {
      process.env.GITHUB_OWNER = 'test-owner';
      process.env.GITHUB_REPO = 'test-repo';

      const newManager = getGitHubPreventionIssueManager();
      expect(newManager.getStatus().owner).toBe('test-owner');
      expect(newManager.getStatus().repo).toBe('test-repo');

      delete process.env.GITHUB_OWNER;
      delete process.env.GITHUB_REPO;
    });

    it('should be disabled if GITHUB_TOKEN not set', () => {
      const managerNoToken = new GitHubPreventionIssueManager('owner', 'repo', '');
      expect(managerNoToken.isConfigured()).toBe(false);
    });

    it('should be enabled if GITHUB_TOKEN provided', () => {
      expect(manager.isConfigured()).toBe(true);
    });
  });

  describe('Post-Mortem Issue Creation', () => {
    it('should create post-mortem issue for critical incident', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            number: 123,
            html_url: 'https://github.com/mininglife7-dev/newspulse-ai/issues/123',
            title: '[Post-Mortem] CRITICAL: Database schema mismatch detected',
            body: 'Issue body...',
            labels: [{ name: 'type: incident-postmortem' }, { name: 'severity: critical' }],
            created_at: new Date().toISOString(),
          }),
          { status: 201 }
        )
      );

      const issue = await manager.createPostMortemIssue(mockIncident, mockDecision, 'Schema migration was incompatible');

      expect(issue).toBeDefined();
      expect(issue?.issueNumber).toBe(123);
      expect(issue?.title).toContain('CRITICAL');
      expect(issue?.title).toContain('Database schema');
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.github.com/repos/mininglife7-dev/newspulse-ai/issues',
        expect.any(Object)
      );

      fetchSpy.mockRestore();
    });

    it('should include incident details in issue body', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            number: 124,
            html_url: 'https://github.com/mininglife7-dev/newspulse-ai/issues/124',
            title: '[Post-Mortem] HIGH: Test incident',
            body: 'Issue body...',
            labels: [],
            created_at: new Date().toISOString(),
          }),
          { status: 201 }
        )
      );

      const highSeverityIncident: DetectedIncident = { ...mockIncident, severity: 'high' };

      await manager.createPostMortemIssue(highSeverityIncident, mockDecision, 'Root cause analysis');

      const callBody = (fetchSpy.mock.calls[0][1] as RequestInit).body as string;
      expect(callBody).toContain('incident-001');
      expect(callBody).toContain('Database schema mismatch');

      fetchSpy.mockRestore();
    });

    it('should cache post-mortem issues to avoid duplicates', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            number: 125,
            html_url: 'https://github.com/mininglife7-dev/newspulse-ai/issues/125',
            title: '[Post-Mortem] CRITICAL: Test',
            body: 'Body...',
            labels: [],
            created_at: new Date().toISOString(),
          }),
          { status: 201 }
        )
      );

      const issue1 = await manager.createPostMortemIssue(mockIncident, mockDecision, 'Analysis');
      const issue2 = await manager.createPostMortemIssue(mockIncident, mockDecision, 'Analysis');

      expect(issue1).toEqual(issue2);
      expect(fetchSpy).toHaveBeenCalledTimes(1); // Only called once due to caching

      fetchSpy.mockRestore();
    });

    it('should add appropriate labels based on severity', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            number: 126,
            html_url: 'https://github.com/mininglife7-dev/newspulse-ai/issues/126',
            title: 'Test',
            body: 'Body',
            labels: [],
            created_at: new Date().toISOString(),
          }),
          { status: 201 }
        )
      );

      await manager.createPostMortemIssue(mockIncident, mockDecision, 'Analysis');

      const callBody = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
      expect(callBody.labels).toContain('type: incident-postmortem');
      expect(callBody.labels).toContain('severity: critical');
      expect(callBody.labels).toContain('priority: high');
      expect(callBody.labels).toContain('hotfix');

      fetchSpy.mockRestore();
    });
  });

  describe('Pattern Prevention Issue Creation', () => {
    it('should create prevention issue for repeated error pattern', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            number: 200,
            html_url: 'https://github.com/mininglife7-dev/newspulse-ai/issues/200',
            title: '[Prevention] Fix repeated error: Database connection refused',
            body: 'Issue body...',
            labels: [{ name: 'type: prevention' }, { name: 'severity: critical' }],
            created_at: new Date().toISOString(),
          }),
          { status: 201 }
        )
      );

      const issue = await manager.createPatternPreventionIssue(
        mockPattern,
        42,
        'Increase connection pool size or add read-only replicas'
      );

      expect(issue).toBeDefined();
      expect(issue?.issueNumber).toBe(200);
      expect(issue?.title).toContain('Database connection refused');

      fetchSpy.mockRestore();
    });

    it('should include pattern details in issue body', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            number: 201,
            html_url: 'https://github.com/mininglife7-dev/newspulse-ai/issues/201',
            title: 'Test',
            body: 'Body...',
            labels: [],
            created_at: new Date().toISOString(),
          }),
          { status: 201 }
        )
      );

      await manager.createPatternPreventionIssue(
        mockPattern,
        42,
        'Increase connection pool size'
      );

      const callBody = (fetchSpy.mock.calls[0][1] as RequestInit).body as string;
      expect(callBody).toContain('fp-db-connection-001');
      expect(callBody).toContain('Database connection refused');
      expect(callBody).toContain('42');

      fetchSpy.mockRestore();
    });

    it('should cache pattern prevention issues', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            number: 202,
            html_url: 'https://github.com/mininglife7-dev/newspulse-ai/issues/202',
            title: 'Test',
            body: 'Body',
            labels: [],
            created_at: new Date().toISOString(),
          }),
          { status: 201 }
        )
      );

      const issue1 = await manager.createPatternPreventionIssue(mockPattern, 42, 'Fix');
      const issue2 = await manager.createPatternPreventionIssue(mockPattern, 50, 'Fix');

      expect(issue1).toEqual(issue2);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      fetchSpy.mockRestore();
    });
  });

  describe('Infrastructure Issue Creation', () => {
    it('should create infrastructure improvement issue', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            number: 300,
            html_url: 'https://github.com/mininglife7-dev/newspulse-ai/issues/300',
            title: 'Improve database connection pooling',
            body: 'Issue body...',
            labels: [{ name: 'type: infrastructure' }, { name: 'priority: high' }],
            created_at: new Date().toISOString(),
          }),
          { status: 201 }
        )
      );

      const issue = await manager.createInfrastructureIssue(
        'Improve database connection pooling',
        'Connection pool exhaustion is causing cascading failures',
        'high'
      );

      expect(issue).toBeDefined();
      expect(issue?.issueNumber).toBe(300);
      expect(issue?.title).toBe('Improve database connection pooling');

      fetchSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle GitHub API errors', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
      );
      const consoleSpy = vi.spyOn(console, 'error');

      const issue = await manager.createPostMortemIssue(mockIncident, mockDecision, 'Analysis');

      expect(issue).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'GitHub API error (401):',
        expect.any(String)
      );

      fetchSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should gracefully handle network errors', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network timeout'));
      const consoleSpy = vi.spyOn(console, 'error');

      const issue = await manager.createPostMortemIssue(mockIncident, mockDecision, 'Analysis');

      expect(issue).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('GitHub API request failed:', expect.any(Error));

      fetchSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should return null if not configured', async () => {
      const unconfiguredManager = new GitHubPreventionIssueManager('owner', 'repo', '');

      const issue = await unconfiguredManager.createPostMortemIssue(mockIncident, mockDecision, 'Analysis');

      expect(issue).toBeNull();
    });
  });

  describe('Issue Search', () => {
    it('should find existing issues by title fragment', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            items: [
              {
                number: 123,
                html_url: 'https://github.com/mininglife7-dev/newspulse-ai/issues/123',
                title: '[Post-Mortem] CRITICAL: Database schema',
                body: 'Body...',
                labels: [{ name: 'incident-postmortem' }],
                created_at: new Date().toISOString(),
              },
            ],
          }),
          { status: 200 }
        )
      );

      const issue = await manager.findExistingIssue('schema');

      expect(issue).toBeDefined();
      expect(issue?.issueNumber).toBe(123);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/search/issues'),
        expect.any(Object)
      );

      fetchSpy.mockRestore();
    });

    it('should return null if no matching issues found', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ items: [] }), { status: 200 })
      );

      const issue = await manager.findExistingIssue('nonexistent');

      expect(issue).toBeNull();

      fetchSpy.mockRestore();
    });

    it('should return null if search fails', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
      );

      const issue = await manager.findExistingIssue('test');

      expect(issue).toBeNull();

      fetchSpy.mockRestore();
    });
  });

  describe('Configuration Status', () => {
    it('should report configuration status', () => {
      const status = manager.getStatus();

      expect(status.configured).toBe(true);
      expect(status.owner).toBe('mininglife7-dev');
      expect(status.repo).toBe('newspulse-ai');
      expect(status.cached_issues).toBe(0);
    });

    it('should track cached issue count', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            number: 999,
            html_url: 'https://github.com/mininglife7-dev/newspulse-ai/issues/999',
            title: 'Test',
            body: 'Body',
            labels: [],
            created_at: new Date().toISOString(),
          }),
          { status: 201 }
        )
      );

      await manager.createPostMortemIssue(mockIncident, mockDecision, 'Analysis');

      const status = manager.getStatus();
      expect(status.cached_issues).toBe(1);

      fetchSpy.mockRestore();
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getGitHubPreventionIssueManager();
      const instance2 = getGitHubPreventionIssueManager();

      expect(instance1).toBe(instance2);
    });
  });
});
