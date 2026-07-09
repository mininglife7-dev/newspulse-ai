import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldAlert,
  Activity,
  Rocket,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
} from 'lucide-react';
import {
  dashboardMeta,
  executiveSummary,
  healthItems,
  deploymentReality,
  healthScores,
  explainers,
  architectureGaps,
  decisionRecords,
  type HealthStatus,
  type RiskLevel,
  type Confidence,
  type Trend,
  type GoDecision,
} from '@/lib/founder/dashboard-data';

export const metadata: Metadata = {
  title: 'Founder Infrastructure Dashboard — NewsPulse AI',
  description:
    'Is our technology foundation healthy enough to launch, scale, and support customers? A plain-language view of infrastructure health, deployment reality, and launch readiness.',
  robots: { index: false, follow: false },
};

// Rendered fresh so the assessment always reflects the current source of truth.
export const dynamic = 'force-dynamic';

/* --------------------------------------------------------------------------
 * Small presentational helpers (color = meaning, for a non-technical reader)
 * ------------------------------------------------------------------------ */

function statusClasses(status: HealthStatus): string {
  switch (status) {
    case 'Operational':
      return 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30';
    case 'Partial':
      return 'bg-amber-500/15 text-amber-300 ring-amber-500/30';
    case 'At Risk':
      return 'bg-orange-500/15 text-orange-300 ring-orange-500/30';
    case 'Not Implemented':
      return 'bg-rose-500/15 text-rose-300 ring-rose-500/30';
    case 'Unknown':
    default:
      return 'bg-slate-500/15 text-slate-300 ring-slate-500/30';
  }
}

function riskClasses(risk: RiskLevel): string {
  switch (risk) {
    case 'Low':
      return 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30';
    case 'Medium':
      return 'bg-amber-500/15 text-amber-300 ring-amber-500/30';
    case 'High':
      return 'bg-orange-500/15 text-orange-300 ring-orange-500/30';
    case 'Critical':
    default:
      return 'bg-rose-500/15 text-rose-300 ring-rose-500/30';
  }
}

function confidenceClasses(c: Confidence): string {
  switch (c) {
    case 'Verified':
      return 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20';
    case 'Estimated':
      return 'bg-sky-500/10 text-sky-300 ring-sky-500/20';
    case 'Unknown':
    default:
      return 'bg-slate-500/10 text-slate-300 ring-slate-500/20';
  }
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === 'Improving')
    return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (trend === 'Declining')
    return <TrendingDown className="h-3.5 w-3.5 text-rose-400" />;
  if (trend === 'New')
    return <Sparkles className="h-3.5 w-3.5 text-accent-400" />;
  return <Minus className="h-3.5 w-3.5 text-white/40" />;
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-slate-300';
  if (score >= 70) return 'text-emerald-300';
  if (score >= 50) return 'text-amber-300';
  if (score >= 35) return 'text-orange-300';
  return 'text-rose-300';
}

function scoreBar(score: number | null): string {
  if (score === null) return 'bg-slate-500/40';
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  if (score >= 35) return 'bg-orange-500';
  return 'bg-rose-500';
}

function decisionBanner(decision: GoDecision): {
  className: string;
  Icon: typeof CheckCircle2;
} {
  switch (decision) {
    case 'GO':
      return {
        className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
        Icon: CheckCircle2,
      };
    case 'GO WITH CONDITIONS':
      return {
        className: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
        Icon: AlertTriangle,
      };
    case 'NO-GO':
    default:
      return {
        className: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
        Icon: XCircle,
      };
  }
}

function SectionHeading({
  index,
  title,
  subtitle,
}: {
  index: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 mt-14 border-b border-border/60 pb-3">
      <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-500/20 text-xs font-bold text-accent-300">
          {index}
        </span>
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------ */

export default function FounderDashboardPage() {
  const overall = healthScores.find(
    (s) => s.label === 'Overall Launch Readiness'
  );
  const banner = decisionBanner(executiveSummary.decision);
  const BannerIcon = banner.Icon;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to app
        </Link>
        <span className="text-xs text-white/40">
          Last reviewed {dashboardMeta.lastReviewed}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-indigo-600 glow">
          <Activity className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {dashboardMeta.title}
          </h1>
          <p className="mt-1 max-w-2xl text-white/60">
            {dashboardMeta.question}
          </p>
          <p className="mt-2 text-xs text-white/40">
            {dashboardMeta.reviewedBy} · Stage:{' '}
            <span className="text-white/60">{dashboardMeta.productStage}</span>
          </p>
        </div>
      </div>

      {/* Decision banner */}
      <div
        className={`mt-6 flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${banner.className}`}
      >
        <div className="flex items-center gap-3">
          <BannerIcon className="h-8 w-8 shrink-0" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider opacity-70">
              Launch Decision
            </div>
            <div className="text-2xl font-extrabold tracking-tight">
              {executiveSummary.decision}
            </div>
          </div>
        </div>
        {overall && (
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-wider opacity-70">
              Overall Launch Readiness
            </div>
            <div className="text-3xl font-extrabold tabular-nums">
              {overall.score ?? '—'}
              <span className="text-base font-medium opacity-60">/100</span>
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        {executiveSummary.decisionRationale}
      </p>

      {/* 7. Executive Summary */}
      <SectionHeading
        index={7}
        title="Executive Summary"
        subtitle="The five-minute read. Everything below is the evidence behind it."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <SummaryCard
          title="Architecture Health"
          body={executiveSummary.architectureHealth}
          tone="neutral"
        />
        <SummaryCard
          title="Deployment Health"
          body={executiveSummary.deploymentHealth}
          tone="neutral"
        />
        <SummaryList
          title="Biggest Risks"
          items={executiveSummary.biggestRisks}
          Icon={ShieldAlert}
          tone="rose"
        />
        <SummaryList
          title="Biggest Achievements"
          items={executiveSummary.biggestAchievements}
          Icon={CheckCircle2}
          tone="emerald"
        />
        <SummaryList
          title="Critical Blockers"
          items={executiveSummary.criticalBlockers}
          Icon={XCircle}
          tone="rose"
        />
        <SummaryList
          title="Recommended Next Actions"
          items={executiveSummary.recommendedNextActions}
          Icon={Rocket}
          tone="accent"
        />
      </div>

      {/* 3. Founder Health Score */}
      <SectionHeading
        index={3}
        title="Founder Health Score"
        subtitle="Honest 0–100 scores. Nothing is inflated; UNKNOWN stays UNKNOWN."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {healthScores.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border/60 bg-card p-4"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">{s.label}</span>
              <span
                className={`text-2xl font-extrabold tabular-nums ${scoreColor(
                  s.score
                )}`}
              >
                {s.score === null ? 'UNK' : s.score}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full ${scoreBar(s.score)}`}
                style={{ width: `${s.score ?? 6}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <Badge className={confidenceClasses(s.confidence)}>
                {s.confidence}
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/55">
              {s.rationale}
            </p>
          </div>
        ))}
      </div>

      {/* 1. Infrastructure Health */}
      <SectionHeading
        index={1}
        title="Infrastructure Health"
        subtitle="Every foundation component: what it is doing, the risk, and the one move to make."
      />
      <div className="space-y-3">
        {healthItems.map((item) => (
          <div
            key={item.name}
            className="rounded-xl border border-border/60 bg-card p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold">{item.name}</span>
              <Badge className={statusClasses(item.status)}>
                {item.status}
              </Badge>
              <Badge className={riskClasses(item.risk)}>
                {item.risk} risk
              </Badge>
              <Badge className={confidenceClasses(item.confidence)}>
                {item.confidence}
              </Badge>
              <span className="inline-flex items-center gap-1 text-[11px] text-white/45">
                <TrendIcon trend={item.trend} />
                {item.trend}
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Business Impact
                </div>
                <p className="mt-0.5 text-sm text-white/75">
                  {item.businessImpact}
                </p>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-accent-300/80">
                  Recommended Action
                </div>
                <p className="mt-0.5 text-sm text-white/75">
                  {item.recommendedAction}
                </p>
              </div>
            </div>
            <p className="mt-2 border-t border-border/40 pt-2 text-xs text-white/40">
              {item.detail}
            </p>
          </div>
        ))}
      </div>

      {/* 2. Deployment Reality */}
      <SectionHeading
        index={2}
        title="Deployment Reality"
        subtitle="Where the product actually lives, and what we can and cannot confirm from the code."
      />
      <div className="overflow-hidden rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <tbody>
            {deploymentReality.map((fact, i) => (
              <tr
                key={fact.label}
                className={i % 2 === 0 ? 'bg-card' : 'bg-cardHover/40'}
              >
                <td className="w-1/3 min-w-[180px] px-4 py-2.5 align-top font-medium text-white/70">
                  {fact.label}
                </td>
                <td className="px-4 py-2.5 align-top text-white/85">
                  {fact.value}
                </td>
                <td className="w-px px-4 py-2.5 align-top">
                  <Badge className={confidenceClasses(fact.confidence)}>
                    {fact.confidence}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Explain Like a Founder */}
      <SectionHeading
        index={4}
        title="Explain Like a Founder"
        subtitle="Each key component in plain English — what it is, why it matters, and the risk of ignoring it."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {explainers.map((e) => (
          <div
            key={e.component}
            className="rounded-xl border border-border/60 bg-card p-4"
          >
            <h3 className="text-sm font-bold text-accent-200">{e.component}</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <ExplainerRow label="What it is" value={e.whatItIs} />
              <ExplainerRow
                label="Why customers care"
                value={e.whyCustomersCare}
              />
              <ExplainerRow label="Business value" value={e.businessValue} />
              <ExplainerRow
                label="Current implementation"
                value={e.currentImplementation}
              />
              <ExplainerRow
                label="Future improvements"
                value={e.futureImprovements}
              />
              <ExplainerRow
                label="Risk if ignored"
                value={e.riskIfIgnored}
                danger
              />
            </dl>
          </div>
        ))}
      </div>

      {/* 5. Architecture Verification */}
      <SectionHeading
        index={5}
        title="Architecture Verification"
        subtitle="Our current architecture measured against world-class SaaS practice — with practical fixes only."
      />
      <div className="space-y-3">
        {architectureGaps.map((g, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-card p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white/5 text-white/70 ring-white/10">
                {g.category}
              </Badge>
              <Badge className={riskClasses(g.risk)}>{g.risk} risk</Badge>
            </div>
            <p className="mt-2 text-sm font-medium text-white/85">
              {g.finding}
            </p>
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
              <p className="text-white/55">
                <span className="font-semibold text-white/40">
                  World-class:{' '}
                </span>
                {g.worldClassPractice}
              </p>
              <p className="text-white/55">
                <span className="font-semibold text-accent-300/80">
                  Practical fix:{' '}
                </span>
                {g.practicalImprovement}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 6. Architecture Decision Record */}
      <SectionHeading
        index={6}
        title="Architecture Decision Record"
        subtitle="The significant infrastructure decisions, why we made them, and how to reverse them."
      />
      <div className="space-y-3">
        {decisionRecords.map((d, i) => (
          <details
            key={i}
            className="group rounded-xl border border-border/60 bg-card p-4"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold marker:content-['']">
              <span>{d.decision}</span>
              <span className="shrink-0 text-xs text-white/40">
                {d.date} · {d.owner}
              </span>
            </summary>
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <ExplainerRow label="Reason" value={d.reason} small />
              <ExplainerRow
                label="Alternatives considered"
                value={d.alternatives}
                small
              />
              <ExplainerRow label="Benefits" value={d.benefits} small />
              <ExplainerRow label="Trade-offs" value={d.tradeOffs} small />
              <ExplainerRow label="Risks" value={d.risks} small />
              <ExplainerRow
                label="Rollback plan"
                value={d.rollbackPlan}
                small
              />
              <ExplainerRow label="Evidence" value={d.evidence} small />
            </dl>
          </details>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-14 flex items-start gap-2 rounded-xl border border-border/60 bg-card/60 p-4 text-xs text-white/45">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          This dashboard is generated from a single source of truth
          (<code className="text-white/60">lib/founder/dashboard-data.ts</code>)
          and is mirrored in{' '}
          <code className="text-white/60">
            docs/founder/INFRASTRUCTURE_DASHBOARD.md
          </code>
          . Items marked{' '}
          <Badge className={confidenceClasses('Unknown')}>Unknown</Badge> can
          only be confirmed from the Vercel, Supabase, or OpenAI consoles — they
          are honestly left unverified rather than guessed.
        </p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Composed sub-components
 * ------------------------------------------------------------------------ */

function ExplainerRow({
  label,
  value,
  danger,
  small,
}: {
  label: string;
  value: string;
  danger?: boolean;
  small?: boolean;
}) {
  return (
    <div>
      <dt
        className={`text-[11px] font-semibold uppercase tracking-wider ${
          danger ? 'text-rose-300/80' : 'text-white/40'
        }`}
      >
        {label}
      </dt>
      <dd className={`mt-0.5 ${small ? 'text-xs' : 'text-sm'} text-white/75`}>
        {value}
      </dd>
    </div>
  );
}

function SummaryCard({
  title,
  body,
}: {
  title: string;
  body: string;
  tone: 'neutral';
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <h3 className="text-sm font-bold text-white/80">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-white/65">{body}</p>
    </div>
  );
}

function SummaryList({
  title,
  items,
  Icon,
  tone,
}: {
  title: string;
  items: string[];
  Icon: typeof ShieldAlert;
  tone: 'rose' | 'emerald' | 'accent';
}) {
  const toneMap = {
    rose: 'text-rose-300',
    emerald: 'text-emerald-300',
    accent: 'text-accent-300',
  } as const;
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <h3
        className={`flex items-center gap-1.5 text-sm font-bold ${toneMap[tone]}`}
      >
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex gap-2 text-sm leading-relaxed text-white/70"
          >
            <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${
              tone === 'rose'
                ? 'bg-rose-400'
                : tone === 'emerald'
                  ? 'bg-emerald-400'
                  : 'bg-accent-400'
            }`}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
