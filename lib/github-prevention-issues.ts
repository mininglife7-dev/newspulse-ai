/**
 * DNS-022: GitHub Issues Automation for Prevention
 *
 * Automatically creates GitHub issues for:
 * - Post-mortems of critical/high incidents
 * - Repeated error pattern prevention
 * - Infrastructure improvements
 *
 * Closes the loop: Incident Detection → Analysis → Prevention Issue → Code Fix
 *
 * Requires: GITHUB_TOKEN (with repo write access) in environment
 */

import { DetectedIncident } from './incident-detection';
import { OrchestrationDecision } from './incident-orchestration';
import { ErrorPattern } from './error-tracking';

export interface PreventionIssue {
  issueNumber: number;
  url: string;
  title: string;
  body: string;
  labels: string[];
  createdAt: string;
}

export interface PreventionIssueInput {
  type: 'incident-postmortem' | 'pattern-prevention' | 'infrastructure-improvement';
  title: string;
  body: string;
  incident?: DetectedIncident;
  decision?: OrchestrationDecision;
  pattern?: ErrorPattern;
}

export class GitHubPreventionIssueManager {
  private githubToken: string;
  private owner: string;
  private repo: string;
  private apiUrl = 'https://api.github.com';
  private issueCache = new Map<string, PreventionIssue>();

  constructor(owner: string, repo: string, githubToken?: string) {
    this.owner = owner;
    this.repo = repo;
    this.githubToken = githubToken || process.env.GITHUB_TOKEN || '';

    if (!this.githubToken) {
      console.warn('GitHubPreventionIssueManager: GITHUB_TOKEN not set. Issue creation disabled.');
    }
  }

  /**
   * Create post-mortem issue for critical/high incident
   */
  async createPostMortemIssue(
    incident: DetectedIncident,
    decision: OrchestrationDecision,
    rootCauseAnalysis: string
  ): Promise<PreventionIssue | null> {
    if (!this.githubToken) return null;

    const cacheKey = `postmortem-${incident.incidentId}`;
    if (this.issueCache.has(cacheKey)) {
      return this.issueCache.get(cacheKey)!;
    }

    const title = `[Post-Mortem] ${incident.severity.toUpperCase()}: ${incident.description}`;
    const body = this.formatPostMortemBody(incident, decision, rootCauseAnalysis);
    const labels = this.getPostMortemLabels(incident.severity);

    try {
      const issue = await this.createIssue(title, body, labels);
      if (issue) {
        this.issueCache.set(cacheKey, issue);
      }
      return issue;
    } catch (error) {
      console.error('Failed to create post-mortem issue:', error);
      return null;
    }
  }

  /**
   * Create prevention issue for repeated error pattern
   */
  async createPatternPreventionIssue(
    pattern: ErrorPattern,
    occurrenceCount: number,
    suggestedFix: string
  ): Promise<PreventionIssue | null> {
    if (!this.githubToken) return null;

    const cacheKey = `pattern-${pattern.fingerprint}`;
    if (this.issueCache.has(cacheKey)) {
      return this.issueCache.get(cacheKey)!;
    }

    const title = `[Prevention] Fix repeated error: ${pattern.message}`;
    const body = this.formatPatternPreventionBody(pattern, occurrenceCount, suggestedFix);
    const labels = this.getPatternLabels(pattern.severity);

    try {
      const issue = await this.createIssue(title, body, labels);
      if (issue) {
        this.issueCache.set(cacheKey, issue);
      }
      return issue;
    } catch (error) {
      console.error('Failed to create pattern prevention issue:', error);
      return null;
    }
  }

  /**
   * Create infrastructure improvement issue
   */
  async createInfrastructureIssue(
    title: string,
    description: string,
    priority: 'critical' | 'high' | 'medium' | 'low'
  ): Promise<PreventionIssue | null> {
    if (!this.githubToken) return null;

    const cacheKey = `infra-${title}`;
    if (this.issueCache.has(cacheKey)) {
      return this.issueCache.get(cacheKey)!;
    }

    const labels = [`type: infrastructure`, `priority: ${priority}`];
    const body = `## Description\n${description}\n\n## Impact\nProduction reliability and incident response capability.`;

    try {
      const issue = await this.createIssue(title, body, labels);
      if (issue) {
        this.issueCache.set(cacheKey, issue);
      }
      return issue;
    } catch (error) {
      console.error('Failed to create infrastructure issue:', error);
      return null;
    }
  }

  /**
   * Internal: Create issue via GitHub REST API
   */
  private async createIssue(title: string, body: string, labels: string[]): Promise<PreventionIssue | null> {
    const url = `${this.apiUrl}/repos/${this.owner}/${this.repo}/issues`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.githubToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          title,
          body,
          labels,
          assignees: [],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`GitHub API error (${response.status}):`, error);
        return null;
      }

      const issue = (await response.json()) as {
        number: number;
        html_url: string;
        title: string;
        body: string;
        labels: Array<{ name: string }>;
        created_at: string;
      };

      return {
        issueNumber: issue.number,
        url: issue.html_url,
        title: issue.title,
        body: issue.body,
        labels: issue.labels.map((l) => l.name),
        createdAt: issue.created_at,
      };
    } catch (error) {
      console.error('GitHub API request failed:', error);
      return null;
    }
  }

  /**
   * Format post-mortem issue body
   */
  private formatPostMortemBody(
    incident: DetectedIncident,
    decision: OrchestrationDecision,
    rootCauseAnalysis: string
  ): string {
    return `## Summary
Automated post-mortem for ${incident.severity} incident.

## Incident Details
- **ID:** ${incident.incidentId}
- **Severity:** ${incident.severity}
- **Category:** ${incident.category}
- **Description:** ${incident.description}
- **Detected:** ${incident.detectedAt}
- **User Impact:** ${(incident.estimatedUserImpact * 100).toFixed(1)}%

## Orchestration Decision
- **Recommended Action:** ${decision.recommendedAction}
- **Recovery Time:** ${decision.estimatedRecoveryTime}s
- **Risk Assessment:** ${decision.riskOfAction}

## Evidence
${decision.evidence.map((e) => `- ${e}`).join('\n')}

## Root Cause Analysis
${rootCauseAnalysis}

## Prevention Measures
- [ ] Identify root cause in codebase
- [ ] Implement fix or process change
- [ ] Add test case to prevent recurrence
- [ ] Update runbook if applicable
- [ ] Code review and merge

## Timeline
\`\`\`
${incident.detectedAt} - Incident detected
${decision.timestamp} - Remediation orchestrated
\`\`\``;
  }

  /**
   * Format pattern prevention issue body
   */
  private formatPatternPreventionBody(
    pattern: ErrorPattern,
    occurrenceCount: number,
    suggestedFix: string
  ): string {
    const affectedServices = Array.from(pattern.affectedServices || []).join(', ') || 'Unknown';

    return `## Error Pattern
Repeated error pattern detected and requires prevention.

## Pattern Details
- **Fingerprint:** \`${pattern.fingerprint}\`
- **Message:** ${pattern.message}
- **Category:** ${pattern.category}
- **Severity:** ${pattern.severity}
- **Occurrences:** ${occurrenceCount}
- **First Seen:** ${pattern.firstSeen}
- **Last Seen:** ${pattern.lastSeen}
- **Affected Services:** ${affectedServices}

## Suggested Prevention
${suggestedFix}

## Steps to Resolve
- [ ] Investigate root cause
- [ ] Implement fix
- [ ] Add monitoring alert for early detection
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Monitor for recurrence

## Sample Stack Trace
\`\`\`
${pattern.sampleStackTrace || '(Stack trace not captured)'}
\`\`\``;
  }

  /**
   * Get labels for post-mortem issues
   */
  private getPostMortemLabels(severity: string): string[] {
    const baseLabels = ['type: incident-postmortem', `severity: ${severity}`];

    if (severity === 'critical') {
      baseLabels.push('priority: high', 'hotfix');
    } else if (severity === 'high') {
      baseLabels.push('priority: high');
    }

    return baseLabels;
  }

  /**
   * Get labels for pattern prevention issues
   */
  private getPatternLabels(severity: string): string[] {
    return ['type: prevention', `severity: ${severity}`];
  }

  /**
   * Search for existing issue by title fragment
   */
  async findExistingIssue(titleFragment: string): Promise<PreventionIssue | null> {
    if (!this.githubToken) return null;

    const url = `${this.apiUrl}/search/issues?q=repo:${this.owner}/${this.repo}+in:title+${encodeURIComponent(titleFragment)}+state:open`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.githubToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as { items: Array<{ number: number; html_url: string; title: string; body: string; labels: Array<{ name: string }>; created_at: string }> };

      if (data.items && data.items.length > 0) {
        const issue = data.items[0];
        return {
          issueNumber: issue.number,
          url: issue.html_url,
          title: issue.title,
          body: issue.body,
          labels: issue.labels.map((l) => l.name),
          createdAt: issue.created_at,
        };
      }

      return null;
    } catch (error) {
      console.error('GitHub search failed:', error);
      return null;
    }
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!this.githubToken;
  }

  /**
   * Get configuration status
   */
  getStatus(): {
    configured: boolean;
    owner: string;
    repo: string;
    cached_issues: number;
  } {
    return {
      configured: this.isConfigured(),
      owner: this.owner,
      repo: this.repo,
      cached_issues: this.issueCache.size,
    };
  }
}

/**
 * Singleton instance for default repository
 */
let instance: GitHubPreventionIssueManager | null = null;

export function getGitHubPreventionIssueManager(): GitHubPreventionIssueManager {
  if (!instance) {
    const owner = process.env.GITHUB_OWNER || 'mininglife7-dev';
    const repo = process.env.GITHUB_REPO || 'newspulse-ai';
    instance = new GitHubPreventionIssueManager(owner, repo);
  }
  return instance;
}
