"use client";

import { useEffect, useState } from "react";
import { Loader } from "lucide-react";
import { RemediationList } from "@/components/remediation/remediation-list";
import { RemediationForm } from "@/components/remediation/remediation-form";

interface Obligation {
  id: string;
  title: string;
}

export default function RemediationPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const workspaceResponse = await fetch("/api/workspace/list");
        if (workspaceResponse.ok) {
          const workspaceData = await workspaceResponse.json();
          if (
            workspaceData.workspaces &&
            workspaceData.workspaces.length > 0
          ) {
            const wId = workspaceData.workspaces[0].id;
            setWorkspaceId(wId);

            const obligationsResponse = await fetch(
              `/api/obligations/list?workspace_id=${wId}`
            );
            if (obligationsResponse.ok) {
              const obligationsData = await obligationsResponse.json();
              setObligations(obligationsData.obligations || []);
            }
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load data"
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-6">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-6">
        <p className="text-red-400">
          No workspace found. Please set up your workspace first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">
            Remediation Actions
          </h1>
          <p className="mt-2 text-lg text-slate-400">
            Track compliance remediation progress and action items
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
        >
          {showForm ? "Hide Form" : "Create Action"}
        </button>
      </div>

      {/* Form Section */}
      {showForm && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            Create Remediation Action
          </h2>
          <RemediationForm
            workspaceId={workspaceId}
            obligations={obligations}
            onSuccess={() => {
              setShowForm(false);
              setRefreshTrigger((prev) => prev + 1);
            }}
          />
        </div>
      )}

      {/* Remediations List Section */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">
          Action Items
        </h2>
        <RemediationList key={refreshTrigger} workspaceId={workspaceId} />
      </div>
    </div>
  );
}
