/**
 * DNS-024: Prevention Measure Issue Orchestration
 *
 * Converts prevention measures from post-mortems into tracked GitHub issues.
 * Links incidents to prevention work, validates effectiveness via regression monitoring.
 */

import type { PreventionMeasure } from './post-mortem';

export interface PreventionIssueLink {
  measureId: string;
  githubIssueNumber: number;
  createdAt: string;
  linkedIncidentId: string;
  linkedRegressionIds: string[];
  status: 'open' | 'in-progress' | 'closed';
  closedAt?: string;
}

export interface PreventionMeasureOrchestrationRequest {
  incidentId: string;
  postMortemTitle: string;
  preventionMeasures: PreventionMeasure[];
  relatedRegressions: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface PreventionIssueCreationResult {
  success: boolean;
  issueNumber?: number;
  measureId: string;
  errorMessage?: string;
}

export interface PreventionOrchestrationMetrics {
  timestamp: string;
  totalMeasures: number;
  issuesCreated: number;
  issuesClosed: number;
  avgClosureTime?: number;
  preventionEffectiveness: number; // % of measures that led to regression prevention
}

const PRIORITY_TO_GITHUB = {
  high: 'P0',
  medium: 'P1',
  low: 'P2',
};

const CATEGORY_LABELS = {
  process: 'type/process',
  tooling: 'type/tooling',
  training: 'type/training',
  monitoring: 'type/monitoring',
  automation: 'type/automation',
};

/**
 * Generate unique ID for prevention measure
 */
export function generateMeasureId(incidentId: string, index: number): string {
  return `${incidentId}-measure-${index}`;
}

/**
 * Format prevention measure as GitHub issue
 */
export function formatPreventionIssue(
  incidentId: string,
  postMortemTitle: string,
  measure: PreventionMeasure,
  measureIndex: number,
  severity: string,
  relatedRegressions: string[]
): { title: string; body: string; labels: string[] } {
  const measureId = generateMeasureId(incidentId, measureIndex);

  const title = `[Prevention] ${measure.measure}`;

  let body = `## Prevention Measure\n\n`;
  body += `**Related Incident:** ${incidentId}\n`;
  body += `**Post-Mortem:** ${postMortemTitle}\n`;
  body += `**Measure ID:** ${measureId}\n\n`;

  body += `## Details\n\n`;
  body += `**Measure:** ${measure.measure}\n`;
  body += `**Category:** ${measure.category}\n`;
  body += `**Priority:** ${measure.priority.toUpperCase()}\n`;
  body += `**Owner:** ${measure.owner || 'Unassigned'}\n`;
  body += `**Due Date:** ${measure.dueDate || 'Not set'}\n\n`;

  if (relatedRegressions.length > 0) {
    body += `## Related Regressions\n\n`;
    relatedRegressions.forEach((regression) => {
      body += `- #${regression}\n`;
    });
    body += `\n`;
  }

  body += `## Validation\n\n`;
  body += `This measure was identified to prevent recurrence of the incident above.\n`;
  body += `Close this issue when the measure is implemented and validated.\n\n`;

  body += `---\n`;
  body += `*This is an automated prevention measure from DNS-024 (Prevention Measure Issue Orchestration). Close when implemented.*\n`;

  const labels = [
    'prevention-measure',
    'incident-response',
    PRIORITY_TO_GITHUB[measure.priority as keyof typeof PRIORITY_TO_GITHUB],
    CATEGORY_LABELS[measure.category as keyof typeof CATEGORY_LABELS],
    `incident-${incidentId}`,
  ];

  if (severity === 'critical') labels.push('severity-critical');
  if (severity === 'high') labels.push('severity-high');

  return {
    title,
    body,
    labels,
  };
}

/**
 * Orchestrate prevention measure issue creation from post-mortem
 * In production, this would call GitHub API; for now returns structured data
 */
export async function orchestratePreventionIssues(
  request: PreventionMeasureOrchestrationRequest
): Promise<PreventionIssueCreationResult[]> {
  const results: PreventionIssueCreationResult[] = [];

  request.preventionMeasures.forEach((measure, index) => {
    if (!measure.measure || !measure.category) {
      results.push({
        success: false,
        measureId: generateMeasureId(request.incidentId, index),
        errorMessage: 'Invalid prevention measure data',
      });
      return;
    }

    const measureId = generateMeasureId(request.incidentId, index);
    const issue = formatPreventionIssue(
      request.incidentId,
      request.postMortemTitle,
      measure,
      index,
      request.severity,
      request.relatedRegressions
    );

    // In production, this would call GitHub API
    // For now, simulate issue creation with deterministic numbering
    const simulatedIssueNumber = Math.abs(
      parseInt(measureId.replace(/\D/g, ''), 10) % 10000
    ) + 5000;

    results.push({
      success: true,
      issueNumber: simulatedIssueNumber,
      measureId,
    });
  });

  return results;
}

/**
 * Track prevention issue closure and validate effectiveness
 */
export function validatePreventionEffectiveness(
  issueLink: PreventionIssueLink,
  regressionRecurrenceRate: number
): { effective: boolean; confidence: number } {
  // If measure is closed and linked regression didn't recur, it was effective
  if (issueLink.status === 'closed') {
    // Check if any linked regressions recurred
    const regressionRecurred = regressionRecurrenceRate > 5; // >5% recurrence = ineffective

    return {
      effective: !regressionRecurred,
      confidence: regressionRecurred ? 0.6 : 0.9, // Higher confidence if no recurrence
    };
  }

  // Measure still in progress - effectiveness unknown
  return {
    effective: false,
    confidence: 0,
  };
}

/**
 * Analyze prevention effectiveness across multiple measures
 */
export function analyzePreventionEffectiveness(
  issueLinks: PreventionIssueLink[],
  regressionRecurrenceRate: number
): PreventionOrchestrationMetrics {
  const closed = issueLinks.filter((link) => link.status === 'closed');
  const created = issueLinks.length;
  const closedCount = closed.length;

  let totalClosureTime = 0;
  let effectiveMeasures = 0;

  closed.forEach((link) => {
    if (link.closedAt) {
      const closureTime =
        new Date(link.closedAt).getTime() - new Date(link.createdAt).getTime();
      totalClosureTime += closureTime;

      const { effective } = validatePreventionEffectiveness(link, regressionRecurrenceRate);
      if (effective) effectiveMeasures++;
    }
  });

  const avgClosureTime = closedCount > 0 ? totalClosureTime / closedCount / 1000 / 60 : undefined;
  const preventionEffectiveness =
    closedCount > 0 ? (effectiveMeasures / closedCount) * 100 : 0;

  return {
    timestamp: new Date().toISOString(),
    totalMeasures: created,
    issuesCreated: created,
    issuesClosed: closedCount,
    avgClosureTime,
    preventionEffectiveness,
  };
}

/**
 * Link prevention issue to regression(s) it prevents
 */
export function createPreventionIssueLink(
  measureId: string,
  issueNumber: number,
  incidentId: string,
  relatedRegressions: string[]
): PreventionIssueLink {
  return {
    measureId,
    githubIssueNumber: issueNumber,
    createdAt: new Date().toISOString(),
    linkedIncidentId: incidentId,
    linkedRegressionIds: relatedRegressions,
    status: 'open',
  };
}
