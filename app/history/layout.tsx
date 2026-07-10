import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search History — NewsPulse AI',
  description: 'Every search you have run on NewsPulse AI, stored in Supabase.',
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
