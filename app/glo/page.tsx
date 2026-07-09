import type { Metadata } from 'next';
import {
  Activity,
  Brain,
  FlaskConical,
  GitBranch,
  ShieldCheck,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { buildDashboardBlock, buildSeededGenome, SEED_AT } from '@/lib/glo';
import { listOrgans } from '@/lib/glo/organs';
import type { ConfidenceLevel, Maturity } from '@/lib/glo';

export const metadata: Metadata = {
  title: 'GLO — General Learning Organism · NewsPulse AI',
  description:
    'Governor dashboard block: is the organism actually learning? Real evidence only.',
};

// Deterministic render: the seeded genome and fixed timestamp keep server and
// client output identical (no Date.now / Math.random anywhere in the genome).
const genome = buildSeededGenome();
const block = buildDashboardBlock(genome, SEED_AT);
const organProfiles = listOrgans();

const MATURITY_STYLE: Record<Maturity, string> = {
  unknown: 'bg-white/5 text-white/50 ring-white/10',
  seed: 'bg-amber-900/30 text-amber-300 ring-amber-500/20',
  developing: 'bg-sky-900/30 text-sky-300 ring-sky-500/20',
  proven: 'bg-emerald-900/30 text-emerald-300 ring-emerald-500/20',
};

const CONFIDENCE_STYLE: Record<
  ConfidenceLevel,
  { label: string; bar: string }
> = {
  unknown: { label: 'Unknown', bar: 'bg-white/25' },
  low: { label: 'Low', bar: 'bg-amber-400/70' },
  moderate: { label: 'Moderate', bar: 'bg-sky-400/70' },
  high: { label: 'High', bar: 'bg-emerald-400/70' },
};

export default function GloDashboardPage() {
  const dist = block.confidenceDistribution;
  const distTotal = dist.unknown + dist.low + dist.moderate + dist.high;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-accent-500/30 bg-accent-900/20 px-3 py-1 text-xs font-medium text-accent-300">
          <Sparkles className="h-3.5 w-3.5" />
          General Learning Organism · DNA-GLO-001
        </span>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Brain className="h-7 w-7 text-accent-400" />
          <span className="gradient-text">Is the organism learning?</span>
        </h1>
        <p className="max-w-2xl text-sm text-white/60">
          Every figure below is computed from real ledger records in the shared
          learning genome — no fabricated maturity, confidence, or success.
          Unknown stays unknown until evidence earns otherwise.
        </p>
        <div
          className={
            'flex w-fit items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ring-inset ' +
            (block.integrityOk
              ? 'bg-emerald-900/30 text-emerald-300 ring-emerald-500/20'
              : 'bg-red-900/30 text-red-300 ring-red-500/30')
          }
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {block.integrityOk
            ? 'Integrity OK — no organ declares more maturity than it earned'
            : 'Integrity ALERT — fabricated maturity detected'}
        </div>
      </header>

      {/* Stat tiles */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat
          icon={<GitBranch className="h-4 w-4" />}
          label="Organs"
          value={block.totalOrgans}
        />
        <Stat
          icon={<Activity className="h-4 w-4" />}
          label="Active loops"
          value={block.activeLearningLoops}
        />
        <Stat
          icon={<FlaskConical className="h-4 w-4" />}
          label="Active hypotheses"
          value={block.activeHypotheses}
        />
        <Stat
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Supported"
          value={block.supportedHypotheses}
        />
        <Stat
          icon={<Brain className="h-4 w-4" />}
          label="Evidence"
          value={block.evidenceGenerated}
        />
        <Stat
          icon={<HelpCircle className="h-4 w-4" />}
          label="Preserved (retired/rejected)"
          value={block.preservedHypotheses}
        />
      </section>

      {/* Confidence distribution + unknown territory */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Confidence distribution"
          subtitle="Across all hypotheses, re-derived from evidence"
        >
          <div className="flex flex-col gap-3">
            {(['high', 'moderate', 'low', 'unknown'] as ConfidenceLevel[]).map(
              (level) => {
                const count = dist[level];
                const pct =
                  distTotal === 0 ? 0 : Math.round((count / distTotal) * 100);
                return (
                  <div key={level} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-white/60">
                      {CONFIDENCE_STYLE[level].label}
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={
                          'h-full rounded-full ' + CONFIDENCE_STYLE[level].bar
                        }
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs tabular-nums text-white/70">
                      {count}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </Panel>

        <Panel
          title="Unknown territory"
          subtitle="What the organism honestly does not know yet"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline gap-6">
              <Metric
                value={block.unknownTerritory.organsAtUnknownMaturity}
                label="organs at unknown maturity"
              />
              <Metric
                value={block.unknownTerritory.declaredUnknowns}
                label="declared unknowns tracked"
              />
            </div>
            <p className="text-xs leading-relaxed text-white/50">
              Unknown is a first-class state here, never rounded up to zero or
              success. Retiring or rejecting a hypothesis preserves it —{' '}
              {block.preservedHypotheses} hypothes
              {block.preservedHypotheses === 1 ? 'is' : 'es'} kept as memory.
            </p>
          </div>
        </Panel>
      </section>

      {/* Organ registry */}
      <Panel
        title="Organ registry"
        subtitle="Maturity is derived from the ledger — not declared"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-white/50">
              <tr>
                <th className="px-3 py-2 font-medium">Organ</th>
                <th className="px-3 py-2 font-medium">Earned maturity</th>
                <th className="px-3 py-2 font-medium text-center">Unknowns</th>
                <th className="px-3 py-2 font-medium">Next best experiment</th>
              </tr>
            </thead>
            <tbody>
              {block.organs.map((organ) => {
                const profile = organProfiles.find((p) => p.id === organ.id);
                return (
                  <tr
                    key={organ.id}
                    className="border-b border-border/40 align-top"
                  >
                    <td className="px-3 py-3">
                      <div className="font-medium text-white">{organ.name}</div>
                      <div className="mt-0.5 max-w-xs text-xs text-white/45">
                        {profile?.mission}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ' +
                          MATURITY_STYLE[organ.earnedMaturity]
                        }
                      >
                        {organ.earnedMaturity}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-white/70">
                      {organ.unknownsCount}
                    </td>
                    <td className="px-3 py-3 text-xs text-white/60">
                      {organ.nextBestExperiment}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Transferable lessons */}
      <Panel
        title="Transferable lessons"
        subtitle="Recommendations only — a transfer never mutates the target organ"
      >
        {block.transferableLessons.length === 0 ? (
          <p className="text-sm italic text-white/40">
            No transferable lessons yet — none of the current learnings match a
            cross-organ affinity with earned confidence.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {block.transferableLessons.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-border/60 bg-card/40 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-white/5 px-2 py-0.5 font-medium uppercase text-white/70">
                    {t.fromOrgan}
                  </span>
                  <span className="text-white/40">→</span>
                  <span className="rounded bg-accent-900/40 px-2 py-0.5 font-medium uppercase text-accent-300">
                    {t.toOrgan}
                  </span>
                  <span className="ml-auto rounded bg-white/5 px-2 py-0.5 text-white/50">
                    {t.status} · confidence {t.confidence}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/70">{t.rationale}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Next organism-wide experiment */}
      <Panel
        title="Next best organism-wide experiment"
        subtitle="The single highest-leverage move for the whole Cathedral"
      >
        <p className="text-sm text-white/80">
          {block.nextBestOrganismExperiment}
        </p>
      </Panel>

      <p className="text-center text-xs text-white/30">
        Genome snapshot generated at {block.generatedAt}. Doctrine: machines
        execute · tools solve · products serve · organisms learn · cathedrals
        endure.
      </p>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/40 p-4">
      <span className="flex items-center gap-1.5 text-xs text-white/50">
        <span className="text-accent-400">{icon}</span>
        {label}
      </span>
      <span className="text-2xl font-bold tabular-nums text-white">
        {value}
      </span>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/30 p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white/90">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-white/45">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-bold tabular-nums text-white">
        {value}
      </span>
      <span className="max-w-[8rem] text-xs text-white/50">{label}</span>
    </div>
  );
}
