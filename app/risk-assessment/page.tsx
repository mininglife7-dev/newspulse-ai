'use client';

import { useEffect, useState } from 'react';
import { Loader, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AssessmentForm } from '@/components/risk-assessment/assessment-form';

interface AISystem {
  id: string;
  name: string;
  category: string;
  risk_level: string;
  status: string;
}

export default function RiskAssessmentPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [systems, setSystems] = useState<AISystem[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const workspaceResponse = await fetch('/api/workspace/list');
        if (workspaceResponse.ok) {
          const workspaceData = await workspaceResponse.json();
          if (workspaceData.workspaces && workspaceData.workspaces.length > 0) {
            const wId = workspaceData.workspaces[0].id;
            setWorkspaceId(wId);

            const systemsResponse = await fetch(
              `/api/ai-system/list?workspace_id=${wId}`
            );
            if (systemsResponse.ok) {
              const systemsData = await systemsResponse.json();
              setSystems(systemsData.ai_systems || []);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
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

  if (systems.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white">Risk Assessment</h1>
          <p className="mt-2 text-lg text-slate-400">
            Assess AI systems for compliance risks
          </p>
        </div>

        <div className="rounded-lg border border-yellow-800/50 bg-yellow-900/20 p-8 text-center">
          <p className="text-yellow-300 mb-4">
            No AI systems found. Create an AI system first before conducting a
            risk assessment.
          </p>
          <Link
            href="/ai-systems"
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            Go to AI Systems
          </Link>
        </div>
      </div>
    );
  }

  if (!selectedSystemId) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white">Risk Assessment</h1>
          <p className="mt-2 text-lg text-slate-400">
            Select an AI system to assess
          </p>
        </div>

        <div className="grid gap-4">
          {systems.map((system) => (
            <button
              key={system.id}
              onClick={() => setSelectedSystemId(system.id)}
              className="text-left rounded-lg border border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80 p-6 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {system.name}
                  </h3>
                  <div className="flex gap-4 text-sm">
                    <span className="text-slate-400">
                      Category:{' '}
                      <span className="text-white font-medium">
                        {system.category}
                      </span>
                    </span>
                    <span className="text-slate-400">
                      Status:{' '}
                      <span className="text-white font-medium">
                        {system.status}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="text-blue-400">→</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const selectedSystem = systems.find((s) => s.id === selectedSystemId);

  return (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSelectedSystemId(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Systems
        </button>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-4xl font-bold text-white">Risk Assessment</h1>
        <p className="mt-2 text-lg text-slate-400">{selectedSystem?.name}</p>
      </div>

      {/* Assessment Form */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            EU AI Act Compliance Assessment
          </h2>
          <p className="text-slate-400">
            Please answer the following questions to assess the risk level of
            this AI system. Your answers will help identify compliance
            obligations under the EU AI Act.
          </p>
        </div>

        <AssessmentForm
          workspaceId={workspaceId}
          aiSystemId={selectedSystemId}
          onSuccess={() => {
            setTimeout(() => {
              setSelectedSystemId(null);
            }, 1000);
          }}
        />
      </div>
    </div>
  );
}
