/**
 * Autonomous Monitoring Loop
 * Continuously observes production health and triggers autonomous responses
 * Runs every 60 seconds by default
 */

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  components: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
  }>;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    down: number;
  };
}

export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  trend: 'stable' | 'increasing' | 'decreasing';
  topError?: {
    signature: string;
    count: number;
  };
}

export interface MonitoringCheckResult {
  timestamp: string;
  health: HealthCheckResult;
  errors: ErrorMetrics;
  incident?: {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    details: string;
  };
}

export class MonitoringLoop {
  private intervalMs = 60000; // 60 seconds
  private isRunning = false;
  private checkHistory: MonitoringCheckResult[] = [];
  private maxHistorySize = 60; // Keep 60 checks (1 hour)
  private intervalId: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    console.log('[Governor] Monitoring loop initializing...');
    this.isRunning = true;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Governor] Monitoring loop already running');
      return;
    }

    await this.initialize();
    console.log('[Governor] Monitoring loop started (60s interval)');

    // Run first check immediately
    await this.performCheck();

    // Schedule recurring checks
    this.intervalId = setInterval(() => {
      this.performCheck().catch((error) => {
        console.error('[Governor] Monitoring check failed:', error);
      });
    }, this.intervalMs);
  }

  private async performCheck(): Promise<void> {
    const result: MonitoringCheckResult = {
      timestamp: new Date().toISOString(),
      health: await this.checkHealth(),
      errors: await this.checkErrors(),
    };

    // Store in history
    this.checkHistory.push(result);
    if (this.checkHistory.length > this.maxHistorySize) {
      this.checkHistory.shift();
    }

    // Analyze and respond to issues
    await this.analyzeAndRespond(result);
  }

  private async checkHealth(): Promise<HealthCheckResult> {
    // In production, this would call the /api/health/detailed endpoint
    // For now, return mock data
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: [
        { name: 'database', status: 'healthy', responseTime: 25 },
        { name: 'supabase_auth', status: 'healthy', responseTime: 30 },
        { name: 'session_store', status: 'healthy', responseTime: 15 },
        { name: 'rls_policies', status: 'healthy', responseTime: 40 },
        { name: 'database_triggers', status: 'healthy', responseTime: 20 },
        { name: 'stored_functions', status: 'healthy', responseTime: 35 },
      ],
      summary: {
        total: 6,
        healthy: 6,
        degraded: 0,
        down: 0,
      },
    };
  }

  private async checkErrors(): Promise<ErrorMetrics> {
    // In production, this would call the /api/errors endpoint
    // For now, return healthy baseline
    return {
      totalErrors: 0,
      errorRate: 0,
      trend: 'stable',
    };
  }

  private async analyzeAndRespond(
    result: MonitoringCheckResult
  ): Promise<void> {
    // Step 1: Detect incidents
    const incident = this.detectIncident(result);
    if (incident) {
      result.incident = incident;
    }

    // Step 2: Log findings
    this.logMonitoringResult(result);

    // Step 3: Autonomous response
    if (incident) {
      await this.respondToIncident(incident);
    }

    // Step 4: Trend detection
    this.analyzeTrends();
  }

  private detectIncident(
    result: MonitoringCheckResult
  ): MonitoringCheckResult['incident'] | undefined {
    // Critical: Any component down
    if (result.health.summary.down > 0) {
      return {
        id: `INC-${Date.now()}`,
        severity: 'critical',
        type: 'component_down',
        details: `${result.health.summary.down}/${result.health.summary.total} components are down`,
      };
    }

    // Critical: Error rate > 5%
    if (result.errors.errorRate > 5) {
      return {
        id: `INC-${Date.now()}`,
        severity: 'critical',
        type: 'high_error_rate',
        details: `Error rate ${result.errors.errorRate.toFixed(2)}% exceeds critical threshold (5%)`,
      };
    }

    // Warning: Error rate 2-5%
    if (result.errors.errorRate > 2) {
      return {
        id: `INC-${Date.now()}`,
        severity: 'high',
        type: 'elevated_error_rate',
        details: `Error rate ${result.errors.errorRate.toFixed(2)}% is elevated`,
      };
    }

    // Warning: Component degraded
    if (result.health.summary.degraded > 0) {
      return {
        id: `INC-${Date.now()}`,
        severity: 'medium',
        type: 'component_degraded',
        details: `${result.health.summary.degraded} component(s) degraded`,
      };
    }

    return undefined;
  }

  private async respondToIncident(
    incident: MonitoringCheckResult['incident']
  ): Promise<void> {
    if (!incident) return;

    if (incident.severity === 'critical') {
      // Critical incidents escalate to founder immediately
      console.log(`[🔴 CRITICAL] ${incident.type}: ${incident.details}`);
      // In production: Send alert to founder
    } else if (incident.severity === 'high') {
      // High severity: Auto-investigate
      console.log(`[🟠 WARNING] ${incident.type}: ${incident.details}`);
      // In production: Create investigation task
    } else {
      // Medium/low: Log for monitoring
      console.log(`[🟡 INFO] ${incident.type}: ${incident.details}`);
    }
  }

  private logMonitoringResult(result: MonitoringCheckResult): void {
    const healthStatus = result.health.status;
    const errorRate = result.errors.errorRate.toFixed(2);

    const status =
      result.incident && result.incident.severity === 'critical'
        ? '🔴 CRITICAL'
        : result.incident && result.incident.severity === 'high'
          ? '🟠 WARNING'
          : result.incident
            ? '🟡 INFO'
            : '✅ HEALTHY';

    console.log(
      `[Governor] ${status} | Health: ${healthStatus} | Errors: ${errorRate}% | Time: ${result.timestamp}`
    );
  }

  private analyzeTrends(): void {
    if (this.checkHistory.length < 3) return;

    const recent = this.checkHistory.slice(-3);

    // Detect error rate trend
    const errorRates = recent.map((c) => c.errors.errorRate);
    const isIncreasing =
      errorRates[1] > errorRates[0] && errorRates[2] > errorRates[1];

    if (isIncreasing && errorRates[2] > 1) {
      console.log(
        '[Governor] ⚠️  Error rate increasing - preparing investigation'
      );
    }

    // Detect health degradation trend
    const downCounts = recent.map((c) => c.health.summary.down);
    if (downCounts[2] > 0 && downCounts.some((c) => c === 0)) {
      console.log('[Governor] ⚠️  Intermittent component failures detected');
    }
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[Governor] Monitoring loop stopped');
  }

  getHistory(): MonitoringCheckResult[] {
    return this.checkHistory;
  }

  getLatestCheck(): MonitoringCheckResult | undefined {
    return this.checkHistory[this.checkHistory.length - 1];
  }

  getSummary(): {
    totalChecks: number;
    incidents: number;
    lastIncidentTime?: string;
    averageErrorRate: number;
  } {
    const incidents = this.checkHistory.filter((c) => c.incident).length;
    const avgErrorRate =
      this.checkHistory.length > 0
        ? this.checkHistory.reduce((sum, c) => sum + c.errors.errorRate, 0) /
          this.checkHistory.length
        : 0;

    return {
      totalChecks: this.checkHistory.length,
      incidents,
      lastIncidentTime: this.checkHistory.find((c) => c.incident)?.timestamp,
      averageErrorRate: avgErrorRate,
    };
  }
}

// Export singleton instance
export const monitoringLoop = new MonitoringLoop();
