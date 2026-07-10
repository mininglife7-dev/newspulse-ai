/**
 * DNA-GOV-011: Dependency Patch Automation
 *
 * Analyze security vulnerabilities and determine which can be safely patched automatically.
 * Distinguishes between patchable vulnerabilities (direct deps) and ones requiring major
 * version bumps (which need Founder approval).
 */

export interface Vulnerability {
  name: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  isDirect: boolean;
  fixAvailable: {
    name: string;
    version: string;
    isSemVerMajor: boolean;
  } | false;
  via: string;
  range: string;
  url?: string;
  cve?: string;
}

export interface PatchabilityAnalysis {
  vulnerability: Vulnerability;
  isPatchable: boolean;
  reason: string;
  recommendedAction: 'auto-patch' | 'manual-review' | 'wait-for-parent-upgrade' | 'accept-risk';
  riskLevel: 'critical' | 'high' | 'moderate' | 'low';
}

/**
 * Determine if a vulnerability can be safely auto-patched
 */
export function analyzePatchability(vuln: Vulnerability): PatchabilityAnalysis {
  // Critical vulnerabilities always need manual review
  if (vuln.severity === 'critical') {
    return {
      vulnerability: vuln,
      isPatchable: false,
      reason: 'Critical vulnerabilities require manual review and testing',
      recommendedAction: 'manual-review',
      riskLevel: 'critical',
    };
  }

  // No fix available - document and alert
  if (!vuln.fixAvailable) {
    return {
      vulnerability: vuln,
      isPatchable: false,
      reason: 'No patch available yet; monitor npm advisory for updates',
      recommendedAction: 'wait-for-parent-upgrade',
      riskLevel: vuln.severity,
    };
  }

  // Major version bumps need manual approval
  if (vuln.fixAvailable.isSemVerMajor) {
    return {
      vulnerability: vuln,
      isPatchable: false,
      reason: `Fix requires major version bump (${vuln.name} → ${vuln.fixAvailable.version}). Needs manual review and compatibility testing.`,
      recommendedAction: 'manual-review',
      riskLevel: vuln.severity,
    };
  }

  // Transitive deps: only auto-patch if parent dependency is also safe
  // For now, flag transitive deps for manual review to avoid surprising changes
  if (!vuln.isDirect) {
    return {
      vulnerability: vuln,
      isPatchable: false,
      reason: `Transitive dependency (${vuln.via}). Parent package needs upgrade; wait for parent maintainer to patch.`,
      recommendedAction: 'wait-for-parent-upgrade',
      riskLevel: vuln.severity,
    };
  }

  // Direct dependency with minor/patch fix available -> safe to auto-patch
  return {
    vulnerability: vuln,
    isPatchable: true,
    reason: `Direct dependency with ${
      vuln.fixAvailable ? (vuln.fixAvailable.isSemVerMajor ? 'major' : 'minor/patch') : ''
    } version available`,
    recommendedAction: 'auto-patch',
    riskLevel: vuln.severity,
  };
}

/**
 * Classify all vulnerabilities into actions
 */
export function classifyVulnerabilities(vulnerabilities: Vulnerability[]): {
  autoPatchable: PatchabilityAnalysis[];
  needsReview: PatchabilityAnalysis[];
  waitingOnParent: PatchabilityAnalysis[];
  acceptRisk: PatchabilityAnalysis[];
} {
  const analyses = vulnerabilities.map(analyzePatchability);

  return {
    autoPatchable: analyses.filter((a) => a.recommendedAction === 'auto-patch'),
    needsReview: analyses.filter((a) => a.recommendedAction === 'manual-review'),
    waitingOnParent: analyses.filter((a) => a.recommendedAction === 'wait-for-parent-upgrade'),
    acceptRisk: analyses.filter((a) => a.recommendedAction === 'accept-risk'),
  };
}

/**
 * Generate a patch command for auto-patchable vulnerabilities
 */
export function generatePatchCommand(analyses: PatchabilityAnalysis[]): string {
  const autoPatchable = analyses.filter(
    (a) => a.isPatchable && a.vulnerability.fixAvailable && typeof a.vulnerability.fixAvailable !== 'boolean'
  );

  if (autoPatchable.length === 0) {
    return '';
  }

  // Generate targeted upgrade commands
  const upgrades = autoPatchable
    .map((a) => {
      const fix = a.vulnerability.fixAvailable;
      if (fix && typeof fix !== 'boolean') {
        return `${fix.name}@${fix.version}`;
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');

  return upgrades ? `npm install --save ${upgrades}` : '';
}

/**
 * Format vulnerability report for GitHub PR and Founder visibility
 */
export function formatPatchAnalysisReport(
  vulnerabilities: Vulnerability[],
  analyses: PatchabilityAnalysis[]
): string {
  const classified = classifyVulnerabilities(vulnerabilities);

  let report = '# Dependency Security Patch Analysis\n\n';
  report += `**Total Vulnerabilities:** ${vulnerabilities.length}\n`;
  report += `- Auto-patchable: ${classified.autoPatchable.length}\n`;
  report += `- Needs review: ${classified.needsReview.length}\n`;
  report += `- Waiting on parent: ${classified.waitingOnParent.length}\n\n`;

  if (classified.autoPatchable.length > 0) {
    report += '## ✅ Auto-Patchable Vulnerabilities\n\n';
    classified.autoPatchable.forEach((a) => {
      report += `### ${a.vulnerability.name}\n`;
      report += `- Severity: ${a.vulnerability.severity}\n`;
      if (a.vulnerability.fixAvailable && typeof a.vulnerability.fixAvailable !== 'boolean') {
        report += `- Fix: ${a.vulnerability.fixAvailable.name}@${a.vulnerability.fixAvailable.version}\n`;
      }
      report += `- Reason: ${a.reason}\n\n`;
    });
  }

  if (classified.needsReview.length > 0) {
    report += '## ⚠️ Requires Manual Review\n\n';
    classified.needsReview.forEach((a) => {
      report += `### ${a.vulnerability.name}\n`;
      report += `- Severity: ${a.vulnerability.severity}\n`;
      report += `- Reason: ${a.reason}\n`;
      if (a.vulnerability.url) {
        report += `- Advisory: ${a.vulnerability.url}\n`;
      }
      report += '\n';
    });
  }

  if (classified.waitingOnParent.length > 0) {
    report += '## ⏳ Waiting on Parent Upgrade\n\n';
    classified.waitingOnParent.forEach((a) => {
      report += `### ${a.vulnerability.name} (via ${a.vulnerability.via})\n`;
      report += `- Severity: ${a.vulnerability.severity}\n`;
      report += `- Reason: ${a.reason}\n\n`;
    });
  }

  return report;
}
