import { execSync } from 'child_process';
import * as fs from 'fs';

/**
 * DNA-GOV-011: Dependency Patch Automation
 *
 * Automatically generates pull requests for patchable npm vulnerabilities.
 * Runs weekly; tests patches locally before PR submission to GitHub.
 *
 * Purpose: Reduce manual effort for security patching; improve MTTR.
 */

export interface PatchableVulnerability {
  package: string;
  current_version: string;
  patched_version: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  cve?: string;
  description: string;
}

export interface PatchResult {
  package: string;
  old_version: string;
  new_version: string;
  applied: boolean;
  testsPassed: boolean;
  error?: string;
}

export interface AutoPatchReport {
  timestamp: string;
  total_patchable: number;
  patches_attempted: number;
  patches_applied: number;
  patches_tested: boolean;
  pr_created?: string;
  results: PatchResult[];
}

export function getPatchableVulnerabilities(): PatchableVulnerability[] {
  try {
    const output = execSync('npm audit --json', { encoding: 'utf-8' });
    const auditData = JSON.parse(output);
    
    const patchable: PatchableVulnerability[] = [];
    
    if (auditData.vulnerabilities) {
      for (const [packageName, vulnData] of Object.entries(auditData.vulnerabilities)) {
        const pkg = vulnData as any;
        
        // Only process if there's a fix available
        if (pkg.fixAvailable && pkg.fixAvailable.version) {
          patchable.push({
            package: packageName,
            current_version: pkg.installed,
            patched_version: pkg.fixAvailable.version,
            severity: pkg.severity || 'low',
            cve: pkg.cves?.[0],
            description: pkg.title || `Update ${packageName}`,
          });
        }
      }
    }
    
    return patchable;
  } catch {
    return [];
  }
}

export function applyPatch(vuln: PatchableVulnerability): PatchResult {
  const result: PatchResult = {
    package: vuln.package,
    old_version: vuln.current_version,
    new_version: vuln.patched_version,
    applied: false,
    testsPassed: false,
  };

  try {
    // Attempt to patch the package
    execSync(`npm update ${vuln.package}@${vuln.patched_version}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    
    result.applied = true;
    
    // Run tests to ensure patch doesn't break anything
    try {
      execSync('npm test 2>&1', {
        encoding: 'utf-8',
        timeout: 60000,
        stdio: 'pipe',
      });
      result.testsPassed = true;
    } catch (testErr) {
      // Tests failed; revert the patch
      execSync(`npm install ${vuln.package}@${vuln.current_version}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      result.applied = false;
      result.error = `Tests failed after patching ${vuln.package}`;
    }
  } catch (err) {
    result.error = (err as any).message || 'Failed to apply patch';
  }

  return result;
}

export async function generatePatchPullRequest(
  patches: PatchResult[],
  severity: 'critical' | 'high' = 'high'
): Promise<string | null> {
  try {
    // Only create PR if we have successful patches
    const successfulPatches = patches.filter((p) => p.applied && p.testsPassed);
    
    if (successfulPatches.length === 0) {
      return null;
    }

    // Determine if critical vulnerabilities were patched
    const isCritical = severity === 'critical';
    const branchName = isCritical 
      ? 'security/critical-patch-auto' 
      : 'security/dependency-patch-auto';

    // Create a git branch for the patches
    try {
      execSync(`git checkout -b ${branchName}`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch {
      // Branch might exist; try to switch to it
      execSync(`git checkout ${branchName}`, { encoding: 'utf-8', stdio: 'pipe' });
    }

    // Stage changes
    execSync('git add package.json package-lock.json', { encoding: 'utf-8', stdio: 'pipe' });

    // Create commit
    const patchSummary = successfulPatches
      .map((p) => `${p.package}: ${p.old_version} → ${p.new_version}`)
      .join('\n');

    const commitMessage = isCritical
      ? `security: Apply critical vulnerability patches\n\n${patchSummary}`
      : `chore: Apply dependency security patches\n\n${patchSummary}`;

    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    // Push branch (GitHub Actions or manual push would create the PR)
    execSync(`git push origin ${branchName}`, { encoding: 'utf-8', stdio: 'pipe' });

    return branchName;
  } catch (err) {
    console.error('[dependency-patch-automation] failed to create PR:', err);
    return null;
  }
}

export async function runAutomatedPatchCycle(): Promise<AutoPatchReport> {
  const timestamp = new Date().toISOString();
  const vulnerabilities = getPatchableVulnerabilities();

  // Separate by severity
  const criticalVulns = vulnerabilities.filter((v) => v.severity === 'critical');
  const highVulns = vulnerabilities.filter((v) => v.severity === 'high');
  
  // Attempt to patch critical vulnerabilities first
  const results: PatchResult[] = [];
  let prCreated: string | null = null;

  if (criticalVulns.length > 0) {
    for (const vuln of criticalVulns) {
      results.push(applyPatch(vuln));
    }
    prCreated = await generatePatchPullRequest(results, 'critical');
  }

  // Attempt to patch high-severity vulnerabilities (if no critical PR created)
  if (!prCreated && highVulns.length > 0) {
    const highResults: PatchResult[] = [];
    for (const vuln of highVulns) {
      highResults.push(applyPatch(vuln));
    }
    results.push(...highResults);
    prCreated = await generatePatchPullRequest(highResults, 'high');
  }

  const appliedCount = results.filter((r) => r.applied && r.testsPassed).length;
  const testedCount = results.filter((r) => r.testsPassed).length;

  return {
    timestamp,
    total_patchable: vulnerabilities.length,
    patches_attempted: results.length,
    patches_applied: appliedCount,
    patches_tested: testedCount === results.length,
    pr_created: prCreated || undefined,
    results,
  };
}

export function formatPatchReport(report: AutoPatchReport): string {
  const lines = ['Dependency Patch Automation Report', '='.repeat(40)];
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push('');

  lines.push(`Total Patchable: ${report.total_patchable}`);
  lines.push(`Patches Attempted: ${report.patches_attempted}`);
  lines.push(`Patches Applied: ${report.patches_applied}`);
  lines.push(`All Tests Passed: ${report.patches_tested ? 'Yes' : 'No'}`);
  lines.push('');

  if (report.pr_created) {
    lines.push(`✅ Pull Request Created: ${report.pr_created}`);
  } else if (report.patches_applied > 0) {
    lines.push(`⚠️ Patches applied but no PR created (manual review recommended)`);
  } else {
    lines.push(`ℹ️ No patchable vulnerabilities applied`);
  }

  if (report.results.length > 0) {
    lines.push('');
    lines.push('Patch Details:');
    for (const result of report.results) {
      const status = result.applied && result.testsPassed ? '✅' : '❌';
      lines.push(`${status} ${result.package}: ${result.old_version} → ${result.new_version}`);
      if (result.error) {
        lines.push(`   Error: ${result.error}`);
      }
    }
  }

  return lines.join('\n');
}
