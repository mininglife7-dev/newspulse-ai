'use client';

import type { CategoryScore } from '@/types/governance';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  categories: CategoryScore[];
}

export default function CategoryScorecard({ categories }: Props) {
  // Sort by currentScore descending
  const sorted = [...categories].sort((a, b) => b.currentScore - a.currentScore);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0':
        return 'bg-red-500/20 text-red-300';
      case 'P1':
        return 'bg-orange-500/20 text-orange-300';
      case 'P2':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'P3':
        return 'bg-blue-500/20 text-blue-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-300';
    if (score >= 70) return 'text-yellow-300';
    if (score >= 50) return 'text-orange-300';
    return 'text-red-300';
  };

  const getGapColor = (current: number, target: number) => {
    const gap = target - current;
    if (gap <= 5) return 'text-green-400';
    if (gap <= 15) return 'text-yellow-400';
    return 'text-red-400';
  };

  const stats = {
    avgCurrent: Math.round(
      categories.reduce((sum, c) => sum + c.currentScore, 0) / categories.length
    ),
    avgTarget: Math.round(
      categories.reduce((sum, c) => sum + c.targetScore, 0) / categories.length
    ),
    onTarget: categories.filter((c) => c.currentScore >= c.targetScore).length,
    needsWork: categories.filter((c) => c.currentScore < c.targetScore * 0.7).length,
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs uppercase text-white/40">Categories On Target</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-green-300">{stats.onTarget}</span>
            <span className="text-white/40">/ {categories.length}</span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs uppercase text-white/40">Needs Work (&lt;70%)</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-red-300">{stats.needsWork}</span>
            <span className="text-white/40">/ {categories.length}</span>
          </div>
        </div>
        <div className="rounded-lg border border-accent-500/30 bg-accent-900/20 p-4">
          <div className="text-xs uppercase text-white/40">Average Current</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-accent-300">{stats.avgCurrent}</span>
            <span className="text-white/40">%</span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs uppercase text-white/40">Average Target</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-accent-300">{stats.avgTarget}</span>
            <span className="text-white/40">%</span>
          </div>
        </div>
      </div>

      {/* Categories Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-black/30">
              <th className="px-4 py-3 text-left font-semibold text-white/70">Category</th>
              <th className="px-4 py-3 text-center font-semibold text-white/70">Before</th>
              <th className="px-4 py-3 text-center font-semibold text-white/70">Current</th>
              <th className="px-4 py-3 text-center font-semibold text-white/70">Target</th>
              <th className="px-4 py-3 text-center font-semibold text-white/70">Gap</th>
              <th className="px-4 py-3 text-center font-semibold text-white/70">Owner</th>
              <th className="px-4 py-3 text-center font-semibold text-white/70">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((category) => {
              const improvement = category.currentScore - category.mainScore;
              const gap = category.targetScore - category.currentScore;
              const onTarget = category.currentScore >= category.targetScore;

              return (
                <tr key={category.name} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-medium">{category.name}</td>
                  <td className="px-4 py-3 text-center text-white/60">{category.mainScore}</td>
                  <td className={`px-4 py-3 text-center font-semibold ${getScoreColor(category.currentScore)}`}>
                    {category.currentScore}
                  </td>
                  <td className="px-4 py-3 text-center text-white/60">{category.targetScore}</td>
                  <td className={`px-4 py-3 text-center font-semibold ${getGapColor(category.currentScore, category.targetScore)}`}>
                    {onTarget ? (
                      <span className="flex items-center justify-center gap-1">
                        <CheckIcon className="h-4 w-4" /> 0
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1">
                        <span>{gap}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-white/60 text-xs">{category.owner}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getPriorityColor(category.priority)}`}>
                      {category.priority}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Category Details */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Category Evidence</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {sorted.map((category) => (
            <div key={category.name} className="rounded-lg border border-border bg-card p-3">
              <div className="font-semibold text-sm mb-2">{category.name}</div>
              <div className="text-xs text-white/70">{category.evidence}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
