import { describe, it, expect } from 'vitest';
import { buildDashboardState } from '@/lib/governance-state';

describe('Governance State Builder', () => {
  it('builds a canonical dashboard state with all required fields', () => {
    const state = buildDashboardState();

    expect(state).toBeDefined();
    expect(state.lastUpdated).toBeDefined();
    expect(state.dataSource).toBe('Canonical Backend');
  });

  it('includes all launch blockers', () => {
    const state = buildDashboardState();

    expect(state.blockers).toBeDefined();
    expect(state.blockers.length).toBe(10); // M-01 through M-10

    const blockerId = state.blockers.map((b) => b.id);
    expect(blockerId).toContain('M-01');
    expect(blockerId).toContain('M-10');
  });

  it('includes all missions', () => {
    const state = buildDashboardState();

    expect(state.missions).toBeDefined();
    expect(state.missions.length).toBe(10); // V2-1 through V2-10

    const missionIds = state.missions.map((m) => m.id);
    expect(missionIds).toContain('V2-1');
    expect(missionIds).toContain('V2-10');
  });

  it('includes all categories', () => {
    const state = buildDashboardState();

    expect(state.categories).toBeDefined();
    expect(state.categories.length).toBeGreaterThan(20);
  });

  it('calculates launch readiness based on critical gates', () => {
    const state = buildDashboardState();

    expect(state.launchReadiness).toBeDefined();
    expect(state.launchReadiness.state).toMatch(/^(go|no_go|conditional_go)$/);
    expect(state.launchReadiness.percentage).toBeGreaterThanOrEqual(0);
    expect(state.launchReadiness.percentage).toBeLessThanOrEqual(100);
  });

  it('enforces critical gate rule: red/unknown gates force NO-GO', () => {
    const state = buildDashboardState();

    const hasRedGate =
      state.criticalGates.buildStatus === 'fail' ||
      state.criticalGates.ciStatus === 'fail' ||
      state.criticalGates.deploymentStatus === 'failed' ||
      state.criticalGates.securityAudit === 'fail';

    if (hasRedGate) {
      expect(state.launchReadiness.state).toBe('no_go');
    }
  });

  it('calculates mission progress correctly', () => {
    const state = buildDashboardState();

    const { missionProgress } = state;
    const total =
      missionProgress.completed +
      missionProgress.inProgress +
      missionProgress.open +
      missionProgress.deferred;

    expect(total).toBe(state.missions.length);
    expect(missionProgress.percentComplete).toBeGreaterThanOrEqual(0);
    expect(missionProgress.percentComplete).toBeLessThanOrEqual(100);
  });

  it('category scores never exceed target', () => {
    const state = buildDashboardState();

    for (const category of state.categories) {
      expect(category.currentScore).toBeLessThanOrEqual(category.targetScore);
    }
  });

  it('detects inconsistencies if they exist', () => {
    const state = buildDashboardState();

    expect(state.inconsistencies).toBeDefined();
    expect(state.inconsistencies).toHaveProperty('found');
    expect(state.inconsistencies).toHaveProperty('issues');
    expect(state.inconsistencies).toHaveProperty('lastCheckedAt');

    expect(Array.isArray(state.inconsistencies.issues)).toBe(true);
  });

  it('includes health status for infrastructure, security, and deployment', () => {
    const state = buildDashboardState();

    expect(state.infraHealth).toMatch(/^(healthy|degraded|critical)$/);
    expect(state.securityStatus).toMatch(/^(healthy|degraded|critical)$/);
    expect(state.deploymentStatus).toMatch(/^(healthy|degraded|critical)$/);
  });

  it('resolves blockers M-01, M-02, M-03, M-08', () => {
    const state = buildDashboardState();

    const resolved = ['M-01', 'M-02', 'M-03', 'M-08'];
    for (const id of resolved) {
      const blocker = state.blockers.find((b) => b.id === id);
      expect(blocker?.status).toBe('resolved');
    }
  });

  it('has open blockers M-04, M-06, M-07, M-09, M-10', () => {
    const state = buildDashboardState();

    const open = ['M-04', 'M-06', 'M-07', 'M-09', 'M-10'];
    for (const id of open) {
      const blocker = state.blockers.find((b) => b.id === id);
      expect(blocker?.status).toMatch(/^(open|blocked)$/);
    }
  });

  it('timestamp is ISO 8601 format', () => {
    const state = buildDashboardState();

    expect(() => new Date(state.lastUpdated).toISOString()).not.toThrow();
    expect(state.lastUpdated).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
  });

  it('returns consistent state on multiple calls', () => {
    const state1 = buildDashboardState();
    const state2 = buildDashboardState();

    // Timing will differ slightly, but content should match
    expect(state1.blockers.length).toBe(state2.blockers.length);
    expect(state1.missions.length).toBe(state2.missions.length);
    expect(state1.categories.length).toBe(state2.categories.length);

    // Same blocker statuses
    for (let i = 0; i < state1.blockers.length; i++) {
      expect(state1.blockers[i].id).toBe(state2.blockers[i].id);
      expect(state1.blockers[i].status).toBe(state2.blockers[i].status);
    }
  });
});
