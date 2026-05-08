import Link from 'next/link';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-900/30 text-accent-300">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <div>
        <p className="font-medium text-white">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-white/50">{description}</p>
        )}
      </div>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-accent-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-accent-900/40 transition hover:from-accent-400 hover:to-indigo-500"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
