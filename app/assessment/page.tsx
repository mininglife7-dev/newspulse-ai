'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { SCREENING_QUESTIONS } from '@/lib/risk-assessment';

interface AiSystem {
  id: string;
  name: string;
  system_type: string | null;
}

interface Assessment {
  id: string;
  ai_system_id: string;
  risk_level: 'unacceptable' | 'high' | 'medium' | 'low';
  risk_score: number | null;
  assessment_data: {
    obligations?: string[];
    rationale?: string;
  };
  created_at: string;
}

const LEVEL_STYLE: Record<string, string> = {
  unacceptable: 'bg-red-950/60 text-red-300 border-red-800/70',
  high: 'bg-orange-950/60 text-orange-300 border-orange-800/70',
  medium: 'bg-amber-950/60 text-amber-300 border-amber-800/70',
  low: 'bg-green-950/60 text-green-300 border-green-800/70',
};

const LEVEL_LABEL: Record<string, string> = {
  unacceptable: 'Unacceptable (prohibited)',
  high: 'High risk',
  medium: 'Limited risk (transparency)',
  low: 'Minimal risk',
};

export default function AssessmentPage() {
  const [systems, setSystems] = useState<AiSystem[] | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  const [activeSystem, setActiveSystem] = useState<AiSystem | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [sysRes, asmRes] = await Promise.all([
        fetch('/api/ai-systems'),
        fetch('/api/risk-assessments'),
      ]);
      if (sysRes.status === 401 || asmRes.status === 401) {
        window.location.href = '/auth/signin?redirect=/assessment';
        return;
      }
      if (sysRes.status === 409 || asmRes.status === 409) {
        setNeedsSetup(true);
        setSystems([]);
        return;
      }
      const sys = await sysRes.json();
      const asm = await asmRes.json();
      if (!sysRes.ok || !sys.ok) throw new Error(sys.error || 'Failed to load');
      if (!asmRes.ok || !asm.ok) throw new Error(asm.error || 'Failed to load');
      setSystems(sys.systems);
      setAssessments(asm.assessments);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load assessment data');
      setSystems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const latestFor = (systemId: string): Assessment | undefined =>
    assessments.find((a) => a.ai_system_id === systemId);

  const startAssessment = (system: AiSystem) => {
    setActiveSystem(system);
    setAnswers({});
    setFormError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeSystem) return;
    const unanswered = SCREENING_QUESTIONS.filter(
      (q) => answers[q.id] === undefined
    );
    if (unanswered.length > 0) {
      setFormError(
        `Please answer all questions (${unanswered.length} remaining)`
      );
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/risk-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiSystemId: activeSystem.id, answers }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save');
      setActiveSystem(null);
      await load();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
          Screen each AI system against the EU AI Act's risk tiers. This is a
          first-pass classification to prioritize your compliance work — not a
          conformity assessment or legal advice.
        </p>
      </div>

      {needsSetup && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-800/60 bg-amber-950/30 p-5 text-amber-200">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            Complete your{' '}
            <Link href="/workspace/setup" className="underline hover:text-amber-100">
              company setup
            </Link>{' '}
            first.
          </div>
        </div>
      )}

      {loadError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-800/60 bg-red-950/30 p-5 text-red-200">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>{loadError}</div>
        </div>
      )}

      {activeSystem ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-lg border border-slate-800 bg-slate-900/50 p-6"
        >
          <h2 className="text-xl font-semibold text-white">
            Screening: {activeSystem.name}
          </h2>
          <p className="text-sm text-slate-400">
            Answer for how the system is actually used in your organization.
          </p>
          {formError && (
            <div className="flex items-center gap-2 rounded-md border border-red-800/60 bg-red-950/30 px-4 py-2 text-sm text-red-200">
              <AlertCircle className="h-4 w-4" /> {formError}
            </div>
          )}
          <ol className="space-y-4">
            {SCREENING_QUESTIONS.map((q, i) => (
              <li
                key={q.id}
                className="rounded-lg border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="mb-3 text-sm text-white">
                  <span className="mr-2 text-slate-500">{i + 1}.</span>
                  {q.text}
                </div>
                <div className="flex gap-2">
                  {([true, false] as const).map((val) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: val }))}
                      className={`rounded-md border px-4 py-1.5 text-sm transition ${
                        answers[q.id] === val
                          ? val
                            ? 'border-amber-500 bg-amber-950/50 text-amber-200'
                            : 'border-cyan-500 bg-cyan-950/50 text-cyan-200'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      {val ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-5 py-2 text-sm font-medium text-white transition hover:shadow-lg hover:shadow-blue-500/40 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Classifying…' : 'Classify risk'}
            </button>
            <button
              type="button"
              onClick={() => setActiveSystem(null)}
              className="rounded-lg border border-slate-700 px-5 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        !needsSetup &&
        systems !== null && (
          <>
            {systems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 p-12 text-center">
                <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-slate-600" />
                <h2 className="text-lg font-semibold text-white">
                  Nothing to assess yet
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                  Add AI systems to your{' '}
                  <Link href="/inventory" className="text-cyan-400 underline">
                    inventory
                  </Link>{' '}
                  first — each one can then be screened here.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {systems.map((s) => {
                  const latest = latestFor(s.id);
                  return (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-5"
                    >
                      <div className="flex items-center gap-3">
                        {latest ? (
                          <ShieldCheck className="h-5 w-5 text-cyan-400" />
                        ) : (
                          <ShieldAlert className="h-5 w-5 text-slate-500" />
                        )}
                        <span className="font-semibold text-white">
                          {s.name}
                        </span>
                        {latest && (
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs ${LEVEL_STYLE[latest.risk_level]}`}
                          >
                            {LEVEL_LABEL[latest.risk_level]}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => startAssessment(s)}
                        className="rounded-lg border border-slate-700 px-4 py-1.5 text-sm text-slate-300 transition hover:border-cyan-500/60 hover:text-white"
                      >
                        {latest ? 'Reassess' : 'Assess now'}
                      </button>
                      {latest?.assessment_data?.obligations && (
                        <div className="w-full text-sm text-slate-400">
                          <div className="mb-1 text-slate-500">
                            {latest.assessment_data.rationale}
                          </div>
                          <ul className="list-inside list-disc space-y-0.5">
                            {latest.assessment_data.obligations
                              .slice(0, 4)
                              .map((o) => (
                                <li key={o}>{o}</li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )
      )}

      {systems === null && !loadError && !needsSetup && (
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}
    </div>
  );
}
