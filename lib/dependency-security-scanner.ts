/**
 * DNA-GOV-008: Dependency Security Scanning
 *
 * Autonomously detect npm security advisories and alert on CVE exposure.
 * Prevents vulnerabilities from accumulating invisibly in the supply chain.
 */

import { execSync } from 'child_process'

export interface VulnerabilityAdvisory {
  name: string
  severity: 'critical' | 'high' | 'moderate' | 'low'
  title: string
  url?: string
  range?: string
  fixAvailable?: boolean
  installedVersion?: string
}

export interface DependencySecurityReport {
  ok: boolean
  timestamp: string
  vulnerabilityCount: {
    critical: number
    high: number
    moderate: number
    low: number
    total: number
  }
  vulnerabilities: VulnerabilityAdvisory[]
  alerts: string[]
  recommendation?: string
}

/**
 * Run `npm audit` and parse JSON output to detect vulnerabilities.
 * Only checks production dependencies (--omit=dev).
 */
export function scanDependencies(): DependencySecurityReport {
  const timestamp = new Date().toISOString()
  const report: DependencySecurityReport = {
    ok: true,
    timestamp,
    vulnerabilityCount: {
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      total: 0,
    },
    vulnerabilities: [],
    alerts: [],
  }

  try {
    const auditOutput = execSync('npm audit --omit=dev --json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const auditData = JSON.parse(auditOutput)

    // Extract vulnerabilities from npm audit output
    if (auditData.vulnerabilities) {
      for (const [packageName, vulnInfo] of Object.entries(auditData.vulnerabilities)) {
        if (typeof vulnInfo === 'object' && vulnInfo !== null) {
          const pkg = vulnInfo as Record<string, unknown>
          const severity = (pkg.severity as string) || 'unknown'

          // Count by severity
          if (severity === 'critical') report.vulnerabilityCount.critical++
          else if (severity === 'high') report.vulnerabilityCount.high++
          else if (severity === 'moderate') report.vulnerabilityCount.moderate++
          else if (severity === 'low') report.vulnerabilityCount.low++

          report.vulnerabilityCount.total++

          // Extract individual advisories
          if (Array.isArray(pkg.via)) {
            for (const advisory of pkg.via) {
              if (typeof advisory === 'object' && advisory !== null) {
                const adv = advisory as Record<string, unknown>
                report.vulnerabilities.push({
                  name: packageName,
                  severity: (severity as VulnerabilityAdvisory['severity']) || 'low',
                  title: (adv.title as string) || 'Unknown vulnerability',
                  url: adv.url as string | undefined,
                  range: adv.range as string | undefined,
                  fixAvailable: Boolean(pkg.fixAvailable),
                  installedVersion: pkg.installedVersion as string | undefined,
                })
              }
            }
          }
        }
      }
    }

    // Determine health status
    report.ok = report.vulnerabilityCount.critical === 0 && report.vulnerabilityCount.high === 0

    // Generate alerts
    if (report.vulnerabilityCount.critical > 0) {
      report.alerts.push(
        `🔴 **CRITICAL: ${report.vulnerabilityCount.critical} critical vulnerability(ies) detected**`
      )
      report.recommendation = 'Update dependencies immediately before next deployment'
    }

    if (report.vulnerabilityCount.high > 0 && report.vulnerabilityCount.critical === 0) {
      report.alerts.push(
        `🟠 **HIGH: ${report.vulnerabilityCount.high} high-severity vulnerability(ies) detected**`
      )
      report.recommendation = 'Schedule security update within next business cycle'
    }

    if (report.vulnerabilityCount.moderate > 0 && report.vulnerabilityCount.critical === 0 && report.vulnerabilityCount.high === 0) {
      report.alerts.push(
        `🟡 **INFO: ${report.vulnerabilityCount.moderate} moderate-severity finding(s)**`
      )
      report.recommendation = 'Monitor and plan security hardening'
    }

    return report
  } catch (error) {
    // If npm audit fails (e.g., network error), report as warning
    const errorMessage = error instanceof Error ? error.message : String(error)
    report.alerts.push(
      `⚠️ **Could not run dependency scan: ${errorMessage}**`
    )
    report.ok = false
    return report
  }
}

/**
 * Format security report for human consumption (Founder alerts).
 */
export function formatDependencySecurityAlert(report: DependencySecurityReport): string {
  let message = ''

  if (report.ok) {
    message = '✅ **Dependency Security**: All clear\n'
    message += `\n**Discovered:** ${report.timestamp}\n`
    return message
  }

  if (report.alerts.length > 0) {
    message += report.alerts.join('\n\n')
    message += '\n\n'
  }

  if (report.vulnerabilities.length > 0) {
    message += '**Affected packages:**\n'
    report.vulnerabilities.forEach((vuln) => {
      message += `- **${vuln.name}** (${vuln.severity}): ${vuln.title}\n`
      if (vuln.url) message += `  → ${vuln.url}\n`
      if (vuln.range) message += `  Vulnerable range: ${vuln.range}\n`
    })
    message += '\n'
  }

  if (report.recommendation) {
    message += `**Recommendation:** ${report.recommendation}\n`
  }

  message += `\n**Discovered:** ${report.timestamp}\n`

  return message
}

/**
 * Determine if vulnerabilities require immediate action.
 */
export function isCriticalSecurityIssue(report: DependencySecurityReport): boolean {
  return report.vulnerabilityCount.critical > 0 || report.vulnerabilityCount.high > 0
}
