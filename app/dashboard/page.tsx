import Link from 'next/link';
import { CheckCircle, ArrowRight, AlertCircle, Building2, AlertTriangle, Shield } from 'lucide-react';
import { createRouteClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface WorkspaceSummary {
  name: string;
  slug: string;
}

interface AssessmentSummary {
  total: number;
  byLevel: {
    unacceptable: number;
    high: number;
    limited: number;
    minimal: number;
  };
}

/**
 * Onboarding dashboard. Server component: reads the signed-in user's real
 * workspace state so progress reflects the database, not wishful defaults.
 */
export default async function DashboardPage() {
  let workspace: WorkspaceSummary | null = null;
  let firstName: string | null = null;
  let systemCount = 0;
  let assessmentSummary: AssessmentSummary = { total: 0, byLevel: { unacceptable: 0, high: 0, limited: 0, minimal: 0 } };
  let workspaceId: string | null = null;

  try {
    const supabase = createRouteClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      firstName = (user.user_metadata?.first_name as string) || null;
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces ( name, slug )')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      workspace = (membership as any)?.workspaces ?? null;
      workspaceId = membership?.workspace_id ?? null;

      if (workspaceId) {
        const { count } = await supabase
          .from('ai_systems')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId);
        systemCount = count ?? 0;

        // Fetch assessment summary
        const { data: assessments } = await supabase
          .from('risk_assessments')
          .select('risk_level')
          .eq('workspace_id', workspaceId);

        if (assessments && assessments.length > 0) {
          assessmentSummary.total = assessments.length;
          assessments.forEach((a: any) => {
            const level = a.risk_level as keyof typeof assessmentSummary.byLevel;
            if (level in assessmentSummary.byLevel) {
              assessmentSummary.byLevel[level]++;
            }
          });
        }
      }
    }
  } catch (err) {
    // Render the fresh-account state rather than crashing the dashboard.
    console.error('[dashboard] failed to load workspace state:', err);
  }

  const hasWorkspace = Boolean(workspace);
  const assessmentsReady = systemCount > 0 && hasWorkspace;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-4xl font-bold text-white">
          {firstName ? `Welcome, ${firstName}` : 'Welcome to EURO AI'}
        </h1>
        <p className="mt-2 text-lg text-slate-400">
          {hasWorkspace
            ? 'Here is where your organization stands'
            : "Let's get your organization set up for AI governance"}
        </p>
      </div>

      {hasWorkspace && (
        <>
          <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-5 py-4">
            <Building2 className="h-5 w-5 text-cyan-400" />
            <div>
              <div className="font-semibold text-white">{workspace!.name}</div>
              <div className="text-xs text-slate-500">
                Workspace · {workspace!.slug}
              </div>
            </div>
          </div>

          <Link
            href="/team"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:shadow-lg"
          >
            Manage Team
            <ArrowRight className="h-4 w-4" />
          </Link>
        </>
      )}

      {/* Onboarding Progress */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Step 1: Company Profile */}
        {hasWorkspace ? (
          <div className="rounded-lg border border-green-800/60 bg-green-950/20 p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-white">Company Setup</h3>
                </div>
                <p className="text-sm text-slate-400">
                  Completed — your workspace is ready
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Link
            href="/workspace/setup"
            className="group rounded-lg border border-slate-800 bg-slate-900/50 p-6 transition hover:border-blue-500/50 hover:bg-slate-900/80"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white text-sm font-bold">
                    1
                  </div>
                  <h3 className="font-semibold text-white">Company Setup</h3>
                </div>
                <p className="text-sm text-slate-400">
                  Tell us about your organization and its AI use
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-600 transition group-hover:text-blue-400" />
            </div>
          </Link>
        )}

        {/* Step 2: AI Inventory */}
        {hasWorkspace ? (
          <Link
            href="/inventory"
            className="group rounded-lg border border-slate-800 bg-slate-900/50 p-6 transition hover:border-blue-500/50 hover:bg-slate-900/80"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${systemCount > 0 ? 'bg-green-600' : 'bg-blue-500 text-sm font-bold'}`}
                  >
                    {systemCount > 0 ? <CheckCircle className="h-5 w-5" /> : '2'}
                  </div>
                  <h3 className="font-semibold text-white">AI Inventory</h3>
                </div>
                <p className="text-sm text-slate-400">
                  {systemCount > 0
                    ? `${systemCount} system${systemCount === 1 ? '' : 's'} registered — add more`
                    : 'Catalog all AI systems in use'}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-600 transition group-hover:text-blue-400" />
            </div>
          </Link>
        ) : (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 opacity-50">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-white text-sm font-bold">
                    2
                  </div>
                  <h3 className="font-semibold text-white">AI Inventory</h3>
                </div>
                <p className="text-sm text-slate-400">
                  Catalog all AI systems in use — unlocked after company setup
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Risk Assessment */}
        {assessmentsReady ? (
          <Link
            href="/assessments"
            className="group rounded-lg border border-slate-800 bg-slate-900/50 p-6 transition hover:border-blue-500/50 hover:bg-slate-900/80"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${assessmentSummary.total > 0 ? 'bg-green-600' : 'bg-blue-500 text-sm font-bold'}`}
                  >
                    {assessmentSummary.total > 0 ? <CheckCircle className="h-5 w-5" /> : '3'}
                  </div>
                  <h3 className="font-semibold text-white">Risk Assessment</h3>
                </div>
                <p className="text-sm text-slate-400">
                  {assessmentSummary.total > 0
                    ? `${assessmentSummary.total} assessment${assessmentSummary.total === 1 ? '' : 's'} — view compliance status`
                    : 'Classify risks and obligations'}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-600 transition group-hover:text-blue-400" />
            </div>
          </Link>
        ) : (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 opacity-50">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-white text-sm font-bold">
                    3
                  </div>
                  <h3 className="font-semibold text-white">Risk Assessment</h3>
                </div>
                <p className="text-sm text-slate-400">
                  Classify risks and obligations — unlocked after adding AI systems
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compliance Status (if assessments exist) */}
      {assessmentSummary.total > 0 && (
        <>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-white mb-2">Compliance Management</h3>
                <p className="text-sm text-slate-400">
                  Track compliance obligations and remediation plans from your assessments
                </p>
              </div>
              <Link
                href="/compliance"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:shadow-lg"
              >
                Manage Compliance
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-white mb-2">Compliance Report</h3>
                <p className="text-sm text-slate-400">
                  Executive summary of your compliance posture and remediation progress
                </p>
              </div>
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 px-4 py-2 text-sm font-medium text-white transition hover:shadow-lg"
              >
                View Report
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-white mb-2">Audit Log</h3>
                <p className="text-sm text-slate-400">
                  Track all compliance actions and changes for regulatory verification
                </p>
              </div>
              <Link
                href="/audit-log"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:shadow-lg"
              >
                View Log
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Next steps */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-8">
        <h2 className="text-2xl font-bold text-white mb-6">
          What you can do next
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex gap-4">
            <CheckCircle
              className={`h-6 w-6 flex-shrink-0 ${hasWorkspace ? 'text-green-400' : 'text-cyan-400'}`}
            />
            <div>
              <h3 className="font-medium text-white">
                Complete company profile
              </h3>
              <p className="text-sm text-slate-400">
                {hasWorkspace
                  ? 'Done — workspace created'
                  : 'Set up your organization details'}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <CheckCircle className="h-6 w-6 text-cyan-400 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-white">Add team members</h3>
              <p className="text-sm text-slate-400">
                Invite colleagues and manage permissions
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <CheckCircle
              className={`h-6 w-6 flex-shrink-0 ${systemCount > 0 ? 'text-green-400' : hasWorkspace ? 'text-cyan-400' : 'text-slate-600'}`}
            />
            <div>
              <h3 className="font-medium text-white">Begin AI inventory</h3>
              <p className="text-sm text-slate-400">
                {systemCount > 0
                  ? `${systemCount} registered`
                  : hasWorkspace
                    ? 'Document your AI systems'
                    : 'Unlocked after company setup'}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <CheckCircle
              className={`h-6 w-6 flex-shrink-0 ${assessmentSummary.total > 0 ? 'text-green-400' : assessmentsReady ? 'text-cyan-400' : 'text-slate-600'}`}
            />
            <div>
              <h3 className="font-medium text-white">Risk assessment</h3>
              <p className="text-sm text-slate-400">
                {assessmentSummary.total > 0
                  ? `${assessmentSummary.total} system${assessmentSummary.total === 1 ? '' : 's'} assessed`
                  : assessmentsReady
                    ? 'Begin evaluating AI system risks'
                    : 'Unlocked after adding AI systems'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/20 p-6">
        <div className="flex gap-4">
          <AlertCircle className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-white">Need help?</h3>
            <p className="text-sm text-slate-400 mt-1">
              In-app documentation and support are on the way. Until then,
              your onboarding contact is happy to help directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
