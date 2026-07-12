'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Clock, TrendingUp, AlertTriangle, Download } from 'lucide-react';

interface ComplianceMetrics {
  totalObligations: number;
  completedObligations: number;
  inProgressObligations: number;
  identifiedObligations: number;
  notApplicableObligations: number;
  compliancePercentage: number;
  urgentObligations: number;
  overallStatus: 'compliant' | 'partial' | 'non_compliant' | 'unknown';
}

interface ComplianceGap {
  obligationId: string;
  obligationTitle: string;
  priority: string;
  gapDescription: string;
  requiredEvidence: string[];
  recommendedActions: string[];
  dueDate?: string;
}

interface RemediationPlan {
  id: string;
  obligation_id: string;
  title: string;
  status: string;
  priority: string;
  target_completion_date?: string;
  actionProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

interface ComplianceDashboardProps {
  companyId: string;
  companyName: string;
}

export function ComplianceDashboard({ companyId, companyName }: ComplianceDashboardProps) {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [gaps, setGaps] = useState<ComplianceGap[]>([]);
  const [plans, setPlans] = useState<RemediationPlan[]>([]);
  const [complianceScore, setComplianceScore] = useState<number>(0);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComplianceData();
  }, [companyId]);

  async function fetchComplianceData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch gap analysis
      const analysisResponse = await fetch(`/api/gap-analysis?company_id=${companyId}`);
      if (!analysisResponse.ok) throw new Error('Failed to fetch gap analysis');
      const analysisData = await analysisResponse.json();

      setMetrics(analysisData.metrics);
      setGaps(analysisData.gaps);
      setComplianceScore(analysisData.complianceScore);
      setRecommendations(analysisData.recommendations);

      // Fetch remediation plans
      const plansResponse = await fetch(`/api/remediation-plans?company_id=${companyId}`);
      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setPlans(plansData.plans);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compliance data');
      console.error('Compliance dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function exportAuditPackage() {
    try {
      const response = await fetch('/api/audit-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          format: 'json',
          includeEvidence: true,
          includeObligations: true,
          includeTechnicalDetails: false,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate audit package');
      const data = await response.json();

      // Download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-package-${companyId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin">⚙️</div>
          <p className="mt-2 text-gray-600">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const statusColor = {
    compliant: 'text-green-600 bg-green-50 border-green-200',
    partial: 'text-orange-600 bg-orange-50 border-orange-200',
    non_compliant: 'text-red-600 bg-red-50 border-red-200',
    unknown: 'text-gray-600 bg-gray-50 border-gray-200',
  };

  const criticalGaps = gaps.filter((g) => g.priority === 'critical');
  const highGaps = gaps.filter((g) => g.priority === 'high');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{companyName}</h1>
          <p className="text-gray-600">EU AI Act Compliance Assessment</p>
        </div>
        <button
          onClick={exportAuditPackage}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          Export Audit Package
        </button>
      </div>

      {/* Compliance Score Card */}
      <div className="border rounded-lg bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Compliance Score</h2>
          <span className="text-4xl font-bold">{complianceScore}</span>
        </div>
        <p className="text-gray-600 text-sm mb-4">Overall compliance status</p>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {metrics?.overallStatus === 'compliant' && (
              <CheckCircle className="h-6 w-6 text-green-600" />
            )}
            {metrics?.overallStatus === 'partial' && (
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            )}
            {metrics?.overallStatus === 'non_compliant' && (
              <AlertCircle className="h-6 w-6 text-red-600" />
            )}
            <span className={`text-lg font-semibold ${statusColor[metrics?.overallStatus || 'unknown']}`}>
              {metrics?.overallStatus?.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full"
              style={{ width: `${Math.min(complianceScore, 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold">{metrics?.completedObligations || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold">{metrics?.inProgressObligations || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Remaining</p>
              <p className="text-2xl font-bold">{metrics?.identifiedObligations || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts and Recommendations */}
      {recommendations.length > 0 && (
        <div className="border rounded-lg bg-white p-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5" />
            Recommendations
          </h2>
          <ul className="space-y-2">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-blue-600 font-bold">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Critical Gaps Alert */}
      {criticalGaps.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {criticalGaps.length} critical compliance gap{criticalGaps.length !== 1 ? 's' : ''} require immediate
            attention
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs for detailed views */}
      <Tabs defaultValue="obligations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="obligations">Obligations</TabsTrigger>
          <TabsTrigger value="gaps">
            Gaps {gaps.length > 0 && <span className="ml-2 text-red-600">({gaps.length})</span>}
          </TabsTrigger>
          <TabsTrigger value="remediation">
            Remediation {plans.length > 0 && <span className="ml-2 text-blue-600">({plans.length})</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="obligations">
          <div className="border rounded-lg bg-white p-6">
            <h2 className="text-lg font-bold mb-2">Compliance Obligations</h2>
            <p className="text-gray-600 text-sm mb-4">Track progress on {metrics?.totalObligations || 0} identified obligations</p>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-blue-600">{metrics?.completedObligations || 0}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-3xl font-bold text-yellow-600">{metrics?.inProgressObligations || 0}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Identified</p>
                  <p className="text-3xl font-bold text-purple-600">{metrics?.identifiedObligations || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Not Applicable</p>
                  <p className="text-3xl font-bold text-gray-600">{metrics?.notApplicableObligations || 0}</p>
                </div>
              </div>

              {metrics?.urgentObligations && metrics.urgentObligations > 0 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    {metrics.urgentObligations} critical/high priority obligation{metrics.urgentObligations !== 1 ? 's' : ''} need{metrics.urgentObligations !== 1 ? '' : 's'} attention
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gaps">
          <div className="border rounded-lg bg-white p-6">
            <h2 className="text-lg font-bold mb-2">Compliance Gaps</h2>
            <p className="text-gray-600 text-sm mb-4">Identified gaps and recommended actions</p>
            {gaps.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="text-gray-600">No compliance gaps identified</p>
              </div>
            ) : (
              <div className="space-y-4">
                {criticalGaps.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-red-600 mb-2">Critical Gaps ({criticalGaps.length})</h3>
                    <div className="space-y-3">
                      {criticalGaps.map((gap) => (
                        <div key={gap.obligationId} className="p-3 border border-red-200 bg-red-50 rounded-lg">
                          <p className="font-semibold text-red-900">{gap.obligationTitle}</p>
                          <p className="text-sm text-red-700 mt-1">{gap.gapDescription}</p>
                          {gap.requiredEvidence.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-semibold text-red-800">Required Evidence:</p>
                              <ul className="text-sm text-red-700 list-disc list-inside">
                                {gap.requiredEvidence.map((ev, idx) => (
                                  <li key={idx}>{ev}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {highGaps.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-orange-600 mb-2">High Priority Gaps ({highGaps.length})</h3>
                    <div className="space-y-3">
                      {highGaps.map((gap) => (
                        <div key={gap.obligationId} className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
                          <p className="font-semibold text-orange-900">{gap.obligationTitle}</p>
                          <p className="text-sm text-orange-700 mt-1">{gap.gapDescription}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="remediation">
          <div className="border rounded-lg bg-white p-6">
            <h2 className="text-lg font-bold mb-2">Remediation Plans</h2>
            <p className="text-gray-600 text-sm mb-4">Track progress on compliance remediation</p>
            {plans.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No remediation plans created yet</p>
                <p className="text-sm text-gray-500 mt-1">Create a plan to start tracking remediation actions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map((plan) => (
                  <div key={plan.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{plan.title}</h4>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          plan.priority === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : plan.priority === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {plan.priority.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">Status: {plan.status}</p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Progress</span>
                        <span className="text-sm font-semibold">
                          {plan.actionProgress.completed}/{plan.actionProgress.total} actions
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${plan.actionProgress.percentage}%` }}
                        />
                      </div>
                    </div>

                    {plan.target_completion_date && (
                      <p className="text-xs text-gray-500 mt-2">Target: {plan.target_completion_date}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Compliance Metrics Summary */}
      <div className="border rounded-lg bg-white p-6">
        <h2 className="text-lg font-bold mb-4">Summary</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-600">Total Obligations</dt>
            <dd className="text-2xl font-bold">{metrics?.totalObligations || 0}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Compliance %</dt>
            <dd className="text-2xl font-bold">{metrics?.compliancePercentage || 0}%</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Gaps Identified</dt>
            <dd className="text-2xl font-bold">{gaps.length}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Remediation Plans</dt>
            <dd className="text-2xl font-bold">{plans.length}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
