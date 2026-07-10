import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  analyzePatchability,
  classifyVulnerabilities,
  generatePatchCommand,
  formatPatchAnalysisReport,
  type Vulnerability,
} from '@/lib/dependency-patch-analyzer';

const execAsync = promisify(exec);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/dependency-patch-automation
 *
 * DNA-GOV-011 endpoint: Dependency Patch Automation.
 *
 * Analyzes npm vulnerabilities and determines which can be safely auto-patched.
 * Distinguishes between patchable (minor/patch) and review-required (major) updates.
 *
 * Returns:
 * - Analysis of all vulnerabilities
 * - Recommendations for each
 * - Auto-patchable subset and their patch command
 *
 * Used by: GitHub Actions workflow (weekly); Founder monitoring dashboard
 */
export async function GET(req: Request) {
  try {
    // Run npm audit to get vulnerability data
    let auditOutput = '';
    try {
      const { stdout } = await execAsync('npm audit --json', {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large reports
      });
      auditOutput = stdout;
    } catch (error: any) {
      // npm audit exits with code 1 when vulnerabilities found
      // but still outputs JSON, so capture it
      auditOutput = error.stdout || '';
      if (!auditOutput) {
        throw new Error('Failed to run npm audit');
      }
    }

    const auditData = JSON.parse(auditOutput);
    const vulnerabilities: Vulnerability[] = [];

    // Parse audit data into our Vulnerability format
    if (auditData.vulnerabilities) {
      for (const [name, vuln] of Object.entries(auditData.vulnerabilities)) {
        if (typeof vuln === 'object' && (vuln as any).name && (vuln as any).severity) {
          vulnerabilities.push({
            name: (vuln as any).name,
            severity: (vuln as any).severity,
            isDirect: (vuln as any).isDirect === true,
            fixAvailable: (vuln as any).fixAvailable || false,
            via: (vuln as any).via || (vuln as any).name,
            range: (vuln as any).range || 'unknown',
            url: (vuln as any).via?.[0]?.url || undefined,
            cve: (vuln as any).via?.[0]?.cve || undefined,
          });
        }
      }
    }

    // Analyze each vulnerability
    const analyses = vulnerabilities.map(analyzePatchability);
    const classified = classifyVulnerabilities(vulnerabilities);

    // Generate patch command for auto-patchable ones
    const patchCommand = generatePatchCommand(analyses);

    // Format report
    const report = formatPatchAnalysisReport(vulnerabilities, analyses);

    // Log for Founder visibility
    if (vulnerabilities.length > 0) {
      if (classified.needsReview.length > 0) {
        console.warn('[dependency-patch] Vulnerabilities need review:\n', report);
      } else if (classified.autoPatchable.length > 0) {
        console.log('[dependency-patch] Vulnerabilities can be auto-patched:\n', report);
      } else {
        console.log('[dependency-patch] All vulnerabilities waiting on parent upgrades:\n', report);
      }
    }

    return NextResponse.json(
      {
        ok: vulnerabilities.length === 0,
        timestamp: new Date().toISOString(),
        vulnerabilityCount: vulnerabilities.length,
        summary: {
          critical: vulnerabilities.filter((v) => v.severity === 'critical').length,
          high: vulnerabilities.filter((v) => v.severity === 'high').length,
          moderate: vulnerabilities.filter((v) => v.severity === 'moderate').length,
          low: vulnerabilities.filter((v) => v.severity === 'low').length,
        },
        autoPatchableCount: classified.autoPatchable.length,
        needsReviewCount: classified.needsReview.length,
        waitingOnParentCount: classified.waitingOnParent.length,
        analyses,
        patchCommand: patchCommand || null,
        report,
      },
      {
        status: vulnerabilities.length === 0 ? 200 : 206,
        headers: {
          'X-Vulnerability-Count': String(vulnerabilities.length),
          'X-Auto-Patchable': String(classified.autoPatchable.length),
          'X-Needs-Review': String(classified.needsReview.length),
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[dependency-patch] Analysis failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Dependency patch analysis failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
