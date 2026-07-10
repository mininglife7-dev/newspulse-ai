import Link from 'next/link';
import {
  CheckCircle,
  Shield,
  Zap,
  Users,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="space-y-6 py-20">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl">
            <span>AI Governance,</span>{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Made Simple
            </span>
          </h1>
          <p className="max-w-2xl text-xl text-slate-300">
            Transform AI governance from a compliance checklist into a strategic
            advantage. Meet EU AI Act obligations with confidence.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-8 py-3 font-semibold text-white transition hover:shadow-lg hover:shadow-blue-500/40"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-8 py-3 font-semibold text-white transition hover:border-slate-600 hover:bg-slate-900"
            aria-label="Learn more about AI governance features"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <CheckCircle className="mb-3 h-6 w-6 text-cyan-400" aria-hidden="true" />
          <h3 className="font-semibold text-white">Built for Europe</h3>
          <p className="mt-2 text-sm text-slate-300">
            EU AI Act compliant from day one
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <Shield className="mb-3 h-6 w-6 text-cyan-400" aria-hidden="true" />
          <h3 className="font-semibold text-white">Enterprise Grade</h3>
          <p className="mt-2 text-sm text-slate-300">
            Security and privacy by design
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <Zap className="mb-3 h-6 w-6 text-cyan-400" aria-hidden="true" />
          <h3 className="font-semibold text-white">Rapid Setup</h3>
          <p className="mt-2 text-sm text-slate-300">
            From registration to insights in hours
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="space-y-8 py-12">
        <div className="space-y-2 text-center">
          <h2 className="text-4xl font-bold text-white">
            Everything You Need
          </h2>
          <p className="text-lg text-slate-300">
            Complete AI governance in one elegant platform
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/30 p-6">
            <Users className="h-6 w-6 text-cyan-400" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-white">AI Inventory</h3>
            <p className="text-slate-300">
              Catalog all AI systems, vendors, and purposes in your organization
            </p>
          </div>
          <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/30 p-6">
            <BarChart3 className="h-6 w-6 text-cyan-400" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-white">Risk Analysis</h3>
            <p className="text-slate-300">
              Classify risks based on EU AI Act and understand regulatory obligations
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-r from-blue-950/40 to-cyan-950/40 px-8 py-16 text-center">
        <h2 className="mb-4 text-3xl font-bold text-white">
          Ready to transform AI governance?
        </h2>
        <p className="mb-8 text-lg text-slate-300">
          Join companies across Europe who trust EURO AI for EU AI Act compliance
        </p>
        <Link
          href="/auth/signup"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-8 py-3 font-semibold text-white transition hover:shadow-lg hover:shadow-blue-500/40"
        >
          Get Started Free
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
