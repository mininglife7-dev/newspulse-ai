'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Download, Shield, Package } from 'lucide-react';

interface InventorySystem {
  id: string;
  name: string;
  source: 'github' | 'aws' | 'azure' | 'gcp';
  url: string;
  confidence: number;
  topics: string[];
  bom?: {
    componentCount: number;
    criticalRiskCount: number;
    requiresAiActAssessment: boolean;
  };
  threats?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  complianceStatus: 'not-assessed' | 'in-progress' | 'compliant' | 'needs-attention';
  lastDiscovered: string;
}

interface InventorySummary {
  systems: InventorySystem[];
  stats: {
    totalSystems: number;
    bySource: Record<string, number>;
    complianceStatus: Record<string, number>;
    threatSummary: {
      systemsWithThreats: number;
      totalAlerts: number;
      criticalAlerts: number;
      highAlerts: number;
    };
    bomCoverage: {
      systemsWithBom: number;
      systemsNeedingAssessment: number;
    };
  };
  lastUpdated: string;
}

export default function InventoryDashboardPage() {
  const [inventory, setInventory] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await fetch('/api/inventory/summary');
        if (!res.ok) throw new Error('Failed to fetch inventory');
        const data = await res.json();
        setInventory(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Inventory error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  const complianceStatusColors = {
    'not-assessed': 'bg-slate-900/50 border-slate-800 text-slate-300',
    'in-progress': 'bg-yellow-950/20 border-yellow-800/50 text-yellow-200',
    'compliant': 'bg-green-950/20 border-green-800/50 text-green-200',
    'needs-attention': 'bg-red-950/20 border-red-800/50 text-red-200',
  };

  const complianceStatusIcon = {
    'not-assessed': '○',
    'in-progress': '◐',
    'compliant': '✓',
    'needs-attention': '!',
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const res = await fetch('/api/export/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'csv'}`;
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

  const sourceIcons = {
    github: '🐙',
    aws: '☁️',
    azure: '☁️',
    gcp: '☁️',
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white">AI System Inventory</h1>
          <p className="mt-2 text-lg text-slate-400">Loading inventory...</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-lg bg-slate-800"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-lg bg-slate-800"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !inventory) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white">AI System Inventory</h1>
          <p className="mt-2 text-lg text-slate-400">Error loading inventory</p>
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

  if (!inventory) return null;

  const threatCount = (system: InventorySystem) => {
    if (!system.threats) return 0;
    return system.threats.critical + system.threats.high + system.threats.medium + system.threats.low;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white">AI System Inventory</h1>
        <p className="mt-2 text-lg text-slate-400">
          Complete catalog of discovered AI systems across your organization
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-slate-400 mb-2">Total Systems</p>
          <p className="text-3xl font-bold text-white">{inventory.stats.totalSystems}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-slate-400 mb-2">With BOM</p>
          <p className="text-3xl font-bold text-blue-400">{inventory.stats.bomCoverage.systemsWithBom}</p>
          <p className="text-xs text-slate-500 mt-1">
            {inventory.stats.bomCoverage.systemsNeedingAssessment} pending assessment
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-slate-400 mb-2">Systems with Threats</p>
          <p className="text-3xl font-bold text-orange-400">{inventory.stats.threatSummary.systemsWithThreats}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-slate-400 mb-2">Critical Alerts</p>
          <p className="text-3xl font-bold text-red-400">{inventory.stats.threatSummary.criticalAlerts}</p>
        </div>
      </div>

      {/* Compliance Status Distribution */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-slate-400 mb-2">Not Assessed</p>
          <p className="text-2xl font-bold text-slate-300">{inventory.stats.complianceStatus['not-assessed'] || 0}</p>
        </div>
        <div className="rounded-lg border border-yellow-800/50 bg-yellow-950/20 p-6">
          <p className="text-sm text-yellow-300/80 mb-2">In Progress</p>
          <p className="text-2xl font-bold text-yellow-200">{inventory.stats.complianceStatus['in-progress'] || 0}</p>
        </div>
        <div className="rounded-lg border border-green-800/50 bg-green-950/20 p-6">
          <p className="text-sm text-green-300/80 mb-2">Compliant</p>
          <p className="text-2xl font-bold text-green-200">{inventory.stats.complianceStatus['compliant'] || 0}</p>
        </div>
        <div className="rounded-lg border border-red-800/50 bg-red-950/20 p-6">
          <p className="text-sm text-red-300/80 mb-2">Needs Attention</p>
          <p className="text-2xl font-bold text-red-200">{inventory.stats.complianceStatus['needs-attention'] || 0}</p>
        </div>
      </div>

      {/* Systems Grid */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-white">Systems</h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('json')}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-3 py-2 text-white text-sm font-medium transition"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting...' : 'JSON'}
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 px-3 py-2 text-white text-sm font-medium transition"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting...' : 'CSV'}
            </button>
          </div>
        </div>
        {inventory.systems.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-8 text-center">
            <AlertCircle className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 font-medium mb-2">No AI systems discovered yet</p>
            <p className="text-sm text-slate-500">
              Run discovery for GitHub, AWS, Azure, or GCP to catalog your AI systems.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inventory.systems.map((system) => (
              <div
                key={system.id}
                className={`rounded-lg border p-4 ${complianceStatusColors[system.complianceStatus]}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate">{system.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">{sourceIcons[system.source]} {system.source.toUpperCase()}</p>
                  </div>
                  <span className="text-lg ml-2">{complianceStatusIcon[system.complianceStatus]}</span>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Confidence</span>
                    <span className="font-mono font-semibold text-white">{Math.round(system.confidence)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div
                      className="bg-cyan-500 h-1.5 rounded-full"
                      style={{ width: `${system.confidence}%` }}
                    ></div>
                  </div>
                </div>

                {system.bom && (
                  <div className="rounded-lg bg-slate-800/50 p-3 mb-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Components</span>
                      <span className="font-semibold text-white">{system.bom.componentCount}</span>
                    </div>
                    {system.bom.criticalRiskCount > 0 && (
                      <div className="flex items-center justify-between text-red-300/80">
                        <span className="text-slate-400">Critical Risks</span>
                        <span className="font-semibold text-red-200">{system.bom.criticalRiskCount}</span>
                      </div>
                    )}
                  </div>
                )}

                {threatCount(system) > 0 && (
                  <div className="rounded-lg bg-orange-950/30 border border-orange-800/30 p-3 mb-3 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-3 w-3 text-orange-400 flex-shrink-0" />
                      <span className="font-semibold text-orange-200">{threatCount(system)} Alert{threatCount(system) !== 1 ? 's' : ''}</span>
                    </div>
                    {system.threats && (
                      <div className="space-y-0.5 text-slate-300">
                        {system.threats.critical > 0 && <p className="text-red-200">• {system.threats.critical} critical</p>}
                        {system.threats.high > 0 && <p className="text-orange-200">• {system.threats.high} high</p>}
                      </div>
                    )}
                  </div>
                )}

                {system.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {system.topics.slice(0, 3).map((topic) => (
                      <span key={topic} className="inline-block bg-slate-800/50 rounded px-2 py-1 text-xs text-slate-300">
                        {topic}
                      </span>
                    ))}
                    {system.topics.length > 3 && (
                      <span className="inline-block text-xs text-slate-500">+{system.topics.length - 3}</span>
                    )}
                  </div>
                )}

                <a
                  href={system.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-cyan-400 hover:text-cyan-300 truncate w-full"
                >
                  {system.url}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
