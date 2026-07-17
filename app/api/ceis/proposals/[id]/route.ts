import { NextRequest, NextResponse } from 'next/server';
import { requireAdminToken, unauthorizedResponse } from '@/lib/api-auth';
import { QUALITY_GATE_NAMES } from '@/lib/ceis/dna-generator';
import { rememberGenomeEntry } from '@/lib/ceis/genome';
import { getProposal, updateProposal } from '@/lib/ceis/store';
import type { QualityGateName } from '@/lib/ceis/types';
import { stableId } from '@/lib/ceis/util';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET   /api/ceis/proposals/:id — full DNA mission document.
 * PATCH /api/ceis/proposals/:id — founder review actions:
 *
 *   { "action": "start-review" }
 *   { "action": "gate", "gate": "security-review", "status": "passed"|"failed", "notes": "..." }
 *   { "action": "approve" }   — only allowed when ALL nine gates passed
 *   { "action": "reject", "reason": "..." }
 *
 * Approvals and rejections are written into the knowledge genome so the
 * Cathedral permanently remembers what it chose and why.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdminToken(req)) {
    return unauthorizedResponse();
  }
  const { id } = await params;
  const proposal = await getProposal(id);
  if (!proposal) {
    return NextResponse.json(
      { ok: false, error: 'Proposal not found.' },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, proposal });
}

interface PatchBody {
  action?: 'start-review' | 'gate' | 'approve' | 'reject';
  gate?: string;
  status?: 'passed' | 'failed';
  notes?: string;
  reason?: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Founder review actions mutate DNA state — same fail-closed admin-token
  // gate the repo uses for its other privileged endpoints (lib/api-auth.ts).
  if (!requireAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  const proposal = await getProposal(id);
  if (!proposal) {
    return NextResponse.json(
      { ok: false, error: 'Proposal not found.' },
      { status: 404 }
    );
  }

  switch (body.action) {
    case 'start-review': {
      const updated = await updateProposal(id, {
        status: 'under-review',
      });
      return NextResponse.json({ ok: true, proposal: updated });
    }

    case 'gate': {
      if (
        !body.gate ||
        !QUALITY_GATE_NAMES.includes(body.gate as QualityGateName) ||
        (body.status !== 'passed' && body.status !== 'failed')
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: `Gate action needs "gate" (one of: ${QUALITY_GATE_NAMES.join(', ')}) and "status" ("passed"|"failed").`,
          },
          { status: 400 }
        );
      }
      const gates = proposal.gates.map((g) =>
        g.name === body.gate
          ? { ...g, status: body.status!, notes: body.notes ?? g.notes }
          : g
      );
      const updated = await updateProposal(id, { gates });
      return NextResponse.json({ ok: true, proposal: updated });
    }

    case 'approve': {
      const pending = proposal.gates.filter((g) => g.status !== 'passed');
      if (pending.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            error: `Cannot approve: ${pending.length} quality gate(s) not passed yet (${pending
              .map((g) => `${g.name}: ${g.status}`)
              .join(
                ', '
              )}). Nothing enters the Cathedral without passing every gate.`,
          },
          { status: 409 }
        );
      }
      const updated = await updateProposal(id, { status: 'approved' });
      await rememberGenomeEntry({
        id: stableId('successful', proposal.id),
        kind: 'successful-idea',
        title: proposal.title,
        summary: `${proposal.code} approved (score ${proposal.evolution_score.overall}/100). Mission: ${proposal.mission}`,
        tags: ['dna', 'approved', proposal.priority],
        evidence: proposal.evidence.join('; '),
      });
      return NextResponse.json({ ok: true, proposal: updated });
    }

    case 'reject': {
      const updated = await updateProposal(id, { status: 'rejected' });
      await rememberGenomeEntry({
        id: stableId('rejected', proposal.principle_id),
        kind: 'rejected-idea',
        title: proposal.title,
        summary:
          body.reason?.trim() ||
          'Rejected by founder review (no reason given).',
        tags: ['dna', 'founder-rejected'],
        evidence: `confidence=${proposal.evolution_score.dimensions.confidence.toFixed(2)} at rejection; ${proposal.evidence.join('; ')}`,
      });
      return NextResponse.json({ ok: true, proposal: updated });
    }

    default:
      return NextResponse.json(
        {
          ok: false,
          error:
            'Invalid action. Use "start-review", "gate", "approve" or "reject".',
        },
        { status: 400 }
      );
  }
}
