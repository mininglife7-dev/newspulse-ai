/**
 * DNS-019: Incident Post-Mortem System
 *
 * Captures learnings from resolved incidents to prevent recurrence.
 * Extracts actionable insights, links to regressions, builds organizational memory.
 */

import { getIncidentMetrics } from './incident-metrics';

export interface PostMortemLearning {
  category: 'root-cause' | 'process-improvement' | 'training-need' | 'tool-gap' | 'detection-gap';
  title: string;
  description: string;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  owner?: string;
  dueDate?: string;
}

export interface PostMortemInsight {
  insight: string;
  impact: 'high' | 'medium' | 'low';
  supportingEvidence: string[];
}

export interface PostMortem {
  incidentId: string;
  issueNumber?: number;
  title: string;
  timestamp: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  rootCause: string;
  impactedUsers?: number;
  impactedSystems: string[];
  metrics: {
    mttr: number;
    mttd: number;
    successRateImpact: number;
  };
  timelineEvents: TimelineEvent[];
  learnings: PostMortemLearning[];
  insights: PostMortemInsight[];
  relatedRegressions: string[];
  preventionPlan: PreventionPlan;
  status: 'draft' | 'in-review' | 'approved' | 'completed';
  createdBy?: string;
  approvedBy?: string;
  completedAt?: string;
}

export interface TimelineEvent {
  timestamp: string;
  actor: string;
  action: string;
  details?: string;
}

export interface PreventionPlan {
  preventionMeasures: PreventionMeasure[];
  targetImplementationDate?: string;
  estimatedEffectiveness: number;
}

export interface PreventionMeasure {
  measure: string;
  category: 'process' | 'tooling' | 'training' | 'monitoring' | 'automation';
  priority: 'high' | 'medium' | 'low';
  owner?: string;
  dueDate?: string;
  status: 'not-started' | 'in-progress' | 'completed';
}

export interface PostMortemMetrics {
  timestamp: string;
  totalIncidents: number;
  incidentsReviewed: number;
  avgDurationMinutes: number;
  topRootCauses: { cause: string; count: number }[];
  topAffectedSystems: { system: string; count: number }[];
  learningCategories: Record<string, number>;
  preventionMeasuresNotStarted: number;
  preventionMeasuresInProgress: number;
  preventionMeasuresCompleted: number;
  regressionRecurrenceRate: number;
}

/**
 * Determine if incident warrants a post-mortem
 */
export function shouldCreatePostMortem(
  severity: string,
  durationMinutes: number,
  playbookEffectivenessImpact: number
): boolean {
  if (severity === 'critical' || severity === 'high') {
    return true;
  }
  if (severity === 'medium' && durationMinutes > 30) {
    return true;
  }
  if (severity === 'low' && playbookEffectivenessImpact > 15) {
    return true;
  }
  return false;
}

/**
 * Create post-mortem from incident data
 */
export function createPostMortem(
  incidentId: string,
  title: string,
  startTime: string,
  endTime: string,
  severity: string,
  category: string,
  rootCause: string,
  impactedSystems: string[],
  metrics: ReturnType<typeof getIncidentMetrics>,
  relatedRegressions: string[] = []
): PostMortem {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

  return {
    incidentId,
    title,
    timestamp: new Date().toISOString(),
    startTime,
    endTime,
    durationMinutes,
    severity: severity as 'critical' | 'high' | 'medium' | 'low',
    category,
    rootCause,
    impactedSystems,
    metrics: {
      mttr: metrics.averageMTTR,
      mttd: metrics.averageMTTD,
      successRateImpact: 100 - metrics.successRate,
    },
    timelineEvents: [],
    learnings: [],
    insights: [],
    relatedRegressions,
    preventionPlan: {
      preventionMeasures: [],
      estimatedEffectiveness: 0,
    },
    status: 'draft',
  };
}

/**
 * Extract learnings from incident
 */
export function extractLearnings(postMortem: PostMortem): PostMortemLearning[] {
  const learnings: PostMortemLearning[] = [];

  learnings.push({
    category: 'root-cause',
    title: `Root Cause: ${postMortem.rootCause}`,
    description: `${postMortem.title} was caused by: ${postMortem.rootCause}`,
    actionable: true,
    priority: postMortem.severity === 'critical' ? 'high' : 'medium',
  });

  if (postMortem.metrics.mttd > 2) {
    learnings.push({
      category: 'detection-gap',
      title: 'Detection Time Improvement',
      description: `Time to detect was ${postMortem.metrics.mttd.toFixed(1)} minutes. Consider improving monitoring/alerting.`,
      actionable: true,
      priority: 'medium',
    });
  }

  if (postMortem.metrics.mttr > 20) {
    learnings.push({
      category: 'process-improvement',
      title: 'Resolution Process Optimization',
      description: `Time to resolve was ${postMortem.metrics.mttr} minutes. Review incident response procedures.`,
      actionable: true,
      priority: postMortem.severity === 'critical' ? 'high' : 'medium',
    });
  }

  if (postMortem.metrics.successRateImpact > 5) {
    learnings.push({
      category: 'tool-gap',
      title: 'Playbook Effectiveness Issue',
      description: `Success rate impacted by ${postMortem.metrics.successRateImpact.toFixed(1)}%. Review and enhance relevant playbooks.`,
      actionable: true,
      priority: 'medium',
    });
  }

  if (postMortem.impactedSystems.length > 1) {
    learnings.push({
      category: 'process-improvement',
      title: 'Multi-System Correlation',
      description: `Incident affected ${postMortem.impactedSystems.join(', ')}. Improve system dependency monitoring.`,
      actionable: true,
      priority: 'medium',
    });
  }

  return learnings;
}

/**
 * Generate insights from post-mortem analysis
 */
export function generateInsights(postMortem: PostMortem): PostMortemInsight[] {
  const insights: PostMortemInsight[] = [];

  const severityInsight = `Severity classification of "${postMortem.severity}" confirmed by ${postMortem.impactedSystems.length} affected systems and ${postMortem.durationMinutes} minute resolution time.`;
  insights.push({
    insight: severityInsight,
    impact: postMortem.severity === 'critical' ? 'high' : 'medium',
    supportingEvidence: [
      `Systems affected: ${postMortem.impactedSystems.join(', ')}`,
      `Duration: ${postMortem.durationMinutes} minutes`,
      `MTTR: ${postMortem.metrics.mttr} minutes`,
    ],
  });

  insights.push({
    insight: `Primary factor was: ${postMortem.rootCause}. Prevention measures should focus on eliminating this class of failure.`,
    impact: postMortem.severity === 'critical' ? 'high' : 'medium',
    supportingEvidence: [
      `MTTD: ${postMortem.metrics.mttd.toFixed(1)} minutes`,
      `Category: ${postMortem.category}`,
    ],
  });

  if (postMortem.metrics.mttd < 1) {
    insights.push({
      insight: 'Detection system performed excellently with sub-1 minute MTTD. Maintain current monitoring levels.',
      impact: 'high',
      supportingEvidence: [`MTTD: ${postMortem.metrics.mttd.toFixed(1)} minutes`],
    });
  } else if (postMortem.metrics.mttd > 5) {
    insights.push({
      insight: 'Detection was delayed. Consider adding alerting for this failure class.',
      impact: 'medium',
      supportingEvidence: [`MTTD: ${postMortem.metrics.mttd.toFixed(1)} minutes`],
    });
  }

  return insights;
}

/**
 * Create prevention plan based on learnings
 */
export function createPreventionPlan(learnings: PostMortemLearning[]): PreventionPlan {
  const measures: PreventionMeasure[] = [];

  learnings.forEach((learning) => {
    if (!learning.actionable) return;

    let category: 'process' | 'tooling' | 'training' | 'monitoring' | 'automation' = 'process';
    if (learning.category === 'detection-gap') {
      category = 'monitoring';
    } else if (learning.category === 'tool-gap') {
      category = 'tooling';
    } else if (learning.category === 'training-need') {
      category = 'training';
    }

    measures.push({
      measure: learning.title,
      category,
      priority: learning.priority,
      status: 'not-started',
    });
  });

  return {
    preventionMeasures: measures,
    estimatedEffectiveness: Math.min(100, measures.length * 15),
  };
}

/**
 * Analyze post-mortem metrics across incidents
 */
export function analyzePostMortemMetrics(postMortems: PostMortem[]): PostMortemMetrics {
  if (postMortems.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      totalIncidents: 0,
      incidentsReviewed: 0,
      avgDurationMinutes: 0,
      topRootCauses: [],
      topAffectedSystems: [],
      learningCategories: {},
      preventionMeasuresNotStarted: 0,
      preventionMeasuresInProgress: 0,
      preventionMeasuresCompleted: 0,
      regressionRecurrenceRate: 0,
    };
  }

  const reviewed = postMortems.filter((pm) => pm.status !== 'draft');
  const avgDuration =
    reviewed.reduce((sum, pm) => sum + pm.durationMinutes, 0) / Math.max(1, reviewed.length);

  const rootCauses = new Map<string, number>();
  const affectedSystems = new Map<string, number>();
  const learningCounts: Record<string, number> = {};
  let preventionNotStarted = 0;
  let preventionInProgress = 0;
  let preventionCompleted = 0;

  postMortems.forEach((pm) => {
    rootCauses.set(pm.rootCause, (rootCauses.get(pm.rootCause) || 0) + 1);
    pm.impactedSystems.forEach((sys) => {
      affectedSystems.set(sys, (affectedSystems.get(sys) || 0) + 1);
    });
    pm.learnings.forEach((learning) => {
      learningCounts[learning.category] = (learningCounts[learning.category] || 0) + 1;
    });
    pm.preventionPlan.preventionMeasures.forEach((measure) => {
      if (measure.status === 'not-started') preventionNotStarted++;
      if (measure.status === 'in-progress') preventionInProgress++;
      if (measure.status === 'completed') preventionCompleted++;
    });
  });

  const recurringRootCauses = postMortems.filter(
    (pm) => postMortems.filter((other) => other.rootCause === pm.rootCause).length > 1
  ).length;
  const regressionRecurrenceRate =
    postMortems.length > 0 ? (recurringRootCauses / postMortems.length) * 100 : 0;

  return {
    timestamp: new Date().toISOString(),
    totalIncidents: postMortems.length,
    incidentsReviewed: reviewed.length,
    avgDurationMinutes: avgDuration,
    topRootCauses: Array.from(rootCauses.entries())
      .map(([cause, count]) => ({ cause, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topAffectedSystems: Array.from(affectedSystems.entries())
      .map(([system, count]) => ({ system, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    learningCategories: learningCounts,
    preventionMeasuresNotStarted: preventionNotStarted,
    preventionMeasuresInProgress: preventionInProgress,
    preventionMeasuresCompleted: preventionCompleted,
    regressionRecurrenceRate,
  };
}

/**
 * Format post-mortem for GitHub issue
 */
export function formatPostMortemIssue(postMortem: PostMortem): { title: string; body: string; labels: string[] } {
  const title = `Post-Mortem: ${postMortem.title} [${postMortem.severity.toUpperCase()}]`;

  let body = `## Incident Overview\n\n`;
  body += `**Incident ID:** ${postMortem.incidentId}\n`;
  body += `**Severity:** ${postMortem.severity}\n`;
  body += `**Category:** ${postMortem.category}\n`;
  body += `**Duration:** ${postMortem.durationMinutes} minutes\n`;
  body += `**Start Time:** ${postMortem.startTime}\n`;
  body += `**End Time:** ${postMortem.endTime}\n\n`;

  body += `## Impact\n\n`;
  body += `**Affected Systems:** ${postMortem.impactedSystems.join(', ')}\n`;
  body += `**Success Rate Impact:** ${postMortem.metrics.successRateImpact.toFixed(1)}%\n`;
  body += `**Detection Time (MTTD):** ${postMortem.metrics.mttd.toFixed(1)} minutes\n`;
  body += `**Resolution Time (MTTR):** ${postMortem.metrics.mttr} minutes\n\n`;

  body += `## Root Cause\n\n`;
  body += `${postMortem.rootCause}\n\n`;

  if (postMortem.learnings.length > 0) {
    body += `## Key Learnings\n\n`;
    postMortem.learnings.forEach((learning) => {
      body += `- **[${learning.category.toUpperCase()}]** ${learning.title}: ${learning.description}\n`;
    });
    body += `\n`;
  }

  if (postMortem.insights.length > 0) {
    body += `## Insights\n\n`;
    postMortem.insights.forEach((insight) => {
      body += `- ${insight.insight}\n`;
    });
    body += `\n`;
  }

  if (postMortem.preventionPlan.preventionMeasures.length > 0) {
    body += `## Prevention Plan\n\n`;
    body += `**Estimated Effectiveness:** ${postMortem.preventionPlan.estimatedEffectiveness}%\n\n`;
    postMortem.preventionPlan.preventionMeasures.forEach((measure) => {
      body += `- [${measure.status === 'completed' ? 'x' : ' '}] ${measure.measure} (${measure.category})\n`;
    });
    body += `\n`;
  }

  if (postMortem.relatedRegressions.length > 0) {
    body += `## Related Regressions\n\n`;
    postMortem.relatedRegressions.forEach((regression) => {
      body += `- Linked to regression detection: #${regression}\n`;
    });
    body += `\n`;
  }

  body += `---\n`;
  body += `*This is an automated post-mortem from DNS-019 (Incident Post-Mortem System). Review, approve, and track prevention measures.*\n`;

  return {
    title,
    body,
    labels: ['post-mortem', 'incident-response', `severity-${postMortem.severity}`],
  };
}
