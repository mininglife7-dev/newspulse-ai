'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Plus,
  FileText,
  Trash2,
} from 'lucide-react';

interface AISystem {
  id: string;
  name: string;
}

interface Evidence {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
}

export default function EvidencePage() {
  const params = useParams();
  const router = useRouter();
  const systemId = params.systemId as string;

  const [system, setSystem] = useState<AISystem | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load system
      const systemRes = await fetch(`/api/ai-systems?id=${systemId}`);
      if (systemRes.status === 401) {
        router.push('/auth/signin?redirect=/inventory');
        return;
      }
      const systemData = await systemRes.json();
      if (!systemRes.ok || !systemData.ok) throw new Error('Failed to load system');
      setSystem(systemData.systems?.[0] || null);

      // Load evidence
      const evidenceRes = await fetch(`/api/evidence?aiSystemId=${systemId}`);
      const evidenceData = await evidenceRes.json();
      if (evidenceRes.ok && evidenceData.ok) {
        setEvidence(evidenceData.evidence || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [systemId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!form.title.trim()) {
      setFormError('Please provide a title');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save');
      setForm({ title: '', description: '' });
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save evidence');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (evidenceId: string) => {
    if (!confirm('Delete this evidence? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/evidence/${evidenceId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete evidence');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inventory
        </Link>
        <h1 className="text-3xl font-bold text-white">Evidence Collection</h1>
        {system && (
          <p className="text-slate-400">
            Upload compliance documentation and evidence for <strong>{system.name}</strong>
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-800/60 bg-red-950/30 p-5 text-red-200">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">
          {evidence.length === 0
            ? 'No evidence uploaded yet'
            : `${evidence.length} item${evidence.length === 1 ? '' : 's'} submitted`}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:shadow-lg hover:shadow-blue-500/40"
        >
          <Plus className="h-4 w-4" />
          Add evidence
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/50 p-6"
        >
          {formError && (
            <div className="flex items-center gap-2 rounded-md border border-red-800/60 bg-red-950/30 px-4 py-2 text-sm text-red-200">
              <AlertCircle className="h-4 w-4" /> {formError}
            </div>
          )}
          <div>
            <label htmlFor="title" className="mb-1 block text-sm text-slate-300">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Security Audit Report 2026"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="description" className="mb-1 block text-sm text-slate-300">
              Description
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What does this evidence demonstrate?"
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-5 py-2 text-sm font-medium text-white transition hover:shadow-lg hover:shadow-blue-500/40 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Saving…' : 'Add evidence'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-700 px-5 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {evidence.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 p-12 text-center">
          <FileText className="mx-auto mb-4 h-10 w-10 text-slate-600" />
          <h2 className="text-lg font-semibold text-white">
            No evidence submitted yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Upload audit reports, testing results, security certifications, and other
            documentation that demonstrates compliance.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {evidence.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-slate-800 bg-slate-900/50 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-5 w-5 text-cyan-400" />
                    <span className="font-medium text-white">{e.title}</span>
                  </div>
                  {e.description && (
                    <p className="text-sm text-slate-400 mb-2">{e.description}</p>
                  )}
                  <div className="text-xs text-slate-500">
                    <span className={`rounded-full border px-2 py-0.5 ${
                      e.status === 'approved'
                        ? 'bg-green-950/50 text-green-300 border-green-800/60'
                        : e.status === 'rejected'
                        ? 'bg-red-950/50 text-red-300 border-red-800/60'
                        : e.status === 'under_review'
                        ? 'bg-amber-950/50 text-amber-300 border-amber-800/60'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700'
                    }`}>
                      {e.status.charAt(0).toUpperCase() + e.status.slice(1).replace('_', ' ')}
                    </span>
                    <span className="ml-3 text-slate-600">
                      {new Date(e.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="text-slate-400 hover:text-red-400 transition"
                  title="Delete evidence"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
