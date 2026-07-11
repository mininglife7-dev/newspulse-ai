import { PerformanceDashboard } from '@/components/monitoring/PerformanceDashboard';

export const metadata = {
  title: 'Performance Monitoring | EURO AI',
  description: 'Real-time performance metrics and SLA monitoring for EURO AI',
};

export default function MonitoringPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <PerformanceDashboard />
      </div>
    </div>
  );
}
