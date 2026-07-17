/**
 * Alert Configuration Reference
 *
 * Defines alert rules, thresholds, and escalation policies for production monitoring.
 * This file documents the configuration to be set up in Sentry once DSN is activated.
 *
 * Not used in runtime - this is a reference guide for alert setup.
 * To activate: Configure rules in Sentry dashboard after DSN activation.
 */

export interface AlertRule {
  name: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
    threshold: number;
    window: string; // e.g., "1m", "5m", "10m"
  };
  filters?: {
    environment?: string[];
    transaction?: string[];
    excludeTransaction?: string[];
    excludeUserAgent?: string[];
  };
  actions: {
    slack?: {
      channel: string;
      mention?: string; // "@channel", "@on-call-team"
    };
    pagerduty?: {
      severity: 'critical' | 'error' | 'warning' | 'info';
    };
    github?: {
      autoCreateIssue: boolean;
    };
    email?: {
      recipients: string[];
    };
  };
}

/**
 * Critical Alerts (Immediate page to on-call engineer)
 */
export const CRITICAL_ALERTS: AlertRule[] = [
  {
    name: 'Error Rate Spike - Critical',
    description: 'More than 50 errors per minute indicates service failure',
    severity: 'critical',
    condition: {
      metric: 'error_rate',
      operator: 'gt',
      threshold: 50, // errors/min
      window: '1m',
    },
    filters: {
      environment: ['production', 'staging'],
    },
    actions: {
      slack: {
        channel: '#critical-alerts',
        mention: '@on-call',
      },
      pagerduty: {
        severity: 'critical',
      },
      github: {
        autoCreateIssue: true,
      },
    },
  },

  {
    name: 'Availability Drop - Critical',
    description: 'System availability below 99% for 5 minutes',
    severity: 'critical',
    condition: {
      metric: 'availability',
      operator: 'lt',
      threshold: 0.99, // 99%
      window: '5m',
    },
    filters: {
      environment: ['production'],
    },
    actions: {
      slack: {
        channel: '#critical-alerts',
        mention: '@on-call',
      },
      pagerduty: {
        severity: 'critical',
      },
      github: {
        autoCreateIssue: true,
      },
    },
  },

  {
    name: 'Database Connection Pool Exhausted',
    description: 'No available database connections',
    severity: 'critical',
    condition: {
      metric: 'db.connection_pool_exhausted',
      operator: 'gt',
      threshold: 0,
      window: 'immediate',
    },
    filters: {
      environment: ['production'],
    },
    actions: {
      slack: {
        channel: '#critical-alerts',
        mention: '@on-call',
      },
      pagerduty: {
        severity: 'critical',
      },
    },
  },

  {
    name: 'API Response Timeout Cascade',
    description: 'More than 75% of requests timing out',
    severity: 'critical',
    condition: {
      metric: 'request_timeout_rate',
      operator: 'gt',
      threshold: 0.75, // 75%
      window: '30s',
    },
    filters: {
      environment: ['production'],
    },
    actions: {
      slack: {
        channel: '#critical-alerts',
        mention: '@on-call',
      },
      pagerduty: {
        severity: 'critical',
      },
    },
  },
];

/**
 * Warning Alerts (On-call review, investigation required)
 */
export const WARNING_ALERTS: AlertRule[] = [
  {
    name: 'Latency Regression - p95 Spike',
    description: 'API response time p95 increased by 50% or more',
    severity: 'warning',
    condition: {
      metric: 'latency_p95_regression',
      operator: 'gt',
      threshold: 1.5, // 50% increase
      window: '10m',
    },
    filters: {
      environment: ['production'],
      transaction: ['/api/*'],
    },
    actions: {
      slack: {
        channel: '#alerts-performance',
      },
      github: {
        autoCreateIssue: false, // Summarize in weekly report
      },
    },
  },

  {
    name: 'Error Rate Elevated',
    description: 'Error rate between 10-50 errors per minute',
    severity: 'warning',
    condition: {
      metric: 'error_rate',
      operator: 'gt',
      threshold: 10, // errors/min
      window: '5m',
    },
    filters: {
      environment: ['production', 'staging'],
    },
    actions: {
      slack: {
        channel: '#alerts-performance',
      },
    },
  },

  {
    name: 'Memory Pressure - Heap Usage High',
    description: 'Process heap memory usage above 85%',
    severity: 'warning',
    condition: {
      metric: 'memory.heap_usage',
      operator: 'gt',
      threshold: 0.85, // 85%
      window: '5m',
    },
    filters: {
      environment: ['production'],
    },
    actions: {
      slack: {
        channel: '#alerts-performance',
      },
    },
  },

  {
    name: 'Slow Database Query Detected',
    description: 'Database query execution time exceeds 2 seconds',
    severity: 'warning',
    condition: {
      metric: 'db.query_duration',
      operator: 'gt',
      threshold: 2000, // milliseconds
      window: 'per_query',
    },
    filters: {
      environment: ['production', 'staging'],
    },
    actions: {
      slack: {
        channel: '#database-alerts',
      },
    },
  },

  {
    name: 'Session Replay Backlog',
    description: 'Session replay processing lag exceeds 60 seconds',
    severity: 'warning',
    condition: {
      metric: 'session_replay_lag',
      operator: 'gt',
      threshold: 60000, // milliseconds
      window: 'continuous',
    },
    filters: {
      environment: ['production'],
    },
    actions: {
      slack: {
        channel: '#alerts-performance',
      },
    },
  },

  {
    name: 'High Error Rate - Assessment Endpoint',
    description: 'Assessment API endpoint error rate spike',
    severity: 'warning',
    condition: {
      metric: 'error_rate',
      operator: 'gt',
      threshold: 5, // errors/min
      window: '5m',
    },
    filters: {
      environment: ['production'],
      transaction: ['/api/assessment*'],
    },
    actions: {
      slack: {
        channel: '#alerts-performance',
      },
    },
  },
];

/**
 * Info Alerts (Awareness and trends)
 */
export const INFO_ALERTS: AlertRule[] = [
  {
    name: 'New Error Signature Detected',
    description: 'First occurrence of a new error pattern',
    severity: 'info',
    condition: {
      metric: 'error.first_seen',
      operator: 'gt',
      threshold: 0,
      window: 'per_error',
    },
    filters: {
      environment: ['production', 'staging'],
      excludeUserAgent: ['/bot/', '/crawler/', '/spider/'],
    },
    actions: {
      slack: {
        channel: '#errors',
      },
      github: {
        autoCreateIssue: true,
      },
    },
  },

  {
    name: 'Deployment Success Notification',
    description: 'Production deployment completed successfully',
    severity: 'info',
    condition: {
      metric: 'deployment.success',
      operator: 'eq',
      threshold: 1,
      window: 'per_deployment',
    },
    filters: {
      environment: ['production'],
    },
    actions: {
      slack: {
        channel: '#deployments',
      },
    },
  },

  {
    name: 'Performance Improvement Detected',
    description: 'API response time improved significantly',
    severity: 'info',
    condition: {
      metric: 'latency_p95_improvement',
      operator: 'gt',
      threshold: 0.2, // 20% improvement
      window: '1h',
    },
    filters: {
      environment: ['production'],
    },
    actions: {
      slack: {
        channel: '#alerts-performance',
      },
    },
  },

  {
    name: 'Weekly Performance Baseline',
    description: 'Weekly performance baseline measurement completed',
    severity: 'info',
    condition: {
      metric: 'baseline.weekly_measurement',
      operator: 'gt',
      threshold: 0,
      window: 'weekly',
    },
    actions: {
      slack: {
        channel: '#alerts-performance',
      },
      email: {
        recipients: ['team@euro-ai.com'],
      },
    },
  },

  {
    name: 'Sentry Quota Usage Alert',
    description: 'Monthly Sentry event quota usage above 80%',
    severity: 'info',
    condition: {
      metric: 'sentry.quota_usage',
      operator: 'gt',
      threshold: 0.8, // 80%
      window: 'daily',
    },
    actions: {
      email: {
        recipients: ['engineering-lead@euro-ai.com'],
      },
    },
  },
];

/**
 * Alert Escalation Policy
 *
 * Determines how alerts are routed and who gets notified
 */
export const ESCALATION_POLICY = {
  // Critical alerts page on-call engineer immediately
  critical: {
    channels: ['#critical-alerts', 'pagerduty', 'github'],
    notification: {
      slack: {
        mention: '@on-call',
        threadReplyThreshold: 'immediate',
      },
      pagerduty: {
        escalationDelayMinutes: 5, // Escalate to manager if not acknowledged
      },
      github: {
        createIssueWithLabel: 'critical',
        autoAssignToTeam: true,
      },
    },
    sloResponse: '5 minutes', // Must respond within 5 min
    sloBreach: '15 minutes', // Must have action within 15 min
  },

  // Warning alerts go to team for investigation
  warning: {
    channels: ['#alerts-performance', '#database-alerts'],
    notification: {
      slack: {
        mention: 'none',
        threadReplyThreshold: '5 minutes',
      },
      github: {
        createIssueWithLabel: 'warning',
        autoAssignToTeam: false,
      },
    },
    sloResponse: '30 minutes',
    sloBreach: '2 hours',
  },

  // Info alerts are logged for trend analysis
  info: {
    channels: ['#deployments', '#errors', '#alerts-performance'],
    notification: {
      slack: {
        mention: 'none',
        threadReplyThreshold: 'none', // Summarized in daily digest
      },
    },
    sloResponse: 'none',
    sloBreach: 'none',
  },
};

/**
 * False Positive Prevention Filters
 *
 * Applied to all alerts to reduce noise
 */
export const FALSE_POSITIVE_FILTERS = {
  // Exclude test/staging data
  excludeEnvironments: ['development', 'test', 'local'],

  // Exclude load testing
  excludeUserAgent: [
    '/load[-_]?test/i',
    '/ab\s+test/i',
    '/jmeter/i',
    '/gatling/i',
  ],

  // Exclude scheduled jobs (add grace period instead)
  excludeTransaction: ['/api/batch/*', '/api/cron/*', '/api/scheduled/*'],

  // Exclude health checks from error rate
  excludeHealthCheckTransaction: ['/api/health', '/api/ping', '/api/status'],

  // Grace period after deployment (reduce false positives from deploy transients)
  deploymentGracePeriod: 5, // minutes

  // Ignore very old events (likely retries or replays)
  ignoreOlderThan: 24, // hours
};

/**
 * Alert Notification Templates
 *
 * Slack message templates for different alert types
 */
export const NOTIFICATION_TEMPLATES = {
  critical: {
    header: '🔴 CRITICAL ALERT',
    fields: [
      'Count',
      'Affected Endpoints',
      'Error Type',
      'Start Time',
      'Links',
    ],
    mention: '@on-call',
  },

  warning: {
    header: '🟠 WARNING',
    fields: ['Metric', 'Value', 'Threshold', 'Duration', 'Links'],
    mention: 'none',
  },

  info: {
    header: 'ℹ️ INFO',
    fields: ['Event', 'Timestamp', 'Details'],
    mention: 'none',
  },
};

/**
 * Runbook Links
 *
 * Quick links to incident response procedures
 */
export const RUNBOOKS = {
  availability:
    'https://github.com/mininglife7-dev/newspulse-ai/wiki/Runbook-Availability',
  database:
    'https://github.com/mininglife7-dev/newspulse-ai/wiki/Runbook-Database',
  deployment:
    'https://github.com/mininglife7-dev/newspulse-ai/wiki/Runbook-Deployment-Rollback',
  latency:
    'https://github.com/mininglife7-dev/newspulse-ai/wiki/Runbook-Performance-Debugging',
  memory:
    'https://github.com/mininglife7-dev/newspulse-ai/wiki/Runbook-Memory-Leak',
  escalation:
    'https://github.com/mininglife7-dev/newspulse-ai/wiki/Runbook-Escalation',
};

/**
 * Configuration Export
 *
 * Combine all rules for reference
 */
export const ALL_ALERT_RULES = {
  critical: CRITICAL_ALERTS,
  warning: WARNING_ALERTS,
  info: INFO_ALERTS,
  escalation: ESCALATION_POLICY,
  filters: FALSE_POSITIVE_FILTERS,
  runbooks: RUNBOOKS,
  templates: NOTIFICATION_TEMPLATES,
};
