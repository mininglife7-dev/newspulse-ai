import { NextResponse } from 'next/server';
import {
  scanDependencies,
  formatSecurityAlert,
  getSecuritySummary,
} from '@/lib/dependency-security-scanner';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/security-scan
 *
 * DNA-GOV-008 endpoint: Scan dependencies for security vulnerabilities.
 * Called by GitHub Actions workflow on schedule (daily) or on demand.
 *
 * Returns:
 * - 200 + clean: No vulnerabilities detected
 * - 200 + warning: High-severity vulnerabilities detected
 * - 200 + critical: Critical vulnerabilities detected
 *
 * Success criteria: Dependency scan completes and returns vulnerability status.
 */
export async function GET(req: Request) {
  try {
    const result = await scanDependencies();
    const alert = formatSecurityAlert(result);
    const summary = getSecuritySummary(result);

    // Log scan results (safe for production)
    if (result.scanStatus === 'critical-found') {
      logger.error(
        'Security scan detected critical vulnerabilities',
        'SECURITY_CRITICAL',
        {
          critical: result.critical,
          high: result.high,
        }
      );
    } else if (result.scanStatus === 'vulnerabilities-found') {
      logger.warn(
        'Security scan detected vulnerabilities',
        'SECURITY_WARNING',
        {
          total: result.total,
          high: result.high,
        }
      );
    } else if (result.resolvedVulnerabilities.length > 0) {
      logger.info(
        'Security scan: vulnerabilities resolved',
        'SECURITY_RESOLVED',
        {
          resolved: result.resolvedVulnerabilities.length,
        }
      );
    } else {
      logger.info(
        'Security scan: no vulnerabilities detected',
        'SECURITY_CLEAN'
      );
    }

    return NextResponse.json(
      {
        ok: result.scanStatus === 'clean',
        status: result.scanStatus,
        alert,
        summary,
        result: {
          timestamp: result.timestamp,
          total: result.total,
          critical: result.critical,
          high: result.high,
          moderate: result.moderate,
          low: result.low,
          info: result.info,
          vulnerabilityCount: result.vulnerabilities.length,
          newVulnerabilityCount: result.newVulnerabilities.length,
          resolvedCount: result.resolvedVulnerabilities.length,
        },
      },
      {
        status: 200,
        headers: {
          'X-Security-Status': result.scanStatus,
          'X-Vulnerability-Count': result.total.toString(),
        },
      }
    );
  } catch (error) {
    logger.error('Security scan failed', 'SECURITY_SCAN_ERROR', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Security scan failed',
        status: 'error',
      },
      { status: 503 }
    );
  }
}
