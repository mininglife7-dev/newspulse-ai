'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Shield,
} from 'lucide-react';
import {
  assessRisk,
  SYSTEM_TYPE_OPTIONS,
  USE_CASE_OPTIONS,
  DATA_CATEGORY_OPTIONS,
  AUTONOMY_LEVEL_OPTIONS,
  type RiskLevel,
} from '@/lib/risk-assessment';

interface AiSystem {
  id: string;
  name: string;
  system_type: string | null;
  status: string;
}

const RISK_LEVEL_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  unacceptable: {
    bg: 'bg-red-950/30',
    text: 'text-red-300',
    border: 'border-red-800/60',
  },
  high: {
    bg: 'bg-orange-950/30',
    text: 'text-orange-300',
    border: 'border-orange-800/60',
  },
  limited: {
    bg: 'bg-amber-950/30',
    text: 'text-amber-300',
    border: 'border-amber-800/60',
  },
  minimal: {
    bg: 'bg-green-950/30',
    text: 'text-green-300',
    border: 'border-green-800/60',
  },
};

export default function RiskAssessmentPage() {
  const router = useRouter();
  const [systems, setSystems] = useState<AiSystem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<AiSystem | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assessment, setAssessment] = useState<any>(null);

  const [formData, setFormData] = useState({
    systemType: '',
    dataCategories: [] as string[],
    useCases: [] as string[],
    autonomyLevel: 'medium' as 'high' | 'medium' | 'low',
    affectsRights: false,
    publicFacing: false,
  });

  // Load AI systems
  const loadSystems = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/ai-systems');
      if (res.status === 401) {
        window.location.href = '/auth/signin?redirect=/risk-assessment';
        return;
      }
      if (res.status === 409) {
        setLoadError('Complete workspace setup first');
        setSystems([]);
        return;
      }
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const data = await res.json().catch(() => {
        throw new Error('Server error - unable to parse response');
      });
      if (!data.ok) throw new Error(data.error || 'Failed to load');
      setSystems(data.systems || []);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load AI systems');
      setSystems([]);
    }
  }, []);

  useEffect(() => {
    loadSystems();
  }, [loadSystems]);

  const handleSystemSelect = (system: AiSystem) => {
    setSelectedSystem(system);
    setAssessment(null);
    setFormSuccess(false);
    setFormError(null);
    // Reset form to system's existing type if available
    setFormData({
      ...formData,
      systemType: system.system_type || '',
    });
  };

  const handleToggleDataCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      dataCategories: prev.dataCategories.includes(category)
        ? prev.dataCategories.filter((c) => c !== category)
        : [...prev.dataCategories, category],
    }));
  };

  const handleToggleUseCase = (useCase: string) => {
    setFormData((prev) => ({
      ...prev,
      useCases: prev.useCases.includes(useCase)
        ? prev.useCases.filter((u) => u !== useCase)
        : [...prev.useCases, useCase],
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSystem) return;

    setFormError(null);
    if (!formData.systemType) {
      setFormError('Please select a system type');
      return;
    }

    // Show preview of assessment before saving
    const preview = assessRisk({
      systemType: formData.systemType,
      dataCategories: formData.dataCategories,
      useCases: formData.useCases,
      autonomyLevel: formData.autonomyLevel,
      affectsRights: formData.affectsRights,
      publicFacing: formData.publicFacing,
    });

    setAssessment(preview);
    setFormSuccess(true);
  };

  const handleSaveAssessment = async () => {
    if (!selectedSystem || !assessment) return;

    setSaving(true);
    try {
      const res = await fetch('/api/risk-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiSystemId: selectedSystem.id,
          ...formData,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json().catch(() => {
        throw new Error('Server error - unable to parse response');
      });

      if (!data.ok) throw new Error(data.error || 'Failed to save');

      // Redirect to assessments list
      setTimeout(() => {
        router.push('/assessments');
      }, 1500);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save assessment');
      setSaving(false);
    }
  };

  if (!selectedSystem) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white">Risk Assessment</h1>
          <p className="text-slate-400">
            Classify your AI systems according to EU AI Act risk categories
          </p>
        </div>

        {loadError && (
          <div className="flex items-start gap-3 rounded-lg border border-red-800/60 bg-red-950/30 p-5 text-red-200">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>{loadError}</div>
          </div>
        )}

        {systems.length === 0 && !loadError ? (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 p-12 text-center">
            <Shield className="mx-auto mb-4 h-10 w-10 text-slate-600" />
            <h2 className="text-lg font-semibold text-white">No AI systems yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              Add AI systems to your inventory first, then assess their compliance risks.
            </p>
            <Link
              href="/inventory"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-2 text-sm font-medium text-white transition hover:shadow-lg"
            >
              Go to Inventory
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Select AI System</h2>
            <div className="grid gap-3">
              {systems.map((system) => (
                <button
                  key={system.id}
                  onClick={() => handleSystemSelect(system)}
                  className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-left transition hover:border-blue-500/50 hover:bg-slate-900/80"
                >
                  <div className="font-semibold text-white">{system.name}</div>
                  <div className="text-xs text-slate-500">
                    {SYSTEM_TYPE_OPTIONS.find((o) => o.value === system.system_type)?.label ||
                      system.system_type ||
                      'Unknown type'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (formSuccess && assessment) {
    return (
      <div className="space-y-8">
        <Link
          href="/risk-assessment"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Assessment Complete</h1>
          <p className="text-slate-400">System: {selectedSystem.name}</p>
        </div>

        <div className={`rounded-lg border p-6 ${RISK_LEVEL_COLORS[assessment.riskLevel].bg} ${RISK_LEVEL_COLORS[assessment.riskLevel].border}`}>
          <div className="mb-4 flex items-center gap-3">
            {assessment.riskLevel === 'unacceptable' && (
              <AlertTriangle className={`h-8 w-8 ${RISK_LEVEL_COLORS[assessment.riskLevel].text}`} />
            )}
            {assessment.riskLevel === 'high' && (
              <AlertTriangle className={`h-8 w-8 ${RISK_LEVEL_COLORS[assessment.riskLevel].text}`} />
            )}
            {['limited', 'minimal'].includes(assessment.riskLevel) && (
              <Shield className={`h-8 w-8 ${RISK_LEVEL_COLORS[assessment.riskLevel].text}`} />
            )}
            <div>
              <div className={`text-2xl font-bold ${RISK_LEVEL_COLORS[assessment.riskLevel].text}`}>
                {assessment.riskLevel.toUpperCase()} RISK
              </div>
              <div className={`text-sm ${RISK_LEVEL_COLORS[assessment.riskLevel].text}`}>
                Score: {Math.round(assessment.riskScore)}/100
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-white mb-2">Assessment Reasoning</h3>
            <ul className="space-y-2">
              {assessment.reasoning.map((reason: string, i: number) => (
                <li key={i} className="text-sm text-slate-300 flex gap-2">
                  <span className="text-blue-400">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <h3 className="font-semibold text-white mb-2">Required Obligations</h3>
            <ul className="space-y-2">
              {assessment.obligations.map((obligation: string, i: number) => (
                <li key={i} className="text-sm text-slate-300 flex gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                  {obligation}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => {
              setSelectedSystem(null);
              setAssessment(null);
              setFormSuccess(false);
            }}
            className="flex-1 rounded-lg border border-slate-700 px-6 py-3 font-semibold text-white transition hover:border-slate-600"
          >
            Assess Another System
          </button>
          <button
            onClick={handleSaveAssessment}
            disabled={saving}
            className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-3 font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Assessment'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-3xl font-bold text-white">
            Risk Assessment: {selectedSystem.name}
          </h1>
          <p className="text-slate-400">Classify this AI system by EU AI Act risk categories</p>
        </div>
        <button
          onClick={() => setSelectedSystem(null)}
          className="text-sm text-slate-400 hover:text-white"
        >
          Change System
        </button>
      </div>

      {formError && (
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 flex gap-3" role="alert" aria-live="polite">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300" id="assessment-error">{formError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* System Type */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">System Type</h3>
          <div>
            <label htmlFor="systemType" className="mb-2 block text-sm text-slate-300">
              What type of AI system is this? <span className="text-red-400">*</span>
            </label>
            <select
              id="systemType"
              value={formData.systemType}
              onChange={(e) => setFormData({ ...formData, systemType: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
              required
              aria-describedby={formError ? "assessment-error" : undefined}
            >
              <option value="">Select system type...</option>
              {SYSTEM_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Categories */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Data Categories</h3>
          <p className="text-sm text-slate-400">What types of data does this system process?</p>
          <div className="grid gap-2 md:grid-cols-2">
            {DATA_CATEGORY_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.dataCategories.includes(option.value)}
                  onChange={() => handleToggleDataCategory(option.value)}
                  className="mt-1 rounded border-slate-700 text-blue-500"
                />
                <span className="text-sm text-slate-300">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Use Cases */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Use Cases</h3>
          <p className="text-sm text-slate-400">How is this system used?</p>
          <div className="grid gap-2 md:grid-cols-2">
            {USE_CASE_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.useCases.includes(option.value)}
                  onChange={() => handleToggleUseCase(option.value)}
                  className="mt-1 rounded border-slate-700 text-blue-500"
                />
                <span className="text-sm text-slate-300">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Autonomy Level */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Decision Autonomy</h3>
          <div className="space-y-3">
            {AUTONOMY_LEVEL_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-start gap-3 p-4 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer">
                <input
                  type="radio"
                  name="autonomyLevel"
                  value={option.value}
                  checked={formData.autonomyLevel === option.value}
                  onChange={(e) => setFormData({ ...formData, autonomyLevel: e.target.value as any })}
                  className="mt-1 border-slate-700 text-blue-500"
                />
                <div>
                  <div className="font-medium text-white">{option.label}</div>
                  <div className="text-xs text-slate-500">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Impact Checkboxes */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Impact Scope</h3>
          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.affectsRights}
              onChange={(e) => setFormData({ ...formData, affectsRights: e.target.checked })}
              className="mt-1 rounded border-slate-700 text-blue-500"
            />
            <div>
              <div className="font-medium text-white">Affects Fundamental Rights</div>
              <div className="text-xs text-slate-500">System decisions significantly impact individual rights</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.publicFacing}
              onChange={(e) => setFormData({ ...formData, publicFacing: e.target.checked })}
              className="mt-1 rounded border-slate-700 text-blue-500"
            />
            <div>
              <div className="font-medium text-white">Public-Facing</div>
              <div className="text-xs text-slate-500">System is used in public-facing context</div>
            </div>
          </label>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 py-3 font-semibold text-white transition hover:shadow-lg hover:shadow-blue-500/40"
        >
          Calculate Risk Assessment
        </button>
      </form>
    </div>
  );
}
