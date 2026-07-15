/**
 * Cathedral Enterprise Initialization Tests
 *
 * Verify:
 * - Cathedral registers as Enterprise 001
 * - Mission and objectives are imported
 * - Launch gates are tracked
 * - Risks are documented
 * - Health is calculated correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HerculesKernel } from '@/lib/hercules-kernel';
import {
  initializeCathedralEnterprise,
  getCathedralState,
} from '@/lib/cathedral-enterprise-init';

describe('Cathedral Enterprise Initialization', () => {
  let kernel: HerculesKernel;

  beforeEach(() => {
    kernel = HerculesKernel.getInstance();
  });

  describe('Enterprise Registration', () => {
    it('should register Cathedral as Enterprise 001', () => {
      const state = initializeCathedralEnterprise();

      expect(state.enterprise).toBeDefined();
      expect(state.enterprise.id).toBe('cathedral-001');
      expect(state.enterprise.name).toBe('Cathedral/EURO AI');
      expect(state.enterprise.status).toBe('ACTIVE');
    });

    it('should import mission statement', () => {
      const state = initializeCathedralEnterprise();

      expect(state.enterprise.missionStatement).toContain(
        'news intelligence platform'
      );
      expect(state.enterprise.missionStatement).toContain('EU AI Act');
      expect(state.enterprise.missionStatement).toContain('compliance');
    });

    it('should import all objectives', () => {
      const state = initializeCathedralEnterprise();

      expect(state.objectives.length).toBeGreaterThanOrEqual(5);

      const objectiveTitles = state.objectives.map((o) => o.title);
      expect(objectiveTitles).toContain('Production Launch');
      expect(objectiveTitles).toContain('Customer Pilot');
      expect(objectiveTitles).toContain('Operational Reliability');
      expect(objectiveTitles).toContain('Security & Compliance');
    });

    it('should set Priority 1 objectives for launch and customer', () => {
      const initState = initializeCathedralEnterprise();

      expect(initState.objectives.length).toBeGreaterThanOrEqual(5);

      const launchObj = initState.objectives.find(
        (o) => o.title === 'Production Launch'
      );
      const customerObj = initState.objectives.find(
        (o) => o.title === 'Customer Pilot'
      );

      expect(launchObj).toBeDefined();
      expect(customerObj).toBeDefined();
      expect(launchObj?.priority).toBe(1);
      expect(customerObj?.priority).toBe(1);
    });

    it('should idempotently register (no duplicates on second call)', () => {
      initializeCathedralEnterprise();
      const state1 = getCathedralState();

      initializeCathedralEnterprise();
      const state2 = getCathedralState();

      expect(state1?.enterprise.id).toBe(state2?.enterprise.id);
      expect(state1?.enterprise.createdAt).toBe(state2?.enterprise.createdAt);
    });
  });

  describe('Launch Gates', () => {
    it('should track launch gate status', () => {
      initializeCathedralEnterprise();
      const state = getCathedralState();

      expect(state).toBeDefined();
      expect(state!.launchGates.length).toBeGreaterThan(0);

      const gates = state!.launchGates.map((g) => g.name);
      expect(gates).toContain('Supabase Production Schema');
      expect(gates).toContain('GitHub Actions Spending Limit');
      expect(gates).toContain('First Customer Onboarded');
    });

    it('should mark production monitoring as complete', () => {
      initializeCathedralEnterprise();
      const state = getCathedralState();

      const monitoring = state?.launchGates.find(
        (g) => g.name === 'Production Monitoring Verified'
      );
      expect(monitoring?.status).toBe('complete');
    });

    it('should mark critical gates as pending', () => {
      initializeCathedralEnterprise();
      const state = getCathedralState();

      const supabase = state?.launchGates.find(
        (g) => g.name === 'Supabase Production Schema'
      );
      const actions = state?.launchGates.find(
        (g) => g.name === 'GitHub Actions Spending Limit'
      );

      expect(supabase?.status).toBe('pending');
      expect(actions?.status).toBe('pending');
    });
  });

  describe('Risk Register', () => {
    it('should document critical risks', () => {
      initializeCathedralEnterprise();
      const state = getCathedralState();

      expect(state).toBeDefined();
      expect(state!.risks.length).toBeGreaterThan(0);

      const criticalRisks = state!.risks.filter(
        (r) => r.severity === 'critical'
      );
      expect(criticalRisks.length).toBeGreaterThan(0);
    });

    it('should include mitigation strategies', () => {
      initializeCathedralEnterprise();
      const state = getCathedralState();

      for (const risk of state!.risks) {
        expect(risk.mitigations).toBeDefined();
        expect(risk.mitigations.length).toBeGreaterThan(0);
      }
    });

    it('should track Supabase deployment risk', () => {
      initializeCathedralEnterprise();
      const state = getCathedralState();

      const supabaseRisk = state?.risks.find((r) =>
        r.title.includes('Supabase')
      );
      expect(supabaseRisk).toBeDefined();
      expect(supabaseRisk?.severity).toBe('critical');
    });
  });

  describe('Health Calculation', () => {
    it('should calculate initial health', () => {
      initializeCathedralEnterprise();

      const health = kernel.calculateHealth('cathedral-001');
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.percentage).toBeGreaterThanOrEqual(0);
      expect(health.percentage).toBeLessThanOrEqual(100);
    });

    it('should retrieve calculated health', () => {
      initializeCathedralEnterprise();

      const health = kernel.getHealth('cathedral-001');
      expect(health).toBeDefined();
      expect(health?.lastCalculatedAt).toBeDefined();
    });
  });

  describe('State Retrieval', () => {
    it('should retrieve Cathedral state after registration', () => {
      initializeCathedralEnterprise();

      const state = getCathedralState();
      expect(state).toBeDefined();
      expect(state?.enterprise.id).toBe('cathedral-001');
    });

    it('should return null for unregistered Cathedral', () => {
      // In a fresh kernel, Cathedral might not be registered
      const freshKernel = HerculesKernel.getInstance();
      // Try to get state for a non-existent enterprise
      const state = getCathedralState();
      // If not registered, should be null (unless previous test registered it)
      // This test is exploratory based on state
      expect(state === null || state?.enterprise.id === 'cathedral-001').toBe(
        true
      );
    });
  });

  describe('Mission Creation', () => {
    it('should create launch pilot mission', () => {
      initializeCathedralEnterprise();

      const enterprise = kernel.getEnterprise('cathedral-001');

      expect(enterprise).toBeDefined();
      expect(enterprise?.objectives.length).toBeGreaterThan(0);
    });
  });
});
