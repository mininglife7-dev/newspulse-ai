import { describe, expect, it } from 'vitest';
import { computeDashboard } from '@/lib/ceis/dashboard';
import { NOW, makeProposal } from './helpers';

describe('computeDashboard', () => {
  it('splits proposals by status and aggregates metrics', () => {
    const proposals = [
      makeProposal({ id: '1', title: 'Queued', status: 'proposed' }),
      makeProposal({ id: '2', title: 'Reviewing', status: 'under-review' }),
      makeProposal({ id: '3', title: 'Shipped', status: 'approved' }),
      makeProposal({ id: '4', title: 'Nope', status: 'rejected' }),
    ];
    const d = computeDashboard({
      proposals,
      latestReport: null,
      genomeTotal: 42,
      genomeRecent: 7,
      now: NOW,
    });
    expect(d.dna_queue.map((p) => p.title)).toEqual(['Queued']);
    expect(d.under_review).toHaveLength(1);
    expect(d.approved).toHaveLength(1);
    expect(d.rejected).toHaveLength(1);
    expect(d.knowledge_entries).toBe(42);
    expect(d.learning_velocity).toBe(7);
    expect(d.evolution_score).toBe(0); // no report yet
    expect(d.architecture_health).toBe(100);
    expect(d.evidence_confidence).toBeGreaterThan(0);
  });

  it('erodes architecture health on failed gates', () => {
    const failing = makeProposal({ status: 'proposed' });
    failing.gates = failing.gates.map((g, i) =>
      i < 2 ? { ...g, status: 'failed' as const } : g
    );
    const d = computeDashboard({
      proposals: [failing],
      latestReport: null,
      genomeTotal: 0,
      genomeRecent: 0,
      now: NOW,
    });
    expect(d.architecture_health).toBe(70); // 100 - 2×15
  });

  it('is safe on a completely empty system', () => {
    const d = computeDashboard({
      proposals: [],
      latestReport: null,
      genomeTotal: 10,
      genomeRecent: 0,
      now: NOW,
    });
    expect(d.ok).toBe(true);
    expect(d.evolution_score).toBe(0);
    expect(d.customer_impact).toBe(0);
    expect(d.roi_estimate).toBe(0);
  });
});
