'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trash2, Eye, Edit2, Loader } from 'lucide-react';

interface AISystem {
  id: string;
  name: string;
  description: string;
  category: string;
  risk_level: string;
  status: string;
  created_at: string;
}

interface SystemListProps {
  workspaceId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  large_language_model: 'Large Language Model',
  computer_vision: 'Computer Vision',
  recommendation: 'Recommendation System',
  autonomous: 'Autonomous Agent',
  biometric: 'Biometric System',
  other: 'Other',
};

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-900/30 border-green-800 text-green-300',
  medium: 'bg-yellow-900/30 border-yellow-800 text-yellow-300',
  high: 'bg-red-900/30 border-red-800 text-red-300',
};

const STATUS_COLORS: Record<string, string> = {
  in_development: 'bg-blue-900/30 border-blue-800 text-blue-300',
  pilot: 'bg-purple-900/30 border-purple-800 text-purple-300',
  production: 'bg-green-900/30 border-green-800 text-green-300',
  deprecated: 'bg-gray-900/30 border-gray-800 text-gray-300',
};

export function SystemList({ workspaceId }: SystemListProps) {
  const [systems, setSystems] = useState<AISystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSystems() {
      try {
        const response = await fetch(
          `/api/ai-system/list?workspace_id=${workspaceId}`
        );
        if (!response.ok) throw new Error('Failed to fetch AI systems');
        const data = await response.json();
        setSystems(data.ai_systems || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (workspaceId) {
      fetchSystems();
    }
  }, [workspaceId]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this AI system?')) return;

    setDeleting(id);
    try {
      const response = await fetch('/api/ai-system/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, workspace_id: workspaceId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete AI system');
      }

      setSystems(systems.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

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

  if (systems.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-12 text-center">
        <p className="text-slate-400 mb-4">No AI systems created yet</p>
        <Link
          href="#"
          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
        >
          Create your first AI system
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {systems.map((system) => (
        <div
          key={system.id}
          className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 hover:border-slate-700 transition"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">
                {system.name}
              </h3>
              <p className="text-sm text-slate-400">
                {system.description || 'No description provided'}
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              <Link
                href={`/ai-systems/${system.id}`}
                className="p-2 hover:bg-slate-800 rounded transition text-slate-400 hover:text-blue-400"
                title="View details"
              >
                <Eye className="w-4 h-4" />
              </Link>
              <Link
                href={`/ai-systems/${system.id}/edit`}
                className="p-2 hover:bg-slate-800 rounded transition text-slate-400 hover:text-yellow-400"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </Link>
              <button
                onClick={() => handleDelete(system.id)}
                disabled={deleting === system.id}
                className="p-2 hover:bg-slate-800 rounded transition text-slate-400 hover:text-red-400 disabled:opacity-50"
                title="Delete"
              >
                {deleting === system.id ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">
                Category
              </p>
              <p className="text-sm text-white">
                {CATEGORY_LABELS[system.category] || system.category}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">
                Risk Level
              </p>
              <div
                className={`inline-block px-2 py-1 rounded text-xs font-medium border ${
                  RISK_COLORS[system.risk_level] ||
                  'bg-slate-900/30 border-slate-800 text-slate-300'
                }`}
              >
                {system.risk_level.charAt(0).toUpperCase() +
                  system.risk_level.slice(1)}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">Status</p>
              <div
                className={`inline-block px-2 py-1 rounded text-xs font-medium border ${
                  STATUS_COLORS[system.status] ||
                  'bg-slate-900/30 border-slate-800 text-slate-300'
                }`}
              >
                {system.status
                  .split('_')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">Created</p>
              <p className="text-sm text-white">
                {new Date(system.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
