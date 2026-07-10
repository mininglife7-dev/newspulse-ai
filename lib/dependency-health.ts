import { execSync } from 'child_process'

export interface VulnerabilityAlert {
  type: 'high_severity' | 'critical_severity' | 'outdated_major' | 'eol_package'
  package: string
  currentVersion: string
  vulnerabilityCount?: number
  severities?: Record<string, number>
  recommendedAction: string
  affectedVersions?: string
  patchedVersions?: string
}

export interface DependencyHealthReport {
  ok: boolean
  timestamp: string
  vulnerabilities: VulnerabilityAlert[]
  outdatedMajors: Record<string, { current: string; latest: string }>
  summary: {
    vulnerablePackages: number
    criticalCount: number
    highCount: number
    outdatedMajors: number
  }
  alerts: string[]
}

export async function checkNpmVulnerabilities(): Promise<VulnerabilityAlert[]> {
  try {
    const auditOutput = execSync('npm audit --json 2>/dev/null || echo "{}"', {
      encoding: 'utf-8',
      timeout: 30000,
    })

    const auditData = JSON.parse(auditOutput || '{}')

    if (!auditData.vulnerabilities || typeof auditData.vulnerabilities !== 'object') {
      return []
    }

    const alerts: VulnerabilityAlert[] = []

    for (const [packageName, vulnData] of Object.entries(auditData.vulnerabilities)) {
      const data = vulnData as any
      if (data.severity && (data.severity === 'high' || data.severity === 'critical')) {
        const severityCount = data.via?.length || 0
        alerts.push({
          type: data.severity === 'critical' ? 'critical_severity' : 'high_severity',
          package: packageName,
          currentVersion: data.installed_version || 'unknown',
          vulnerabilityCount: severityCount,
          severities: { [data.severity]: severityCount },
          recommendedAction: `Run "npm install ${packageName}@latest" to update`,
          affectedVersions: data.range || 'multiple',
          patchedVersions: data.fixed_in ? `>=${data.fixed_in}` : 'check npm advisory',
        })
      }
    }

    return alerts
  } catch (error) {
    console.error('Error checking npm vulnerabilities:', error)
    return []
  }
}

export async function checkOutdatedMajors(): Promise<Record<string, { current: string; latest: string }>> {
  try {
    const outdatedOutput = execSync('npm outdated --json 2>/dev/null || echo "{}"', {
      encoding: 'utf-8',
      timeout: 30000,
    })

    const outdatedData = JSON.parse(outdatedOutput || '{}')
    const majors: Record<string, { current: string; latest: string }> = {}

    for (const [packageName, depData] of Object.entries(outdatedData)) {
      const data = depData as any
      const current = data.current as string
      const latest = data.latest as string

      if (!current || !latest) continue

      const currentMajor = parseInt(current.split('.')[0])
      const latestMajor = parseInt(latest.split('.')[0])

      if (latestMajor > currentMajor) {
        majors[packageName] = { current, latest }
      }
    }

    return majors
  } catch (error) {
    console.error('Error checking outdated packages:', error)
    return {}
  }
}

export async function runDependencyHealthChecks(): Promise<DependencyHealthReport> {
  const vulnerabilities = await checkNpmVulnerabilities()
  const outdatedMajors = await checkOutdatedMajors()

  const criticalVulns = vulnerabilities.filter((v) => v.type === 'critical_severity')
  const highVulns = vulnerabilities.filter((v) => v.type === 'high_severity')

  const alerts: string[] = []

  if (criticalVulns.length > 0) {
    alerts.push(
      `[CRITICAL] ${criticalVulns.length} critical npm vulnerability(ies) detected: ${criticalVulns.map((v) => v.package).join(', ')}`
    )
  }

  if (highVulns.length > 0) {
    alerts.push(
      `[HIGH] ${highVulns.length} high-severity npm vulnerability(ies) detected: ${highVulns.map((v) => v.package).join(', ')}`
    )
  }

  const outdatedCount = Object.keys(outdatedMajors).length
  if (outdatedCount > 0) {
    const packages = Object.entries(outdatedMajors)
      .slice(0, 3)
      .map(([pkg, versions]) => `${pkg} (${versions.current} → ${versions.latest})`)
      .join(', ')
    alerts.push(`[WARNING] ${outdatedCount} major version upgrade(s) available: ${packages}${outdatedCount > 3 ? '...' : ''}`)
  }

  return {
    ok: criticalVulns.length === 0 && highVulns.length === 0,
    timestamp: new Date().toISOString(),
    vulnerabilities,
    outdatedMajors,
    summary: {
      vulnerablePackages: vulnerabilities.length,
      criticalCount: criticalVulns.length,
      highCount: highVulns.length,
      outdatedMajors: outdatedCount,
    },
    alerts,
  }
}

export function formatDependencyAlert(report: DependencyHealthReport): string {
  const lines: string[] = [`=== Dependency Health Report === [${report.timestamp}]`]

  if (!report.ok) {
    lines.push('')
    lines.push('⚠️ SECURITY ISSUES DETECTED')
    for (const vuln of report.vulnerabilities) {
      lines.push(`  - ${vuln.package} (${vuln.type}): ${vuln.recommendedAction}`)
    }
  }

  if (Object.keys(report.outdatedMajors).length > 0) {
    lines.push('')
    lines.push(`ℹ️ ${Object.keys(report.outdatedMajors).length} outdated major version(s):`)
    for (const [pkg, versions] of Object.entries(report.outdatedMajors).slice(0, 5)) {
      lines.push(`  - ${pkg}: ${versions.current} → ${versions.latest}`)
    }
  }

  if (report.alerts.length === 0) {
    lines.push('')
    lines.push('✅ No security vulnerabilities detected')
  }

  return lines.join('\n')
}
