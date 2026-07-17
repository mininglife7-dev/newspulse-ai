/**
 * Security Alert Bridge (DNA-GOV-008 ↔ DNA-GOV-005 Integration)
 *
 * Translates security scan results from dependency-security-scanner into
 * alerts that integrate with the centralized alert hub.
 */

import { recordAlert } from './alert-hub';
import type { SecurityScanResult } from './dependency-security-scanner';

export function bridgeSecurityScanToAlerts(result: SecurityScanResult): void {
  if (result.scanStatus === 'critical-found') {
    const criticalCount = result.vulnerabilities.filter(
      (v) => v.severity === 'critical'
    ).length;
    recordAlert(
      'security',
      'critical',
      `🔴 CRITICAL: ${criticalCount} Critical Dependency Vulnerabilities Detected`,
      `${result.newVulnerabilities.length} new vulnerabilities found. Immediate patching required.`,
      `Run 'npm audit fix' to patch automatically; review and test changes before committing.`
    );
  } else if (result.scanStatus === 'vulnerabilities-found') {
    const highCount = result.vulnerabilities.filter(
      (v) => v.severity === 'high'
    ).length;
    recordAlert(
      'security',
      'warning',
      `⚠️ HIGH-SEVERITY: ${highCount} High-Risk Dependency Vulnerabilities`,
      `${result.newVulnerabilities.length} new vulnerabilities detected. Patches available.`,
      `Review with 'npm audit' and prioritize patches for high-severity vulnerabilities.`
    );
  } else if (result.resolvedVulnerabilities.length > 0) {
    recordAlert(
      'security',
      'info',
      `✅ Security: ${result.resolvedVulnerabilities.length} Vulnerabilities Resolved`,
      `Dependencies have been patched. Continuing to monitor for new vulnerabilities.`,
      `Continue regular security scans.`
    );
  } else if (result.scanStatus === 'clean') {
    // No need to create an alert for clean status; only alert on issues
    // To avoid alert fatigue, skip info-level "all clear" messages
    // Founder can check /api/security-scan directly for status
  }
}

export function shouldUpdateSecurityAlert(result: SecurityScanResult): boolean {
  // Only update alerts if there are actual changes (new vulns, resolved vulns, or severity changes)
  return (
    result.newVulnerabilities.length > 0 ||
    result.resolvedVulnerabilities.length > 0 ||
    result.scanStatus === 'critical-found'
  );
}
