'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Dna,
  FlaskConical,
  Loader2,
  Play,
  RotateCw,
  ShieldCheck,
  ShieldX,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  DnaProposal,
  EvolutionDashboard,
  QualityGate,
} from '@/lib/ceis/types';

/**
 * Founder Evolution Dashboard — the Cathedral's self-improvement console.
 * Reads /api/ceis/dashboard; founder actions go through /api/ceis/proposals.
 */
export default function EvolutionPage() {
  const [data, setData] = useState<EvolutionDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ceis/dashboard', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.ok)
        throw new Error(json.error || `Failed (${res.status})`);
      setData(json as EvolutionDashboard);
    } catch (err: any) {
      setError(err?.message || 'Failed to load the evolution dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runCycle = useCallback(async () => {
    setRunning(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/ceis/run', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.ok)
        throw new Error(json.error || `Cycle failed (${res.status})`);
      setNotice(
        `Cycle complete: ${json.stats.observations} observations → ${json.stats.principles} principles → ${json.stats.dna_generated} DNA proposals (${json.stats.rejected} rejected by the immune system).`
      );
      await load();
    } catch (err: any) {
      setError(err?.message || 'Evolution cycle failed.');
    } finally {
      setRunning(false);
    }
  }, [load]);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Dna className="h-7 w-7 text-accent-400" />
            <span className="gradient-text">Evolution</span>
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Cathedral Evolution Intelligence System — observe, learn, validate,
            evolve. Every mission below waits for quality gates and your
            approval.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-white/80 transition hover:border-accent-500/60 hover:text-white disabled:opacity-50"
          >
            <RotateCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={runCycle}
            disabled={running || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-accent-500/50 bg-accent-900/30 px-3 py-2 text-sm text-accent-200 transition hover:border-accent-400 hover:bg-accent-900/60 disabled:opacity-50"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {running ? 'Evolving…' : 'Run Evolution Cycle'}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-accent-500/40 bg-accent-900/20 px-4 py-3 text-sm text-accent-200">
          {notice}
        </div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-border/60 bg-card"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI tiles */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MeterTile label="Evolution Score" value={data.evolution_score} />
            <MeterTile
              label="Architecture Health"
              value={data.architecture_health}
            />
            <MeterTile
              label="Evidence Confidence"
              value={data.evidence_confidence}
            />
            <MeterTile
              label="Launch Readiness Impact"
              value={data.launch_readiness_impact}
            />
            <MeterTile label="Customer Impact" value={data.customer_impact} />
            <MeterTile label="ROI Estimate" value={data.roi_estimate} />
            <StatTile
              label="Knowledge Genome"
              value={data.knowledge_entries}
              hint="permanent memory entries"
            />
            <StatTile
              label="Learning Velocity"
              value={data.learning_velocity}
              hint="entries learned in the last 7 days"
            />
          </section>

          {/* DNA sections */}
          <ProposalSection
            title="DNA Queue"
            proposals={data.dna_queue}
            emptyText="The queue is empty — run an evolution cycle to gather new proposals."
            onChanged={load}
          />
          <ProposalSection
            title="Under Review"
            proposals={data.under_review}
            emptyText="Nothing is under review."
            onChanged={load}
          />
          <ProposalSection
            title="Approved DNA"
            proposals={data.approved}
            emptyText="No DNA approved yet — every mission must pass all nine quality gates first."
            onChanged={load}
          />
          <ProposalSection
            title="Rejected DNA"
            proposals={data.rejected}
            emptyText="Nothing rejected by founder review yet."
            onChanged={load}
          />

          {/* Latest weekly report */}
          {data.latest_report && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <FlaskConical className="h-5 w-5 text-accent-400" />
                Latest Evolution Report ({data.latest_report.week})
              </h2>
              <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl border border-border/60 bg-card/40 p-5 text-sm leading-relaxed text-white/80">
                {data.latest_report.markdown}
              </pre>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <p className="text-xs uppercase tracking-wider text-white/50">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

/** 0..100 metric with a thin single-hue meter under the hero number. */
function MeterTile({ label, value }: { label: string; value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <p className="text-xs uppercase tracking-wider text-white/50">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-white">
        {clamped}
        <span className="ml-1 text-sm font-normal text-white/40">/ 100</span>
      </p>
      <div
        className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-accent-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ProposalSection({
  title,
  proposals,
  emptyText,
  onChanged,
}: {
  title: string;
  proposals: DnaProposal[];
  emptyText: string;
  onChanged: () => void;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <Dna className="h-5 w-5 text-accent-400" />
        {title}
        <span className="rounded-full bg-accent-900/40 px-2 py-0.5 text-xs font-medium text-accent-300 ring-1 ring-inset ring-accent-500/20">
          {proposals.length}
        </span>
      </h2>
      {proposals.length === 0 ? (
        <p className="rounded-xl border border-border/60 bg-card/30 px-4 py-5 text-sm italic text-white/40">
          {emptyText}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {proposals.map((p) => (
            <ProposalCard key={p.id} proposal={p} onChanged={onChanged} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProposalCard({
  proposal,
  onChanged,
}: {
  proposal: DnaProposal;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const act = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setActionError(null);
      try {
        const res = await fetch(`/api/ceis/proposals/${proposal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok || !json.ok)
          throw new Error(json.error || `Failed (${res.status})`);
        onChanged();
      } catch (err: any) {
        setActionError(err?.message || 'Action failed.');
      } finally {
        setBusy(false);
      }
    },
    [proposal.id, onChanged]
  );

  const reject = useCallback(() => {
    const reason = prompt(
      'Why is this DNA rejected? (stored in the knowledge genome)'
    );
    if (reason === null) return;
    act({ action: 'reject', reason });
  }, [act]);

  return (
    <div className="rounded-xl border border-border/60 bg-card/40">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-white/50" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-white/50" />
        )}
        <span className="font-mono text-xs text-accent-300">
          {proposal.code}
        </span>
        <span className="flex-1 truncate font-medium text-white">
          {proposal.title}
        </span>
        <span className="hidden text-xs text-white/50 sm:inline">
          {proposal.priority} · {proposal.estimated_effort}
        </span>
        <span className="rounded-full bg-accent-900/40 px-2 py-0.5 text-xs font-semibold tabular-nums text-accent-300 ring-1 ring-inset ring-accent-500/20">
          {proposal.evolution_score.overall}
        </span>
      </button>

      {open && (
        <div className="border-t border-border/40 px-5 py-4 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Mission" value={proposal.mission} wide />
            <Field label="Problem" value={proposal.problem_statement} wide />
            <Field label="Business Value" value={proposal.business_value} />
            <Field
              label="Customer Impact"
              value={proposal.expected_customer_impact}
            />
            <Field label="Architecture" value={proposal.architecture} wide />
            <Field label="Rollback Plan" value={proposal.rollback_plan} wide />
          </dl>

          <div className="mt-4">
            <p className="mb-1.5 text-xs uppercase tracking-wider text-white/50">
              Implementation Plan
            </p>
            <ol className="list-inside list-decimal space-y-1 text-white/70">
              {proposal.implementation_plan.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-xs uppercase tracking-wider text-white/50">
              Quality Gates — all nine must pass before approval
            </p>
            <div className="flex flex-wrap gap-1.5">
              {proposal.gates.map((gate) => (
                <GateChip
                  key={gate.name}
                  gate={gate}
                  disabled={
                    busy ||
                    proposal.status === 'approved' ||
                    proposal.status === 'rejected'
                  }
                  onSet={(status) =>
                    act({ action: 'gate', gate: gate.name, status })
                  }
                />
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-xs uppercase tracking-wider text-white/50">
              Evidence
            </p>
            <ul className="space-y-1 text-xs text-white/50">
              {proposal.evidence.map((e, i) => (
                <li key={i} className="truncate">
                  {e}
                </li>
              ))}
            </ul>
          </div>

          {actionError && (
            <div className="mt-4 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-xs text-red-300">
              {actionError}
            </div>
          )}

          {(proposal.status === 'proposed' ||
            proposal.status === 'under-review') && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {proposal.status === 'proposed' && (
                <button
                  onClick={() => act({ action: 'start-review' })}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-white/80 transition hover:border-accent-500/60 hover:text-white disabled:opacity-50"
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  Start Review
                </button>
              )}
              <button
                onClick={() => act({ action: 'approve' })}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-300 transition hover:border-emerald-400 disabled:opacity-50"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Approve
              </button>
              <button
                onClick={reject}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-1.5 text-xs text-red-300 transition hover:border-red-400 disabled:opacity-50"
              >
                <ShieldX className="h-3.5 w-3.5" />
                Reject
              </button>
              {busy && (
                <Loader2 className="h-4 w-4 animate-spin text-white/50" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={cn(wide && 'sm:col-span-2')}>
      <dt className="text-xs uppercase tracking-wider text-white/50">
        {label}
      </dt>
      <dd className="mt-0.5 text-white/70">{value}</dd>
    </div>
  );
}

/** Gate status is never color-alone: icon + label always shown. */
function GateChip({
  gate,
  disabled,
  onSet,
}: {
  gate: QualityGate;
  disabled: boolean;
  onSet: (status: 'passed' | 'failed') => void;
}) {
  const Icon =
    gate.status === 'passed'
      ? CheckCircle2
      : gate.status === 'failed'
        ? XCircle
        : FlaskConical;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs',
        gate.status === 'passed' &&
          'border-emerald-500/40 bg-emerald-950/30 text-emerald-300',
        gate.status === 'failed' &&
          'border-red-500/40 bg-red-950/30 text-red-300',
        gate.status === 'pending' && 'border-border bg-card text-white/60'
      )}
      title={gate.notes ?? undefined}
    >
      <Icon className="h-3 w-3" />
      {gate.name.replace(/-/g, ' ')} · {gate.status}
      {!disabled && gate.status === 'pending' && (
        <span className="ml-1 inline-flex gap-0.5">
          <button
            onClick={() => onSet('passed')}
            className="rounded px-1 text-emerald-300 hover:bg-emerald-950/50"
            aria-label={`Pass ${gate.name}`}
          >
            ✓
          </button>
          <button
            onClick={() => onSet('failed')}
            className="rounded px-1 text-red-300 hover:bg-red-950/50"
            aria-label={`Fail ${gate.name}`}
          >
            ✗
          </button>
        </span>
      )}
    </span>
  );
}
