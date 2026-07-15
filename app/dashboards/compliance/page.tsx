'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, TrendingUp, ArrowRight, Download } from 'lucide-react';

interface ComplianceAssessment {
  overallScore: number;
  readinessLevel: 'not-started' | 'in-progress' | 'advanced' | 'compliant';
  lastAssessed: string;
  sections: {
    discovery: {
      score: number;
      status: string;
      findings: string[];
    };
    documentation: {
      score: number;
      status: string;
      findings: string[];
    };
    security: {
      score: number;
      status: string;
      findings: string[];
    };
  };
  actionItems: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    action: string;
    estimatedTime: string;
    impact: string;
  }>;
}

export default function ComplianceDashboardPage() {
  const [assessment, setAssessment] = useState<ComplianceAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const res = await fetch('/api/compliance/assessment');
        if (!res.ok) throw new Error('Failed to fetch compliance assessment');
        const data = await res.json();
        setAssessment(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Compliance assessment error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, []);

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const res = await fetch('/api/export/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-assessment-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white">EU AI Act Compliance</h1>
          <p className="mt-2 text-lg text-slate-400">Loading your assessment...</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-lg bg-slate-800"></div>
          <div className="h-64 rounded-lg bg-slate-800"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white">EU AI Act Compliance</h1>
          <p className="mt-2 text-lg text-slate-400">Error loading assessment</p>
        </div>
        <div className="rounded-lg border border-red-800/50 bg-red-950/20 p-6">
          <div className="flex gap-4">
            <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-white">Error</h3>
              <p className="text-sm text-slate-400 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!assessment) return null;

  const readinessColors = {
    'not-started': 'bg-slate-700',
    'in-progress': 'bg-yellow-700',
    'advanced': 'bg-blue-700',
    'compliant': 'bg-green-700',
  };

  const readinessLabels = {
    'not-started': 'Not Started',
    'in-progress': 'In Progress',
    'advanced': 'Advanced',
    'compliant': 'Compliant',
  };

  const priorityColors = {
    critical: 'border-red-800/50 bg-red-950/20',
    high: 'border-orange-800/50 bg-orange-950/20',
    medium: 'border-yellow-800/50 bg-yellow-950/20',
    low: 'border-blue-800/50 bg-blue-950/20',
  };

  const priorityBadgeColors = {
    critical: 'bg-red-900/50 text-red-200',
    high: 'bg-orange-900/50 text-orange-200',
    medium: 'bg-yellow-900/50 text-yellow-200',
    low: 'bg-blue-900/50 text-blue-200',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white">EU AI Act Compliance</h1>
        <p className="mt-2 text-lg text-slate-400">
          Track your organization's readiness for AI governance regulations
        </p>
      </div>

      {/* Overall Score Card */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8">
        <div className="flex items-start justify-between gap-8">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-300 mb-2">Overall Readiness</h2>
            <p className="text-sm text-slate-500 mb-4">
              Last assessed: {new Date(assessment.lastAssessed).toLocaleDateString()}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-white">{assessment.overallScore}</span>
              <span className="text-xl text-slate-400">/100</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div
              className={`${readinessColors[assessment.readinessLevel]} rounded-full px-4 py-2 text-white font-semibold`}
            >
              {readinessLabels[assessment.readinessLevel]}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('json')}
                disabled={exporting}
                className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-4 py-2 text-white font-medium transition text-sm"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'JSON'}
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className="flex items-center gap-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 px-4 py-2 text-white font-medium transition text-sm"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'CSV'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section Scores */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Discovery */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">AI System Discovery</h3>
              <span className="text-2xl font-bold text-cyan-400">{assessment.sections.discovery.score}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-cyan-500 h-2 rounded-full"
                style={{ width: `${(assessment.sections.discovery.score / 20) * 100}%` }}
              ></div>
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-4">{assessment.sections.discovery.status}</p>
          <ul className="space-y-2">
            {assessment.sections.discovery.findings.map((finding, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-slate-300">
                <span className="text-cyan-400 flex-shrink-0">•</span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Documentation */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">AI-BOM Documentation</h3>
              <span className="text-2xl font-bold text-blue-400">{assessment.sections.documentation.score}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${(assessment.sections.documentation.score / 30) * 100}%` }}
              ></div>
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-4">{assessment.sections.documentation.status}</p>
          <ul className="space-y-2">
            {assessment.sections.documentation.findings.map((finding, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-slate-300">
                <span className="text-blue-400 flex-shrink-0">•</span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Security */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">Runtime Security</h3>
              <span className="text-2xl font-bold text-green-400">{assessment.sections.security.score}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${(assessment.sections.security.score / 50) * 100}%` }}
              ></div>
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-4">{assessment.sections.security.status}</p>
          <ul className="space-y-2">
            {assessment.sections.security.findings.map((finding, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-slate-300">
                <span className="text-green-400 flex-shrink-0">•</span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action Items */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-xl font-bold text-white mb-6">Recommended Action Items</h2>
        <div className="space-y-4">
          {assessment.actionItems.length === 0 ? (
            <div className="rounded-lg border border-green-800/50 bg-green-950/20 p-4">
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-200 font-medium">All action items complete!</p>
                  <p className="text-sm text-green-300/80">Continue monitoring for compliance.</p>
                </div>
              </div>
            </div>
          ) : (
            assessment.actionItems.map((item, idx) => (
              <div key={idx} className={`rounded-lg border p-4 ${priorityColors[item.priority]}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${priorityBadgeColors[item.priority]}`}>
                        {item.priority.toUpperCase()}
                      </span>
                      <h3 className="font-medium text-white">{item.action}</h3>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">{item.impact}</p>
                    <p className="text-xs text-slate-500">⏱️ Est. {item.estimatedTime}</p>
                  </div>
                  <button className="flex items-center gap-1 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-white text-sm font-medium transition flex-shrink-0">
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
