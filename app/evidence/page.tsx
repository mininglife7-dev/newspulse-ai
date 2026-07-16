'use client';

import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import { EvidenceForm } from '@/components/evidence/evidence-form';

interface AISystem {
  id: string;
  name: string;
}

interface Obligation {
  id: string;
  title: string;
  ai_system_id: string;
}

export default function EvidencePage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [systems, setSystems] = useState<AISystem[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [selectedObligationId, setSelectedObligationId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

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

  const filteredObligations = selectedSystemId
    ? obligations.filter((o) => o.ai_system_id === selectedSystemId)
    : obligations;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-white">Evidence Upload</h1>
        <p className="mt-2 text-lg text-slate-400">
          Submit compliance evidence to demonstrate obligation fulfillment
        </p>
      </div>

      {/* Selection Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* AI System Selection */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Associated AI System (Optional)
          </label>
          <select
            value={selectedSystemId}
            onChange={(e) => {
              setSelectedSystemId(e.target.value);
              setSelectedObligationId('');
            }}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
          >
            <option value="">None - General Evidence</option>
            {systems.map((system) => (
              <option key={system.id} value={system.id}>
                {system.name}
              </option>
            ))}
          </select>
        </div>

        {/* Obligation Selection */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Associated Obligation (Optional)
          </label>
          <select
            value={selectedObligationId}
            onChange={(e) => setSelectedObligationId(e.target.value)}
            disabled={filteredObligations.length === 0}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition disabled:opacity-50"
          >
            <option value="">No Obligation Selected</option>
            {filteredObligations.map((obligation) => (
              <option key={obligation.id} value={obligation.id}>
                {obligation.title}
              </option>
            ))}
          </select>
          {selectedSystemId && filteredObligations.length === 0 && (
            <p className="text-xs text-slate-400 mt-1">
              No obligations found for this system
            </p>
          )}
        </div>
      </div>

      {/* Evidence Form */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Submit Evidence</h2>
        <EvidenceForm
          key={formKey}
          workspaceId={workspaceId}
          aiSystemId={selectedSystemId || undefined}
          obligationId={selectedObligationId || undefined}
          onSuccess={() => {
            setFormKey((prev) => prev + 1);
          }}
        />
      </div>
    </div>
  );
}
