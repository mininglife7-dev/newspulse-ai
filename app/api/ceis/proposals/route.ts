import { NextRequest, NextResponse } from 'next/server';
import { listProposals } from '@/lib/ceis/store';
import { requireAdminToken, unauthorizedResponse } from '@/lib/api-auth';
import type { DnaStatus } from '@/lib/ceis/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES: DnaStatus[] = [
  'proposed',
  'under-review',
  'approved',
  'rejected',
];

/** GET /api/ceis/proposals[?status=proposed] — list DNA proposals. ADMIN TOKEN REQUIRED */
export async function GET(req: NextRequest) {
  if (!requireAdminToken(req)) {
    return unauthorizedResponse();
  }
  const statusParam = req.nextUrl.searchParams.get('status');
  if (statusParam && !STATUSES.includes(statusParam as DnaStatus)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Invalid status. Use one of: ${STATUSES.join(', ')}.`,
      },
      { status: 400 }
    );
  }
  try {
    const proposals = await listProposals(
      (statusParam as DnaStatus) || undefined
    );
    return NextResponse.json({ ok: true, count: proposals.length, proposals });
  } catch (err: any) {
    console.error('[/api/ceis/proposals] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to list proposals.' },
      { status: 500 }
    );
  }
}
