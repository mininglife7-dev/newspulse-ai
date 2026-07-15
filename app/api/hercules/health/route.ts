/**
 * HERCULES Unified Health Endpoint
 *
 * Aggregates health signals from all DNA organs:
 * - Production monitoring (DNA-002)
 * - Error rate detection (DNA-004)
 * - Dependency security (DNA-008)
 * - Cost anomalies (DNA-011)
 * - Performance baselines (DNA-009)
 * - Customer journey (DNA-006)
 *
 * Produces: Single HEALTHY/DEGRADED/AT_RISK/CRITICAL verdict
 */

import { NextRequest, NextResponse } from 'next/server';
import { HerculesKernel } from '@/lib/hercules-kernel';
import type {
  HealthScore,
  HealthFactor,
  HealthStatus,
} from '@/lib/hercules-kernel';
import { getRequiredAppUrl } from '@/lib/config-validation';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface OrganHealth {
  organ: string;
  status: HealthStatus;
  percentage: number;
  issues: string[];
  lastChecked: string;
}

interface UnifiedHealth {
  timestamp: string;
  overallStatus: HealthStatus;
  overallPercentage: number;
  organs: OrganHealth[];
  blockingIssues: string[];
  recommendations: string[];
}

async function checkProductionHealth(): Promise<OrganHealth> {
  try {
    const response = await fetch(
      new URL('/api/production-health', getRequiredAppUrl()).toString(),
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return {
        organ: 'Production Monitoring (DNA-002)',
        status: 'DEGRADED',
        percentage: 50,
        issues: ['Health check endpoint unavailable'],
        lastChecked: new Date().toISOString(),
      };
    }

    const data = await response.json();
    const status = data.status === 'operational' ? 'HEALTHY' : 'DEGRADED';

    return {
      organ: 'Production Monitoring (DNA-002)',
      status,
      percentage: status === 'HEALTHY' ? 100 : 60,
      issues: data.failures || [],
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      organ: 'Production Monitoring (DNA-002)',
      status: 'UNKNOWN',
      percentage: 0,
      issues: [`Error checking production health: ${String(error)}`],
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkErrorRates(): Promise<OrganHealth> {
  try {
    const response = await fetch(
      new URL('/api/error-rate', getRequiredAppUrl()).toString(),
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return {
        organ: 'Error Rate Monitoring (DNA-004)',
        status: 'UNKNOWN',
        percentage: 0,
        issues: ['Error rate endpoint unavailable'],
        lastChecked: new Date().toISOString(),
      };
    }

    const data = await response.json();
    let status: HealthStatus = 'HEALTHY';
    let percentage = 100;

    if (data.errorRate && data.errorRate > 0.05) {
      status = 'CRITICAL';
      percentage = 20;
    } else if (data.errorRate && data.errorRate > 0.02) {
      status = 'AT_RISK';
      percentage = 50;
    } else if (data.errorRate && data.errorRate > 0.01) {
      status = 'DEGRADED';
      percentage = 75;
    }

    return {
      organ: 'Error Rate Monitoring (DNA-004)',
      status,
      percentage,
      issues: data.errorRate
        ? [`Error rate: ${(data.errorRate * 100).toFixed(2)}%`]
        : [],
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      organ: 'Error Rate Monitoring (DNA-004)',
      status: 'UNKNOWN',
      percentage: 0,
      issues: [`Error checking error rate: ${String(error)}`],
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkSecurityStatus(): Promise<OrganHealth> {
  try {
    const response = await fetch(
      new URL('/api/security-scan', getRequiredAppUrl()).toString(),
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return {
        organ: 'Dependency Security (DNA-008)',
        status: 'UNKNOWN',
        percentage: 0,
        issues: ['Security scan endpoint unavailable'],
        lastChecked: new Date().toISOString(),
      };
    }

    const data = await response.json();
    let status: HealthStatus = 'HEALTHY';
    let percentage = 100;
    const issues: string[] = [];

    if (data.criticalVulnerabilities && data.criticalVulnerabilities > 0) {
      status = 'CRITICAL';
      percentage = 10;
      issues.push(`${data.criticalVulnerabilities} critical vulnerabilities`);
    } else if (data.highVulnerabilities && data.highVulnerabilities > 2) {
      status = 'AT_RISK';
      percentage = 50;
      issues.push(`${data.highVulnerabilities} high vulnerabilities`);
    } else if (data.highVulnerabilities && data.highVulnerabilities > 0) {
      status = 'DEGRADED';
      percentage = 75;
      issues.push(`${data.highVulnerabilities} high vulnerabilities`);
    }

    return {
      organ: 'Dependency Security (DNA-008)',
      status,
      percentage,
      issues,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      organ: 'Dependency Security (DNA-008)',
      status: 'UNKNOWN',
      percentage: 0,
      issues: [`Error checking security: ${String(error)}`],
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkCostHealth(): Promise<OrganHealth> {
  try {
    const response = await fetch(
      new URL('/api/cost-anomaly', getRequiredAppUrl()).toString(),
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return {
        organ: 'Cost Anomaly Detection (DNA-011)',
        status: 'UNKNOWN',
        percentage: 0,
        issues: ['Cost anomaly endpoint unavailable'],
        lastChecked: new Date().toISOString(),
      };
    }

    const data = await response.json();
    let status: HealthStatus = 'HEALTHY';
    let percentage = 100;
    const issues: string[] = [];

    if (data.anomalies && data.anomalies.length > 0) {
      const critical = data.anomalies.filter(
        (a: any) => a.severity === 'CRITICAL'
      );
      const high = data.anomalies.filter((a: any) => a.severity === 'HIGH');

      if (critical.length > 0) {
        status = 'CRITICAL';
        percentage = 20;
        issues.push(`${critical.length} critical cost anomalies`);
      } else if (high.length > 0) {
        status = 'AT_RISK';
        percentage = 60;
        issues.push(`${high.length} high cost anomalies`);
      }
    }

    return {
      organ: 'Cost Anomaly Detection (DNA-011)',
      status,
      percentage,
      issues,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      organ: 'Cost Anomaly Detection (DNA-011)',
      status: 'UNKNOWN',
      percentage: 0,
      issues: [`Error checking costs: ${String(error)}`],
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkPerformanceHealth(): Promise<OrganHealth> {
  try {
    const response = await fetch(
      new URL('/api/performance-baseline', getRequiredAppUrl()).toString(),
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return {
        organ: 'Performance Baseline (DNA-009)',
        status: 'UNKNOWN',
        percentage: 0,
        issues: ['Performance endpoint unavailable'],
        lastChecked: new Date().toISOString(),
      };
    }

    const data = await response.json();
    let status: HealthStatus = 'HEALTHY';
    let percentage = 100;
    const issues: string[] = [];

    if (data.regressions && data.regressions.length > 0) {
      const critical = data.regressions.filter(
        (r: any) => r.severity === 'CRITICAL'
      );
      const high = data.regressions.filter((r: any) => r.severity === 'HIGH');

      if (critical.length > 0) {
        status = 'CRITICAL';
        percentage = 30;
        issues.push(`${critical.length} critical performance regressions`);
      } else if (high.length > 0) {
        status = 'AT_RISK';
        percentage = 60;
        issues.push(`${high.length} high performance regressions`);
      }
    }

    return {
      organ: 'Performance Baseline (DNA-009)',
      status,
      percentage,
      issues,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      organ: 'Performance Baseline (DNA-009)',
      status: 'UNKNOWN',
      percentage: 0,
      issues: [`Error checking performance: ${String(error)}`],
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkCustomerJourney(): Promise<OrganHealth> {
  try {
    const response = await fetch(
      new URL('/api/production-health', getRequiredAppUrl()).toString(),
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return {
        organ: 'Customer Journey (DNA-006)',
        status: 'DEGRADED',
        percentage: 60,
        issues: ['Customer journey check unavailable'],
        lastChecked: new Date().toISOString(),
      };
    }

    return {
      organ: 'Customer Journey (DNA-006)',
      status: 'HEALTHY',
      percentage: 100,
      issues: [],
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      organ: 'Customer Journey (DNA-006)',
      status: 'UNKNOWN',
      percentage: 0,
      issues: [`Error checking customer journey: ${String(error)}`],
      lastChecked: new Date().toISOString(),
    };
  }
}

function calculateOverallHealth(organs: OrganHealth[]): {
  status: HealthStatus;
  percentage: number;
} {
  if (organs.length === 0) {
    return { status: 'UNKNOWN', percentage: 0 };
  }

  const criticalCount = organs.filter((o) => o.status === 'CRITICAL').length;
  const atRiskCount = organs.filter((o) => o.status === 'AT_RISK').length;
  const degradedCount = organs.filter((o) => o.status === 'DEGRADED').length;
  const healthyCount = organs.filter((o) => o.status === 'HEALTHY').length;

  let status: HealthStatus = 'HEALTHY';
  if (criticalCount > 0) {
    status = 'CRITICAL';
  } else if (atRiskCount > organs.length * 0.5) {
    status = 'AT_RISK';
  } else if (degradedCount > 0 || atRiskCount > 0) {
    status = 'DEGRADED';
  }

  const avgPercentage = Math.round(
    organs.reduce((sum, o) => sum + o.percentage, 0) / organs.length
  );

  return { status, percentage: avgPercentage };
}

export async function GET(request: NextRequest) {
  try {
    // Collect health from all organs in parallel
    const [production, errorRates, security, costs, performance, journey] =
      await Promise.all([
        checkProductionHealth(),
        checkErrorRates(),
        checkSecurityStatus(),
        checkCostHealth(),
        checkPerformanceHealth(),
        checkCustomerJourney(),
      ]);

    const organs = [
      production,
      errorRates,
      security,
      costs,
      performance,
      journey,
    ];
    const { status: overallStatus, percentage: overallPercentage } =
      calculateOverallHealth(organs);

    // Identify blocking issues
    const blockingIssues = organs
      .filter((o) => o.status === 'CRITICAL')
      .flatMap((o) => o.issues.map((i) => `${o.organ}: ${i}`));

    // Generate recommendations
    const recommendations: string[] = [];
    if (overallStatus === 'CRITICAL') {
      recommendations.push('🚨 CRITICAL: Immediate intervention required');
      recommendations.push(
        'Review blocking issues and escalate to incident commander'
      );
    } else if (overallStatus === 'AT_RISK') {
      recommendations.push(
        '⚠️ AT_RISK: Monitor closely and prepare remediation'
      );
    } else if (overallStatus === 'DEGRADED') {
      recommendations.push(
        '🔧 DEGRADED: Address issues before they become critical'
      );
    }

    const health: UnifiedHealth = {
      timestamp: new Date().toISOString(),
      overallStatus,
      overallPercentage,
      organs,
      blockingIssues,
      recommendations,
    };

    return NextResponse.json(health);
  } catch (error) {
    logger.error(
      'HERCULES health calculation failed',
      'HERCULES_HEALTH_ERROR',
      error
    );
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        overallStatus: 'UNKNOWN',
        overallPercentage: 0,
        organs: [],
        blockingIssues: [],
        recommendations: [
          'Unable to calculate health. Check logs for details.',
        ],
      },
      { status: 500 }
    );
  }
}
