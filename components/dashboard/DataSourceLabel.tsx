'use client';

import { Info } from 'lucide-react';

interface Props {
  source: string;
  lastUpdated: string;
  lastFetch?: string;
}

export default function DataSourceLabel({ source, lastUpdated, lastFetch }: Props) {
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString();
  };

  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 text-xs text-white/50">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div>
            <strong className="text-white/70">Data Source:</strong> {source}
          </div>
          <div>
            <strong className="text-white/70">Last Updated:</strong> {formatDate(lastUpdated)} at {formatTime(lastUpdated)}
          </div>
          {lastFetch && (
            <div>
              <strong className="text-white/70">Last Synced:</strong> {formatTime(lastFetch)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
