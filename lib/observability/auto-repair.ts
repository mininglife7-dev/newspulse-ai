/**
 * Auto-Repair Workflows
 * Autonomous remediation for common production issues
 * Triggered by MonitoringLoop incident detection
 */

export interface RepairAction {
  id: string;
  type: 'investigate' | 'optimize' | 'scale' | 'rollback';
  severity: 'low' | 'medium' | 'high' | 'critical';
  target: string; // What to repair (e.g., 'error_rate', 'slow_queries', 'connection_pool')
  description: string;
  suggestedFix: string;
  autoExecute: boolean; // Should this be auto-executed or just logged?
  timestamp: string;
}

export interface InvestigationResult {
  id: string;
  timestamp: string;
  issueType: string; // 'high_error_rate', 'slow_query', 'connection_pool'
  severity: 'high' | 'critical';
  findings: string[];
  rootCausePossibilities: string[];
  recommendedActions: string[];
  suggestedFixes: RepairAction[];
}

export class AutoRepairEngine {
  private investigations: InvestigationResult[] = [];
  private maxInvestigationHistory = 100;

  async investigateHighErrorRate(
    errorRate: number,
    topError?: { signature: string; count: number }
  ): Promise<InvestigationResult> {
    const investigationId = `INV-${Date.now()}`;
    const findings: string[] = [];
    const rootCausePossibilities: string[] = [];
    const suggestedFixes: RepairAction[] = [];

    // Analyze error rate level
    if (errorRate > 5) {
      findings.push(`Critical error rate detected: ${errorRate.toFixed(2)}%`);
      rootCausePossibilities.push(
        'Database connection pool exhaustion',
        'External service timeout or failure',
        'Memory leak causing cascading failures'
      );
    } else if (errorRate > 2) {
      findings.push(`Elevated error rate detected: ${errorRate.toFixed(2)}%`);
      rootCausePossibilities.push(
        'Slow query causing request timeouts',
        'High load causing temporary failures',
        'Recent deployment introduced regression'
      );
    }

    // Analyze error signature if available
    if (topError && topError.count > 0) {
      findings.push(
        `Top error signature: ${topError.signature} (${topError.count} occurrences)`
      );

      // Categorize error type
      if (topError.signature.includes('timeout')) {
        rootCausePossibilities.push('Query or external service timeout');
        suggestedFixes.push({
          id: `FIX-${investigationId}-1`,
          type: 'optimize',
          severity: 'high',
          target: 'slow_queries',
          description: 'Timeout errors suggest slow queries',
          suggestedFix:
            'Analyze slow query logs, add missing indexes, optimize query plans',
          autoExecute: false,
          timestamp: new Date().toISOString(),
        });
      } else if (
        topError.signature.includes('connection') ||
        topError.signature.includes('pool')
      ) {
        rootCausePossibilities.push('Connection pool exhaustion');
        suggestedFixes.push({
          id: `FIX-${investigationId}-2`,
          type: 'scale',
          severity: 'high',
          target: 'connection_pool',
          description: 'Connection pool exhausted',
          suggestedFix: 'Increase max connections or optimize connection usage',
          autoExecute: false,
          timestamp: new Date().toISOString(),
        });
      } else if (topError.signature.includes('memory')) {
        rootCausePossibilities.push('Memory leak or exhaustion');
        suggestedFixes.push({
          id: `FIX-${investigationId}-3`,
          type: 'investigate',
          severity: 'critical',
          target: 'memory_usage',
          description: 'Memory error detected',
          suggestedFix:
            'Check for memory leaks, restart service if necessary, review recent changes',
          autoExecute: false,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Recommendations based on severity
    const recommendedActions: string[] = [];
    if (errorRate > 5) {
      recommendedActions.push('Escalate to on-call engineer');
      recommendedActions.push('Check external service status');
      recommendedActions.push('Analyze error logs for patterns');
      recommendedActions.push('Consider temporary traffic reduction');
    } else if (errorRate > 2) {
      recommendedActions.push('Review recent deployments');
      recommendedActions.push('Check database query performance');
      recommendedActions.push('Monitor error rate for 10+ minutes');
      recommendedActions.push('Prepare rollback if rate continues to increase');
    }

    // Standard investigation action
    suggestedFixes.push({
      id: `FIX-${investigationId}-investigate`,
      type: 'investigate',
      severity: errorRate > 5 ? 'critical' : 'high',
      target: 'error_rate',
      description: `Error rate ${errorRate.toFixed(2)}% - Auto-investigation initiated`,
      suggestedFix:
        'Review error logs, check external service status, verify database connectivity',
      autoExecute: true,
      timestamp: new Date().toISOString(),
    });

    const result: InvestigationResult = {
      id: investigationId,
      timestamp: new Date().toISOString(),
      issueType: 'high_error_rate',
      severity: errorRate > 5 ? 'critical' : 'high',
      findings,
      rootCausePossibilities,
      recommendedActions,
      suggestedFixes,
    };

    // Store investigation
    this.investigations.push(result);
    if (this.investigations.length > this.maxInvestigationHistory) {
      this.investigations.shift();
    }

    console.log(
      `[Governor] Investigation ${investigationId} created for error rate ${errorRate.toFixed(2)}%`
    );

    return result;
  }

  async investigateSlowQueries(
    slowQueryCount: number,
    avgLatencyMs: number
  ): Promise<InvestigationResult> {
    const investigationId = `INV-${Date.now()}`;
    const findings: string[] = [];
    const rootCausePossibilities: string[] = [];
    const suggestedFixes: RepairAction[] = [];

    findings.push(`${slowQueryCount} slow queries detected`);
    findings.push(`Average latency: ${avgLatencyMs}ms`);

    if (avgLatencyMs > 2000) {
      findings.push('Critical query performance degradation');
      rootCausePossibilities.push(
        'Missing database indexes',
        'Table scans on large datasets',
        'Complex JOIN operations'
      );
    } else if (avgLatencyMs > 1000) {
      findings.push('Elevated query latency');
      rootCausePossibilities.push(
        'Non-optimal query plans',
        'High table cardinality',
        'Suboptimal indexes'
      );
    }

    suggestedFixes.push({
      id: `FIX-${investigationId}-index`,
      type: 'optimize',
      severity: 'high',
      target: 'slow_queries',
      description: 'Add indexes to optimize query performance',
      suggestedFix:
        'Analyze query execution plans, identify missing indexes on frequently filtered columns, test index impact',
      autoExecute: false,
      timestamp: new Date().toISOString(),
    });

    const recommendedActions = [
      'Review query execution plans',
      'Check for missing indexes',
      'Consider query optimization',
      'Monitor query performance after changes',
    ];

    const result: InvestigationResult = {
      id: investigationId,
      timestamp: new Date().toISOString(),
      issueType: 'slow_query',
      severity: avgLatencyMs > 2000 ? 'critical' : 'high',
      findings,
      rootCausePossibilities,
      recommendedActions,
      suggestedFixes,
    };

    this.investigations.push(result);
    if (this.investigations.length > this.maxInvestigationHistory) {
      this.investigations.shift();
    }

    console.log(
      `[Governor] Investigation ${investigationId} created for ${slowQueryCount} slow queries`
    );

    return result;
  }

  async investigateConnectionPoolExhaustion(
    utilizationPercent: number,
    activeConnections: number,
    maxConnections: number
  ): Promise<InvestigationResult> {
    const investigationId = `INV-${Date.now()}`;
    const findings: string[] = [];
    const rootCausePossibilities: string[] = [];
    const suggestedFixes: RepairAction[] = [];

    findings.push(
      `Connection pool at ${utilizationPercent.toFixed(1)}% utilization`
    );
    findings.push(`Active: ${activeConnections}/${maxConnections}`);

    if (utilizationPercent > 95) {
      findings.push(
        'CRITICAL: Pool nearly exhausted, new connections will be rejected'
      );
      rootCausePossibilities.push(
        'Connection leak (connections not being closed)',
        'Insufficient pool size for current load',
        'Long-running queries holding connections'
      );

      suggestedFixes.push({
        id: `FIX-${investigationId}-scale`,
        type: 'scale',
        severity: 'critical',
        target: 'connection_pool',
        description: 'Connection pool at critical capacity',
        suggestedFix:
          'Immediately increase max connections, investigate connection leaks, optimize query patterns',
        autoExecute: false,
        timestamp: new Date().toISOString(),
      });
    } else if (utilizationPercent > 80) {
      findings.push('WARNING: Limited capacity for traffic spikes');
      rootCausePossibilities.push(
        'Steady increase in connection demand',
        'Insufficient pool provisioning'
      );

      suggestedFixes.push({
        id: `FIX-${investigationId}-optimize`,
        type: 'optimize',
        severity: 'high',
        target: 'connection_usage',
        description: 'Connection pool approaching limits',
        suggestedFix:
          'Review connection usage patterns, implement connection pooling library, optimize long-running transactions',
        autoExecute: false,
        timestamp: new Date().toISOString(),
      });
    }

    const recommendedActions = [
      'Monitor active connection count',
      'Review application connection handling',
      'Implement connection pooling best practices',
      utilizationPercent > 95
        ? 'Prepare to scale connections immediately'
        : 'Plan for scale before reaching critical',
    ];

    const result: InvestigationResult = {
      id: investigationId,
      timestamp: new Date().toISOString(),
      issueType: 'connection_pool',
      severity: utilizationPercent > 95 ? 'critical' : 'high',
      findings,
      rootCausePossibilities,
      recommendedActions,
      suggestedFixes,
    };

    this.investigations.push(result);
    if (this.investigations.length > this.maxInvestigationHistory) {
      this.investigations.shift();
    }

    console.log(
      `[Governor] Investigation ${investigationId} created for connection pool exhaustion (${utilizationPercent.toFixed(1)}%)`
    );

    return result;
  }

  getInvestigations(): InvestigationResult[] {
    return this.investigations;
  }

  getLatestInvestigation(): InvestigationResult | undefined {
    return this.investigations[this.investigations.length - 1];
  }

  getInvestigationsByType(type: string): InvestigationResult[] {
    return this.investigations.filter((inv) => inv.issueType === type);
  }
}

// Export singleton instance
export const autoRepairEngine = new AutoRepairEngine();
