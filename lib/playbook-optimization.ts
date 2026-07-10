/**
 * DNS-021: Playbook Optimization
 *
 * Automatically improve incident response runbooks based on post-mortem findings.
 * Closes the feedback loop: incident response → post-mortem → improved playbooks →
 * better future response. Enables continuous improvement of incident handling.
 */

export type PlaybookCategory = 'deployment' | 'database' | 'api' | 'security' | 'performance' | 'infrastructure' | 'external-dependency' | 'customer-impact';

export type FindingImpact = 'high' | 'medium' | 'low';

export interface PlaybookStep {
  id: string;
  order: number;
  title: string;
  description: string;
  expectedDuration: number; // minutes
  automation?: string; // automation endpoint or script
  successCriteria?: string[];
  commonPitfalls?: string[];
}

export interface Playbook {
  id: string;
  category: PlaybookCategory;
  version: number;
  createdAt: string;
  lastUpdatedAt: string;
  steps: PlaybookStep[];
  effectiveness: number; // 0-100 score
  successRate: number; // percentage
  averageResolutionTime: number; // minutes
  usageCount: number;
  lastUsedAt?: string;
  tags: string[];
  description: string;
  owner?: string;
}

export interface PlaybookImprovement {
  id: string;
  playbookId: string;
  timestamp: string;
  type: 'add-step' | 'remove-step' | 'reorder-steps' | 'update-duration' | 'add-automation' | 'update-criteria';
  stepId?: string;
  change: Record<string, unknown>;
  rationale: string;
  source: 'post-mortem-analysis' | 'manual-improvement' | 'effectiveness-score';
  applied: boolean;
}

export interface PlaybookAnalysis {
  id: string;
  timestamp: string;
  playbookId: string;
  category: PlaybookCategory;
  recentIncidents: number;
  successfulResolutions: number;
  failedResolutions: number;
  commonFailures: string[];
  suggestedImprovements: {
    improvement: string;
    rationale: string;
    expectedImpact: 'high' | 'medium' | 'low';
    priority: number;
  }[];
  effectivenessScore: number;
  trendDirection: 'improving' | 'stable' | 'declining';
}

// In-memory stores
const playbookStore = new Map<string, Playbook>();
const improvementHistory: PlaybookImprovement[] = [];
const analysisHistory: PlaybookAnalysis[] = [];
const incidentPlaybookMap = new Map<string, string>(); // incidentId -> playbookId

// Initialize default playbooks
const defaultPlaybooks: Playbook[] = [
  {
    id: 'playbook-deployment-rollback',
    category: 'deployment',
    version: 1,
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    steps: [
      {
        id: 'step-1',
        order: 1,
        title: 'Acknowledge Deployment Alert',
        description: 'Receive and verify deployment failure alert',
        expectedDuration: 1,
      },
      {
        id: 'step-2',
        order: 2,
        title: 'Identify Affected Version',
        description: 'Determine which deployment version caused the issue',
        expectedDuration: 2,
      },
      {
        id: 'step-3',
        order: 3,
        title: 'Notify Stakeholders',
        description: 'Alert customers and internal teams',
        expectedDuration: 2,
      },
      {
        id: 'step-4',
        order: 4,
        title: 'Initiate Rollback',
        description: 'Revert to last known good version',
        expectedDuration: 5,
        automation: '/api/deployments/rollback',
      },
      {
        id: 'step-5',
        order: 5,
        title: 'Verify Service Recovery',
        description: 'Confirm all services are responding normally',
        expectedDuration: 3,
      },
    ],
    effectiveness: 85,
    successRate: 92,
    averageResolutionTime: 13,
    usageCount: 0,
    tags: ['deployment', 'rollback', 'automation'],
    description: 'Standard procedure for handling failed deployments and initiating rollbacks',
  },
  {
    id: 'playbook-database-recovery',
    category: 'database',
    version: 1,
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    steps: [
      {
        id: 'step-1',
        order: 1,
        title: 'Detect Database Issue',
        description: 'Verify database connectivity and error logs',
        expectedDuration: 2,
      },
      {
        id: 'step-2',
        order: 2,
        title: 'Check Connection Pool',
        description: 'Review connection pool status and limits',
        expectedDuration: 3,
      },
      {
        id: 'step-3',
        order: 3,
        title: 'Review Recent Queries',
        description: 'Identify slow or problematic queries',
        expectedDuration: 5,
      },
      {
        id: 'step-4',
        order: 4,
        title: 'Scale Database Resources',
        description: 'Increase CPU/memory if resource-constrained',
        expectedDuration: 10,
        automation: '/api/database/scale',
      },
      {
        id: 'step-5',
        order: 5,
        title: 'Monitor Recovery',
        description: 'Watch metrics until stable',
        expectedDuration: 5,
      },
    ],
    effectiveness: 78,
    successRate: 85,
    averageResolutionTime: 25,
    usageCount: 0,
    tags: ['database', 'scaling', 'performance'],
    description: 'Procedure for diagnosing and recovering from database issues',
  },
  {
    id: 'playbook-api-throttling',
    category: 'api',
    version: 1,
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    steps: [
      {
        id: 'step-1',
        order: 1,
        title: 'Detect API Overload',
        description: 'Identify elevated error rates or latency spikes',
        expectedDuration: 1,
      },
      {
        id: 'step-2',
        order: 2,
        title: 'Review Request Patterns',
        description: 'Identify sources of excessive traffic',
        expectedDuration: 3,
      },
      {
        id: 'step-3',
        order: 3,
        title: 'Enable Rate Limiting',
        description: 'Apply rate limiting rules to protect API',
        expectedDuration: 2,
        automation: '/api/rate-limiting/enable',
      },
      {
        id: 'step-4',
        order: 4,
        title: 'Scale API Servers',
        description: 'Add capacity to handle legitimate traffic',
        expectedDuration: 8,
        automation: '/api/autoscaling/trigger',
      },
      {
        id: 'step-5',
        order: 5,
        title: 'Monitor Metrics',
        description: 'Verify recovery and stability',
        expectedDuration: 3,
      },
    ],
    effectiveness: 88,
    successRate: 90,
    averageResolutionTime: 17,
    usageCount: 0,
    tags: ['api', 'rate-limiting', 'scaling'],
    description: 'Procedure for handling API overload and performance degradation',
  },
];

// Initialize playbooks
for (const playbook of defaultPlaybooks) {
  playbookStore.set(playbook.id, playbook);
}

/**
 * Get playbook for incident category
 */
export function getPlaybookForCategory(category: PlaybookCategory): Playbook | undefined {
  for (const [, playbook] of playbookStore) {
    if (playbook.category === category) {
      return playbook;
    }
  }
  return undefined;
}

/**
 * Record incident playbook usage
 */
export function recordPlaybookUsage(incidentId: string, playbookId: string): void {
  incidentPlaybookMap.set(incidentId, playbookId);
  const playbook = playbookStore.get(playbookId);
  if (playbook) {
    playbook.usageCount++;
    playbook.lastUsedAt = new Date().toISOString();
  }
}

/**
 * Get playbook by ID
 */
export function getPlaybook(playbookId: string): Playbook | undefined {
  return playbookStore.get(playbookId);
}

/**
 * Get all playbooks
 */
export function getAllPlaybooks(): Playbook[] {
  return Array.from(playbookStore.values()).sort((a, b) => b.effectiveness - a.effectiveness);
}

/**
 * Analyze playbook effectiveness and suggest improvements
 */
export function analyzePlaybookEffectiveness(playbookId: string, recentIncidents: Array<{
  id: string;
  category: PlaybookCategory;
  resolved: boolean;
  resolutionTime: number;
  findings: Array<{ title: string; category: string; impact: FindingImpact }>;
}>): PlaybookAnalysis {
  const playbook = playbookStore.get(playbookId);
  if (!playbook) {
    throw new Error(`Playbook ${playbookId} not found`);
  }

  const relevant = recentIncidents.filter((i) => i.category === playbook.category);
  const successful = relevant.filter((i) => i.resolved).length;
  const failed = relevant.filter((i) => !i.resolved).length;

  // Extract common failure patterns
  const failurePatterns: Record<string, number> = {};
  const avgResolutionTime = relevant.length > 0 ? relevant.reduce((sum, i) => sum + i.resolutionTime, 0) / relevant.length : 0;

  for (const incident of relevant.filter((i) => !i.resolved)) {
    for (const finding of incident.findings) {
      failurePatterns[finding.title] = (failurePatterns[finding.title] || 0) + 1;
    }
  }

  const commonFailures = Object.entries(failurePatterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([title]) => title);

  // Calculate effectiveness score
  const successRate = relevant.length > 0 ? (successful / relevant.length) * 100 : 100;
  const timeEfficiency = avgResolutionTime > 0 ? Math.max(0, 100 - (avgResolutionTime / playbook.averageResolutionTime) * 50) : 0;
  const effectivenessScore = Math.round((successRate * 0.6 + timeEfficiency * 0.4) / 10) * 10;

  // Suggest improvements based on failure patterns
  const suggestedImprovements: Array<{
    improvement: string;
    rationale: string;
    expectedImpact: 'high' | 'medium' | 'low';
    priority: number;
  }> = [];

  if (successRate < 80 && commonFailures.length > 0) {
    suggestedImprovements.push({
      improvement: `Add troubleshooting step for: ${commonFailures[0]}`,
      rationale: `This issue appeared in ${failurePatterns[commonFailures[0]]} recent failures`,
      expectedImpact: 'high' as const,
      priority: 1,
    });
  }

  if (avgResolutionTime > playbook.averageResolutionTime * 1.2) {
    suggestedImprovements.push({
      improvement: 'Add automation to time-consuming manual steps',
      rationale: `Resolution time increased from ${playbook.averageResolutionTime}min to ${Math.round(avgResolutionTime)}min`,
      expectedImpact: 'high' as const,
      priority: 2,
    });
  }

  if (commonFailures.length > 0 && successRate < 85) {
    suggestedImprovements.push({
      improvement: 'Add decision tree for common failure modes',
      rationale: 'Help responders identify and address issues faster',
      expectedImpact: 'medium' as const,
      priority: 3,
    });
  }

  // Determine trend
  let trendDirection: 'improving' | 'stable' | 'declining' = 'stable';
  if (successRate > playbook.successRate) {
    trendDirection = 'improving';
  } else if (successRate < playbook.successRate - 10) {
    trendDirection = 'declining';
  }

  const analysis: PlaybookAnalysis = {
    id: `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    playbookId,
    category: playbook.category,
    recentIncidents: relevant.length,
    successfulResolutions: successful,
    failedResolutions: failed,
    commonFailures,
    suggestedImprovements,
    effectivenessScore,
    trendDirection,
  };

  analysisHistory.push(analysis);
  return analysis;
}

/**
 * Apply improvement to playbook
 */
export function applyPlaybookImprovement(
  playbookId: string,
  type: PlaybookImprovement['type'],
  change: Record<string, unknown>,
  rationale: string,
  stepId?: string
): PlaybookImprovement | undefined {
  const playbook = playbookStore.get(playbookId);
  if (!playbook) return undefined;

  const improvement: PlaybookImprovement = {
    id: `improvement-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    playbookId,
    timestamp: new Date().toISOString(),
    type,
    stepId,
    change,
    rationale,
    source: 'post-mortem-analysis',
    applied: false,
  };

  // Apply the change
  if (type === 'add-step') {
    const newStep = change as unknown as PlaybookStep;
    playbook.steps.push(newStep);
  } else if (type === 'remove-step' && stepId) {
    playbook.steps = playbook.steps.filter((s) => s.id !== stepId);
  } else if (type === 'reorder-steps') {
    const order = change.newOrder as Array<{ id: string; order: number }>;
    for (const item of order) {
      const step = playbook.steps.find((s) => s.id === item.id);
      if (step) {
        step.order = item.order;
      }
    }
  } else if (type === 'update-duration' && stepId) {
    const step = playbook.steps.find((s) => s.id === stepId);
    if (step) {
      step.expectedDuration = change.newDuration as number;
    }
  } else if (type === 'add-automation' && stepId) {
    const step = playbook.steps.find((s) => s.id === stepId);
    if (step) {
      step.automation = change.automation as string;
    }
  } else if (type === 'update-criteria' && stepId) {
    const step = playbook.steps.find((s) => s.id === stepId);
    if (step) {
      step.successCriteria = change.criteria as string[];
    }
  }

  improvement.applied = true;
  playbook.version++;
  playbook.lastUpdatedAt = new Date().toISOString();

  improvementHistory.push(improvement);
  return improvement;
}

/**
 * Get playbook improvements
 */
export function getPlaybookImprovements(playbookId: string): PlaybookImprovement[] {
  return improvementHistory.filter((i) => i.playbookId === playbookId);
}

/**
 * Get playbook analysis history
 */
export function getPlaybookAnalysisHistory(playbookId: string): PlaybookAnalysis[] {
  return analysisHistory.filter((a) => a.playbookId === playbookId);
}

/**
 * Generate playbook effectiveness report
 */
export function generatePlaybookReport(): {
  totalPlaybooks: number;
  averageEffectiveness: number;
  mostEffective: Playbook | undefined;
  leastEffective: Playbook | undefined;
  playbooksNeedingImprovement: Playbook[];
  recentImprovements: PlaybookImprovement[];
} {
  const playbooks = Array.from(playbookStore.values());
  const avgEffectiveness = playbooks.length > 0 ? playbooks.reduce((sum, p) => sum + p.effectiveness, 0) / playbooks.length : 0;

  const sorted = [...playbooks].sort((a, b) => b.effectiveness - a.effectiveness);

  return {
    totalPlaybooks: playbooks.length,
    averageEffectiveness: Math.round(avgEffectiveness),
    mostEffective: sorted[0],
    leastEffective: sorted[sorted.length - 1],
    playbooksNeedingImprovement: sorted.filter((p) => p.effectiveness < 70),
    recentImprovements: improvementHistory.slice(-5),
  };
}

/**
 * Format playbook as markdown
 */
export function formatPlaybookAsMarkdown(playbook: Playbook): string {
  const lines = [
    `# Incident Response Playbook: ${playbook.category.toUpperCase()}`,
    '',
    `**Version:** ${playbook.version}`,
    `**Effectiveness:** ${playbook.effectiveness}%`,
    `**Success Rate:** ${playbook.successRate}%`,
    `**Average Resolution Time:** ${playbook.averageResolutionTime} minutes`,
    `**Usage Count:** ${playbook.usageCount}`,
    `**Last Updated:** ${new Date(playbook.lastUpdatedAt).toLocaleString()}`,
    '',
    `## Overview`,
    playbook.description,
    '',
    '## Steps',
  ];

  for (const step of playbook.steps.sort((a, b) => a.order - b.order)) {
    lines.push(`### Step ${step.order}: ${step.title}`);
    lines.push(step.description);
    lines.push(`- **Expected Duration:** ${step.expectedDuration} minutes`);

    if (step.automation) {
      lines.push(`- **Automation:** ${step.automation}`);
    }

    if (step.successCriteria && step.successCriteria.length > 0) {
      lines.push('- **Success Criteria:**');
      for (const criterion of step.successCriteria) {
        lines.push(`  - ${criterion}`);
      }
    }

    if (step.commonPitfalls && step.commonPitfalls.length > 0) {
      lines.push('- **Common Pitfalls:**');
      for (const pitfall of step.commonPitfalls) {
        lines.push(`  - ${pitfall}`);
      }
    }

    lines.push('');
  }

  lines.push('## Tags');
  lines.push(playbook.tags.map((t) => `\`${t}\``).join(', '));

  return lines.join('\n');
}

/**
 * Reset playbook store (testing/admin only)
 */
export function resetPlaybookStore(): void {
  playbookStore.clear();
  improvementHistory.length = 0;
  analysisHistory.length = 0;
  incidentPlaybookMap.clear();

  for (const playbook of defaultPlaybooks) {
    playbookStore.set(playbook.id, JSON.parse(JSON.stringify(playbook)));
  }
}
