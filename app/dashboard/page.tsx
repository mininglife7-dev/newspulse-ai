"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, ArrowRight, AlertCircle, Loader } from "lucide-react";
import { ComplianceSummary } from "@/components/dashboard/compliance-summary";
import { RiskHeatmap } from "@/components/dashboard/risk-heatmap";

export default function DashboardPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would come from context, session, or URL params
    // For now, fetch the first workspace the user has access to
    async function loadWorkspace() {
      try {
        const response = await fetch("/api/workspace/list");
        if (response.ok) {
          const data = await response.json();
          if (data.workspaces && data.workspaces.length > 0) {
            setWorkspaceId(data.workspaces[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load workspace:", err);
      } finally {
        setLoading(false);
      }
    }

    loadWorkspace();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-4xl font-bold text-white">Welcome to EURO AI</h1>
          <p className="mt-2 text-lg text-slate-400">
            Let's get your organization set up for AI governance
          </p>
        </div>

        {/* Onboarding Progress */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Step 1: Company Profile */}
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

          {/* Step 2: AI Inventory */}
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
                  Catalog all AI systems in use
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Risk Assessment */}
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
                  Classify risks and obligations
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Features Section */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            What you can do next
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-cyan-400 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-white">Complete company profile</h3>
                <p className="text-sm text-slate-400">
                  Set up your organization details
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-cyan-400 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-white">Add team members</h3>
                <p className="text-sm text-slate-400">
                  Invite colleagues to collaborate
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-cyan-400 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-white">Begin AI inventory</h3>
                <p className="text-sm text-slate-400">
                  Document your AI systems
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-cyan-400 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-white">Start assessment</h3>
                <p className="text-sm text-slate-400">
                  Evaluate compliance gaps
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
                Our AI governance advisors are here to guide you. Check out our{" "}
                <Link href="/docs" className="text-blue-400 hover:text-blue-300">
                  documentation
                </Link>{" "}
                or{" "}
                <Link href="#" className="text-blue-400 hover:text-blue-300">
                  contact support
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-white">Compliance Dashboard</h1>
        <p className="mt-2 text-lg text-slate-400">
          Monitor your AI governance compliance status
        </p>
      </div>

      {/* Compliance Summary */}
      <ComplianceSummary workspaceId={workspaceId} />

      {/* Risk Heatmap */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">System Risk Heatmap</h2>
        <RiskHeatmap workspaceId={workspaceId} />
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/ai-systems"
            className="group flex gap-4 p-4 rounded-lg border border-slate-700 hover:border-blue-500/50 bg-slate-900/50 hover:bg-slate-900/80 transition"
          >
            <div className="flex-1">
              <h3 className="font-medium text-white group-hover:text-blue-400">
                Add AI System
              </h3>
              <p className="text-sm text-slate-400">
                Register a new AI system in your inventory
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition" />
          </Link>

          <Link
            href="/workspace/setup"
            className="group flex gap-4 p-4 rounded-lg border border-slate-700 hover:border-blue-500/50 bg-slate-900/50 hover:bg-slate-900/80 transition"
          >
            <div className="flex-1">
              <h3 className="font-medium text-white group-hover:text-blue-400">
                Upload Evidence
              </h3>
              <p className="text-sm text-slate-400">
                Submit compliance documentation
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition" />
          </Link>

          <Link
            href="/risk-assessment"
            className="group flex gap-4 p-4 rounded-lg border border-slate-700 hover:border-blue-500/50 bg-slate-900/50 hover:bg-slate-900/80 transition"
          >
            <div className="flex-1">
              <h3 className="font-medium text-white group-hover:text-blue-400">
                Start Assessment
              </h3>
              <p className="text-sm text-slate-400">
                Run risk assessment questionnaire
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition" />
          </Link>

          <Link
            href="/workspace/setup"
            className="group flex gap-4 p-4 rounded-lg border border-slate-700 hover:border-blue-500/50 bg-slate-900/50 hover:bg-slate-900/80 transition"
          >
            <div className="flex-1">
              <h3 className="font-medium text-white group-hover:text-blue-400">
                Team Management
              </h3>
              <p className="text-sm text-slate-400">
                Invite members and manage roles
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition" />
          </Link>
        </div>
      </div>
    </div>
  );
}
