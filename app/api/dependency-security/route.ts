/**
 * GET /api/dependency-security
 *
 * DNA-GOV-008 endpoint: Dependency Security Scanning
 * Vercel cron job — runs periodically to detect npm vulnerabilities
 *
 * No authentication required (internal cron only)
 * Never rate-limited (exempt endpoint, like /api/health)
 */

import { scanDependencies, formatDependencySecurityAlert, isCriticalSecurityIssue } from '@/lib/dependency-security-scanner'

export const maxDuration = 60

export async function GET() {
  try {
    const report = scanDependencies()
    const formatted = formatDependencySecurityAlert(report)
    const isCritical = isCriticalSecurityIssue(report)

    // Log alert to console for Founder visibility
    if (isCritical || !report.ok) {
      console.error('[dependency-security] Vulnerabilities detected:\n' + formatted)
    } else {
      console.log('[dependency-security] ✅ All clear')
    }

    return Response.json(
      {
        ok: report.ok,
        timestamp: report.timestamp,
        isCritical,
        vulnerabilityCount: report.vulnerabilityCount,
        vulnerabilities: report.vulnerabilities,
        alerts: report.alerts,
        recommendation: report.recommendation,
        formatted,
      },
      {
        status: report.ok ? 200 : isCritical ? 500 : 200,
        headers: {
          'cache-control': 'no-store',
          'x-scan-severity': isCritical ? 'critical' : report.ok ? 'healthy' : 'warning',
        },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[dependency-security] Scan failed:', message)

    return Response.json(
      {
        ok: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
