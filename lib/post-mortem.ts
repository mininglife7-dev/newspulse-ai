/**
 * DNS-019: Post-Mortem Automation
 *
 * Automatically capture incident learning and generate post-mortem reports.
 * Bridges remediation (DNS-011-012) with operational learning to prevent recurrence.
 * Enables data-driven improvement and institutional knowledge building.
 */

export type PostMortemPhase = 'drafted' | 'scheduled' | 'in-progress' | 'completed' | 'archived';

export type PostMortemStatus = 'pending' | 'scheduled' | 'in-progress' | 'completed';

export type FindingCategory = 'root-cause' | 'process-gap' | 'monitoring-blind-spot' | 'automation-opportunity' | 'communication-improvement';

export interface PostMortemFinding {
  id: string;
  category: FindingCategory;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  owner?: string;
  actionItems?: string[];
}

export interface PostMortemSummary {
  title: string;
  incidentId: string;
  timestamp: string;
  severity: string;
  duration: number; // minutes
  affectedServices: string[];
  affectedUsers: number;
  rootCause: string;
  resolution: string;
  preventionSteps: string[];
}

export interface PostMortem {
  id: string;
  incidentId: string;
  timestamp: string;
  scheduledFor?: string;
  completedAt?: string;
  status: PostMortemStatus;
  phase: PostMortemPhase;
  summary: PostMortemSummary;
  findings: PostMortemFinding[];
  actionItems: { id: string; title: string; owner?: string; dueDate?: string; completed: boolean }[];
  participants: { name: string; role: string; email: string }[];
  reviewNotes: string;
}

export interface PostMortemMetrics {
  totalPostMortems: number;
  completedPostMortems: number;
  averageTimeToComplete: number; // hours
  findingsByCategory: Record<FindingCategory, number>;
  highImpactFindings: number;
  avgActionsPerIncident: number;
  completionRate: number; // percent
}

// In-memory post-mortem store
const postMortemStore = new Map<string, PostMortem>();
const postMortemHistory: PostMortem[] = [];

/**
 * Create post-mortem for resolved incident
 */
export function createPostMortem(
  incidentId: string,
  summary: PostMortemSummary,
  scheduledFor?: Date
): PostMortem {
  const id = `postmortem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const postMortem: PostMortem = {
    id,
    incidentId,
    timestamp: new Date().toISOString(),
    scheduledFor: scheduledFor?.toISOString(),
    status: scheduledFor ? 'scheduled' : 'pending',
    phase: 'drafted',
    summary,
    findings: [],
    actionItems: [],
    participants: [],
    reviewNotes: '',
  };

  postMortemStore.set(id, postMortem);
  return postMortem;
}

/**
 * Add finding to post-mortem
 */
export function addFinding(
  postMortemId: string,
  category: FindingCategory,
  title: string,
  description: string,
  impact: 'high' | 'medium' | 'low'
): PostMortem | undefined {
  const pm = postMortemStore.get(postMortemId);
  if (!pm) return undefined;

  const finding: PostMortemFinding = {
    id: `finding-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    category,
    title,
    description,
    impact,
  };

  pm.findings.push(finding);
  return pm;
}

/**
 * Add action item to post-mortem
 */
export function addActionItem(
  postMortemId: string,
  title: string,
  owner?: string,
  dueDate?: Date
): PostMortem | undefined {
  const pm = postMortemStore.get(postMortemId);
  if (!pm) return undefined;

  const action = {
    id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title,
    owner,
    dueDate: dueDate?.toISOString(),
    completed: false,
  };

  pm.actionItems.push(action);
  return pm;
}

/**
 * Mark action item as completed
 */
export function completeAction(postMortemId: string, actionId: string): PostMortem | undefined {
  const pm = postMortemStore.get(postMortemId);
  if (!pm) return undefined;

  const action = pm.actionItems.find((a) => a.id === actionId);
  if (action) {
    action.completed = true;
  }

  return pm;
}

/**
 * Add participant to post-mortem
 */
export function addParticipant(
  postMortemId: string,
  name: string,
  role: string,
  email: string
): PostMortem | undefined {
  const pm = postMortemStore.get(postMortemId);
  if (!pm) return undefined;

  // Avoid duplicates
  if (!pm.participants.find((p) => p.email === email)) {
    pm.participants.push({ name, role, email });
  }

  return pm;
}

/**
 * Schedule post-mortem meeting
 */
export function schedulePostMortem(postMortemId: string, scheduledFor: Date): PostMortem | undefined {
  const pm = postMortemStore.get(postMortemId);
  if (!pm) return undefined;

  pm.scheduledFor = scheduledFor.toISOString();
  pm.status = 'scheduled';

  return pm;
}

/**
 * Start post-mortem session
 */
export function startPostMortemSession(postMortemId: string): PostMortem | undefined {
  const pm = postMortemStore.get(postMortemId);
  if (!pm) return undefined;

  pm.status = 'in-progress';
  pm.phase = 'in-progress';

  return pm;
}

/**
 * Complete post-mortem
 */
export function completePostMortem(postMortemId: string, reviewNotes: string): PostMortem | undefined {
  const pm = postMortemStore.get(postMortemId);
  if (!pm) return undefined;

  pm.status = 'completed';
  pm.phase = 'completed';
  pm.completedAt = new Date().toISOString();
  pm.reviewNotes = reviewNotes;

  postMortemHistory.push(pm);
  postMortemStore.delete(postMortemId);

  return pm;
}

/**
 * Get post-mortem by ID
 */
export function getPostMortem(postMortemId: string): PostMortem | undefined {
  return postMortemStore.get(postMortemId);
}

/**
 * Get post-mortem by incident ID
 */
export function getPostMortemByIncident(incidentId: string): PostMortem | undefined {
  for (const [, pm] of postMortemStore) {
    if (pm.incidentId === incidentId) {
      return pm;
    }
  }
  return undefined;
}

/**
 * Get all active post-mortems
 */
export function getActivePostMortems(): PostMortem[] {
  return Array.from(postMortemStore.values()).sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Get post-mortems by status
 */
export function getPostMortemsByStatus(status: PostMortemStatus): PostMortem[] {
  return Array.from(postMortemStore.values())
    .filter((pm) => pm.status === status)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Generate post-mortem metrics
 */
export function generatePostMortemMetrics(): PostMortemMetrics {
  const allPostMortems = [...postMortemHistory, ...Array.from(postMortemStore.values())];
  const completed = postMortemHistory;

  let totalTime = 0;
  const findingsByCategory: Record<FindingCategory, number> = {
    'root-cause': 0,
    'process-gap': 0,
    'monitoring-blind-spot': 0,
    'automation-opportunity': 0,
    'communication-improvement': 0,
  };

  let highImpactCount = 0;
  let totalActions = 0;

  for (const pm of allPostMortems) {
    if (pm.completedAt) {
      const completedTime = new Date(pm.completedAt).getTime();
      const createdTime = new Date(pm.timestamp).getTime();
      totalTime += (completedTime - createdTime) / (1000 * 60 * 60); // hours
    }

    pm.findings.forEach((f) => {
      findingsByCategory[f.category]++;
      if (f.impact === 'high') highImpactCount++;
    });

    totalActions += pm.actionItems.length;
  }

  const averageTime = completed.length > 0 ? totalTime / completed.length : 0;
  const avgActions = allPostMortems.length > 0 ? totalActions / allPostMortems.length : 0;
  const completionRate = allPostMortems.length > 0 ? Math.round((completed.length / allPostMortems.length) * 100) : 0;

  return {
    totalPostMortems: allPostMortems.length,
    completedPostMortems: completed.length,
    averageTimeToComplete: Math.round(averageTime * 10) / 10,
    findingsByCategory,
    highImpactFindings: highImpactCount,
    avgActionsPerIncident: Math.round(avgActions * 10) / 10,
    completionRate,
  };
}

/**
 * Format post-mortem report as markdown
 */
export function formatPostMortemReport(postMortem: PostMortem): string {
  const lines = [
    '# Post-Mortem Report',
    '',
    `**Title:** ${postMortem.summary.title}`,
    `**Incident ID:** ${postMortem.summary.incidentId}`,
    `**Date:** ${new Date(postMortem.timestamp).toLocaleDateString()}`,
    '',
    '## Incident Summary',
    `- **Severity:** ${postMortem.summary.severity}`,
    `- **Duration:** ${postMortem.summary.duration} minutes`,
    `- **Affected Services:** ${postMortem.summary.affectedServices.join(', ')}`,
    `- **Affected Users:** ${postMortem.summary.affectedUsers.toLocaleString()}`,
    '',
    '## Root Cause',
    postMortem.summary.rootCause,
    '',
    '## Resolution',
    postMortem.summary.resolution,
    '',
  ];

  if (postMortem.findings.length > 0) {
    lines.push('## Key Findings');
    postMortem.findings.forEach((f) => {
      const impact = f.impact === 'high' ? '🔴' : f.impact === 'medium' ? '🟡' : '🟢';
      lines.push(`${impact} **${f.title}** (${f.category})`);
      lines.push(`   - ${f.description}`);
      if (f.owner) {
        lines.push(`   - Owner: ${f.owner}`);
      }
    });
    lines.push('');
  }

  if (postMortem.actionItems.length > 0) {
    lines.push('## Action Items');
    postMortem.actionItems.forEach((a) => {
      const status = a.completed ? '✓' : '⚠️';
      lines.push(`${status} ${a.title}`);
      if (a.owner) {
        lines.push(`   - Owner: ${a.owner}`);
      }
      if (a.dueDate) {
        lines.push(`   - Due: ${new Date(a.dueDate).toLocaleDateString()}`);
      }
    });
    lines.push('');
  }

  if (postMortem.participants.length > 0) {
    lines.push('## Participants');
    postMortem.participants.forEach((p) => {
      lines.push(`- ${p.name} (${p.role})`);
    });
    lines.push('');
  }

  if (postMortem.summary.preventionSteps.length > 0) {
    lines.push('## Prevention Steps');
    postMortem.summary.preventionSteps.forEach((step, i) => {
      lines.push(`${i + 1}. ${step}`);
    });
  }

  return lines.join('\n');
}

/**
 * Reset post-mortem store (testing/admin only)
 */
export function resetPostMortemStore(): void {
  postMortemStore.clear();
  postMortemHistory.length = 0;
}

/**
 * Get post-mortem trend (incidents with high-impact findings)
 */
export function getHighImpactTrends(): { category: FindingCategory; count: number; examples: string[] }[] {
  const trends: Record<FindingCategory, { count: number; examples: Set<string> }> = {
    'root-cause': { count: 0, examples: new Set() },
    'process-gap': { count: 0, examples: new Set() },
    'monitoring-blind-spot': { count: 0, examples: new Set() },
    'automation-opportunity': { count: 0, examples: new Set() },
    'communication-improvement': { count: 0, examples: new Set() },
  };

  postMortemHistory.forEach((pm) => {
    pm.findings
      .filter((f) => f.impact === 'high')
      .forEach((f) => {
        trends[f.category].count++;
        trends[f.category].examples.add(f.title);
      });
  });

  return Object.entries(trends)
    .filter(([, v]) => v.count > 0)
    .map(([category, data]) => ({
      category: category as FindingCategory,
      count: data.count,
      examples: Array.from(data.examples).slice(0, 3),
    }))
    .sort((a, b) => b.count - a.count);
}
