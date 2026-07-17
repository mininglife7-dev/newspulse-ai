'use client';

import type { Mission } from '@/types/governance';
import type { DashboardState } from '@/types/governance';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Props {
  missions: Mission[];
  missionProgress: DashboardState['missionProgress'];
}

export default function MissionTracker({ missions, missionProgress }: Props) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'open':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-950/30 border-green-500/30';
      case 'in_progress':
        return 'bg-blue-950/30 border-blue-500/30';
      case 'open':
        return 'bg-yellow-950/30 border-yellow-500/30';
      default:
        return 'bg-card border-border';
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      <div className="grid gap-4 sm:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs uppercase text-white/40">Total Missions</div>
          <div className="mt-2 text-2xl font-bold">
            {missionProgress.completed +
              missionProgress.inProgress +
              missionProgress.open +
              missionProgress.deferred}
          </div>
        </div>
        <div className="rounded-lg border border-green-500/30 bg-green-950/20 p-3">
          <div className="text-xs uppercase text-white/40">Completed</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-green-300">
              {missionProgress.completed}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-blue-500/30 bg-blue-950/20 p-3">
          <div className="text-xs uppercase text-white/40">In Progress</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-300">
              {missionProgress.inProgress}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-950/20 p-3">
          <div className="text-xs uppercase text-white/40">Open</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-yellow-300">
              {missionProgress.open}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs uppercase text-white/40">Progress</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-accent-300">
              {missionProgress.percentComplete}%
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="text-xs uppercase text-white/40">Overall Progress</div>
        <div className="h-3 overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-gradient-to-r from-accent-500 to-indigo-600"
            style={{ width: `${missionProgress.percentComplete}%` }}
          />
        </div>
      </div>

      {/* Missions List */}
      <div className="mt-6 space-y-2">
        {missions.map((mission) => (
          <div
            key={mission.id}
            className={`rounded-lg border p-4 transition ${getStatusBg(mission.status)}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-1 items-start gap-3">
                <div className="mt-1">{getStatusIcon(mission.status)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{mission.id}</div>
                      <div className="text-sm text-white/70">
                        {mission.title}
                      </div>
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-black/50 px-2 py-1 text-xs capitalize text-white/70">
                      {mission.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="text-right">
                  <div className="text-sm font-semibold text-accent-300">
                    {mission.impactScore}/10
                  </div>
                  <div className="text-xs text-white/40">Impact</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/50">
                    {mission.effortEstimate}
                  </div>
                  <div className="text-xs text-white/40">Effort</div>
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-white/60">
              <span className="inline-block h-1 w-1 rounded-full bg-white/40" />
              Owner: <span className="font-medium">{mission.owner}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
