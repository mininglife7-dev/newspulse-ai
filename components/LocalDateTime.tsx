'use client';

import { formatAbsoluteDate } from '@/lib/utils';

interface LocalDateTimeProps {
  iso: string | null | undefined;
  className?: string;
}

/**
 * Renders a timestamp in the *visitor's* locale and timezone.
 *
 * Server components format dates in the server's timezone, so the same
 * search could show one time on /history (client-rendered) and a different
 * time on /history/[id] (server-rendered). Formatting in a client component
 * keeps every screen consistent; suppressHydrationWarning absorbs the
 * server-locale placeholder swapped out at hydration.
 */
export default function LocalDateTime({ iso, className }: LocalDateTimeProps) {
  return (
    <time dateTime={iso ?? undefined} className={className} suppressHydrationWarning>
      {formatAbsoluteDate(iso)}
    </time>
  );
}
