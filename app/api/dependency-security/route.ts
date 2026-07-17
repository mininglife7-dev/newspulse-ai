/**
 * GET /api/dependency-security
 *
 * DNA-GOV-008 endpoint: Dependency Security Scanning
 * Vercel cron job — runs periodically to detect npm vulnerabilities
 *
 * No authentication required (internal cron only)
 * Never rate-limited (exempt endpoint, like /api/health)
 */

import {
  scanDependencies,
  formatSecurityAlert,
  getSecuritySummary,
} from '@/lib/dependency-security-scanner';

export const maxDuration = 60;

export async function GET() {
  try {
    const report = await scanDependencies();
    const alert = formatSecurityAlert(report);
    const summary = getSecuritySummary(report);
    const isCritical = report.critical > 0;

    // Log alert to console for Founder visibility
    if (isCritical || report.scanStatus !== 'clean') {
      console.error(
        '[dependency-security] Vulnerabilities detected:\n' + summary
      );
    } else {
      console.log('[dependency-security] ✅ All clear');
    }

    return Response.json(
      {
        ok: report.scanStatus === 'clean',
        timestamp: report.timestamp,
        isCritical,
        vulnerabilityCount: {
          critical: report.critical,
          high: report.high,
          moderate: report.moderate,
          low: report.low,
          total: report.total,
        },
        vulnerabilities: report.vulnerabilities,
        alert,
        summary,
      },
      {
        status: isCritical ? 500 : 200,
        headers: {
          'cache-control': 'no-store',
          'x-scan-severity': isCritical ? 'critical' : 'healthy',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[dependency-security] Scan failed:', message);

    return Response.json(
      {
        ok: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
