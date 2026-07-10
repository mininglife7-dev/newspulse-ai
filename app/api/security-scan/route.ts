import { NextResponse } from 'next/server';
import { scanDependencies, formatSecurityAlert, getSecuritySummary } from '@/lib/dependency-security-scanner';

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

    // Log alerts for Founder visibility
    if (result.scanStatus === 'critical-found') {
      console.error('[security-scan] CRITICAL:\n', alert.message);
    } else if (result.scanStatus === 'vulnerabilities-found') {
      console.warn('[security-scan] WARNING:\n', alert.message);
    } else if (result.resolvedVulnerabilities.length > 0) {
      console.log('[security-scan] RESOLVED:\n', alert.message);
    } else {
      console.log('[security-scan] CLEAN:', summary);
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[security-scan] Check failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Security scan failed',
        message,
        status: 'error',
      },
      { status: 503 }
    );
  }
}
