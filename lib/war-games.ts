/**
 * DNS-026: Production War Games & Orchestration Validation
 *
 * Synthetic incident scenarios for end-to-end orchestration testing.
 * Validates detection → analysis → response → learning → prevention pipeline.
 */

export interface WarGameScenario {
  name: string;
  description: string;
  category: 'deployment' | 'database' | 'api' | 'infrastructure' | 'cascading';
  severity: 'critical' | 'high' | 'medium';
  errorMetrics: {
    totalErrors: number;
    errorRate: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
  };
  errorPatterns: Array<{
    fingerprint: string;
    category: string;
    message: string;
    severity: string;
    occurrenceCount: number;
  }>;
  expectedDetectionTime: number; // milliseconds
  expectedRemediationTime: number; // milliseconds
  expectedIncidents: number;
}

export interface WarGameResult {
  scenarioName: string;
  executedAt: string;
  detectionTime: number; // milliseconds
  remediationTime: number; // milliseconds
  success: boolean;
  incidentsDetected: number;
  remediationExecuted: boolean;
  foundationAlerted: boolean;
  escalated: boolean;
  timeline: Array<{
    timestamp: string;
    phase: 'detection' | 'analysis' | 'decision' | 'remediation' | 'verification' | 'learning';
    system: string; // DNS-XXX
    action: string;
    result: 'success' | 'failure';
  }>;
  postMortemCreated: boolean;
  preventionIssuesCreated: number;
  metrics: {
    mttr: number; // Mean Time To Recovery
    mttd: number; // Mean Time To Detect
    successRateImpact: number; // Percentage
  };
}

/**
 * Scenario 1: Bad Deployment (Code + Database Schema Mismatch)
 */
export const deploymentMismatchScenario: WarGameScenario = {
  name: 'Deployment Schema Mismatch',
  description: 'New code version expects database column that old schema lacks',
  category: 'deployment',
  severity: 'critical',
  errorMetrics: {
    totalErrors: 2847,
    errorRate: 23.5,
    errorsByCategory: {
      database: 2100,
      'type-error': 500,
      timeout: 247,
    },
    errorsBySeverity: {
      critical: 2100,
      high: 500,
      medium: 247,
    },
  },
  errorPatterns: [
    {
      fingerprint: 'db_column_not_found_user_preferences',
      category: 'database',
      message: 'column "preferences" does not exist',
      severity: 'critical',
      occurrenceCount: 2100,
    },
    {
      fingerprint: 'schema_mismatch_api_response',
      category: 'type-error',
      message: 'Cannot read property preferences of undefined',
      severity: 'high',
      occurrenceCount: 500,
    },
  ],
  expectedDetectionTime: 45, // 45 milliseconds
  expectedRemediationTime: 120000, // 2 minutes (rollback)
  expectedIncidents: 1,
};

/**
 * Scenario 2: Database Connection Pool Exhaustion
 */
export const connectionPoolExhaustionScenario: WarGameScenario = {
  name: 'Connection Pool Exhaustion',
  description: 'Slow queries leak connections; new requests timeout',
  category: 'database',
  severity: 'high',
  errorMetrics: {
    totalErrors: 1856,
    errorRate: 14.2,
    errorsByCategory: {
      timeout: 1450,
      'pool-exhaustion': 406,
    },
    errorsBySeverity: {
      high: 1450,
      medium: 406,
    },
  },
  errorPatterns: [
    {
      fingerprint: 'connection_timeout_readonly_replica',
      category: 'timeout',
      message: 'Query timeout: read-only replica connection pool exhausted',
      severity: 'high',
      occurrenceCount: 1450,
    },
    {
      fingerprint: 'pool_wait_queue_full',
      category: 'pool-exhaustion',
      message: 'Connection pool wait queue exceeded limit',
      severity: 'medium',
      occurrenceCount: 406,
    },
  ],
  expectedDetectionTime: 60, // 60 milliseconds
  expectedRemediationTime: 180000, // 3 minutes (scale connections + kill slow queries)
  expectedIncidents: 1,
};

/**
 * Scenario 3: Cascading API Failure (Third-party Dependency Down)
 */
export const cascadingApiFailureScenario: WarGameScenario = {
  name: 'Cascading API Failure',
  description: 'Third-party API timeout causes cascade to dependent services',
  category: 'cascading',
  severity: 'high',
  errorMetrics: {
    totalErrors: 3200,
    errorRate: 31.8,
    errorsByCategory: {
      'external-api': 2400,
      'circuit-breaker': 800,
    },
    errorsBySeverity: {
      high: 2400,
      medium: 800,
    },
  },
  errorPatterns: [
    {
      fingerprint: 'firecrawl_api_timeout_search',
      category: 'external-api',
      message: 'Firecrawl search API timeout (>30s)',
      severity: 'high',
      occurrenceCount: 2400,
    },
    {
      fingerprint: 'search_circuit_breaker_open',
      category: 'circuit-breaker',
      message: 'Search service circuit breaker opened after 5 consecutive failures',
      severity: 'medium',
      occurrenceCount: 800,
    },
  ],
  expectedDetectionTime: 35, // 35 milliseconds
  expectedRemediationTime: 300000, // 5 minutes (fallback + wait for dependency recovery)
  expectedIncidents: 2,
};

/**
 * Scenario 4: Memory Leak (Process Gradual Degradation)
 */
export const memoryLeakScenario: WarGameScenario = {
  name: 'Memory Leak Degradation',
  description: 'Process heap grows over time; requests slow down, then fail',
  category: 'infrastructure',
  severity: 'high',
  errorMetrics: {
    totalErrors: 950,
    errorRate: 8.7,
    errorsByCategory: {
      'memory-pressure': 650,
      timeout: 300,
    },
    errorsBySeverity: {
      high: 650,
      medium: 300,
    },
  },
  errorPatterns: [
    {
      fingerprint: 'heap_size_warning_800mb',
      category: 'memory-pressure',
      message: 'Process heap at 800MB (90% of limit); garbage collection pausing requests',
      severity: 'high',
      occurrenceCount: 650,
    },
    {
      fingerprint: 'request_timeout_gc_pause',
      category: 'timeout',
      message: 'Request timeout during garbage collection pause',
      severity: 'medium',
      occurrenceCount: 300,
    },
  ],
  expectedDetectionTime: 120, // 120 milliseconds (slower to detect)
  expectedRemediationTime: 60000, // 1 minute (rolling restart)
  expectedIncidents: 1,
};

/**
 * Scenario 5: Billing Limit Hit (Soft Limit, Graceful Degradation)
 */
export const billingLimitScenario: WarGameScenario = {
  name: 'Rate Limit / Billing Cap',
  description: 'External API rate limit or billing cap reached; service degrades',
  category: 'api',
  severity: 'medium',
  errorMetrics: {
    totalErrors: 420,
    errorRate: 3.2,
    errorsByCategory: {
      'rate-limit': 420,
    },
    errorsBySeverity: {
      medium: 420,
    },
  },
  errorPatterns: [
    {
      fingerprint: 'openai_rate_limit_exceeded',
      category: 'rate-limit',
      message: 'OpenAI API rate limit exceeded; queuing summarization requests',
      severity: 'medium',
      occurrenceCount: 420,
    },
  ],
  expectedDetectionTime: 50, // 50 milliseconds
  expectedRemediationTime: 3600000, // 1 hour (wait + alert founder for upgrade)
  expectedIncidents: 1,
};

/**
 * Generate all war game scenarios
 */
export function getAllScenarios(): WarGameScenario[] {
  return [
    deploymentMismatchScenario,
    connectionPoolExhaustionScenario,
    cascadingApiFailureScenario,
    memoryLeakScenario,
    billingLimitScenario,
  ];
}

/**
 * Validate a war game result
 */
export function validateWarGameResult(
  result: WarGameResult,
  scenario: WarGameScenario
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check detection time
  if (result.detectionTime > scenario.expectedDetectionTime * 2) {
    errors.push(
      `Detection too slow: ${result.detectionTime}ms (expected <${scenario.expectedDetectionTime * 2}ms)`
    );
  }

  // Check incident detection
  if (result.incidentsDetected !== scenario.expectedIncidents) {
    errors.push(
      `Wrong incident count: ${result.incidentsDetected} (expected ${scenario.expectedIncidents})`
    );
  }

  // Check critical timeline phases
  const phases = result.timeline.map((t) => t.phase);
  const requiredPhases: Array<'detection' | 'analysis' | 'decision'> = [
    'detection',
    'analysis',
    'decision',
  ];
  requiredPhases.forEach((phase) => {
    if (!phases.includes(phase)) {
      errors.push(`Missing phase: ${phase}`);
    }
  });

  // For critical severity, check remediation was attempted
  if (scenario.severity === 'critical' && !result.remediationExecuted) {
    errors.push('Critical incident but no remediation attempted');
  }

  // Check post-mortem for high/critical
  if (
    ['high', 'critical'].includes(scenario.severity) &&
    !result.postMortemCreated
  ) {
    errors.push('High/critical incident but no post-mortem created');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate war game metrics summary
 */
export function summarizeWarGameResults(
  results: WarGameResult[]
): {
  totalScenarios: number;
  successfulScenarios: number;
  avgDetectionTime: number;
  avgRemediationTime: number;
  foundationAlertRate: number;
  escalationRate: number;
  postMortemCreationRate: number;
} {
  const successful = results.filter((r) => r.success).length;
  const avgDetection =
    results.reduce((sum, r) => sum + r.detectionTime, 0) / results.length;
  const avgRemediation =
    results.reduce((sum, r) => sum + r.remediationTime, 0) / results.length;
  const alertRate = results.filter((r) => r.foundationAlerted).length / results.length;
  const escalationRate =
    results.filter((r) => r.escalated).length / results.length;
  const postMortemRate =
    results.filter((r) => r.postMortemCreated).length / results.length;

  return {
    totalScenarios: results.length,
    successfulScenarios: successful,
    avgDetectionTime: avgDetection,
    avgRemediationTime: avgRemediation,
    foundationAlertRate: alertRate,
    escalationRate,
    postMortemCreationRate: postMortemRate,
  };
}
