import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface Vulnerability {
  package: string;
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'info';
  fixAvailable: boolean | { name: string; version: string; isSemVerMajor: boolean };
  cve: string | null;
  description: string;
  affectedVersions: string;
  patchedVersions: string;
}

export interface SecurityScanResult {
  timestamp: string;
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  info: number;
  vulnerabilities: Vulnerability[];
  newVulnerabilities: Vulnerability[];
  resolvedVulnerabilities: string[];
  scanStatus: 'clean' | 'vulnerabilities-found' | 'critical-found';
}

export interface SecurityAlert {
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  vulnerabilities: Vulnerability[];
  recommendedAction: string;
}

const VULNERABILITY_CACHE_PATH = process.env.SECURITY_SCAN_CACHE || 'docs/governance/.security-scan-cache.json';

function getVulnerabilityCachePath(): string {
  // For testing, allow environment override
  return process.env.SECURITY_SCAN_CACHE_PATH || VULNERABILITY_CACHE_PATH;
}

function readVulnerabilityCache(): { [key: string]: Vulnerability } {
  try {
    const cachePath = getVulnerabilityCachePath();
    if (fs.existsSync(cachePath)) {
      const content = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    // Cache read failed; treat as empty
  }
  return {};
}

function writeVulnerabilityCacheSync(vulnerabilities: { [key: string]: Vulnerability }): void {
  try {
    const cachePath = getVulnerabilityCachePath();
    const dir = path.dirname(cachePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(cachePath, JSON.stringify(vulnerabilities, null, 2));
  } catch (error) {
    console.error('[security-scanner] Failed to write cache:', error instanceof Error ? error.message : String(error));
  }
}

function parseAuditOutput(auditJson: string): Vulnerability[] {
  try {
    const auditData = JSON.parse(auditJson);
    const vulnerabilities: Vulnerability[] = [];
    const seen = new Set<string>();

    if (auditData.vulnerabilities) {
      for (const [packageName, data] of Object.entries(auditData.vulnerabilities)) {
        if (typeof data === 'object' && data !== null && 'severity' in data) {
          const vuln = data as any;
          const key = `${packageName}:${vuln.severity}`;

          if (!seen.has(key)) {
            seen.add(key);

            // Determine patch information
            let patchedVersions = 'no patch';
            if (vuln.fixAvailable) {
              if (typeof vuln.fixAvailable === 'object' && vuln.fixAvailable.version) {
                patchedVersions = vuln.fixAvailable.version;
              } else {
                patchedVersions = 'available';
              }
            }

            // Get description from 'via' field (contains the actual CVE/issue)
            const viaInfo = Array.isArray(vuln.via) && vuln.via.length > 0 ? vuln.via[0] : 'Unknown vulnerability';

            vulnerabilities.push({
              package: packageName,
              severity: vuln.severity || 'info',
              fixAvailable: !!vuln.fixAvailable,
              cve: null, // npm audit doesn't provide CVE in this structure
              description: typeof viaInfo === 'string' ? viaInfo : (viaInfo.title || 'Unknown vulnerability'),
              affectedVersions: vuln.range || 'unknown',
              patchedVersions,
            });
          }
        }
      }
    }

    return vulnerabilities;
  } catch {
    return [];
  }
}

export async function scanDependencies(): Promise<SecurityScanResult> {
  const timestamp = new Date().toISOString();

  try {
    const auditOutput = execSync('npm audit --json', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const vulnerabilities = parseAuditOutput(auditOutput);

    // Load previous scan cache
    const previousVulns = readVulnerabilityCacheSync();
    const newVulnerabilities = vulnerabilities.filter(v => !previousVulns[`${v.package}:${v.severity}`]);
    const resolvedVulnerabilities = Object.keys(previousVulns).filter(
      key => !vulnerabilities.some(v => `${v.package}:${v.severity}` === key)
    );

    // Update cache with current vulnerabilities
    const currentCache: { [key: string]: Vulnerability } = {};
    vulnerabilities.forEach(v => {
      currentCache[`${v.package}:${v.severity}`] = v;
    });
    writeVulnerabilityCacheSync(currentCache);

    const counts = vulnerabilities.reduce(
      (acc, v) => {
        acc[v.severity] = (acc[v.severity] || 0) + 1;
        return acc;
      },
      { critical: 0, high: 0, moderate: 0, low: 0, info: 0 } as Record<string, number>
    );

    return {
      timestamp,
      total: vulnerabilities.length,
      critical: counts.critical || 0,
      high: counts.high || 0,
      moderate: counts.moderate || 0,
      low: counts.low || 0,
      info: counts.info || 0,
      vulnerabilities,
      newVulnerabilities,
      resolvedVulnerabilities,
      scanStatus: counts.critical > 0 ? 'critical-found' : counts.high > 0 ? 'vulnerabilities-found' : 'clean',
    };
  } catch (error) {
    // npm audit exits with non-zero if vulnerabilities found
    // Retry to capture the output
    try {
      const auditOutput = execSync('npm audit --json 2>&1 || true', { encoding: 'utf-8', shell: '/bin/bash' } as any);
      const vulnerabilities = parseAuditOutput(auditOutput);

      const previousVulns = readVulnerabilityCacheSync();
      const newVulnerabilities = vulnerabilities.filter(v => !previousVulns[`${v.package}:${v.severity}`]);
      const resolvedVulnerabilities = Object.keys(previousVulns).filter(
        key => !vulnerabilities.some(v => `${v.package}:${v.severity}` === key)
      );

      const currentCache: { [key: string]: Vulnerability } = {};
      vulnerabilities.forEach(v => {
        currentCache[`${v.package}:${v.severity}`] = v;
      });
      writeVulnerabilityCacheSync(currentCache);

      const counts = vulnerabilities.reduce(
        (acc, v) => {
          acc[v.severity] = (acc[v.severity] || 0) + 1;
          return acc;
        },
        { critical: 0, high: 0, moderate: 0, low: 0, info: 0 } as Record<string, number>
      );

      return {
        timestamp,
        total: vulnerabilities.length,
        critical: counts.critical || 0,
        high: counts.high || 0,
        moderate: counts.moderate || 0,
        low: counts.low || 0,
        info: counts.info || 0,
        vulnerabilities,
        newVulnerabilities,
        resolvedVulnerabilities,
        scanStatus: counts.critical > 0 ? 'critical-found' : counts.high > 0 ? 'vulnerabilities-found' : 'clean',
      };
    } catch (innerError) {
      return {
        timestamp,
        total: 0,
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
        info: 0,
        vulnerabilities: [],
        newVulnerabilities: [],
        resolvedVulnerabilities: [],
        scanStatus: 'clean',
      };
    }
  }
}

function readVulnerabilityCacheSync(): { [key: string]: Vulnerability } {
  try {
    const cachePath = getVulnerabilityCachePath();
    if (fs.existsSync(cachePath)) {
      const content = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    // Cache read failed; treat as empty
  }
  return {};
}

export function formatSecurityAlert(result: SecurityScanResult): SecurityAlert {
  if (result.scanStatus === 'critical-found') {
    const criticalVulns = result.vulnerabilities.filter(v => v.severity === 'critical');
    return {
      timestamp: result.timestamp,
      severity: 'critical',
      title: `🔴 CRITICAL: ${criticalVulns.length} Critical Dependency Vulnerabilities Detected`,
      message: `${result.newVulnerabilities.length} new vulnerabilities found:\n${criticalVulns
        .map(v => `  • ${v.package}: ${v.description}`)
        .join('\n')}`,
      vulnerabilities: result.newVulnerabilities.filter(v => v.severity === 'critical'),
      recommendedAction: `Run 'npm audit fix' to patch automatically; review and test changes before committing.`,
    };
  }

  if (result.scanStatus === 'vulnerabilities-found') {
    return {
      timestamp: result.timestamp,
      severity: 'warning',
      title: `⚠️ WARNING: ${result.high} High-Severity Dependency Vulnerabilities`,
      message: `${result.newVulnerabilities.length} new vulnerabilities (${result.newVulnerabilities.filter(v => v.severity === 'high').length} high severity)`,
      vulnerabilities: result.newVulnerabilities,
      recommendedAction: `Review with 'npm audit' and prioritize patches for high-severity vulnerabilities.`,
    };
  }

  if (result.resolvedVulnerabilities.length > 0) {
    return {
      timestamp: result.timestamp,
      severity: 'info',
      title: `✅ Security: ${result.resolvedVulnerabilities.length} Vulnerabilities Resolved`,
      message: `Dependencies have been patched. Current status: ${result.total} remaining vulnerabilities.`,
      vulnerabilities: [],
      recommendedAction: 'Continue monitoring for new vulnerabilities.',
    };
  }

  return {
    timestamp: result.timestamp,
    severity: 'info',
    title: '✅ Security: No Known Vulnerabilities Detected',
    message: 'All dependencies are up to date with no known CVEs.',
    vulnerabilities: [],
    recommendedAction: 'Continue regular security scans.',
  };
}

export function getSecuritySummary(result: SecurityScanResult): string {
  const line1 = `Dependencies: ${result.total} vulnerabilities (${result.critical} critical, ${result.high} high, ${result.moderate} moderate)`;
  const line2 =
    result.newVulnerabilities.length > 0
      ? `NEW: ${result.newVulnerabilities.length} found in this scan`
      : result.resolvedVulnerabilities.length > 0
        ? `RESOLVED: ${result.resolvedVulnerabilities.length} vulnerabilities patched`
        : 'Status: All clear';

  return `${line1}\n${line2}`;
}
