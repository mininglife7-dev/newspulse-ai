import IncidentObservabilityDashboard from '@/components/dashboard/IncidentObservabilityDashboard';

export const metadata = {
  title: 'Incident Response Observability',
  description: 'Monitor incident response system health, metrics, and effectiveness',
};

export const dynamic = 'force-dynamic';

export default function IncidentObservabilityPage() {
  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-white">Incident Response System</h1>
        <p className="mt-2 text-lg text-slate-400">
          Monitor incident lifecycle metrics, system health, and continuous improvements
        </p>
      </div>

      {/* Main Dashboard */}
      <IncidentObservabilityDashboard />
    </div>
  );
}
