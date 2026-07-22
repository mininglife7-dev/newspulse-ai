import { describe, it, expect, beforeAll } from 'vitest';
import { ReferenceMissionExecutor } from '../lib/governor/reference-mission';
import { getOrCreateRegistry } from '../lib/governor/capability-registry';
import { getOrCreatePolicyEngine } from '../lib/governor/policy-engine';
import { getOrCreateLedger } from '../lib/governor/evidence-ledger';

describe('Phase 1 Operational Acceptance Gate', () => {
  let report: any;

  beforeAll(
    async () => {
      // Initialize all components
      const registry = await getOrCreateRegistry();
      const engine = await getOrCreatePolicyEngine(registry);
      const ledger = getOrCreateLedger();

      // Create executor
      const executor = new ReferenceMissionExecutor(registry, engine, ledger);

      // Execute reference mission
      report = await executor.execute();
    },
    30000 // Increase hook timeout to accommodate reference mission execution (18+ seconds)
  );

  it('should complete with SUCCESS status', () => {
    expect(report.status).toBe('SUCCESS');
  });

  it('should complete all tasks', () => {
    expect(report.failed_tasks).toBe(0);
    expect(report.total_tasks).toBe(report.completed_tasks);
  });

  it('should record evidence', () => {
    expect(report.evidence_count).toBeGreaterThan(0);
  });

  it('should improve fitness', () => {
    expect(report.fitness_post_execution).toBeGreaterThanOrEqual(
      report.fitness_baseline
    );
  });
});
